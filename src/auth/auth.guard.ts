import { CanActivate, ExecutionContext, HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { WsService } from "src/ws/ws.service";

@Injectable()
export class DupLoginGuard implements CanActivate {
	
	constructor(
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		
		if (await this.wsService.isLogin(undefined, req.body.username)) {
			throw new HttpException({ status: 'error', detail: 'Duplication Login' }, 409);
		}
		return true;
	}
}