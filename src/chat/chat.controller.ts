import { Controller, Get, Param, UseGuards, Headers, forwardRef, Inject } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { TempJwtGuard } from 'src/auth/temp_jwt/tempJwt.guard';
import { UserService } from 'src/user/user.service';
import { ChatService } from './chat.service';
import { SendHistoryGuard } from './chat.guard';
require('dotenv').config();


@Controller('chat')
export class ChatController {

	constructor(
		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => ChatService))
		private chatService: ChatService,
	) {}

	// @UseGuards(AuthGuard('jwt'))
	@UseGuards(TempJwtGuard)
	@UseGuards(SendHistoryGuard)
	@Get('history/:roomId')
	async sendHistory(@Param('roomId') id: number, @Headers() header: any) {
		// const name = await this.authService.decodeToken(header, process.env.TMP_SECRET);
		// const user = await this.userService.findOne(name);
		// this.chatService.sendHistory(id, user);
	}
}
