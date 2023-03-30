import { Controller, Get, Post, Request, UseGuards, Body, Res} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { SignupService } from 'src/signup/signup.service';
import { OtpDto } from './dto/otp.dto';
import { LoginAuthGuard } from '../login/login.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		// private signupService: SignupService,
		private jwtService: JwtService,
	) {}


	//아이디 비번 확인 후, 로그인 과정에 사용할 Login 토큰을 발행
	@UseGuards(AuthGuard('local'))
	@Post('login')
	async login(@Request() req) {
		return this.authService.login(req.user);
	}

	// Login 토큰을 확인하고, 유효하면 otp를 보냄
	@UseGuards(LoginAuthGuard)
	@Post('otp/get/login')
	async sendLoginOtp(@Body() body: PhoneNumberDto) {
		await this.authService.sendOtp(body.phonenumber);
	}

	@Post('otp/get/signup')
	async sendSignupOtp(@Body() body: PhoneNumberDto) {
		await this.authService.sendOtp(body.phonenumber);
	}

	// 최종적으로 나머지 모든 곳에서 사용할 jwt 토큰 발행
	@UseGuards(LoginAuthGuard)
	@Post('otp/check/login')
	async checkLoginOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp);
			if (result.status === 'approved') {
				return res.json({
					status: "approved",
					access_token: this.jwtService.sign(req.user),
				});
			}

			if (result.status === 'pending') {
				return res.json({
					status: "pending",
					detail: "Invalid Token",
				});
			}
		} catch (error) {
			res.status(404);
			return res.json({
				status: "error",
				detail: 'Invaild Verification Check Request'
			})
		}
	}


	@Post('otp/check/signup')
	async checkSignupOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp);
			if (result.status === 'approved') {
				return res.json({
					status: "approved",
					// access_token: await this.signupService.signup(req.user),
				});
			}

			if (result.status === 'pending') {
				return res.json({
					status: "pending",
					detail: "Invalid Token",
				});
			}
		} catch (error) {
			res.status(404);
			return res.json({
				status: "error",
				detail: 'Invaild Verification Check Request'
			})
		}
	}

}
