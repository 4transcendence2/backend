import { ArgumentsHost, CanActivate, ExecutionContext, HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { UserService } from "src/user/user.service";
import { WsService } from "src/ws/ws.service";
import { ChatService } from "./chat.service";
require('dotenv').config();



@Injectable()
export class SendHistoryGuard implements CanActivate {

	constructor(
		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => ChatService))
		private chatService: ChatService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		const name = await this.authService.decodeToken(req.headers, process.env.TMP_SECRET);

		if (!await this.wsService.isLogin(undefined, name)) {
			throw new HttpException({ status: 'error', detail: 'Not logged in user.'}, 400);
		}

		const roomId = parseInt(req.params.roomId);
		if (isNaN(roomId)) {
			throw new HttpException({ status: 'error', detail: 'parameter should be a number type.'}, 400);
		}

		if (!await this.chatService.isExist(roomId)) {
			throw new HttpException({ status: 'error', detail: 'Invalid roomId.'}, 400);
		}

		return true;
	}
}
