import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { RoomStatus } from "../chat.room.status";
import { User } from "src/user/entity/user.entity";
import { userInfo } from "os";


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

	@ManyToMany(() => User)
	@JoinTable()
	admin: User[];

	@ManyToMany(() => User, (user) => user.chat)
	user: User[];

	@ManyToMany(() => User)
	@JoinTable()
	mute: User[];
	
	@ManyToMany(() => User)
	@JoinTable()
	ban: User[];

	
}