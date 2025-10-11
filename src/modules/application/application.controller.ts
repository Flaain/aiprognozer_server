import { Body, Controller, Post, Req } from '@nestjs/common';
import { Routes } from './constants';
import { Auth } from '../auth/decorators/auth.decorator';
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
}