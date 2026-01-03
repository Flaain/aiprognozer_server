import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';
import { ReferralsModule } from '../referrals/referrals.module';
import { OneWinReferrals, OneWinReferralsSchema } from './schemas/onewin.referral.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: OneWinReferrals.name, schema: OneWinReferralsSchema },
        ]),
        ReferralsModule
    ],
    providers: [UserService, UserRepository],
    controllers: [UserController],
    exports: [UserService, UserRepository],
})
export class UserModule {}