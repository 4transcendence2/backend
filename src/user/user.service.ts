import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entity/user.entity';
import { Socket } from 'socket.io';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
	) {}

	async findAll(): Promise<User[]> {
		return this.usersRepository.find();
	}

	async findOne(username: string): Promise<User> {
		return this.usersRepository.findOneBy({ username });
	}

	async createUser(userInfo: CreateUserDto) {
		const hashedPassword = await bcrypt.hash(userInfo.password, 10);
		const newUser: User = this.usersRepository.create({
      username: userInfo.username,
			password: hashedPassword,
			nickname: userInfo.nickname,
			phone_number: userInfo.phonenumber,
    });

    await this.usersRepository.insert(newUser);
	}

	async isExist(username: string, client: Socket): Promise<boolean> {
		if (await this.findOne(username) === undefined) {
			client.emit("notice", {
				status: "notice",
				detail: "존재하지 않는 유저입니다."
			})
			return false;
		}
		return true;
	}

	async exitChatRoom(username: string, room_id: number) {
		const user = await this.findOne(username);

		if (user.chat_room_list === null) return;

		let index = user.chat_room_list.findIndex(element => element === room_id);
		if (index === -1) return ;
		user.chat_room_list.splice(index, 1);

		await this.usersRepository.save(user);
	}

	async joinChatRoom(username: string, room_id: number) {
		const user = await this.findOne(username);

		if (user.chat_room_list === null || user.chat_room_list.length === 0) {
			user.chat_room_list = [room_id];
		} else {
			if (user.chat_room_list.find(element => element === room_id) === undefined) {
				user.chat_room_list.push(room_id);
			}
		}
		await this.usersRepository.save(user);
	}
}
