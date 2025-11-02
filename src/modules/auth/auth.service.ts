import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WebAppUser } from '../user/types/types';
import { UserRepository } from '../user/user.repository';
import { InitDataInRequest } from 'src/shared/types';
import { PROVIDERS } from 'src/shared/constants';
import { Bot } from 'grammy';

@Injectable()
export class AuthService {
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        this.isProduction = this.configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    public parseInitData = (init_data: string) => {
        const encoded = decodeURIComponent(init_data);
        const secret = createHmac('sha256', 'WebAppData').update(this.configService.getOrThrow<string>('BOT_TOKEN'));

        const data = encoded.split('&');
        const hash_index = data.findIndex((str) => str.startsWith('hash='));
        const hash = data.splice(hash_index)[0].split('=')[1];

        data.sort((a, b) => a.localeCompare(b));

        const data_check_string = data.join('\n');

        if (!(createHmac('sha256', secret.digest()).update(data_check_string).digest('hex') === hash)) throw new UnauthorizedException();

        const params = new URLSearchParams(init_data);

        return {
            hash,
            data_check_string,
            user: JSON.parse(params.get('user')) as WebAppUser,
            auth_date: params.get('auth_date'),
            query_id: params.get('query_id'),
        };
    };

    public login = async (init_data: InitDataInRequest) => {
        const { value, lastErrorObject } = await this.userRepository.findOrCreateUserByTelegramId(init_data.user.id);
        
        !lastErrorObject.updatedExisting && this.notifyAboutNewUser(init_data.user);
        
        const { telegram_id, __v, ...user } = value.toObject();

        return user;
    };

    public validate = async (telegram_id: number) => {
        const user = await this.userRepository.findUserByTelegramId(telegram_id);

        if (!user) throw new UnauthorizedException();

        return user;
    };

    private notifyAboutNewUser = (user: WebAppUser) => {
        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 Новый пользователь!\n👤 Имя: ${user.first_name}\n📧 Username: @${user.username || 'без юзернейма'}\n🆔 ID: ${user.id}`,
            { parse_mode: 'Markdown', disable_notification: !this.isProduction },
        );
    };
}
