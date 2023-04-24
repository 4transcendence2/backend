import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user_friend')
export class UserFriend {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, (user) => user.from_friend)
	from: User;

	@ManyToOne(() => User, (user) => user.to_friend)
	to: User;
}