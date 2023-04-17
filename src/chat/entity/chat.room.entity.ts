import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, ManyToOne, ManyToMany, JoinTable, OneToMany, JoinColumn } from "typeorm";
import { RoomStatus } from "../chat.room.status";
import { User } from "src/user/entity/user.entity";
import { ChatRoomUser } from "./chat.room.user.entity";


@Entity('chat_room')
export class ChatRoom {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		nullable: false,
		enum: RoomStatus
	})
	status: string;

	@Column({
		nullable: true,
	})
	password: string;

	@Column({
		nullable: false,
	})
	title: string;

	@ManyToOne(() => User)
	owner: User;

	@OneToMany(() => ChatRoomUser, (chatRoomUser) => chatRoomUser.room)
	users: ChatRoomUser[];

	@ManyToMany(() => User, (user) => user.ban)
	ban: User[];


}