import { User } from "src/user/entity/user.entity";
import { Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DmHistory } from "./dm.history";

@Entity('dm')
export class Dm {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => User, (user) => user.dm)
	@JoinTable()
	user: User[];

	@OneToMany(() => DmHistory, (dmHistory) => dmHistory.dm)
	history: DmHistory[];
}