import { Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entity/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginService } from '../login/login.service';
const client = require('twilio')('AC9409078cc01ffa3c66be5844f8bd145a', '53e28dea1e42e5fd0e5a143fbc8352f7');

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private loginService: LoginService,

	) {}

	async validateUser(id: string, password: string): Promise<User> {
		const user = await this.userService.findOne(id);
		if (user && await bcrypt.compare(password, user.password)) {
			return user;
		}
		return null;
	}

	async login(user: User) {
		// const payload = { username: user.username, sub: user.unique_id };
		return {
			status: 'approved',
			access_token: await this.loginService.login(user),
		};
	}

	async sendOtp(phoneNumber: string) {
		client.verify.v2.services('VA81bb240d9cd5af57e1d1f89659a220c0')
    .verifications
    .create({to: '+82' + phoneNumber.substring(1), channel: 'sms'})
		.catch(error => console.log(error));
	}

	async checkOtp(otp: string) {
		try {
			const result = await client.verify.v2.services('VA81bb240d9cd5af57e1d1f89659a220c0')
				.verificationChecks
				.create({to: '+821021145537', code: otp });
			return result;
		} catch (error) {
			throw new Error('Verification failed');
		}
	}

}
