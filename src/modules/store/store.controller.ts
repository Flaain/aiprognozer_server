import { Controller, Get, Req } from '@nestjs/common';
import { Routes } from './constants';
import { StoreService } from './store.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequestWithInitDataAndUser } from 'src/shared/types';

@Controller(Routes.PREFIX)
export class StoreController {
    constructor(private readonly storeService: StoreService) {}

    @Get()
    @Auth(true)
    getStore(@Req() { user }: RequestWithInitDataAndUser) {
        return this.storeService.getStore(user);
    }
}