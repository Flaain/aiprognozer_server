import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserModule } from '../user/user.module';
import { Bot } from 'grammy';
import { PROVIDERS } from 'src/shared/constants';
import { createConversation } from '@grammyjs/conversations';

@Module({
    imports: [UserModule],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule implements OnModuleInit {
    constructor(
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot,
        private readonly dashboardService: DashboardService,
    ) {}

    onModuleInit() {
        this.tgBot.command('dashboard', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboard.bind(this.dashboardService));
        
        this.tgBot.callbackQuery('dashboard', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.buildWelcomeScreen.bind(this.dashboardService));
        this.tgBot.callbackQuery('dashboard/hide', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboardHide.bind(this.dashboardService));
        
        this.tgBot.use(createConversation(this.dashboardService.onDashboardLinkConversation.bind(this.dashboardService), 'dashboard/link'));
        
        this.tgBot.callbackQuery('dashboard/link', this.dashboardService.hasAccess.bind(this.dashboardService), this.dashboardService.onDashboardLink.bind(this.dashboardService));
    }
}