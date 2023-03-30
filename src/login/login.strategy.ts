import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConstants } from "../auth/constants";

@Injectable()
export class Login2Strategy extends PassportStrategy(Strategy, 'login2') {
	constructor() {
		super({
			JwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpriation: false,
			secretOrKey: jwtConstants.loginSecret,
		});
	}

	async validate(payload: any) {
		return { unique_id: payload.sub, nickname: payload.username }
	}
}