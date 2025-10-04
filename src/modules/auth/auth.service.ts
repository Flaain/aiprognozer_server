import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WebAppUser } from '../user/types/types';
import { UserRepository } from '../user/user.repository';
import { InitDataInRequest } from 'src/shared/types';
import { TgService } from '../tg/tg.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly tgService: TgService
    ) {}

    parseInitData = (init_data: string) => {
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

    login = async (init_data: InitDataInRequest) => {
        const { value: { telegram_id, last_request_at, __v, ...user }, lastErrorObject }: any = await this.userRepository.findOrCreateUserByTelegramId(
            { telegram_id: init_data.user.id },
            { $setOnInsert: { last_request_at: new Date(), request_count: 10 } },
            { new: true, upsert: true, includeResultMetadata: true }
        )

        !lastErrorObject?.updatedExisting && this.tgService.notifyAboutNewUser(init_data.user);

        return user;
    };

    validate = async (telegram_id: number) => {
        const user = await this.userRepository.findUserByTelegramId(telegram_id);

        if (!user) throw new UnauthorizedException();

        return user;
    };
}