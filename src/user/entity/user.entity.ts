import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { UserStatus } from "../user.status";

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
	
	@Column({
		unique: true,
	})
	username: string;

	@Column({
	})
	password: string;

	@Column({
		nullable: true,
	})
	avatar_path: string;

	@Column({	
		unique: true,
	})
	phone_number: string;

}
