import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class PhoneNumberDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/[0-9]\d{1,14}$/)
	readonly phonenumber: string;
}