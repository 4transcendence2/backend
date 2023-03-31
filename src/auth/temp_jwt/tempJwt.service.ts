import { Injectable } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { User } from "src/user/entity/user.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt'

@Injectable()
export class TempJwtService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
	) {}

	async login(user: User) {
		const payload = { username: user.username, sub:user.unique_id }
		return {
			status: 'approved',
			access_token: this.jwtService.sign(payload),
		}
	}
}