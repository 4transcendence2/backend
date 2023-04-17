import { Inject, Injectable, forwardRef, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/user.create.dto';
import { User } from './entity/user.entity';
import { Socket } from 'socket.io';
const bcrypt = require('bcrypt');
import { join } from 'path';
import { AuthService } from 'src/auth/auth.service';
import { WsService } from 'src/ws/ws.service';
const fs = require('fs');

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,

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
				friend: true,
				chat: {
					room: {
						owner: true,
						users: true,
					}
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

	



	async addFriend(client: Socket, body: any) {
		const user = await this.findOne(await this.wsService.findName(client));
		user.friend.push(await this.findOne(body.username));
		await this.usersRepository.save(user);
		client.emit('addFriendResult', client, 'approved');
	}

	async addFriendResult(client: Socket, status: string, detail?: string) {
		client.emit('addFriendResult', {
			status: status,
			detail: detail,
		})
	}

	async isFriend(from: string, to: string) {
		const fromUser = await this.findOne(from);
		return fromUser.friend.find(elem => elem.name === to) !== undefined ? true : false;
	}
}
