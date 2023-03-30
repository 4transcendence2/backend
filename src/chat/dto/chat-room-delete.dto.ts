import { IsNotEmpty, IsNumber } from 'class-validator';

export class DeleteChatRoomDto {
	@IsNumber()
	@IsNotEmpty()
	readonly unique_id: number;
}