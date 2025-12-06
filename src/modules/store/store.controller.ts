import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Routes } from './constants';
import { StoreService } from './store.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { paramPipe } from 'src/shared/constants';

@Controller(Routes.PREFIX)
@Auth(true)
export class StoreController {
    constructor(private readonly storeService: StoreService) {}

    @Get()
    getStore(@Req() { user }: RequestWithInitDataAndUser) {
        return this.storeService.getStore(user);
    }

    @Post(Routes.GET_INVOICE)
    getInvoice(@Req() { user }: RequestWithInitDataAndUser, @Param('productId', paramPipe) productId: string) {
        return this.storeService.getInvoiceOrPreCheckout(user, productId);
    }
}