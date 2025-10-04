import { Module } from '@nestjs/common';
import { TgService } from './tg.service';

@Module({
    imports: [],
    providers: [TgService],
    exports: [TgService],
})
export class TgModule {}