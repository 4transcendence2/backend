import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/user.create.dto';
import { User } from './entity/user.entity';
import { Socket } from 'socket.io';
const bcrypt = require('bcrypt');
import { join } from 'path';
const fs = require('fs');

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,

	) {}

	async findAll(): Promise<User[]> {
		return await this.usersRepository.find();
	}

	async findOne(name: string): Promise<User> {
		return await this.usersRepository.findOneBy({ name });
	}


	async createUser(userInfo: CreateUserDto) {
		const hashedPassword = await bcrypt.hash(userInfo.password, parseInt(process.env.HASH_KEY));
		const defaultAvatar = await fs.readFileSync(join(__dirname, '../..', 'public', 'default.png'), (err) => {
			if (err) console.log(err);
		});
		const newUser: User = this.usersRepository.create({
      friend: [],
			owner: [],
			name: userInfo.username,
			password: hashedPassword,
			avatar: defaultAvatar,
			phone: userInfo.phonenumber,
    });

    await this.usersRepository.insert(newUser);
	}

	async updateAvatar(username: string, file: Buffer) {
		const user = await this.findOne(username);

		user.avatar = file;
		await this.usersRepository.save(user);
	}



	async isExist(username: string): Promise<boolean> {
		if (await this.findOne(username) === null) {
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

	

	async addFriend(fromUsername: string, toUsername: string) {
		const from = await this.findOne(fromUsername);

		if (from.friend_list === null || from.friend_list.length === 0) {
			from.friend_list = [toUsername];
		} else {
			from.friend_list.push(toUsername);
		}

		await this.usersRepository.save(from);
	}

	async addFriendResult(client: Socket, status: string, detail?: string) {
		client.emit('addFriendResult', {
			status: status,
			detail: detail,
		})
	}

	async isFriend(fromUsername: string, toUsername: string): Promise<boolean> {
		const from = await this.findOne(fromUsername);
		if (from.friend_list === null || from.friend_list === undefined || from.friend_list.length === 0) return false;
		return from.friend_list.find(el => el === toUsername) !== undefined ? true : false;
	}
}
