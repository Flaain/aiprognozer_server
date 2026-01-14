import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksAds, TasksAdsSchema } from './schema/task.ads.schema';
import { TasksReferrals, TasksReferralsSchema } from './schema/task.referrals.schema';
import { TasksSocials, TasksSocialsSchema } from './schema/task.socials.schema';
import { TasksRequests, TasksRequestsSchema } from './schema/task.requests.schema';
import { TasksClaims, TasksClaimsSchema } from './schema/task.claims.schema';
import { TasksRepository } from './tasks.repository';
import { ReferralsModule } from '../referrals/referrals.module';
import { TasksController } from './tasks.controller';
import { TasksDaily, TasksDailySchema } from './schema/task.daily.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TasksAds.name, schema: TasksAdsSchema },
            { name: TasksReferrals.name, schema: TasksReferralsSchema },
            { name: TasksSocials.name, schema: TasksSocialsSchema },
            { name: TasksRequests.name, schema: TasksRequestsSchema },
            { name: TasksDaily.name, schema: TasksDailySchema },
            { name: TasksClaims.name, schema: TasksClaimsSchema },
        ]),
        ReferralsModule
    ],
    controllers: [TasksController],
    providers: [TasksService, TasksRepository],
    exports: [TasksService],
})
export class TasksModule {}