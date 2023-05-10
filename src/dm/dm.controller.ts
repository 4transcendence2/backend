import { Controller, Get, Headers, Inject, Param, Res, Response, UseGuards, forwardRef } from '@nestjs/common';
import { JwtGuard } from 'src/auth/jwt.guard';
import { TempJwtGuard } from 'src/auth/temp_jwt/tempJwt.guard';
import { SendListGuard } from './dm.guard';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { DmService } from './dm.service';
require('dotenv').config();

@Controller('dm')
export class DmController {
	constructor(
		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => DmService))
		private dmService: DmService,
	) {}

	// @UserGuard(JwtGuard)
	@UseGuards(TempJwtGuard)
	@UseGuards(SendListGuard)
	@Get('list')
	async sendList(@Headers() header, @Response() res) {
		const name = await this.authService.decodeToken(header, process.env.SECRET);
		const user = await this.userService.findOne(name);
		return this.dmService.sendList(user, res);
	}
}
