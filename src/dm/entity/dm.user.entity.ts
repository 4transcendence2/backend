import { User } from "src/user/entity/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Dm } from "./dm.entity";

@Entity('dm_user')
export class DmUser {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (user) => user.dm)
	user: User;

	@ManyToOne(() => Dm, (dm) => dm.user)
	dm: Dm;

	@Column({
		nullable: false,
	})
	time: Date;
}