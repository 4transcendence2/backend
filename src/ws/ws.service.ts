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
import { InjectRepository } from '@nestjs/typeorm';
import { GameRoomUser } from 'src/game/entity/game.room.user.entity';
import { Repository } from 'typeorm';

interface login {
	name: string,
	client: Socket,
	id: string,
	status: string,
}

interface queue {
	client: Socket,
	type: string,
	detail: string | undefined,
	body: {
		type: string | undefined,
		roomId: number | undefined,
	}
}

@Injectable()
export class WsService {

	public users: login[] = [];
	public queue: queue[] = [];
	public queueLen: number = 0;
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

		@InjectRepository(GameRoomUser)
		private gameRoomUserRepository: Repository<GameRoomUser>,


	) { }
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

				this.users.push({
					name: name,
					client: client,
					id: client.id,
					status: 'none',
				});

				await this.userService.updateStatus(name, UserStatus.LOGIN);
				const user = await this.userService.findOne(name);

				for (const chat of user.chat) {
					let clients = await this.wsGateWay.server.in('chatRoom' + chat.room.id).fetchSockets();
					for (const elem of clients) {
						let elemClient = await this.findClient(undefined, elem.id);
						this.chatService.updateChatRoom(elemClient, chat.room.id);
					}
				}


			})
			.catch(err => {
				console.log('login error');
				client.emit('error', err);
				client.disconnect();
			})

	}

	async logout(@ConnectedSocket() client: Socket) {
		await this.authService.decodeToken(client.handshake.headers, process.env.TMP_SECRET)
			.then(async name => {
				const tmpClient = await this.findClient(name);
				if (tmpClient !== client) return;


				const user = await this.userService.findOne(name);

				await this.userService.updateStatus(name, UserStatus.LOGOUT);
				for (const chat of user.chat) {
					let clients = await this.wsGateWay.server.in('chatRoom' + chat.room.id).fetchSockets();
					for (const elem of clients) {
						let elemClient = await this.findClient(undefined, elem.id);
						this.chatService.updateChatRoom(elemClient, chat.room.id);
					}
				}

				let index = this.users.findIndex(user => user.name === name);
				if (index !== -1) this.users.splice(index, 1);


			})
			.catch(err => {
				console.log('logout error');
				client.emit('error', err);
			})
	}

	async subscribe(@ConnectedSocket() client: Socket, body) {
		const name = await this.findName(client);
		
		// chatRoom
		if (body.type === Type.CHAT_ROOM) {
			await client.join('chatRoom' + body.roomId);
			this.chatService.updateChatRoom(client, body.roomId);
			this.chatService.updateBlockList(body.roomId, await this.findName(client), client);
			this.chatService.sendHistory(client, body);
		}


		// gameRoom
		if (body.type === Type.GAME_ROOM) {
			const game = await this.gameService.findOne(body.roomId);
			await client.join('gameRoom' + game.id);
		}


		// DM
		if (body.type === Type.DM) {
			const user1 = await this.userService.findOne(await this.findName(client));
			const user2 = await this.userService.findOne(body.username);
			let dm = await this.dmService.findOne(user1, user2);
			if (dm === null) {
				dm = await this.dmService.createOne(user1, user2);
			}
			this.dmService.sendHistory(client, body);
			await client.join('dm' + dm.id);
		}

		// chatRoomList
		if (body.type === Type.CHAT_ROOM_LIST) {
			await client.join('chatRoomList');
			this.chatService.updateMyChatRoomList(name, client);
			this.chatService.updateChatRoomList(name, client);
		}

		// gameRoomList
		if (body.type === Type.GAME_ROOM_LIST) {
			await client.join('gameRoomList');
			this.gameService.updateGameRoomList(client);
		}

		// dmList
		if (body.type === Type.DM_LIST) {
			await client.join('dmList');
			// this.dmService.updateDmList(name, client);
		}

		// friendList
		if (body.type === Type.FRIEND_LIST) {
			await client.join('friendList');
			this.updateFriend(name, client);
		}

		// chatInvitation
		if (body.type === Type.CHAT_INVITATION) {
			await client.join('chatInvitation');
		}

		// gameInvitation
		if (body.type === Type.GAME_INVITATION) {
			await client.join('gameInvitation');
		}
	}


	async unsubscribe(@ConnectedSocket() client: Socket, body: any) {

			// chatRoom
			if (body.type === Type.CHAT_ROOM) {
				await client.leave('chatRoom' + body.roomId);
			}

			// gameRoom
			if (body.type === Type.CHAT_ROOM) {
				await client.leave('gameRoom' + body.roomId);
			}

			// DM
			if (body.type === Type.DM) {
				const user1 = await this.userService.findOne(await this.findName(client));
				const user2 = await this.userService.findOne(body.username);
				const dm = await this.dmService.findOne(user1, user2);
				await client.leave('dm' + dm.id);
			}

			// chatRoomList
			if (body.type === Type.CHAT_ROOM_LIST) {
				await client.leave('chatRoomList');
			}

			// gameRoomList
			if (body.type === Type.GAME_ROOM_LIST) {
				await client.leave('gameRoomList');
			}
	
			// dmList
			if (body.type === Type.DM_LIST) {
				await client.leave('dmList');
			}
	
			// friendList
			if (body.type === Type.FRIEND_LIST) {
				await client.leave('friendList');
			}
	
			// chatInvitation
			if (body.type === Type.CHAT_INVITATION) {
				await client.leave('chatInvitation');
			}

			// gameInvitation
			if (body.type === Type.GAME_INVITATION) {
				await client.leave('gameInvitation');
			}
	}

	async handleQueue(@ConnectedSocket() client: Socket, body: any) {
		let id = setInterval(async () => {
			if (this.queue.length !== this.queueLen) return;

			const q = this.queue[0];
			this.queue.splice(0, 1);

			clearInterval(id);
			if (q.type === 'sub') {
				await this.subscribe(q.client, q.body);
				// console.log(new Date(Date.now()), q.type, q.detail);
				this.result('subscribeResult', client, 'approved', undefined, body.type);

			}
			if (q.type === 'unsub') {
				await this.unsubscribe(q.client, q.body);
				// console.log(new Date(Date.now()), q.type, q.detail);
				this.result('unsubscribeResult', client, 'approved', undefined, body.type);
			}
			this.queueLen--;
		}, 10)

	}

	async findName(@ConnectedSocket() client: Socket, id?: string): Promise<string> {
		const login = id === undefined ? this.users.find(user => user.client === client) : this.users.find(user => user.id === id);
		if (login === undefined) return undefined;
		return login.name;
	}

	async findClient(name: string, id?: string): Promise<Socket> {
		const login = id === undefined ? this.users.find(user => user.name === name) : this.users.find(user => user.id === id);
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

		for (let i = 0; i < friends.length; ++i) {
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

		for (const elem of clients) {
			let elemName = await this.findName(undefined, elem.id);
			let elemClient = await this.findClient(undefined, elem.id);

			if (await this.userService.isFriend(elemName, name)) {
				this.updateFriend(elemName, elemClient);
			}
		}
	}

	getLoginUsers(): login[] {
		return this.users;
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
