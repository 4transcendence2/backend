import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class VerificationResultDto {
	@IsString()
	@IsNotEmpty()
	status: string;

	@IsString()
	@IsNotEmpty()
	code: string;

	@IsString()
	@IsNotEmpty()
	detail: string;
}