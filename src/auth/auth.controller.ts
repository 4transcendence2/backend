import { Controller, Get, Post, Request, UseGuards, Param, Body, Res, Headers, NotFoundException, UnauthorizedException} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { OtpDto, LoginOtpDto } from './dto/otp.dto';
import { JwtService } from '@nestjs/jwt';
import { TempJwtGuard } from './temp_jwt/tempJwt.guard';
import { TempJwtService } from './temp_jwt/tempJwt.service';
import { SignupJwtService } from './signup_jwt/signupJwt.service';
import { UserService } from 'src/user/user.service';
import { DupLoginGuard } from './auth.guard';
require('dotenv').config();

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private tempJwtService: TempJwtService,
		private jwtService: JwtService,
		private signupJwtService: SignupJwtService,
		private userService: UserService,
		
	) {}


	// 42 OAuth통해, 아이디가 존재하는지 없는지 확인.
	@Get('oauth/:code')
	async oauth(@Param('code') code, @Res() resp: Response) {
		const url = `https://api.intra.42.fr/oauth/token?grant_type=authorization_code&client_id=${process.env.FT_OAUTH_UID}&client_secret=${process.env.FT_OAUTH_SECRET}&code=${code}&redirect_uri=http://localhost:5173`;

		const res = await fetch(url, {
			method: 'post',
		}).then(res => res.json()).catch(err => {
			return resp.json({
				error: err,
			})
		});

		if (res.error) {
			resp.status(400);
			return resp.json({
				error: 'Invalid Code',
			});
		}

		const token = res.access_token;
		if (token === undefined) {
			resp.status(401);
			return resp.json({
				error: 'Invaild Code',
			})
		}

		const me = await fetch('https://api.intra.42.fr/v2/me', {
			method: 'get',
			headers: {
				"Authorization": "Bearer " + token,
			}
		}).then(res => res.json()).catch(err => {
			resp.status(500);
			return resp.json({
				error: 'API Server Error, Try Again.'
			});
		});

		const user = await this.userService.findOneByIntra(me.login);
		if (user === null) {
			return resp.json({
				status: false,
				intraId: user,
			})
		}

		return resp.json({
			status: true,
		});
	}

	//아이디 비번 확인 후, TempJwt 토큰을 발행
	@UseGuards(AuthGuard('local'))
	@UseGuards(DupLoginGuard)
	@Post('login')
	async login(@Request() req) {
		return await this.tempJwtService.login(req.user);
	}


	@Get('exist/:name')
	async isExist(@Param('name') name: string, @Res() res: Response) {
		const result =  await this.userService.isExist(name);

		if (result) {
			return res.json({
				status: true
			})
		}

		return res.json({
			status: false
		})
	}

	//회원가입 할 때, 핸드폰 otp 요청
	@Post('get/otp/signup')
	async sendLoginOtp(@Body() body: PhoneNumberDto) {
		await this.authService.sendOtp(body.phonenumber);
	}


	//로그인 할 때, 핸드폰 otp 요청
	@UseGuards(TempJwtGuard)
	@Get('get/otp/login')
	async sendSignupOtp(@Headers() header: any) {
		const name = await this.authService.decodeToken(header, process.env.TMP_SECRET);
		const user = await this.userService.findOne(name);
		await this.authService.sendOtp(user.phone);
	}


	// 최종적으로 나머지 모든 곳에서 사용할 jwt 토큰 발행
	@UseGuards(TempJwtGuard)
	@Post('check/otp/login')
	async checkLoginOtp(@Headers() header:any, @Request() req, @Body() body: LoginOtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp, req.user.phone);
			if (result.status === 'approved') {
				res.status(200);
				return res.json({
					status: "approved",
					accessToken: this.jwtService.sign(req.user),
				});
			}

			if (result.status === 'pending') {
				return res.json({
					status: "pending",
					detail: "Invalid Otp",
				});
			}
		} catch (error) {
			res.status(404);
			return res.json({
				status: "error",
				detail: 'Invalid Check Request'
			})
		}
	}


	// 최종적으로 데이터베이스에 유저정보를 저장할 수 있게 하는 otp(SignupJwt) 발급
	@Post('check/otp/signup')
	async checkSignupOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp, body.phonenumber);
			if (result.status === 'approved') {
				res.status(200);
				return res.json({
					status: "approved",
					accessToken: await this.signupJwtService.login(body.otp, body.phonenumber),
				});
			}

			if (result.status === 'pending') {
				res.status(401);
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
