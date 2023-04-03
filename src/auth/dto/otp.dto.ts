import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class OtpDto {
	@IsString()
	@IsNotEmpty()
	readonly otp: string;

	@IsString()
	@IsNotEmpty()
	readonly phonenumber: string;
}

export class LoginOtpDto {
	@IsString()
	@IsNotEmpty()
	readonly otp: string;
}