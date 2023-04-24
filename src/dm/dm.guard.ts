import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { UserService } from "src/user/user.service";
import { WsService } from "src/ws/ws.service";
import { DmService } from "./dm.service";
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

		@Inject(forwardRef(() => DmService))
		private dmService: DmService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		const name = await this.authService.decodeToken(req.headers, process.env.TMP_SECRET);

		if (!await this.wsService.isLogin(undefined, name)) {
			throw new HttpException({ status: 'error', detail: 'Not logged in user.'}, 400);
		}

		const username = req.params.username;

		if (!await this.userService.isExist(username)) {
			throw new HttpException({ status: 'error', detail: 'Invalid username.'}, 400);			
		}
		
		const user1 = await this.userService.findOne(name);
		const user2 = await this.userService.findOne(username);
		if (!await this.dmService.isExist(user1, user2)) {
			throw new HttpException({ status: 'error', detail: 'History not exist.'}, 404);
		}

		return true;
	}
}
