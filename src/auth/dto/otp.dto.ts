import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class OtpDto {
	@IsString()
	@IsNotEmpty()
	readonly otp: string;
}