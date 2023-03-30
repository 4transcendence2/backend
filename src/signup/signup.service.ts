import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SignupService {
	constructor(
		private jwtService: JwtService,
	) {}

	async signup(user) {
		const payload = { username: user.username, sub: user.uniqueId };
		const token = this.jwtService.sign(payload);
		return token;
	}
}
