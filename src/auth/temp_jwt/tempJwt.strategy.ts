import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConstants } from "../constants";

@Injectable()
export class TempJwtStrategy extends PassportStrategy(Strategy, 'tmpJwt') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtConstants.tempSecret,
		});
	}

	async validate(payload: any) {
		return {
			unique_id: payload.sub,
			username: payload.username,
		}
	}
}