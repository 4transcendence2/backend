import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class CreateUserDto {

	@IsString()
	@IsNotEmpty()
	readonly username: string;

	// @IsString()
	// @IsNotEmpty()
	// readonly password: string;

	// @IsString()
	// @IsNotEmpty()
	// @Matches(/[0-9]\d{1,14}$/)
	// readonly phonenumber: string;

	// @IsString()
	// @IsNotEmpty()
	// readonly intraId: string;
}