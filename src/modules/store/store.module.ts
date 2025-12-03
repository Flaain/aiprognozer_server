import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { PROVIDERS } from 'src/shared/constants';
import { TgProvider } from '../tg/types';
import { GatewayModule } from '../gateway/gateway.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [ProductModule, PaymentModule, GatewayModule, UserModule],
    providers: [StoreService],
    controllers: [StoreController],
})
export class StoreModule implements OnModuleInit {
    constructor(
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly storeService: StoreService,
    ) {}

    private onTgBotInit() {
        this.tgProvider.bot.on('pre_checkout_query', this.storeService.handlePreCheckoutQuery.bind(this.storeService));

        this.tgProvider.bot.on(
            'message:successful_payment',
            this.storeService.handleSuccessfulPayment.bind(this.storeService),
        );
    }

    onModuleInit() {
        this.tgProvider.subscribe(this.onTgBotInit.bind(this));
    }
}
