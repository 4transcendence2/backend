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
import { GameService } from 'src/game/game.service';

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

		@Inject(forwardRef(() => GameService))
		private gameService: GameService,

		@Inject(forwardRef(() => WsGateWay))
		private wsGateWay: WsGateWay,

	) {}

	async login(@ConnectedSocket() client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
		.then(async name => {
			if (await this.isLogin(undefined, name)) {
				client.emit('error', {
					status: 'error',
					detail: '이미 접속중인 유저입니다.',
				});

				client.disconnect();
				return;
			}

			users.push({
				name: name,
				client: client,
				id: client.id,
			});

			await this.userService.updateStatus(name, UserStatus.LOGIN);
			const user = await this.userService.findOne(name);

			for (const room of user.chat) {
				let clients = await this.wsGateWay.server.in('chatRoom' + room.room.id).fetchSockets();
				for(const elem of clients) {
					let elemClient = await this.findClient(undefined, elem.id);
					this.chatService.updateChatRoom(elemClient, room.room);
				}
			}


		})
		.catch(err => {
			client.emit('error', err);
			client.disconnect();
		})

	}

	async logout(@ConnectedSocket() client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
		.then(async name => {
			const tmpClient = await this.findClient(name);
			if (tmpClient !== client) return;


			await this.userService.updateStatus(name, UserStatus.LOGOUT);
			const user = await this.userService.findOne(name);

			for (const room of user.chat) {
				let clients = await this.wsGateWay.server.in('chatRoom' + room.room.id).fetchSockets();
				for(const elem of clients) {
					let elemClient = await this.findClient(undefined, elem.id);
					this.chatService.updateChatRoom(elemClient, room.room);
				}
			}

			let index = users.findIndex(user => user.name === name);
			if (index !== -1) users.splice(index, 1);


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
			// this.chatService.sendHistory(client, body);
		}


		// gameRoom
		if (body.type === Type.GAME_ROOM) {
			const game = await this.gameService.findOne(body.roomId);
			client.join('gameRoom' + game.id);
		}


		// DM
		if (body.type === Type.DM) {
			const user1 = await this.userService.findOne(await this.findName(client));
			const user2 = await this.userService.findOne(body.username);
			let dm = await this.dmService.findOne(user1, user2);
			if (dm === null) {
				dm = await this.dmService.createOne(user1, user2);
			} else {
				// this.dmService.sendHistory(client, body);
			}
			client.join('dm' + dm.id);
		}




		// chatRoomList
		if (body.type === Type.CHAT_ROOM_LIST) {
			client.join('chatRoomList');
			this.chatService.updateMyChatRoomList(name, client);
			this.chatService.updateChatRoomList(name, client);
		}

		// gameRoomList
		if (body.type === Type.GAME_ROOM_LIST) {
			client.join('gameRoomList');
			this.gameService.updateGameRoomList(client);
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


	async unsubscribe(@ConnectedSocket() client: Socket, body: any) {
		const name = await this.findName(client);

		// chatRoom
		if (body.type === Type.CHAT_ROOM) {
			client.leave('chatRoom' + body.roomId);
		}

		// gameRoom
		if (body.type === Type.CHAT_ROOM) {
			client.leave('gameRoom' + body.roomId);
		}

		// DM
		if (body.type === Type.DM) {
			const user1 = await this.userService.findOne(await this.findName(client));
			const user2 = await this.userService.findOne(body.username);
			const dm = await this.dmService.findOne(user1, user2);
			client.leave('dm' + dm.id);
		}

		// chatRoomList
		if (body.type === Type.CHAT_ROOM_LIST) {
			client.leave('chatRoomList');
		}

		// gameRoomList
		if (body.type === Type.GAME_ROOM_LIST) {
			client.leave('gameRoomList');
		}

		// dmList
		if (body.type === Type.DM_LIST) {
			client.leave('dmList');
		}

		// friendList
		if (body.type === Type.FRIEND_LIST) {
			client.leave('friendList');
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

			if (res === undefined) {
				return false;
			}
			
			return true;
		}


		if (name !== undefined) {

			const res = await this.findClient(name);

			if (res === undefined) {
				return false;
			}
			return true;
		}
	}

	async updateFriend(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const friendList: {
			username: string,
			status: string,
		}[] = [];
		const friends = await this.userService.findFriends(user);

		for(let i = 0; i < friends.length; ++i) {
			friendList.push({
				username: friends[i].to.name,
				status: friends[i].to.status,
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


	/**
	 * 
	 * @param event 이벤트이름
	 * @param client 소켓
	 * @param status 상태
	 * @param detail 에러내용
	 * @param type subscribe, unsubscribe 타입
	 * @param roomId roomId
	 */
	result(event: string, client: Socket, status: string, detail: string, type?: string | undefined, roomId?: number | undefined) {
		client.emit(event, {
			type: type, // subscribe 또는 unsubscribe 요청시.
			status: status,
			roomId: roomId, // roomId 관련 요청시.
			detail: detail,
		})
	}

}
