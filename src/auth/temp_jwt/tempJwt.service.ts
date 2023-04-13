import { Injectable } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { User } from "src/user/entity/user.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt'

@Injectable()
export class TempJwtService {
	constructor(
		private jwtService: JwtService,
	) {}

	async login(user: User) {
		const payload = { name: user.name, id: user.id, phone: user.phone };
		return {
			status: 'approved',
			accessToken: this.jwtService.sign(payload),
		}
	}
}