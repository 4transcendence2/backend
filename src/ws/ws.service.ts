import { Injectable, forwardRef, Inject, UseGuards } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { ChatRoom } from 'src/chat/entity/chat-room.entity';
// import { User } from 'src/user/entity/user.entity';
// import { Repository } from 'typeorm';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { ChatService } from 'src/chat/chat.service';
import { AuthService } from 'src/auth/auth.service';
import { UserStatus } from 'src/user/user.status';
import { TokenGuard } from './guard/ws.token.guard';

interface login {
	name: string,
	client: Socket,
}

const users: login[] = [];

@Injectable()
export class WsService {

	constructor(
		// @InjectRepository(ChatRoom)
		// private chatRoomRepository: Repository<ChatRoom>,

		// @InjectRepository(User)
		// private usersRepository: Repository<User>,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => ChatService))
		private chatService: ChatService,
	) {}

	async login(client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
		.then(async name => {
			if (await this.isLogin(client)) {
				client.emit('error', {
					status: 'error',
					detail: '이미 접속중인 유저입니다.',
				})
				client.disconnect();
				return;
			}
			users.push({
				name: name,
				client: client,
			});

			await this.userService.updateStatus(name, UserStatus.LOGIN);
			await this.updateFriend(name, client);
			await this.chatService.joinRooms(name, client);
			await this.chatService.updateMyChatRoomList(name, client);
			await this.chatService.updateChatRoomList(name, client);
			//DM 룸 업데이트 필요
			//게임 룸 업데이트 필요
			

		})
		.catch(err => {
			client.emit('error', err);
			client.disconnect();
		})

	}

	async logout(client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
		.then(async name => {
			let index = users.findIndex(user => user.name === name);
			if (index !== -1) users.splice(index, 1);
			users.splice(users.findIndex(elem => elem.client === client), 1);
			await this.userService.updateStatus(name, UserStatus.LOGOUT);
			await this.chatService.leaveRooms(name, client);
		})
		.catch(err => {
			client.emit('error', err);
		})
	}
	
	async findName(client: Socket): Promise<string> {
		const login = users.find(user => user.client === client);
		if (login === undefined) return undefined;
		return login.name;
	}

	async findClient(name: string): Promise<Socket> {
		const login = users.find(user => user.name === name);
		if (login === undefined) return undefined;
		return login.client;
	}

	async isLogin(client: Socket, name?: string): Promise<boolean> {
		if (client !== undefined) {
			const res = await this.findName(client);
			if (res === undefined) return false;
			return true;
		}

		if (name !== undefined) {
			const res = await this.findClient(name);
			if (res === undefined) return false;
			return true;
		}
	}

	async updateFriend(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const friendList: {
			username: string,
			status: string,
		}[] = [];
		for(let i = 0; i < user.friend.length; ++i) {
			friendList.push({
				username: user.friend[i].name,
				status: user.friend[i].status,
			})
		}
		client.emit('updateFriend', friendList);
	}

	async updateYourFriend(name: string) {
		const friend = await this.userService.findOne(name);
		users.forEach(async elem => {
			const user = await this.userService.findOne(elem.name);
			if (user.friend.find(f => f === friend) !== undefined) {
				this.updateFriend(user.name, await this.findClient(user.name));
			}
		})
	}

	getLoginUsers(): login[] {
		return users;
	}




}
