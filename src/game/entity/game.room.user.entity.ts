import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GameRoom } from "./game.room.entity";
import { User } from "src/user/entity/user.entity";
import { Role } from "../game.role";

@Entity('game_room_user')
export class GameRoomUser {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => GameRoom, (gameRoom) => gameRoom.users)
	room: GameRoom;

	@ManyToOne(() => User, (user) => user.game)
	user: User;

	@Column({
		nullable: false,
		enum: Role,
	})
	role: string;

	@Column({
		default: 0,
	})
	score: number;


}