import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
require('dotenv').config();


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
		return ({
			intraId: payload.id,
			username: payload.name,
			phone: payload.phone,
			activate: payload.activate,
		});
	}
}