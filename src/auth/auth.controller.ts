import { Controller, Get, Post, Request, UseGuards, Body, Res, Headers} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express'
import { OtpDto } from './dto/otp.dto';
import { JwtService } from '@nestjs/jwt';
import { TempJwtGuard } from './temp_jwt/tempJwt.guard';
import { TempJwtService } from './temp_jwt/tempJwt.service';
import * as jwt from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';

@Controller('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private tempJwtService: TempJwtService,
		private jwtService: JwtService,
		
		@InjectRepository(User)
		private usersRepository: Repository<User>,
	) {}


	//아이디 비번 확인 후, TempJwt 토큰을 발행
	@UseGuards(AuthGuard('local'))
	@Post('login')
	async login(@Request() req) {
		return await this.tempJwtService.login(req.user);
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
		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.TMP_SECRET);
		const username = decodedToken['username'];
		const user = await this.usersRepository.findOneBy({ username });
		await this.authService.sendOtp(user.phone_number);
	}


	// 최종적으로 나머지 모든 곳에서 사용할 jwt 토큰 발행
	@UseGuards(TempJwtGuard)
	@Post('check/otp/login')
	async checkLoginOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp, body.phonenumber);
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


	// 최종적으로 데이터베이스에 유저정보를 저장할 수 있게 하는 otp(TempJwt) 발급
	@Post('check/otp/signup')
	async checkSignupOtp(@Request() req, @Body() body: OtpDto, @Res() res: Response) {
		try {
			const result = await this.authService.checkOtp(body.otp, body.phonenumber);
			if (result.status === 'approved') {
				return res.json({
					status: "approved",
					access_token: await this.tempJwtService.login(req.user),
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
