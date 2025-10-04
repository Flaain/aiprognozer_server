import { BadRequestException, Injectable } from '@nestjs/common';
import { SendApplicationDTO } from './types';
import { UserDocument, WebAppUser } from '../user/types/types';
import { ApplicationRepository } from './application.repository';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { TgService } from '../tg/tg.service';
import { defaultResponse } from 'src/shared/constants';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class ApplicationService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly applicationRepository: ApplicationRepository,
        private readonly userRepository: UserRepository,
        private readonly tgService: TgService
    ) {}
    async sendApplication({ one_win_name }: SendApplicationDTO, user: UserDocument, webAppUser: WebAppUser) {
        if (user.isVerified || user.application) throw new BadRequestException('Application already sent');

        if (await this.applicationRepository.exists({ one_win_name: { $regex: one_win_name, $options: 'i' } })) throw new BadRequestException({ code: 'APPLICATION_NAME_EXISTS' });

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const application = (await this.applicationRepository.create([{ one_win_name, userId: user._id, status: 'pending' }], { session }))[0];

            await user.updateOne({ $set: { application: application._id } });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }

        this.tgService.notifyOnApplicationSend(webAppUser, one_win_name);

        return defaultResponse;
    }

    async rejectApplication(applicationId: string) {
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
            
            this.tgService.notifyOnApplicationReject(application.userId.telegram_id, application.one_win_name);
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }
    }
}