import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "src/user/user.service";


@Injectable()
export class SignupJwtService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
	) {}

	async login(otp: string, phonenumber: string) {
		const payload = { username: otp, sub: phonenumber }
		return this.jwtService.sign(payload);
	}
}