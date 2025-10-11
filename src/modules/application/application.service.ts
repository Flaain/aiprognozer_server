import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GetApplicationsReturn, SendApplicationDTO } from './types';
import { UserDocument, WebAppUser } from '../user/types/types';
import { ApplicationRepository } from './application.repository';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { defaultResponse, PROVIDERS } from 'src/shared/constants';
import { UserRepository } from '../user/user.repository';
import { APPLICATIONS_LIMIT_PER_PAGE } from './constants';
import { Bot } from 'grammy';
import { ConfigService } from '@nestjs/config';
import { Application } from './schemas/application.schema';

@Injectable()
export class ApplicationService {
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot,
        @InjectConnection() private readonly connection: Connection,
        private readonly applicationRepository: ApplicationRepository,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    public sendApplication = async ({ onewin_id }: SendApplicationDTO, user: UserDocument, webAppUser: WebAppUser) => {
        if (user.isVerified || user.application) throw new BadRequestException('Application already sent');

        if (await this.applicationRepository.exists({ onewin_id })) throw new BadRequestException({ code: 'APPLICATION_EXISTS' });

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const application = (await this.applicationRepository.create([{ onewin_id, userId: user._id, status: 'pending' }], { session }))[0];

            await user.updateOne({ $set: { application: application._id } });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }

        this.notifyOnApplicationSend(webAppUser, onewin_id);

        return defaultResponse;
    }

    public rejectApplication = async (applicationId: string) => {
        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const application: any = await this.applicationRepository.findOne({ _id: applicationId }, null, {
                session,
                populate: {
                    path: 'userId',
                    foreignField: '_id',
                    model: 'User',
                    select: '_id telegram_id',
                },
            });
    
            if (!application) throw new BadRequestException('Application not found');
    
            await application.deleteOne({ session });

            await this.userRepository.findOneAndUpdate({ _id: application.userId._id }, { $unset: { application: '' } }, { session });

            await session.commitTransaction();
            
            this.notifyOnApplicationReject(application.userId.telegram_id, application.onewin_id);
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }
    }

    public getApplications = async ({ page = 1}: { page?: number; }): Promise<GetApplicationsReturn> => {
        const totalDocuments = await this.applicationRepository.count({ status: 'pending' });
        const totalPages = Math.ceil(totalDocuments / APPLICATIONS_LIMIT_PER_PAGE);
        const currentPage = Math.min(Math.max(page, 1), totalPages);   

        if (!totalPages) return { applications: [], currentPage, hasPrevPage: false, hasNextPage: false, totalPages };

        const applications: Array<Pick<Application, 'onewin_id'> & { _id: Types.ObjectId }> = await this.applicationRepository.find(
            { status: 'pending' }, 
            { onewin_id: 1 },
            {
                skip: (currentPage - 1) * APPLICATIONS_LIMIT_PER_PAGE,
                sort: { _id: 1 },
                limit: APPLICATIONS_LIMIT_PER_PAGE
            }
        )

        return { 
            totalPages,
            applications,
            currentPage,
            hasPrevPage: currentPage > 1, 
            hasNextPage: currentPage < totalPages, 
        };
    }

    private notifyOnApplicationSend = (user: WebAppUser, onewin_id: number) => {
        this.tgBot.api.sendMessage(user.id, `${user.first_name}, спасибо за проявленный интерес к нашему боту. Ваша заявка получена и находится в обработке.`);

        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 *НОВАЯ ЗАЯВКА!*\n\n🎯 ID Реферала: \`${onewin_id}\``,
            { parse_mode: 'Markdown', disable_notification: !this.isProduction },
        );
    };

    private notifyOnApplicationReject = (telegram_id: number, onewin_id: number) => {
        this.tgBot.api.sendMessage(
            telegram_id,
            `К сожалению, ваша заявка, поданная с указанным id - *${onewin_id}*, была отклонена.\nВы можете подать новую заявку. `,
            { parse_mode: 'Markdown' },
        );
    };
}