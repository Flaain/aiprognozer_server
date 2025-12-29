import { Controller, Post, Query, Req } from '@nestjs/common';
import { refQueryPipe, Routes } from './constants/constants';
import { RequestWithInitData } from 'src/shared/types';
import { AuthService } from './auth.service';

@Controller(Routes.PREFIX)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post(Routes.LOGIN)
    login(@Req() req: RequestWithInitData, @Query('ref', refQueryPipe) ref?: string) {
        return this.authService.login(req.init_data, ref);
    }
}