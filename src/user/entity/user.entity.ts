import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserStatus } from "../user.status";
import Dm from "src/chat/entity/chat.dm.entity";

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	unique_id: number;

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

	@Column({
		type: "text",
		array: true,
		nullable: true,
	})
	friend_list: string[];

	@Column({
		type: "integer",
		array: true,
		nullable: true,
	})
	chat_room_list: number[];

	@ManyToMany(() => Dm)
	@JoinTable()
	dm_list: Dm[];


	@Column({
		unique: true,
	})
	username: string;

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
	phone_number: string;

}
