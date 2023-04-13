require('dotenv').config();
import { Injectable, Headers, forwardRef, Inject, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entity/user.entity';
import * as jwt from 'jsonwebtoken';
const bcrypt = require('bcrypt');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

@Injectable()
export class AuthService {
	constructor(

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

	) {}

	async validateUser(id: string, password: string): Promise<User> {
		const user = await this.userService.findOne(id);
		if (user && await bcrypt.compare(password, user.password)) {
			return user;
		}
		return null;
	}

	
	async sendOtp(phoneNumber: string) {
		const formatNumber = '+82' + phoneNumber.substring(1);
		client.verify.v2.services(process.env.TWILIO_SERVICE_SID)
    .verifications
    .create({ to: formatNumber, channel: 'sms' })
		.catch(error => {
			console.log(error);
		});
	}

	async checkOtp(otp: string, phoneNumber: string) {
		const formatNumber = '+82' + phoneNumber.substring(1);
		try {
			const result = await client.verify.v2.services(process.env.TWILIO_SERVICE_SID)
				.verificationChecks
				.create({to: formatNumber, code: otp });
			return result;
		} catch (error) {
			throw new Error('Verification failed');
		}
	}


	async decodeToken(@Headers() header, secret: string): Promise<string> {
		try {
			const token = await this.extractToken(header);
			const decodedToken = jwt.verify(token, secret);
			return decodedToken['name'];
		} catch (err) {
			throw new UnauthorizedException();
		}
	}

	async extractToken(@Headers() header): Promise<string> {
		return header['authorization'].split(" ")[1];
	}
}
