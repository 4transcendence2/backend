import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";


@Injectable()
export class TempJwtStrategy extends PassportStrategy(Strategy, 'tmpJwt') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.TMP_SECRET,
		});
	}

	async validate(payload: any) {
		return {
			unique_id: payload.sub,
			username: payload.username,
		}
	}
}