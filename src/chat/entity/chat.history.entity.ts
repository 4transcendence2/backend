import { User } from "src/user/entity/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ChatRoom } from "./chat.room.entity";

@Entity('chat_history')
export class ChatHistory {
	@PrimaryGeneratedColumn()
	id: number;


	@Column()
	time: Date;

	@ManyToOne(() => User, (user) => user.chat_history)
	user: User;

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.history)
	room: ChatRoom;

	@Column({
		nullable: false,
	})
	content: string;
}