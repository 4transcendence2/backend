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
				users: true,
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
				users: true,
				owner: true,
				ban: true,
				block: true,
			}
		}).catch();
	}

	async findAllRoomUser(room: ChatRoom): Promise<ChatRoomUser[]> {
		return await this.chatRoomUserRepository.find({
			where: {
				room: room,
			},
			relations: {
				user: true,
				room: true,
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

	async findHistory(room: ChatRoom): Promise<ChatHistory[]> {
		return await this.chatHistoryRepository.find({
			where: {
				room: room,
			}
		});
	}

	async findBlock(room: ChatRoom): Promise<Block[]> {
		return await this.blockRepository.find({
			where: {
				room: room,
			}
		});
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
			if (elem.id === client.id) {
				this.updateMyChatRoomList(name, client);
			} else {
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

		let newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${user.name} 님이 입장하셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${user.name} 님이 입장하셨습니다.`,
		});

		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room.id);
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
		room = await this.findOne(body.roomId);
		// 방에 남은 유저가 한 명인 경우.
		if (room.users.length === 0) {
			const blockList = await this.findBlock(room);
			const history = await this.findHistory(room);
			await this.blockRepository.remove(blockList);
			await this.chatHistoryRepository.remove(history);
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
				let roomUsers = await this.chatRoomUserRepository.find({
					where: {
						room: room,
						admin: true,
					},
					order: {
						time: 'ASC',
					},
					relations: {
						user: true,
					}
				});

				// admin이 없는 경우.
				room = await this.findOne(body.roomId);
				if (roomUsers.length === 0) {
					roomUsers = await this.findAllRoomUser(room);
					room.owner = roomUsers[0].user;
				} else {
					roomUsers[0].admin = false;
					room.owner = roomUsers[0].user;
					await this.chatRoomUserRepository.save(roomUsers[0]);
				}
				await this.chatRoomRepository.save(room);
				room = await this.findOne(body.roomId);
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
			}

			room = await this.findOne(body.roomId);
			let clients = await server.in('chatRoom' + room.id).fetchSockets();
			for (const elem of clients) {
				let elemClient = await this.wsService.findClient(undefined, elem.id);
				this.updateChatRoom(elemClient, room.id);
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
		const blockList = await this.blockRepository.find({
			where: {
				room: room,
				from: user,
			},
			relations: {
				to: true,
			}
		});

		if (room === null) return;
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

			if (blockList.find(elem => elem.to.name === history.user.name) !== undefined) {
				continue;
			}

			list.unshift({
				status: history.status,
				from: history.status === 'plain' ? history.user.name : 'server',
				content: history.content,
			})
		}

		client.emit('message', {
			type: 'history',
			roomId: room.id,
			list: list,
		});
	}

	// async sendHistory(id: number, user: User) {

	// }

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
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		const chatRoomUser = await this.findRoomUser(user, room);
		await this.chatRoomUserRepository.remove(chatRoomUser);

		this.result('kickResult', client, 'approved', 'kick', room.id);

		room = await this.findOne(body.roomId);
		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			let elemName = await this.wsService.findName(undefined, elem.id);

			if (elemName === user.name) {
				elemClient.emit('message', {
					type: 'kick',
					roomId: room.id,
					from: await this.wsService.findName(client),
				})
				await elemClient.leave('chatRoom' + room.id);
			} else {
				elemClient.emit('message', {
					type: 'chat',
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 kick 하셨습니다.`,
				})
				this.updateChatRoom(elemClient, room.id);
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

		clients = await server.in('chatRoomList').fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			let elemName = await this.wsService.findName(undefined, elem.id);
			this.updateMyChatRoomList(elemName, elemClient);
			this.updateChatRoomList(elemName, elemClient);
		}

	}

	async ban(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('banResult', client, 'approved', 'ban', room.id);
	
		const roomUser = await this.findRoomUser(user, room);
		await this.chatRoomUserRepository.remove(roomUser);

		room.ban.push(user);
		await this.chatRoomRepository.save(room);

		room = await this.findOne(body.roomId);
		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);

			if (elemName === user.name) {
				elemClient.emit('message', {
					type: 'ban',
					roomId: room.id,
					from: await this.wsService.findName(client),
				})
				await elemClient.leave('chatRoom' + room.id);
			} else {
				elemClient.emit('message', {
					type: 'chat',
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 ban 하셨습니다.`,
				})
				
				this.updateChatRoom(elemClient, room.id);
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


		clients = await server.in('chatRoomList').fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			let elemName = await this.wsService.findName(undefined, elem.id);
			this.updateMyChatRoomList(elemName, elemClient);
			this.updateChatRoomList(elemName, elemClient);
		}
	}


	async unban(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('unbanResult', client, 'approved', 'unban', room.id);

		room.ban.splice(room.ban.findIndex(elem => elem.id === user.id), 1);
		await this.chatRoomRepository.save(room);
	
		room = await this.findOne(body.roomId);
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
	

		const clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room.id);
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
			this.updateChatRoom(elemClient, room.id);
		}

		setTimeout(async () => {

			roomUser.muted = false;
			await this.chatRoomUserRepository.save(roomUser);
			room = await this.findOne(body.roomId);
			const clients = await server.in('chatRoom' + room.id).fetchSockets();
			for (const elem of clients) {
				let elemClient = await this.wsService.findClient(undefined, elem.id);
				this.updateChatRoom(elemClient, room.id);
			}
		}, 20000);

		
	}

	async block(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const from = await this.userService.findOne(await this.wsService.findName(client));
		const to = await this.userService.findOne(body.username);

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
		let room = await this.findOne(body.roomId);

		this.result('inviteChatResult', client, 'approved', 'inviteChat', room.id);
		const newChatRoomUser = this.chatRoomUserRepository.create({
			user: user,
			room: room,
			time: new Date(Date.now()),
		});
		await this.chatRoomUserRepository.save(newChatRoomUser);

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

		room = await this.findOne(body.roomId);
		let clients = await server.in('chatRoom' + room.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room.id);
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

		const clients = await server.in('chatRoom' + body.roomId).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room.id);
		}
	}

	async dismissAdmin(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		const roomUser = await this.findRoomUser(user, room);
		this.result('dismissAdminResult', client, 'approved', 'dismissAdmin', room.id);


		roomUser.admin = false;
		await this.chatRoomUserRepository.save(roomUser);

		server.to('chatRoom' + room.id).emit('message', {
			type: 'chat',
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${user.name}님이 관리자에서 해임되셨습니다.`
		});
		const newHistory = this.chatHistoryRepository.create({
			time: new Date(Date.now()),
			user: user,
			room: room,
			status: 'notice',
			content: `${user.name}님이 관리자에서 해임되셨습니다.`,
		})
		await this.chatHistoryRepository.save(newHistory);
		room = await this.findOne(body.roomId);

		const clients = await server.in('chatRoom' + body.roomId).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoom(elemClient, room.id);
		}
	}

	async setPassword(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		room.status = RoomStatus.PROTECTED;
		room.password = body.password;

		client.emit('setPasswordResult', {
			status: 'approved',
			roomId: room.id,
		})

		await this.chatRoomRepository.save(room);
		const clients = await server.in('chatRoomList').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoomList(elemName, elemClient);
			this.updateMyChatRoomList(elemName, elemClient);
		}
	}

	async changePassword(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		room.password = body.password;

		client.emit('changePasswordResult', {
			status: 'approved',
			roomId: room.id,
		})


		await this.chatRoomRepository.save(room);
	}

	async removePassword(server: Server, client: Socket, body: any) {
		let room = await this.findOne(body.roomId);
		room.status = RoomStatus.PULBIC;
		room.password = body.password;

		client.emit('removePasswordResult', {
			status: 'approved',
			roomId: room.id,
		})

		await this.chatRoomRepository.save(room);
		const clients = await server.in('chatRoomList').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			this.updateChatRoomList(elemName, elemClient);
			this.updateMyChatRoomList(elemName, elemClient);
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

	async updateChatRoom(client: Socket, id: number) {
		const room = await this.findOne(id);
		const roomUsers = await this.findAllRoomUser(room);

		if (room === null || roomUsers === null) return;

		const userList: {
			username: string,
			owner: boolean,
			admin: boolean,
			muted: boolean,
			status: string,
		} [] = [];

		const banList: {
			username: string
		} [] = [];

		if (roomUsers !== null) {
			for (const roomUser of roomUsers) {
				userList.push({
					username: roomUser.user.name,
					owner: room.owner.id === roomUser.user.id ? true : false,
					admin: roomUser.admin,
					muted: roomUser.muted,
					status: roomUser.user.status,
				});
			}
		}
		for (const ban of room.ban) {
			banList.push({
				username: ban.name,
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

		for (const chat of user.chat) {
			let room = await this.findOne(chat.room.id);
			list.push({
				title:room.title, 
				roomId: room.id,
				owner: room.owner.name,
				status: room.status,
				joining: room.users.length,
			})
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

		for(const room of chatRooms) {
			if (room.status === RoomStatus.PRIVATE) continue;
			if (await this.findRoomUser(user, room) !== null) continue;

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

		if (blockList.length > 0) {
			for (const elem of blockList) {
				list.push({
					username: elem.to.name,
				});
			}
		}

		client.emit('message', {
			type: 'block',
			roomId: id,
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
