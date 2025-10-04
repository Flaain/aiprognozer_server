import { Body, Controller, Delete, Param, Patch, Post, Req } from '@nestjs/common';
import { Routes } from './constants';
import { Auth } from '../auth/decorators/auth.decorator';
import { paramPipe } from 'src/shared/constants';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { SendApplicationDTO } from './types';
import { validateSendAppliactionDTO } from './utils/validateSendApplicationDTO';
import { ApplicationService } from './application.service';

@Controller(Routes.PREFIX)
export class ApplicationController {
    constructor(private readonly applicationService: ApplicationService) {}
    @Post(Routes.SEND)
    @Auth(false)
    async sendApplication(@Req() req: RequestWithInitDataAndUser, @Body() dto: SendApplicationDTO) {
        return this.applicationService.sendApplication(validateSendAppliactionDTO(dto), req.user, req.init_data.user);
    }

    @Patch(Routes.APPROVE)
    @Auth(true, 'ADMIN')
    async approveApplication(@Param('id', paramPipe) applicationId: string) {
        return 1;
    }

    @Delete(Routes.REJECT)
    @Auth(true, 'ADMIN')
    async rejectApplication(@Param('id', paramPipe) applicationId: string) {
        return this.applicationService.rejectApplication(applicationId);
    }
}