import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class SignupJwtService {
	constructor(
		private jwtService: JwtService,
	) {}

	async publish(token: string, intraId: string) {
		const payload = { token: token, intraId: intraId}
		return this.jwtService.sign(payload);
	}
}