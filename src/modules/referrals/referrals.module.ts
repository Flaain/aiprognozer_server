import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Referrals, ReferralsSchema } from './schemas/referrals.schema';
import { ReferralsService } from './referrals.service';
import { ReferralsRepository } from './referrals.repository';

@Module({
    imports: [MongooseModule.forFeature([{ name: Referrals.name, schema: ReferralsSchema }])],
    providers: [ReferralsService, ReferralsRepository],
    exports: [ReferralsService],
})
export class ReferralsModule {}