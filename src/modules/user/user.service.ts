import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private readonly userRepository: UserRepository) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    private async resetRequestCount() {
        try {
            const { matchedCount } = await this.userRepository.resetRequestCount();

            this.logger.log(`Cron job resetRequestCount success, updated users: ${matchedCount}`);
        } catch (error) {
            this.logger.error(`Cron job resetRequestCount error: ${error}`);
        }
    }
}