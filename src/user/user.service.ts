import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/user.create.dto';
import { User } from './entity/user.entity';
import { Socket, Server } from 'socket.io';
const bcrypt = require('bcrypt');
import { join } from 'path';
import { UserFriend } from './entity/user.friend';
import { WsService } from 'src/ws/ws.service';
const fs = require('fs');

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,

		@InjectRepository(UserFriend)
		private usersFriendRepository: Repository<UserFriend>,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}

	async findAll(): Promise<User[]> {
		return await this.usersRepository.find();
	}

	async findOne(name: string): Promise<User> {
		return await this.usersRepository.findOne({
			where: {
				name: name,
			},
			relations: {
				chat: {
					room: {
						owner: true,
						users: {
							user: true,
						},
						ban: true,
					},
					user: true,
				},
			}
		});
	}

	async getProfile(requesterName: string, name: string) {
		if (!(await this.isExist(name))) {
			throw new Error('존재하지 않는 유저입니다.');
		};

		const requester = await this.findOne(requesterName);
		const user = await this.findOne(name);

		let relation: string;
		if (requester.name === user.name) {
			relation = 'myself';
		} else {
			relation = await this.isFriend(requesterName, name) ? 'friend' : 'others';
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

	async createUser(userInfo: CreateUserDto) {
		const hashedPassword = await bcrypt.hash(userInfo.password, parseInt(process.env.HASH_KEY));
		const defaultAvatar = await fs.readFileSync(join(__dirname, '../..', 'public', 'default.png'), (err) => {
			if (err) console.log(err, "기본 아바타 파일 이상");
		});
		const newUser: User = this.usersRepository.create({
			chat: [],
			name: userInfo.username,
			password: hashedPassword,
			avatar: defaultAvatar,
			phone: userInfo.phonenumber,
		});
		await this.usersRepository.save(newUser);
	}

	async updateAvatar(name: string, file: Buffer) {
		const user = await this.findOne(name);

		user.avatar = file;
		await this.usersRepository.save(user);
	}



	async isExist(username: string): Promise<boolean> {
		return await this.findOne(username) === null ? false : true;
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


	async addFriend(server: Server, client: Socket, body: any) {
		const user = await this.findOne(await this.wsService.findName(client));
		const friend = await this.findOne(body.username);

		const newFriend = this.usersFriendRepository.create({
			from: user,
			to: friend,
		});
		await this.usersFriendRepository.save(newFriend);

		client.emit('addFriendResult', {
			status: 'approved',
		});

		let clients = await server.in('friendList').fetchSockets();
		for (const elem of clients) {
			if (elem.id === client.id) {
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.wsService.updateFriend(elemName, client);
				break;
			}
		}


	}

	async findFriends(user: User): Promise<UserFriend[]> {
		return await this.usersFriendRepository.find({
			where: {
				from: user
			},
			relations: {
				from: true,
				to: true,
			}
		});
	}

	async isFriend(from: string, to: string) {
		const fromUser = await this.findOne(from);
		const toUser = await this.findOne(to);
		const friends = await this.findFriends(fromUser);

		if (friends === null) return false;
		const res = friends.find(elem => elem.to.id === toUser.id);

		return res !== undefined ? true : false;
	}
}
