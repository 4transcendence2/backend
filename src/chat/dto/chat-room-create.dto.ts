import { IsNotEmpty, IsOptional, IsString, IsIn } from "class-validator";

export class CreateChatRoomDto {
	@IsString()
	@IsIn(['public', 'private', 'protected'])
	@IsNotEmpty()
	readonly status: string;

	@IsString()
	@IsNotEmpty()
	readonly title: string;

	@IsString()
	@IsOptional()
	readonly password: string;

}