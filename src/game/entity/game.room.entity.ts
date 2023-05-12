import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { GameRoomUser } from "./game.room.user.entity";
import { Rule } from "../game.rule";

@Entity('game_room')
export class GameRoom {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		nullable: false,
		enum: Rule,
	})
	rule: string;

	@OneToMany(() => GameRoomUser, (gameRoomUser) => gameRoomUser.room)
	users: GameRoomUser[];

	


}