import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entity/chat.room.entity';
import { WsService } from 'src/ws/ws.service';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import Dm from './entity/chat.dm.entity';
import { RoomStatus } from './chat.room.status';
import { UserStatus } from 'src/user/user.status';


@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,

		@InjectRepository(Dm)
		private dmRepository: Repository<Dm>,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,
	) {}

	async findAll(): Promise<ChatRoom []> {
		return await this.chatRoomRepository.find({
			relations: {
				user: true,
				admin: true,
				mute: true,
				ban: true,
				owner: true,
			}
		})
	}

	async findOne(id: number): Promise<ChatRoom> {
		return await this.chatRoomRepository.findOne({
			where: {
				id: id,
			},
			relations: {
				user: true,
				admin: true,
				mute: true,
				ban: true,
				owner: true,
			}
		})
	}


	async isExist(id: number): Promise<boolean> {
		return await this.findOne(id) === null ? false : true;
	}

	async isExistUser(id: number, client: Socket): Promise<boolean> {
		const room = await this.findOne(id);
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);
		return room.user.find(elem => elem.id === user.id) !== undefined ? true : false;
	}

	// async isOwner(username: string, room_id: number): Promise<boolean> {
	// 	const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
	// 	return username === chatRoom.owner ? true : false;
	// }

	// async isAdmin(username: string, room_id: number): Promise<boolean> {
	// 	const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
	// 	try {
	// 		return chatRoom.admin_list.find(element => element === username) !== undefined ? true : false;
	// 	} catch {
	// 		return false;
	// 	}
	// }

	async isBan(id: number, client: Socket): Promise<boolean> {
		const room = await this.findOne(id);
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);
		return room.ban.find(elem => elem.id === user.id) !== undefined ? true : false;
	}

	// async isMute(room_id: number, client: Socket): Promise<boolean> {
	// 	const chatRoom = await this.findRoomById(room_id);
	// 	const username = await this.wsService.findUserByClientId(client.id);
	// 	if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) return false;
	// 	if (chatRoom.mute_list.find(element => element === username) === undefined) return false;
	// 	return true;
	// }


	async joinChatRoom(client: Socket, body: any) {
		
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));

		room.user.push(user);
		await this.chatRoomRepository.save(room);

		this.result('joinChatRoomResult', client, 'approved');
		client.join('room' + room.id);
		client.to('room' + room.id).emit('chat', {
			status: 'notice',
			from: 'server',
			content: `${user.name} 님이 입장하셨습니다.`,
		});

		await this.updateChatRoom(room);
	}

	async exitChatRoom(client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);


		
		
		client.leave('room' + body.roomId);
		
		// 방에 남은 유저가 한 명인 경우.
		if (room.user.length === 1) {
			await this.chatRoomRepository.remove(room);
			this.result('exitChatRoomResult', client, 'approved');
			const users = this.wsService.getLoginUsers();
			users.forEach(elem => {
				this.updateChatRoomList(elem.name, elem.client);
			});
			await this.updateMyChatRoomList(name, client);
			return;
		}
				
		let index = room.user.findIndex(elem => elem.id === user.id);
		room.user.splice(index, 1);

		client.to('room' + room.id).emit('chat', {
			status: 'notice',
			from: 'server',
			content: `${user.name} 님이 퇴장하셨습니다.`
		})

		// 나가는 유저가 소유자인 경우
		if (room.owner.id === user.id) {
			
			// admin이 없는 경우.
			if (room.admin.length === 0) {
				room.owner = room.user[0];
			} else { //admin이 있는 경우.
				room.owner = room.admin[0];
				room.admin.splice(0, 1);
			}

			await this.chatRoomRepository.save(room);

			client.to('room' + room.id).emit('chat', {
				status: 'notice',
				from: 'server',
				content: `${room.owner.name} 님이 새로운 소유자가 되었습니다.`
			})
			this.updateChatRoom(room);
			return;
		}

		// 나가는 유저가 관리자인 경우
		index = room.admin.findIndex(elem => elem.id === user.id);
		if (index !== -1) {
			room.admin.splice(index, 1);
			await this.chatRoomRepository.save(room);
			this.updateChatRoom(room);
			return;
		}
	}

	// async removeUser(room_id: number, client: Socket, server: Server) {
	// 	const username = await this.wsService.findUserByClientId(client.id);
	// 	const chatRoom = await this.findRoomById(room_id);

	// 	await this.userService.exitChatRoom(username, room_id);
	// 	await client.leave('room' + room_id);

	// 	// 방에 마지막 남은 유저가 한 명(소유자)인 경우
	// 	if (chatRoom.user_list.length === 1) {
	// 		await this.chatRoomRepository.delete({ room_id: room_id });
	// 		await this.updateChatRoomList(server);
	// 		return;
	// 	}


	// 	let index = chatRoom.user_list.findIndex(element => element === username);
	// 	chatRoom.user_list.splice(index, 1);

	// 	server.to('room' + room_id).emit('chat', {
	// 		status: "notice",
	// 		from: 'server',
	// 		content: `${username}님이 퇴장하셨습니다.`,
	// 	})



	// 	// 나가는 유저가 방의 소유자이고, 방에 남은 인원이 2명 이상인 경우
	// 	if (await this.isOwner(username, room_id)) {

	// 		// 방에 관리자가 없는 경우 가장 빨리 들어온 유저가 소유자가 됨.
	// 		if (chatRoom.admin_list === null || chatRoom.admin_list.length === 0) {
	// 			chatRoom.owner = chatRoom.user_list[0];
	// 		} else { // 방에 관리자가 있는 경우 첫 번째 관리자가 소유자가 됨
	// 			chatRoom.owner = chatRoom.admin_list[0];
	// 			chatRoom.admin_list.splice(0, 1);
	// 		}
	// 		server.to('room' + room_id).emit('chat', {
	// 			status: "notice",
	// 			from: 'server',
	// 			content: `${chatRoom.owner}님이 새로운 소유자가 되었습니다.`,
	// 		})
	// 	}

	// 	// 나가는 유저가 관리자인 경우
	// 	if (await this.isAdmin(username, room_id)) {
	// 		index = chatRoom.admin_list.findIndex(element => element === username);
	// 		chatRoom.admin_list.splice(index, 1);
	// 	}
		

	// 	if (chatRoom.mute_list !== null && chatRoom.mute_list.length > 0) {
	// 		index = chatRoom.mute_list.findIndex(element => element === username);
	// 		if (index !== -1)
	// 			chatRoom.mute_list.splice(index, 1);
	// 	}

	// 	await this.chatRoomRepository.save(chatRoom);
	// }

	// async addUser(room_id: number, client: Socket, server: Server) {
	// 	const username = await this.wsService.findUserByClientId(client.id);
	// 	const chatRoom = await this.findRoomById(room_id);

	// 	if (chatRoom.user_list === null || chatRoom.user_list.length === 0) {
	// 		chatRoom.user_list = [username];
	// 	} else {
	// 		if (await this.isExistUser(room_id, client)) return;
	// 		chatRoom.user_list.push(username);
	// 	}
	// 	await this.chatRoomRepository.save(chatRoom);
	// 	await this.userService.joinChatRoom(username, room_id);
	// 	client.join('room' + room_id);
	// 	server.to('room' + room_id).emit('chat', {
	// 		status: "notice",
	// 		from: 'server',
	// 		content: `${username}님이 입장하셨습니다.`,
	// 	})
	// }



	
	async updateChatRoom(room: ChatRoom) {
		const userList: {
			username: string,
			owner: boolean,
			admin: boolean,
			login: boolean,
			ban: boolean,
		} [] = [];

		for(let i = 0; i < room.user.length; ++i) {
			userList.push({
				username: room.user[i].name,
				owner: room.owner.id === room.user[i].id ? true : false,
				admin: room.admin.find(elem => elem.id === room.user[i].id) !== undefined ? true : false,
				login: room.user[i].status === UserStatus.LOGIN ? true : false,
				ban: room.ban.find(elem => elem.id === room.user[i].id) !== undefined ? true : false,
			})
		}

		for(let i = 0; i < room.user.length; ++i) {
			if (room.user[i].status === UserStatus.LOGIN) {
				(await this.wsService.findClient(room.user[i].name)).emit('updateChatRoom', {
					userList: userList,
				});
			}
		}
	}

	async createChatRoom(client: Socket, body: any) {
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);

		const newRoom = this.chatRoomRepository.create({
			status: body.status,
			title: body.title,
			password: body.status === 'protected' ? body.password : null,
			owner: user,
			admin: [],
			user: [user],
			mute: [],
			ban: [],
		});

		this.result('joinChatRoomResult', client, 'approved');


		client.join('room' + newRoom.id);
		await this.chatRoomRepository.save(newRoom);
		await this.updateMyChatRoomList(name, client);
		const users = this.wsService.getLoginUsers();
		users.forEach(async elem => {
			await this.updateChatRoomList(elem.name, elem.client);
		});
	}

	async joinRooms(name: string, client: Socket) {
		const user = await this.userService.findOne(name);

		for(let i = 0; i < user.chat.length; ++i) {
			client.join('room' + user.chat[i].id);
		}

		// dm join
	}

	async leaveRooms(name: string, client: Socket) {
		const user = await this.userService.findOne(name);

		for(let i = 0; i < user.chat.length; ++i) {
			client.leave('room' + user.chat[i].id);
		}

		// dm leave
	}


	

	async updateChatRoomList(name: string, client: Socket) {
		const chatRooms = await this.findAll();
		const user = await this.userService.findOne(name);
		const list: {
			status: string,
			title: string,
			roomId: number,
			owner: string,
		}[] = [];
		for (let i = 0; i < chatRooms.length; ++i) {
			let room = chatRooms[i];
			if (room.status === RoomStatus.PRIVATE) continue;
			if (room.user.find(elem => elem.id === user.id) !== undefined) continue;
			list.push({
				status: room.status,
				title: room.title,
				roomId: room.id,
				owner: room.owner.name,
			})
		}
		client.emit('updateChatRoomList', list);
	}

	// async updateDmList(client: Socket) {
	// 	const username = await this.wsService.findUserByClientId(client.id);
	// 	const user = await this.userService.findOne(username);

	// 	const dmList: {
	// 		roomId: number,
	// 		opponent: string,
	// 	}[] = [];

	// 	if (user.dm_list === null || user.dm_list === undefined || user.dm_list.length === 0) {
	// 		client.emit('updateDmList', []);
	// 		return;
	// 	}

	// 	user.dm_list.forEach(dm => {
	// 		if (dm.user_list[0] === user) {
	// 			dmList.push({
	// 				roomId: dm.id,
	// 				opponent: dm.user_list[1].username,
	// 			})
	// 		} else {
	// 			dmList.push({
	// 				roomId: dm.id,
	// 				opponent: dm.user_list[0].username,
	// 			})
	// 		}
	// 	})
	// 	client.emit('updateDmList', dmList);

	// }

	async updateMyChatRoomList(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const list: {
			title: string,
			roomId: number,
			owner: string,
			status: string,
		}[] = [];
		for(let i = 0; i < user.chat.length; ++i) {
			list.push({
				title: user.chat[i].title,
				roomId: user.chat[i].id,
				owner: user.chat[i].owner.name,
				status: user.chat[i].status,
			});
		}
		client.emit('updateMyChatRoomList', list);
	}


	// async createDmRoomResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('createDmRoomResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }
	
	// async dmResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('dmResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async exitDmRoomResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('exitDmRoomResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	result(event: string, client: Socket, status: string, detail?: string) {
		client.emit(event, {
			status: status,
			detail: detail,
		})
	}


	// async joinChatRoomResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('joinChatRoomResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async exitChatRoomResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('exitChatRoomResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async chatResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('chatResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async kickResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('kickResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async banResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('banResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async unbanResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('unbanResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

	// async muteResult(client: Socket, status: string, detail?: string) {
	// 	client.emit('muteResult', {
	// 		status: status,
	// 		detail: detail,
	// 	})
	// }

}
