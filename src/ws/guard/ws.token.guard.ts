import { CanActivate, ExecutionContext, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";

@Injectable()
export class TokenGuard implements CanActivate {
	constructor(
		@Inject(forwardRef(()  => AuthService))
		private authService:AuthService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean>{
		const req = context.switchToHttp().getRequest();
		await this.authService.decodeToken(req.handshake.headers, process.env.SECRET);
		return true;

		// return await this.authService.decodeToken(req.handshake.headers, process.env.SECRET)
		// .then(name => {
		// 	return true;
		// })
		// .catch(err => {
		// 	return false;
		// })
	}
}