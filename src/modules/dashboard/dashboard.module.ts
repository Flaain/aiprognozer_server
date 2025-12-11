import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserModule } from '../user/user.module';
import { PROVIDERS } from 'src/shared/constants';
import { TgProvider } from '../tg/types';
import { createConversation } from '@grammyjs/conversations';

@Module({
    imports: [UserModule],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule implements OnModuleInit {
    constructor(
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly dashboardService: DashboardService,
    ) {}

    private onTgBotInit() {
        this.tgProvider.bot.use(createConversation(this.dashboardService.onDashboardLinkConversation.bind(this.dashboardService), 'dashboard/link'));
        
        this.tgProvider.bot.command('dashboard', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboard.bind(this.dashboardService));

        this.tgProvider.bot.callbackQuery('dashboard', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.buildWelcomeScreen.bind(this.dashboardService));
        this.tgProvider.bot.callbackQuery('dashboard/hide', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboardHide.bind(this.dashboardService));
        this.tgProvider.bot.callbackQuery('dashboard/link', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboardLink.bind(this.dashboardService));
    }

    onModuleInit() {
        this.tgProvider.subscribe(this.onTgBotInit.bind(this));
    }
}