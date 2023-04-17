import { User } from "src/user/entity/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ChatRoom } from "./chat.room.entity";

@Entity('chat_room_user')
export class ChatRoomUser {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (user) => user.chat)
	user: User;

	@ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.users)
	room: ChatRoom;

	@Column({
		default: false,
	})
	admin: boolean;

	@Column({
		default: false,
	})
	muted: boolean;

	@Column({
		nullable: false,
	})
	time: Date;
}