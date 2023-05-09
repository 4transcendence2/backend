import { Injectable, Req } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
require('dotenv').config();


@Injectable()
export class SignupJwtStrategy extends PassportStrategy(Strategy, 'signupJwt') {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.SIGNUP_SECRET,
		});
	}

	async validate(payload: {token: string, intraId: string}, ) {
		return ({
			token: payload.token,
			intraId: payload.intraId,
		});
	}
}