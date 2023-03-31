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

	async validateUser(id: string, password: string): Promise<User> {
		const user = await this.userService.findOne(id);
		if (user && await bcrypt.compare(password, user.password)) {
			return user;
		}
		return null;
	}

	async login(user: User) {
		const payload = { username: user.username, sub:user.unique_id }
		return {
			status: 'approved',
			access_token: this.jwtService.sign(payload),
		}
	}
}