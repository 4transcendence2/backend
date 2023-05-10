import { Injectable, Headers, forwardRef, Inject, UnauthorizedException, HttpException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { SignupJwtService } from './signup_jwt/signupJwt.service';
import { WsService } from 'src/ws/ws.service';
import { JwtService } from '@nestjs/jwt';
import { TempJwtService } from './temp_jwt/tempJwt.service';
require('dotenv').config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

@Injectable()
export class AuthService {
	constructor(

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		private signupJwtService: SignupJwtService,
		private tempJwtService: TempJwtService,
		private jwtService: JwtService,
	) {}

	async login(code: string, res: Response) {
		const token = await this.getAccessToken(code);
		if (token === 'error') {
			res.status(401);
			return res.json({
				status: 'error',
				detail: 'Invalid Code',
			});
		}

		const intraId = await this.getIntraId(token);
		if (intraId === 'error') {
			res.status(500);
			return res.json({
				status: 'error',
				detail: '42 API server is sick. Try later',
			});
		}

		const user = await this.userService.findOneByIntra(intraId);


		// 해당 intraId로 가입된 유저가 아닌경우
		if (user === null) {
			return res.json({
				status: 'approved',
				detail: 'signup',
				accessToken: await this.signupJwtService.publish(token, intraId),
			})
		}


		// 이미 로그인 중인 유저인 경우
		if (await this.wsService.isLogin(undefined, user.name)) {
			res.status(409);
			return res.json({
				status: 'error',
				detail: 'Duplication Login',
			});
		}


		// 2FA 미사용 유저인 경우
		if (user.tfa === false) {
			return res.json({
				status: 'approved',
				username: user.name,
				accessToken: this.publishToken(intraId, user.name),
			})
		}



		// 2FA 사용 유저인 경우
		if (user.tfa === true) {
			try {
				await this.sendOtp(user.phone);
				return res.json({
					status: 'published',
					detail: '2fa',
					username: user.name,
					accessToken: this.tempJwtService.publish(intraId, user.name, user.phone, false),
				})
			} catch(err) {
				res.status(500);
				return res.json({
					status: 'error',
					detail: 'OTP API server is sick. Try later.',
				})
			}
		}
	}

	async getAccessToken(code: string): Promise<string> {
		const url = `https://api.intra.42.fr/oauth/token?grant_type=authorization_code&client_id=${process.env.FT_OAUTH_UID}&client_secret=${process.env.FT_OAUTH_SECRET}&code=${code}&redirect_uri=http://localhost:5173/signin`;

		const res = await fetch(url, {
			method: 'post',
		}).then(res => res.json()).catch(err => {
			console.log('42OAuth access token fetch error.');
		});

		return (res.error || res.access_token === undefined) ? 'error' : res.access_token;
	}

	async getIntraId(token: string): Promise<string> {
		const me = await fetch('https://api.intra.42.fr/v2/me', {
			method: 'get',
			headers: {
				"Authorization": "Bearer " + token,
			}
		})
		.then(res => res.json())
		.catch(err => {
			console.log('42 Get IntraId fetch error.');
		});

		return me.login === undefined ? 'error' : me.login;
	}

	// async validateUser(id: string, password: string): Promise<User> {
	// 	const user = await this.userService.findOne(id);
	// 	// if (user && await bcrypt.compare(password, user.password)) {
	// 	// 	return user;
	// 	// }
	// 	return null;
	// }

	async activate2FA(payload: {intraId: string, username: string }, phone: string, res: Response) {
		try {
			await this.sendOtp(phone);
			return res.json({
				status: 'published',
				detail: '2fa',
				accessToken: this.tempJwtService.publish(payload.intraId, payload.username, phone, true),
			})
		} catch(err) {
			res.status(500);
			return res.json({
				status: 'error',
				detail: 'OTP API server is sick. Try later.',
				content: err,
			})
		}
	}

	async inactivate2FA(username: string, res: Response) {
		try {
			await this.userService.inactivate2FA(username);
			return res.json({
				status: 'approved',
			})
		} catch (err) {
			res.status(500);
			return res.json({
				status: 'error',
				detail: 'API Server\'s Database is sick. Typ later',
			})
		}
	}

	async sendOtp(phoneNumber: string) {
			const formatNumber = '+82' + phoneNumber.substring(1);
			client.verify.v2.services(process.env.TWILIO_SERVICE_SID)
			.catch(err => {
				throw new Error(err)
			})
			.verifications
			.create({ to: formatNumber, channel: 'sms' })
			.catch (err => {
				throw new Error(err);
			})
	}

	async checkOtp(payload: any, otp: string, res: Response) {
		const formatNumber = '+82' + payload.phone.substring(1);
		try {
			const result = await client.verify.v2.services(process.env.TWILIO_SERVICE_SID)
				.verificationChecks
				.create({to: formatNumber, code: otp });

			if (result.status === 'approved') {
				if (payload.activate) await this.userService.activate2FA(payload.username, payload.phone);

				return res.json({
					status: "approved",
					accessToken: payload.activate ? null : this.publishToken(payload.intraId, payload.username),
				});
			}
	
			if (result.status === 'pending') {
				res.status(401);
				return res.json({
					status: "pending",
					detail: "Invalid Otp",
				});
			}
		} catch (error) {
			res.status(404);
			return res.json({
				status: 'error',
				detail: 'Invalid Check Request'
			})
		}
	}

	async decodeToken(@Headers() header, secret: string): Promise<string> {
		try {
			const token = await this.extractToken(header);
			const decodedToken = jwt.verify(token, secret);
			return decodedToken['username'];
		} catch (err) {
			throw new UnauthorizedException();
		}
	}

	async extractToken(@Headers() header): Promise<string> {
		return header['authorization'].split(" ")[1];
	}

	publishToken(intraId: string, username: string ): string {
		const payload = { intraId: intraId, username: username }
		return this.jwtService.sign(payload);
	}
}
