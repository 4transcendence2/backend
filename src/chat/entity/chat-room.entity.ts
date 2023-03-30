import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import { RoomStatus } from "../chat-room.status";


@Entity('chat_room')
export class ChatRoom {
	@PrimaryGeneratedColumn()
	room_id: number;

	@Column({
		nullable: false,
		enum: RoomStatus
	})
	status: string

	@Column({
		nullable: true,
	})
	password: string

	@Column({
		nullable: false,
	})
	title: string

	@Column({
		nullable: false,
	})
	owner: string

	@Column({
		type: "text",
		array: true,
		nullable: true,
	})
	admin_list: string[]

	@Column({
		type: 'text',
		array: true,
		nullable: true,
	})
	user_list: string[]

	@Column({
		type: 'text',
		array: true,
		nullable: true,
	})
	mute_list: string[]

	@Column({
		type: 'text',
		array: true,
		nullable: true,
	})
	ban_list: string[]




	@BeforeInsert()
  @BeforeUpdate()
  validatePassword() {
		if (this.status === 'protected' && (this.password === null || this.password === undefined)) {
			throw new Error('Password is required for protected rooms.');
    } 
		
		if ((this.status === 'public' || this.status === 'private') && (this.password !== undefined && this.password !== null)) {
			throw new Error('Password is not required for public or private rooms.');
		}
  }

}