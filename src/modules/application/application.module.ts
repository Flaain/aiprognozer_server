import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { ApplicationRepository } from './application.repository';
import { ApplicationController } from './application.controller';
import { UserModule } from '../user/user.module';

@Module({
    imports: [MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]), UserModule],
    providers: [ApplicationService, ApplicationRepository],
    controllers: [ApplicationController],
    exports: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}