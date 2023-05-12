import { Controller, Get, Post, Request, UseGuards, Param, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { OtpDto } from './dto/otp.dto';
import { TempJwtGuard } from './temp_jwt/tempJwt.guard';
import { UserService } from 'src/user/user.service';
import { JwtGuard } from './jwt.guard';
require('dotenv').config();

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private userService: UserService,
	) {}

	@Get('login/:code')
	async login(@Param('code') code: string, @Res() res: Response) {
		return await this.authService.login(code, res);
	}

	// test code
	@Post('login/test')
	async loginTest(@Body() body) {
		const username = body.username;

		if (0 < parseInt(username) && parseInt(username) < 10) {
			console.log(body.username)
			return ({
				accessToken: this.authService.publishToken(body.username, body.username),
			});
		} else {
			return ({
				accessToken: 'error',
			})
		}
	}

	@Get('exist/:name')
	async isExist(@Param('name') name: string, @Res() res: Response) {
		return res.json({ status: await this.userService.isExist(name) });
	}

	@UseGuards(JwtGuard)
	@Post('activate/2fa')
	async activate2FA(@Request() req: any, @Body() body: PhoneNumberDto, @Res() res: Response) {
		return await this.authService.activate2FA(req.user, body.phonenumber, res);
	}

	@UseGuards(JwtGuard)
	@Get('inactivate/2fa')
	async inactivate2FA(@Request() req: any, @Res() res: Response) {
		return await this.authService.inactivate2FA(req.user.username, res);
	}

	@UseGuards(TempJwtGuard)
	@Post('check/otp')
	async checkLoginOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		console.log(req.user);
		return await this.authService.checkOtp(req.user, body.otp, res);
	}
}
