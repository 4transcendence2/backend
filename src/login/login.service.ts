import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "src/user/entity/user.entity";

@Injectable()
export class LoginService {
	constructor(
		private jwtService: JwtService
	) {}

	async login(user: User) {
		const payload = { username: user.nickname, sub: user.unique_id }
		const token = this.jwtService.sign(payload);
		return token;
	}
}