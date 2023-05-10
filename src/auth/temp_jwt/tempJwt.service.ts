import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

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