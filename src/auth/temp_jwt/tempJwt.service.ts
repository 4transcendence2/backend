import { Injectable } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { User } from "src/user/entity/user.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt'
import { use } from "passport";

@Injectable()
export class TempJwtService {
	constructor(
		private jwtService: JwtService,
	) {}

	publish(intraId: string, username: string, phone: string, activate: boolean) {
		const payload = {
			intraId: intraId,
			username: username,
			phone: phone,
			activate: activate,
		}
		return this.jwtService.sign(payload);
	}
}