import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConstants } from "../auth/constants";

@Injectable()
export class SignupStrategy extends PassportStrategy(Strategy, 'signup') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtConstants.signupSecret,
		});
	}

	async validate(payload: any) {
		return { unique_id: payload.sub, nickname: payload.username }
	}
}
