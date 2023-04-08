import { User } from "src/user/entity/user.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Dm {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => User)
	@JoinTable()
	user_list: User[];
}