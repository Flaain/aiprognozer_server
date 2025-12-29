import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Referalls, ReferallsSchema } from './schemas/referalls.schema';
import { ReferallsRepository } from './referalls.repository';
import { ReferallsService } from './referalls.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Referalls.name, schema: ReferallsSchema }])],
    providers: [ReferallsService, ReferallsRepository],
    exports: [ReferallsService],
})
export class ReferallsModule {}