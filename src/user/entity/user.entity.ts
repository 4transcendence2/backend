import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	unique_id: number;

	@Column({
		default: 0,
	})
	status: number;

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
		type: "integer",
		array: true,
		nullable: true,
	})
	friend_list: number[];

	@Column({
		type: "integer",
		array: true,
		nullable: true,
	})
	chat_room_list: number[];

	@Column({
		type: "text",
		array: true,
		nullable: true,
	})
	block_list: string[];

	@Column({
		default: 0,
	})
	game_history_id: number;

	@Column({
		default: 0,
	})
	current_game_id: number;
	
	@Column({
		unique: true,
	})
	username: string;

	@Column({
	})
	password: string;

	@Column({
		nullable: true
	})
	intra_id: string;

	@Column({
		unique: true,
	})
	nickname: string;

	@Column({
		nullable: true,
	})
	avatar_path: string;

	@Column({	
		unique: true,
	})
	phone_number: string;

	@Column({
		nullable: true,
	})
	chat_socket_ip: string;

	@Column({
		nullable: true,
	})
	game_socket_ip: string;
}
