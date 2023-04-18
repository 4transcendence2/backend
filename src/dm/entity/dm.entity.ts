import { User } from "src/user/entity/user.entity";
import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('dm')
export class Dm {
	@PrimaryGeneratedColumn()
	id: number;


	@ManyToOne(() => User, (user) => user.dm)
	user1: User;

	@ManyToOne(() => User, (user) => user.dm)
	user2: User;


	


}