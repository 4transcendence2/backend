import { User } from "src/user/entity/user.entity";
import { Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DmHistory } from "./dm.history";
import { DmUser } from "./dm.user.entity";

@Entity('dm')
export class Dm {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (user) => user.from_dm)
	from: User;


	@ManyToOne(() => User, (user) => user.to_dm)
	to: User;

	@OneToMany(() => DmUser, (dmUser) => dmUser.dm)
	user: DmUser[];

	@OneToMany(() => DmHistory, (dmHistory) => dmHistory.dm)
	history: DmHistory[];
}