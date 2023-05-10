import { CanActivate, ExecutionContext, Inject, Injectable, forwardRef } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "src/auth/auth.service";

@Injectable()
export class TokenGuard implements CanActivate {
	constructor(
		@Inject(forwardRef(()  => AuthService))
		private authService:AuthService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean>{
		const req = context.switchToHttp().getRequest();
		return await this.authService.decodeToken(req.handshake.headers, process.env.SECRET)
		.then(name => {
			return true;
		})
		.catch(err => {
			return false;
		})
	}
}