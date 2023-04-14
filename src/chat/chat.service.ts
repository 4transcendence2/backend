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
				owner: true,
				ban: true,
				mute: true,
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

	async isExistUser(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.user.find(elem => elem.id === user.id) !== undefined ? true : false;
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





	/*---------------채팅방---------------*/
	
	async createChatRoom(server: Server, client: Socket, body: any) {
		const name = await this.wsService.findName(client);
		const user = await this.userService.findOne(name);

		const newRoom = this.chatRoomRepository.create({
			status: body.status,
			title: body.title,
			password: body.status === 'protected' ? body.password : null,
			owner: user,
			user: [user],
			mute: [],
			ban: [],
			admin: []
		});

		this.result('createChatRoomResult', client, 'approved', undefined, newRoom.id);
		client.join('room' + newRoom.id);
		await this.chatRoomRepository.save(newRoom);
		const users = this.wsService.getLoginUsers();
		await this.updateMyChatRoomList(name, client);
		users.forEach(async elem => {
			await this.updateChatRoomList(elem.name, elem.client);
		});
	}

	async joinChatRoom(server: Server, client: Socket, body: any) {
		
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));

		this.result('joinChatRoomResult', client, 'approved', undefined, room.id);
		if (room.user.find(elem => elem.id === user.id) === undefined) {
			room.user.push(user);
			await this.chatRoomRepository.save(room);
	
			client.join('room' + room.id);
			server.to('room' + room.id).emit('chat', {
				roomId: room.id,
				status: 'notice',
				from: 'server',
				content: `${user.name} 님이 입장하셨습니다.`,
			});
		}

		await this.updateChatRoom(room);
		this.wsService.getLoginUsers().forEach(elem => {
			this.updateChatRoomList(elem.name, elem.client);
			this.updateMyChatRoomList(elem.name, elem.client);
		})
	}

	async exitChatRoom(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));


		client.leave('room' + body.roomId);
		this.result('exitChatRoomResult', client, 'approved', undefined, room.id);

		// 방에 남은 유저가 한 명인 경우.
		if (room.user.length === 1) {
			await this.chatRoomRepository.remove(room);
			const users = this.wsService.getLoginUsers();
			users.forEach(elem => {
				this.updateChatRoomList(elem.name, elem.client);
			});
			await this.updateMyChatRoomList(user.name, client);
		} else {

			let index = room.user.findIndex(elem => elem.id === user.id);
			room.user.splice(index, 1);
			
			server.to('room' + room.id).emit('chat', {
				roomId: room.id,
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
				server.to('room' + room.id).emit('chat', {
					roomId: room.id,
					status: 'notice',
					from: 'server',
					content: `${room.owner.name} 님이 새로운 소유자가 되었습니다.`
				})
			}

			await this.chatRoomRepository.save(room);
			this.wsService.getLoginUsers().forEach(elem => {
				this.updateChatRoomList(elem.name, elem.client);
				this.updateMyChatRoomList(elem.name, elem.client);
			});
			this.updateChatRoom(room);
		}
	}

	async chat(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));
		this.result('chatResult', client, 'approved', undefined, room.id);
		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'plain',
			from: user.name,
			content: body.content,
		});
	}

	async kick(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('kickResult', client, 'approved', undefined, room.id);

		let index = room.user.findIndex(elem => elem.id === user.id);
		room.user.splice(index, 1);

		const socket = await this.wsService.findClient(user.name);
		if (socket !== undefined) {
			socket.leave('room' + room.id);
		}

		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 kick 하셨습니다.`,
		})

		await this.chatRoomRepository.save(room);
		this.updateChatRoom(room);
		this.wsService.getLoginUsers().forEach(elem => {
			this.updateChatRoomList(elem.name, elem.client);
			this.updateMyChatRoomList(elem.name, elem.client);
		});
	}
	
	async ban(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('banResult', client, 'approved', undefined, room.id);
	
		let index = room.user.findIndex(elem => elem.id === user.id);
		room.user.splice(index, 1);

		room.ban.push(user);
	
		const socket = await this.wsService.findClient(user.name);
		if (socket !== undefined) {
			socket.leave('room' + room.id);
		}
	
		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 ban 하셨습니다.`,
		})
	
		await this.chatRoomRepository.save(room);
		this.updateChatRoom(room);
		this.wsService.getLoginUsers().forEach(elem => {
			this.updateChatRoomList(elem.name, elem.client);
			this.updateMyChatRoomList(elem.name, elem.client);
		});
	}
	
	async unban(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('unbanResult', client, 'approved', undefined, room.id);

		room.ban.splice(room.ban.findIndex(elem => elem.id === user.id), 1);
	
		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 unban 하셨습니다.`,
		})
	
		await this.chatRoomRepository.save(room);
		this.updateChatRoom(room);
	}

	async mute(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('muteResult', client, 'approved', undefined, room.id);
	
		room.mute.push(user);

		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)} 님이 ${user.name} 님을 mute 하셨습니다.`,
		})
	
		await this.chatRoomRepository.save(room);
		setTimeout(async () => {
			const tmpRoom = await this.findOne(body.roomId);
			tmpRoom.mute.splice(tmpRoom.mute.findIndex(elem => elem.id === user.id), 1);
			await this.chatRoomRepository.save(tmpRoom);
		}, 10000);
	}

	async appointAdmin(server: Server, client: Socket, body: any) {
		const room = await this.findOne(body.roomId);
		const user = await this.userService.findOne(body.username);
		this.result('appointAdminResult', client, 'approved', undefined, room.id);


		room.admin.push(user);
		await this.chatRoomRepository.save(room);

		server.to('room' + room.id).emit('chat', {
			roomId: room.id,
			status: 'notice',
			from: 'server',
			content: `${await this.wsService.findName(client)}님이 ${user.name}님을 관리자로 임명하셨습니다.`
		});
	}

	async isBan(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.ban.find(elem => elem.id === user.id) !== undefined ? true : false;
	}

	async isMute(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.mute.find(elem => elem.id === user.id) !== undefined ? true : false;
	}

	async isOwner(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.owner.id === user.id;
	}

	async isAdmin(id: number, client: Socket, name?: string): Promise<boolean> {
		const room = await this.findOne(id);
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return room.admin.find(elem => elem.id === user.id) !== undefined ? true : false;
	}
	
	async updateChatRoom(room: ChatRoom) {
		const userList: {
			username: string,
			owner: boolean,
			admin: boolean,
			login: boolean,
		} [] = [];

		const banList: {
			username: string
		} [] = [];
		for(let i = 0; i < room.user.length; ++i) {
			userList.push({
				username: room.user[i].name,
				owner: room.owner.id === room.user[i].id ? true : false,
				admin: room.admin.find(elem => elem.id === room.user[i].id) !== undefined ? true : false,
				login: room.user[i].status === UserStatus.LOGIN ? true : false,
			})
		}

		for(let i = 0; i < room.ban.length; ++i) {
			banList.push({
				username: room.ban[i].name,
			});
		}

		for(let i = 0; i < room.user.length; ++i) {
			if (room.user[i].status === UserStatus.LOGIN) {
				(await this.wsService.findClient(room.user[i].name)).emit('updateChatRoom', {
					roomId: room.id,
					userList: userList,
					banList: banList,
				})
			}
		}
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
				title: user.chat[i].title,
				roomId: user.chat[i].id,
				owner: user.chat[i].owner.name,
				status: user.chat[i].status,
				joining: user.chat[i].user.length,
			});
		}
		client.emit('updateMyChatRoomList', list);
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
			if (room.user.find(elem => elem.id === user.id) !== undefined) continue;
			list.push({
				status: room.status,
				title: room.title,
				roomId: room.id,
				owner: room.owner.name,
				joining: room.user.length,
			})
		}
		client.emit('updateChatRoomList', list);
	}

	result(event: string, client: Socket, status: string, detail?: string, roomId?: number) {
		client.emit(event, {
			status: status,
			detail: detail,
			roomid: roomId,
		})
	}
}
