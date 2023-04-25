import { CanActivate, ExecutionContext, Inject, Injectable, forwardRef } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "src/auth/auth.service";

@Injectable()
export class TokenGuard implements CanActivate {
	constructor(
		@Inject(forwardRef(()  => AuthService))
		private authService:AuthService,
	) {}
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const req = context.switchToHttp().getRequest();
		this.authService.decodeToken(req.handshake.headers, process.env.TMP_SECRET)
		.then(name => {
			return true;
		})
		.catch(err => {
			return false;
		})
		return true;
	}
}