import { Column, Entity, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserStatus } from "../user.status";
import { ChatRoom } from "src/chat/entity/chat.room.entity";
import { ChatRoomUser } from "src/chat/entity/chat.room.user.entity";
import { ChatHistory } from "src/chat/entity/chat.history.entity";
import { Dm } from "src/dm/entity/dm.entity";
import { DmHistory } from "src/dm/entity/dm.history";

@Entity('user')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		enum: UserStatus,
		default: UserStatus.LOGOUT,
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

	@OneToMany(() => ChatRoomUser, (chatRoomUser) => chatRoomUser.user)
	chat: ChatRoomUser[];

	@ManyToMany(() => Dm, (dm) => dm.user)
	dm: Dm[];

	@OneToMany(() => ChatHistory, (chatHistory) => chatHistory.user)
	chat_history: ChatHistory[];

	@OneToMany(() => DmHistory, (dmHistory) => dmHistory.user)
	dm_history: DmHistory[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.ban)
	@JoinTable()
	ban: ChatRoom[];

	@OneToMany(() => ChatRoom, (chatRoom) => chatRoom.owner)
	owner: ChatRoom[];

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
