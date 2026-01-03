import { BadRequestException, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Routes, validateReferralCursorQueryPipe, verifyOneWinIdParamPipe } from './constants';
import { UserService } from './user.service';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { Auth } from '../auth/decorators/auth.decorator';
import { Public } from 'src/shared/decorators/public.decorator';
import { PostbackType } from './types/types';

@Controller(Routes.PREFIX)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post(Routes.VERIFY)
    @Auth(false)
    verify(@Req() { user }: RequestWithInitDataAndUser, @Query('id', verifyOneWinIdParamPipe) onewin_id: number) {
        return this.userService.verify(user, onewin_id);
    }

    @Get(Routes.POSTBACK)
    @Public()
    postback(
        @Query('id', verifyOneWinIdParamPipe) onewin_id: number,
        @Query('country') country: string,
        @Query('type') type: PostbackType,
        @Query('name') name: string,
        @Query('hash') hash: string,
    ) {
        if (type !== 'PROMO' && type !== 'LINK') throw new BadRequestException('Invalid postback type');
        
        if (hash !== process.env.POSTBACK_HASH) throw new BadRequestException('Invalid postback hash');

        return this.userService.postback({ onewin_id, country, type, name });
    }

    @Get(Routes.REFERRALS)
    @Auth(true)
    referrals(@Req() { user }: RequestWithInitDataAndUser, @Query('cursor', validateReferralCursorQueryPipe) cursor?: string) {
        return this.userService.referrals(user._id, cursor);
    }

    @Get(Routes.INVITE)
    @Auth(true)
    invite(@Req() { user }: RequestWithInitDataAndUser) {
        return this.userService.generatePreparedMessage(user.telegram_id, user._id);
    }
}