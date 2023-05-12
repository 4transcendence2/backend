import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { WsService } from "src/ws/ws.service";
require('dotenv').config();

@Injectable()
export class SendListGuard implements CanActivate {

	constructor(

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		const name = await this.authService.decodeToken(req.headers, process.env.SECRET);

		if (!await this.wsService.isLogin(undefined, name)) {
			throw new HttpException({ status: 'error', detail: 'Not logged in user.'}, 400);
		}

		return true;
	}
}