import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';
import { OneWinReferalls, OneWinReferallsSchema } from './schemas/onewin.referall.schema';
import { ReferallsModule } from '../referalls/referalls.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: OneWinReferalls.name, schema: OneWinReferallsSchema },
        ]),
        ReferallsModule
    ],
    providers: [UserService, UserRepository],
    controllers: [UserController],
    exports: [UserService, UserRepository],
})
export class UserModule {}