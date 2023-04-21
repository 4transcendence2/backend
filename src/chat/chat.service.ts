import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entity/chat.room.entity';
import { WsService } from 'src/ws/ws.service';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { RoomStatus } from './chat.room.status';
import { UserStatus } from 'src/user/user.status';
import { User } from 'src/user/entity/user.entity';
import { ChatRoomUser } from './entity/chat.room.user.entity';
import { ChatHistory } from './entity/chat.history.entity';
import { Block } from './entity/chat.block.entity';


@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,

		@InjectRepository(ChatRoomUser)
		private chatRoomUserRepository: Repository<ChatRoomUser>,
		
		@InjectRepository(ChatHistory)
		private chatHistoryRepository: Repository<ChatHistory>,

		@InjectRepository(Block)
		private blockRepository: Repository<Block>,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,
	) {}

	async findAll(): Promise<ChatRoom []> {
		return await this.chatRoomRepository.find({
			relations: {
				users: {
					user: true,
				},
				owner: true,
				ban: true,
			}
		})
	}

	async findOne(id: number): Promise<ChatRoom> {
		return await this.chatRoomRepository.findOne({
			where: {
				id: id,
			},
			relations: {
				users: {
					user: true,
				},
				history: true,
				owner: true,
				ban: true,
				block: {
					from: true,
					to: true,
				}
			}
		})
	}

	async findRoomUser(user: User, room: ChatRoom): Promise<ChatRoomUser> {
		return await this.chatRoomUserRepository.findOne({
			where: {
				user: user,
				room: room,
			}
		})
	}


	async isExist(id: number): Promise<boolean> {
		return await this.findOne(id) === null ? false : true;
	}

	async isExistUser(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return await this.findRoomUser(user, room) !== null ? true : false;
	}





	/*---------------채팅방---------------*/
	
	async createChatRoom(server: Server, client: Socket, body: any) {
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);

		const newRoom = this.chatRoomRepository.create({
			status: body.status,
			title: body.title,
			password: body.status === 'protected' ? body.password : null,
			owner: user,
			users: [],
			ban: [],
		});
		
		await this.chatRoomRepository.save(newRoom);

		const newChatRoomUser = this.chatRoomUserRepository.create({
			room: newRoom,
			user: user,
			time: new Date(Date.now()),
		})
		await this.chatRoomUserRepository.save(newChatRoomUser);

		this.result('createChatRoomResult', client, 'approved', 'createChatRoom', newRoom.id);

		const clients = await server.in('chatRoomList').fetchSockets();
		for	(const elem of clients) {
			if (elem.id === client.id) this.updateMyChatRoomList(name, client);
			else {
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.updateChatRoomList(elemName, await this.wsService.findClient(elemName));
			}
		}
	}








	async joinChatRoom(server: Server, client: Socket, body: any) {

		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));

		this.result('joinChatRoomResult', client, 'approved', 'joinChatROom', room.id);
		const newChatRoomUser = this.chatRoomUserRepository.create({
			user: user,
			room: room,
			time: new Date(Date.now()),
		});
		await this.chatRoomUserRepository.save(newChatRoomUser);

		setTimeout(() => {
			server.to('chatRoom' + room.id).emit('message', {
				type: 'chat',
				roomId: room.id,
				status: 'notice',
				from: 'server',
				content: `${user.name} 님이 입장하셨습니다.`,
			});
		}, 300);
		let newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${user.name} 님이 입장하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
		


		room = await this.findOne(body.roomId);
		
		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room);
		}

		clients = await server.in('chatRoomList').fetchSockets();

		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			let elemName = await this.wsService.findName(undefined, elem.id);
			this.updateChatRoomList(elemName, elemClient);
			this.updateMyChatRoomList(elemName, elemClient);
		}
	}






	async exitChatRoom(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));
		const chatRoomUser = await this.findRoomUser(user, room);

		if (!room || !chatRoomUser) return;
		this.result('exitChatRoomResult', client, 'approved', 'exitChatRoom', room.id);

		await this.chatRoomUserRepository.remove(chatRoomUser);

		// 방에 남은 유저가 한 명인 경우.
		if (room.users.length === 1) {
			await this.chatHistoryRepository.remove(room.history);
			await this.chatRoomRepository.remove(room);
			const clients = await server.in('chatRoomList').fetchSockets();
			for (const elem of clients) {
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.updateChatRoomList(elemName, await this.wsService.findClient(elemName));
			}
		} else {
			server.to('chatRoom' + room.id).emit('message', {
				type: 'chat',
				roomId: room.id,
				status: 'notice',
				from: 'server',
				content: `${user.name} 님이 퇴장하셨습니다.`
			})
			let newHistory = this.chatHistoryRepository.create({
				time: new Date(Date.now()),
				user: user,
				room: room,
				status: 'notice',
				content: `${user.name} 님이 퇴장하셨습니다.`,
			})
			await this.chatHistoryRepository.save(newHistory);
			// 나가는 유저가 소유자인 경우
			if (room.owner.id === user.id) {

				// admin이 없는 경우.
				if (room.users.find(elem => elem.admin === true) === undefined) {
					room = await this.findOne(body.roomId);
					room.owner = room.users[0].user;
				} else {
					await this.chatRoomUserRepository.find({
						where: {
							admin: true,
						},
						order: {
							time: 'ASC',
						}
					}).then(roomUsers => {
						roomUsers[0].admin = false;
						room.owner = roomUsers[0].user;
					})
				}

				await this.chatRoomRepository.save(room);
				server.to('chatRoom' + room.id).emit('message', {
					type: 'chat',
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${room.owner.name} 님이 새로운 소유자가 되었습니다.`
				})
				let newHistory = this.chatHistoryRepository.create({
					time: new Date(Date.now()),
					user: user,
					room: room,
					status: 'notice',
					content: `${room.owner.name} 님이 새로운 소유자가 되었습니다.`,
				})
				await this.chatHistoryRepository.save(newHistory);

				await this.chatRoomRepository.save(room);
			}

			room = await this.findOne(body.roomId);

			let clients = await server.in('chatRoom' + room.id).fetchSockets();
			for (const elem of clients) {
				let elemClient = await this.wsService.findClient(undefined, elem.id);
				this.updateChatRoom(elemClient, room);
			}

			clients = await server.in('chatRoomList').fetchSockets();
			for (const elem of clients) {
				let elemClient = await this.wsService.findClient(undefined, elem.id);
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.updateChatRoomList(elemName, elemClient);
				this.updateMyChatRoomList(elemName, elemClient);
			}
		}
	}


	async sendHistory(client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));
		const roomUser = await this.findRoomUser(user, room);
		if (roomUser === null) return;
		const joinTime = roomUser.time;

		const histories = await this.chatHistoryRepository.find({
			where: {
				room: room,
			},
			relations: {
				user: true,
			},
			order: {
				time: 'DESC',
			}
		});
		if (histories === null) return;

		let list: {
			status: string,
			from: string,
			content: string,
		}[] = [];

		for (const history of histories) {
			if (history.time < joinTime) break;

			list.unshift({
				status: history.status,
				from: history.status === 'plain' ? history.user.name : 'server',
				content: history.content,
			})
		}

		client.emit('message', {
			type: 'history',
			list: list,
		});
	}

	async chat(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));
		
		const newHistory = this.chatHistoryRepository.create({
			user: user,
			room: room,
			status: 'plain',
			content: body.content,
			time: new Date(Date.now()),
		})
		await this.chatHistoryRepository.save(newHistory);
		this.result('chatResult', client, 'approved', 'chat', room.id);
		
		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);

			if (await this.isBlock(room.id, elemClient, user.name)) continue;

			elemClient.emit('message', {
				type: 'chat',
				roomId: room.id,
				status: 'plain',
				from: user.name,
				content: body.content,
			})
		}
	}

	async kick(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		const chatRoomUser = await this.findRoomUser(user, room);
		await this.chatRoomUserRepository.remove(chatRoomUser);

		this.result('kickResult', client, 'approved', 'kick', room.id);

		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			let elemName = await this.wsService.findName(undefined, elem.id);

			if (elemName === user.name) {
				elemClient.emit('message', {
					type: 'kick',
					roomId: room.id,
					from: await this.wsService.findName(client),
				})
				elemClient.leave('chatRoom' + room.id);
			} else {
				elemClient.emit('message', {
					type: 'chat',
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 kick 하셨습니다.`,
				})
				this.updateChatRoom(elemClient, room);
			}
		}
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 kick 하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
	}
	
	async ban(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('banResult', client, 'approved', 'ban', room.id);
	
		const roomUser = await this.findRoomUser(user, room);
		await this.chatRoomUserRepository.remove(roomUser);

		room.ban.push(user);
		await this.chatRoomRepository.save(room);

		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);

			if (elemName === user.name) {
				elemClient.emit('message', {
					type: 'ban',
					roomId: room.id,
					from: await this.wsService.findName(client),
				})
				elemClient.leave('chatRoom' + room.id);
			} else {
				elemClient.emit('message', {
					type: 'chat',
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 ban 하셨습니다.`,
				})
				
				this.updateChatRoom(elemClient, room);
			}
		}
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 ban 하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
	}
	
	async unban(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('unbanResult', client, 'approved', 'unban', room.id);

		room.ban.splice(room.ban.findIndex(elem => elem.id === user.id), 1);
	
		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 unban 하셨습니다.`,
		})
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 unban 하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
	
		await this.chatRoomRepository.save(room);

		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room);
		}
	}

	async mute(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('muteResult', client, 'approved', 'mute', room.id);
	
		const roomUser = await this.findRoomUser(user, room);
		roomUser.muted = true;

		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 mute 하셨습니다.`,
		})
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 mute 하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);

		await this.chatRoomUserRepository.save(roomUser);

		room = await this.findOne(body.roomId);
		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			if (user.name === await this.wsService.findName(undefined, elem.id)) {
				const socket = await this.wsService.findClient(body.username);
				if (socket !== undefined) {
					socket.emit('message', {
						type: 'mute',
						roomId: room.id,
						from: await this.wsService.findName(client),
					})
				}
			}
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room);
		}

		setTimeout(async () => {
			roomUser.muted = false;
			await this.chatRoomUserRepository.save(roomUser);

			const clients = await server.in('chatRoom' + room.id).fetchSockets();
			for (const elem of clients) {
				let elemClient = await this.wsService.findClient(undefined, elem.id);
				this.updateChatRoom(elemClient, room);
			}
		}, 20000);

		
	}

	async block(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const from = await this.userService.findOne(await this.wsService.findName(client));
		const to = await this.userService.findOne(body.roomId);


		client.emit('blockResult', {
			status: 'approved',
			roomId: room.id,
		});


		const newBlock = this.blockRepository.create({
			room: room,
			from: from,
			to: to,
		});
		await this.blockRepository.save(newBlock);

		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			if (elem.id === client.id) {
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.updateBlockList(room.id, elemName, client);
				break;
			}
		}
	}

	async unBlock(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const from = await this.userService.findOne(await this.wsService.findName(client));
		const to = await this.userService.findOne(body.username);

		
		const block = await this.blockRepository.findOne({
			where: {
				room: room,
				from: from,
				to: to,
			}
		})
		if (block === null) return;

		client.emit('unblockResult', {
			status: 'approved',
			roomId: room.id,
		});

		await this.blockRepository.remove(block);
		
		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			if (elem.id === client.id) {
				let elemName = await this.wsService.findName(undefined, elem.id);
				this.updateBlockList(room.id, elemName, client);
				break;
			}
		}
	}

	async invite(server: Server, client: Socket, body: any) {
		const user = await this.userService.findOne(body.username);
		const room = await this.findOne(body.roomId);

		this.result('joinChatRoomResult', client, 'approved', 'joinChatROom', room.id);
		const newChatRoomUser = this.chatRoomUserRepository.create({
			user: user,
			room: room,
			time: new Date(Date.now()),
		});
		this.chatRoomUserRepository.save(newChatRoomUser);

		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${user.name} 님이 초대 되었습니다.`,
		});

		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${user.name} 님이 초대 되었습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);

		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room);
		}

		clients = await server.in('chatInvitation').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);

			if (elemName === user.name) {
				elemClient.emit('message', {
					type: 'chatInvitation',
					roomId: room.id,
					from: await this.wsService.findName(client),
				})
				break;
			}
		}

		clients = await server.in('chatRoomList').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			if (elemName === user.name) {
				this.updateMyChatRoomList(elemName, elemClient);
				this.updateChatRoomList(elemName, elemClient);
				break;
			}
		}
	}

	async appointAdmin(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		const roomUser = await this.findRoomUser(user, room);
		this.result('appointAdminResult', client, 'approved', 'appointAdmin', room.id);


		roomUser.admin = true;
		await this.chatRoomUserRepository.save(roomUser);

		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 관리자로 임명하셨습니다.`
		});
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 관리자로 임명하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
		room = await this.findOne(body.roomId);

		const clients = await server.in('chatRoom' + body.roomId).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room);
		}
	}

	async isBan(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.ban.find(elem => elem.id === user.id) !== undefined ? true : false;
	}

	async isMute(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		const roomUser = await this.findRoomUser(user, room);
		return roomUser.muted;
	}

	async isOwner(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.owner.id === user.id;
	}

	async isAdmin(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		const roomUser = await this.findRoomUser(user, room);
		return roomUser.admin;
	}
	
	async isBlock(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const from = await this.userService.findOne(await this.wsService.findName(client));
		const to = await this.userService.findOne(name);

		const block = await this.blockRepository.findOne({
			where: {
				room: room,
				from: from,
				to: to,
			}
		});
		return block !== null ? true : false;
	}

	async updateChatRoom(client: Socket, room: ChatRoom) {
		const userList: {
			username: string,
			owner: boolean,
			admin: boolean,
			muted: boolean
			login: boolean,
		} [] = [];

		const banList: {
			username: string
		} [] = [];

		for(let i = 0; i < room.users.length; ++i) {
			userList.push({
				username: room.users[i].user.name,
				owner: room.owner.id === room.users[i].user.id ? true : false,
				admin: room.users.find(elem => elem.id === room.users[i].id).admin,
				muted: room.users.find(elem => elem.id === room.users[i].id).muted,
				login: room.users[i].user.status === UserStatus.LOGIN ? true : false,
			})
		}

		for(let i = 0; i < room.ban.length; ++i) {
			banList.push({
				username: room.ban[i].name,
			});
		}

		client.emit('message', {
			type: 'chatRoom',
			roomId: room.id,
			userList: userList,
			banList: banList,
		});
	}


	async updateMyChatRoomList(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const list: {
			title: string,
			roomId: number,
			owner: string,
			status: string,
			joining: number,
		}[] = [];
		for(let i = 0; i < user.chat.length; ++i) {
			list.push({
				title: user.chat[i].room.title,
				roomId: user.chat[i].room.id,
				owner: user.chat[i].room.owner.name,
				status: user.chat[i].room.status,
				joining: user.chat[i].room.users.length,
			});
		}
		client.emit('message', {
			type: 'myRoom',
			list: list,
		});
	}

	async updateChatRoomList(name: string, client: Socket) {
		const chatRooms = await this.findAll();
		const user = await this.userService.findOne(name);

		const list: {
			status: string,
			title: string,
			roomId: number,
			owner: string,
			joining: number,
		}[] = [];

		for (let i = 0; i < chatRooms.length; ++i) {
			let room = chatRooms[i];

			if (room.status === RoomStatus.PRIVATE) continue;

			if (room.users.find(elem => elem.user.id === user.id) !== undefined) continue;

			list.push({
				status: room.status,
				title: room.title,
				roomId: room.id,
				owner: room.owner.name,
				joining: room.users.length,
			})
		}
		client.emit('message', {
			type: 'otherRoom',
			list: list,
		});
	}

	async updateBlockList(id: number, name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const blockList = await this.blockRepository.find({
			where: {
				room: {
					id: id
				},
				from: user,
			},
			relations: {
				to: true,
			}
		});

		let list: {
			username :string,
		} [] = [];

		for (let i = 0; i < blockList.length; ++i) {
			list.push({
				username: blockList[i].to.name,
			})
		};

		client.emit('message', {
			type: 'block',
			list: list,
		});
	}

	result(event: string, client: Socket, status: string, detail?: string, roomId?: number) {
		client.emit(event, {
			status: status,
			detail: detail,
			roomId: roomId,
		})
	}

}
