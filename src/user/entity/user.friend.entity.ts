import { Entity, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export default class Friend {
	@PrimaryGeneratedColumn()
	id: number;


	@ManyToMany(() => User)
	@JoinTable()
	user: User[]
}