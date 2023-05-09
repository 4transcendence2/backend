import { Controller, Get, Post, Request, UseGuards, Param, Body, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { OtpDto } from './dto/otp.dto';
import { TempJwtGuard } from './temp_jwt/tempJwt.guard';
import { UserService } from 'src/user/user.service';
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

	@Get('exist/:name')
	async isExist(@Param('name') name: string, @Res() res: Response) {
		return res.json({
			status: await this.userService.isExist(name),
		});
	}

	@UseGuards(AuthGuard('jwt'))
	@Post('activate/2fa')
	async activate2FA(@Request() req: any, @Body() body: PhoneNumberDto, @Res() res: Response) {
		return await this.authService.activate2FA(req.user, body.phonenumber, res);
	}

	@UseGuards(AuthGuard('jwt'))
	@Post('inactivate/2fa')
	async inactivate2FA(@Request() req: any, @Res() res: Response) {
		return await this.authService.inactivate2FA(req.user.name, res);
	}

	@UseGuards(TempJwtGuard)
	@Post('check/otp')
	async checkLoginOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		return await this.authService.checkOtp(req.user, body.otp, res);
	}
}
