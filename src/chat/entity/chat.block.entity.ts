import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ChatRoom } from "./chat.room.entity";
import { User } from "src/user/entity/user.entity";

@Entity('block_list')
export class Block {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.block)
	room: ChatRoom;

	@ManyToOne(() => User, (user) => user.block)
	from: User;

	@ManyToOne(() => User, (user) => user.blocked)
	to: User;
}