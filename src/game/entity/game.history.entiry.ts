import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { GameType } from "../game.type";
import { GameResult } from "../game.result";


@Entity('game_history')
export class GameHistory {
	@PrimaryGeneratedColumn()
	uniqueId: number;

	@Column({
		nullable: false,
	})
	red: string;

	@Column({
		nullable: false,
	})
	blue: string;

	@Column({
		default: 0,
	})
	redScore: number;

	@Column({
		default: 0,
	})
	blueScore: number;

	@Column({
		enum: GameResult,
		nullable: true,
	})
	winner: string;

	@Column({
		enum: GameType,
		nullable: false,
	})
	type: string;

}