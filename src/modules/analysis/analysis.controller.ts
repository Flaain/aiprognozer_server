import { Controller, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { filePipe, Routes, sportTypePipe } from './constants';
import { Auth } from '../auth/decorators/auth.decorator';
import { AnalysisService } from './analysis.service';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { SportType } from './types';
import { Limit } from '../auth/decorators/auth.limit.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller(Routes.PREFIX)
export class AnalysisController {
    constructor(private readonly analysisService: AnalysisService) {}

    @Post()
    @Auth(true)
    @Limit()
    @UseInterceptors(FileInterceptor('image'))
    async analysis(
        @Req() { user }: RequestWithInitDataAndUser,
        @UploadedFile(filePipe) file: Express.Multer.File,
        @Query('type', sportTypePipe) type: SportType,
    ) {
        return this.analysisService.analysis(user, type, file);
    }
}