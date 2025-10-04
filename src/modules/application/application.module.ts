import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { TgModule } from '../tg/tg.module';
import { ApplicationRepository } from './application.repository';
import { ApplicationController } from './application.controller';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TgModule, MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]), UserModule],
    providers: [ApplicationService, ApplicationRepository],
    controllers: [ApplicationController],
    exports: [ApplicationService],
})
export class ApplicationModule {}