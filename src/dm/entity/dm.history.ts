import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Dm } from "./dm.entity";
import { User } from "src/user/entity/user.entity";

@Entity('dm_history')
export class DmHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		nullable: false,
	})
	time: Date;

	@ManyToOne(() => Dm, (dm) => dm.history)
	dm: Dm;

	@ManyToOne(() => User, (user) => user.dm_history)
	user: User;

	@Column({
		nullable: false,
	})
	content: string;
}