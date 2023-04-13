import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ChatRoom } from "./chat.room.entity";
import { User } from "src/user/entity/user.entity";

@Entity('block_list')
export class BlockList {
	@PrimaryGeneratedColumn()
	id: number;
}