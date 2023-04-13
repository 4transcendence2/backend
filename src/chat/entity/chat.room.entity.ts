import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, ManyToOne, ManyToMany, JoinTable, OneToMany, JoinColumn } from "typeorm";
import { RoomStatus } from "../chat.room.status";
import { User } from "src/user/entity/user.entity";
import { BlockList } from "./chat.block.entity";


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

	@ManyToMany(() => User, (user) => user.chat)
	user: User[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.user)
	@JoinTable()
	admin: User[];

	@ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.user)
	@JoinTable()
	mute: User[];

	@ManyToMany(() => User)
	@JoinTable()
	ban: User[];

	@OneToMany(() => BlockList, (blockList) => blockList.chat)
	block: BlockList[];


}