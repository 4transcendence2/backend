import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserStatus } from "../user.status";
import { ChatRoom } from "src/chat/entity/chat.room.entity";

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		enum: UserStatus,
		default: 'logout',
	})
	status: string;

	@Column({
		default: 1000,
	})
	rating: number;

	@Column({
		default: 0,
	})
	win: number;

	@Column({
		default: 0,
	})
	lose: number;

	@ManyToMany(() => User)
	@JoinTable()
	friend: User[];


	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.user)
	@JoinTable()
	chat: ChatRoom[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.admin)
	@JoinTable()
	admin: ChatRoom[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.ban)
	@JoinTable()
	ban: ChatRoom[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.mute)
	@JoinTable()
	mute: ChatRoom[];

	@Column({
		unique: true,
	})
	name: string;

	@Column({
	})
	password: string;

	@Column({
		type: "bytea",
		nullable: false,
	})
	avatar: Buffer;

	@Column({	
		nullable: false,
	})
	phone: string;

}
