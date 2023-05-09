import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { WsService } from "src/ws/ws.service";

@Injectable()
export class LoginGuard implements CanActivate {
	
	constructor(
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();

		// const token = await this.userService.getAccessToken(req.params.code);
		// if (token === 'error') {
		// 	throw new HttpException({ status: 'error', detail: 'Invalid Code'}, 401);
		// }

		// const intraId = await this.userService.getIntraId(token);
		// if (intraId === 'error') {
		// 	throw new HttpException({ status: 'error', detail: '42 API server is sick. Try later'}, 500);
		// }

		// const user = await this.userService.findOneByIntra(intraId);
		// if (await this.wsService.isLogin(undefined, user.name)) {
		// 	throw new HttpException({ status: 'error', detail: 'Duplication Login' }, 409);
		// }

		return true;
	}
}