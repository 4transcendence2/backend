import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { ChatService } from 'src/chat/chat.service';
import { AuthService } from 'src/auth/auth.service';
import { UserStatus } from 'src/user/user.status';
import { ConnectedSocket } from '@nestjs/websockets';
import { Type } from './ws.type';
import { WsGateWay } from './ws.gateway';
import { DmService } from 'src/dm/dm.service';

interface login {
	name: string,
	client: Socket,
	id: string,
}

const users: login[] = [];

@Injectable()
export class WsService {

	constructor(
		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,

		@Inject(forwardRef(() => ChatService))
		private chatService: ChatService,

		@Inject(forwardRef(() => DmService))
		private dmService: DmService,

		@Inject(forwardRef(() => WsGateWay))
		private wsGateWay: WsGateWay,

	) {}

	async login(@ConnectedSocket() client: Socket) {
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
				id: client.id,
			});

			await this.userService.updateStatus(name, UserStatus.LOGIN);

		})
		.catch(err => {
			client.emit('error', err);
			client.disconnect();
		})

	}

	async logout(@ConnectedSocket() client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
		.then(async name => {
			let index = users.findIndex(user => user.name === name);
			if (index !== -1) users.splice(index, 1);
			await this.userService.updateStatus(name, UserStatus.LOGOUT);
		})
		.catch(err => {
			client.emit('error', err);
		})
	}
	
	async subscribe(@ConnectedSocket() client: Socket, body: any) {
		const name = await this.findName(client);

		// chatRoom
		if (body.type === Type.CHAT_ROOM) {
			client.join('chatRoom' + body.roomId);
			this.chatService.updateChatRoom(client, await this.chatService.findOne(body.roomId));
			this.chatService.updateBlockList(body.roomId, await this.findName(client), client);
			this.chatService.sendHistory(client, body);
		}

		// gameRoom
		if (body.type === Type.CHAT_ROOM) {
			client.join('gameRoom' + body.roomId);
			//게임룸 업데이트
		}

		// DM
		if (body.type === Type.DM) {
			const user1 = await this.userService.findOne(await this.findName(client));
			const user2 = await this.userService.findOne(body.username);
			const dm = await this.dmService.findOne(user1, user2);
			client.join('dm' + dm.id);

			this.dmService.sendHistory(client, body);
		}

		// chatRoomList
		if (body.type === Type.CHAT_ROOM_LIST) {
			client.join('chatRoomList');
			this.chatService.updateMyChatRoomList(name, client);
			this.chatService.updateChatRoomList(name, client);
		}

		// gameRoomList
		if (body.type === Type.GAME_ROOM_LIST) {
		}

		// dmList
		if (body.type === Type.DM_LIST) {
			client.join('dmList');
			this.dmService.updateDmList(name, client);
		}

		// friendList
		if (body.type === Type.FRIEND_LIST) {
			client.join('friendList');
			this.updateFriend(name, client);
		}


		





	}


	async findName(@ConnectedSocket() client: Socket, id?: string): Promise<string> {
		const login = id === undefined ? users.find(user => user.client === client) : users.find(user => user.id === id);
		if (login === undefined) return undefined;
		return login.name;
	}

	async findClient(name: string, id?: string): Promise<Socket> {
		const login = id === undefined ? users.find(user => user.name === name) : users.find(user => user.id === id);
		if (login === undefined) return undefined;
		return login.client;
	}

	async isLogin(@ConnectedSocket() client: Socket, name?: string): Promise<boolean> {
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
		client.emit('message', {
			type: 'friend',
			list: friendList
		});
	}

	async updateYourFriend(name: string) {
		const clients = await this.wsGateWay.server.in('friendList').fetchSockets();
		
		for(const elem of clients) {
			let elemName = await this.findName(undefined, elem.id);
			let elemClient = await this.findClient(undefined, elem.id);

			if (await this.userService.isFriend(elemName, name))  {
				this.updateFriend(elemName, elemClient);
			}
		}
	}

	getLoginUsers(): login[] {
		return users;
	}


	result(event: string, @ConnectedSocket() client: Socket, status: string, detail?: string, type?: string) {
		client.emit(event, {
			type: type,
			status: status,
			detail: detail,
		})
	}

}
