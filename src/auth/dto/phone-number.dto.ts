import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class PhoneNumberDto {
	@IsString()
	@IsNotEmpty()
	readonly phonenumber: string;
}