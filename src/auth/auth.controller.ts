import { Controller, Get, Post, Request, UseGuards, Param, Body, Res, Headers} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { OtpDto, LoginOtpDto } from './dto/otp.dto';
import { JwtService } from '@nestjs/jwt';
import { TempJwtGuard } from './temp_jwt/tempJwt.guard';
import { TempJwtService } from './temp_jwt/tempJwt.service';
import * as jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { SignupJwtService } from './signup_jwt/signupJwt.service';
import { UserService } from 'src/user/user.service';
require('dotenv').config();

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private tempJwtService: TempJwtService,
		private jwtService: JwtService,
		private signupJwtService: SignupJwtService,

		private userService: UserService,
		
		@InjectRepository(User)
		private usersRepository: Repository<User>,
	) {}


	//아이디 비번 확인 후, TempJwt 토큰을 발행
	@UseGuards(AuthGuard('local'))
	@Post('login')
	async login(@Request() req) {
		return await this.tempJwtService.login(req.user);
	}


	// @Get('exist/:username')
	async isExist(@Param('username') username: string, @Res() res: Response) {
		const result =  await this.userService.isExist(username);

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
	// @Post('get/otp/signup')
	async sendLoginOtp(@Body() body: PhoneNumberDto) {
		await this.authService.sendOtp(body.phonenumber);
	}


	//로그인 할 때, 핸드폰 otp 요청
	@UseGuards(TempJwtGuard)
	@Get('get/otp/login')
	async sendSignupOtp(@Headers() header: any) {
		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.TMP_SECRET);
		const username = decodedToken['username'];
		const user = await this.usersRepository.findOneBy({ username });
		await this.authService.sendOtp(user.phone_number);
	}


	// 최종적으로 나머지 모든 곳에서 사용할 jwt 토큰 발행
	@UseGuards(TempJwtGuard)
	@Post('check/otp/login')
	async checkLoginOtp(@Headers() header:any, @Request() req, @Body() body: LoginOtpDto, @Res() res: Response) {
		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.TMP_SECRET);
		const username = decodedToken['username'];
		const user = await this.usersRepository.findOneBy({ username });

		try {
			const result = await this.authService.checkOtp(body.otp, user.phone_number);
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
					detail: "Invalid Token",
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
		console.log(body);
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
