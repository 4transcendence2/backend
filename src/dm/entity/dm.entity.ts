import { User } from "src/user/entity/user.entity";
import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DmHistory } from "./dm.history";

@Entity('dm')
export class Dm {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (user) => user.dm)
	user1: User;

	@ManyToOne(() => User, (user) => user.dm)
	user2: User;

	@OneToMany(() => DmHistory, (dmHistory) => dmHistory.dm)
	history: DmHistory[];
}