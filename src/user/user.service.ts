import { Headers, Inject, Injectable, forwardRef, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/user.create.dto';
import { User } from './entity/user.entity';
import { Socket } from 'socket.io';
const bcrypt = require('bcrypt');
import { join } from 'path';
import { AuthService } from 'src/auth/auth.service';
import { UserStatus } from './user.status';
import { WsService } from 'src/ws/ws.service';
import { ChatRoom } from 'src/chat/entity/chat.room.entity';
const fs = require('fs');

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) { }

	async findAll(): Promise<User[]> {
		return await this.usersRepository.find();
	}

	async findOne(name: string): Promise<User> {
		return await this.usersRepository.findOne({
			where: {
				name: name,
			},
			relations: {
				friend: true,
				chat: {
					owner: true,
					user: true,
				},
			}
		});
	}


	async createUser(userInfo: CreateUserDto) {
		const hashedPassword = await bcrypt.hash(userInfo.password, parseInt(process.env.HASH_KEY));
		const defaultAvatar = await fs.readFileSync(join(__dirname, '../..', 'public', 'default.png'), (err) => {
			if (err) console.log(err, "기본 아바타 파일 이상");
		});
		const newUser: User = this.usersRepository.create({
			friend: [],
			chat: [],
			name: userInfo.username,
			password: hashedPassword,
			avatar: defaultAvatar,
			phone: userInfo.phonenumber,
		});

		await this.usersRepository.insert(newUser);
	}

	async updateAvatar(name: string, file: Buffer) {
		const user = await this.findOne(name);

		user.avatar = file;
		await this.usersRepository.save(user);
	}

	async getProfile(requesterName: string, name: string) {
		if (!(await this.isExist(name))) {
			throw new Error('존재하지 않는 유저입니다.');
		};

		const requester = await this.findOne(requesterName);
		const user = await this.findOne(name);

		let relation: string;
		if (requester.name === user.name) relation = 'myself';
		else {
			relation = requester.friend.find(friend => friend === user) === undefined ? 'others' : 'friend';
		}

		return ({
			"username": user.name,
			"status": user.status,
			"rating": user.rating,
			"win": user.win,
			"lose": user.lose,
			"relation": relation,
			// game history 추가 필요.
		})
		


	}

	async updateStatus(name: string, status: string) {
		try {
			const user = await this.findOne(name);
			user.status = status;
			await this.usersRepository.save(user);
			this.wsService.updateYourFriend(name);

		} catch (err) {
			console.log(err);
		}
	}

















	async isExist(name: string): Promise<boolean> {
		if (await this.findOne(name) === null) {
			return false;
		}
		return true;
	}

	async save(user: User) {
		await this.usersRepository.save(user);
	}

	async exitChatRoom(username: string, room_id: number) {
		const user = await this.findOne(username);

		// if (user.chat_room_list === null) return;

		// let index = user.chat_room_list.findIndex(element => element === room_id);
		// if (index === -1) return;
		// user.chat_room_list.splice(index, 1);

		await this.usersRepository.save(user);
	}



	async addFriend(fromUsername: string, toUsername: string) {
		const from = await this.findOne(fromUsername);

		// if (from.friend_list === null || from.friend_list.length === 0) {
		// 	from.friend_list = [toUsername];
		// } else {
		// 	from.friend_list.push(toUsername);
		// }

		await this.usersRepository.save(from);
	}

	async addFriendResult(client: Socket, status: string, detail?: string) {
		client.emit('addFriendResult', {
			status: status,
			detail: detail,
		})
	}

	// async isFriend(fromUsername: string, toUsername: string): Promise<boolean> {
	async isFriend(fromUsername: string, toUsername: string) {
		// const from = await this.findOne(fromUsername);
		// if (from.friend_list === null || from.friend_list === undefined || from.friend_list.length === 0) return false;
		// return from.friend_list.find(el => el === toUsername) !== undefined ? true : false;
	}
}
