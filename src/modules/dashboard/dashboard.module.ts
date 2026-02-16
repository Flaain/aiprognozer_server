import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserModule } from '../user/user.module';

@Module({
    imports: [UserModule],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule {}