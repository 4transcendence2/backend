import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { RoomStatus } from "../chat.room.status";
import { User } from "src/user/entity/user.entity";


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

	@ManyToOne(() => User, (user) => user.owner)
	owner: User;

	@ManyToMany(() => User)
	@JoinTable()
	admin: User[];

	@ManyToMany(() => User)
	@JoinTable()
	user: User[];

	@ManyToMany(() => User)
	@JoinTable()
	mute: User[];
	
	@ManyToMany(() => User)
	@JoinTable()
	ban: User[];

	
}