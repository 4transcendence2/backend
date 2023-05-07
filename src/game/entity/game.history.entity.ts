import { User } from "src/user/entity/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('game_history')
export class GameHistory {
	@PrimaryGeneratedColumn()
	id: number;


	@ManyToOne(() => User, (user) => user.red)
	red: User;

	@Column({
		nullable: true,
	})
	red_score: number;

	@Column({
		nullable: true,
	})
	blue_score: number;


	@ManyToOne(() => User, (user) => user.blue)
	blue: User;

	@Column()
	time: Date;

	@Column()
	winner: string;

	@Column()
	rule: string;
}