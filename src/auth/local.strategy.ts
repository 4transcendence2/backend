import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local";
import { AuthService } from "./auth.service";
import { User } from "src/user/entity/user.entity";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
	constructor(private authService: AuthService) {
		super();
	}

	async validate(id: string, password: string): Promise<User> {
		// const user = await this.authService.validateUser(id, password);
		// if (!user) {
		// 	throw new UnauthorizedException();
		// }
		return null;
	}
}