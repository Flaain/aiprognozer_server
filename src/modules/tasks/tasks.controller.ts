import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { queryVerifyTypePipe, Routes } from './constants';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { TasksService } from './tasks.service';
import { paramPipe } from 'src/shared/constants';
import { TaskType } from './types';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller(Routes.PREFIX)
@Auth(true)
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get()
    getTasks(@Req() { user }: RequestWithInitDataAndUser) {
        return this.tasksService.getTasks(user);
    }

    @Post(Routes.VERIFY)
    verifyTask(
        @Req() { user }: RequestWithInitDataAndUser,
        @Param('id', paramPipe) taskId: string,
        @Query('type', queryVerifyTypePipe) type: TaskType,
    ) {
        return this.tasksService.verifyTask(user, taskId, type);
    }
}