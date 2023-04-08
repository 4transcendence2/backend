import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatRoomDto } from './dto/chat-room-create.dto';
import { ChatRoom } from './entity/chat.room.entity';
import { User } from 'src/user/entity/user.entity';
import { WsGateWay } from 'src/ws/ws.gateway';
import { WsService } from 'src/ws/ws.service';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { use } from 'passport';
import Dm from './entity/chat.dm.entity';


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

	async findRoomById(room_id: number): Promise<ChatRoom> {
		return await this.chatRoomRepository.findOneBy({ room_id });
	}

	async isExist(room_id: number): Promise<boolean> {
		if (await this.findRoomById(room_id) === undefined) return false;
		return true;
	}

	async isExistUser(room_id: number, client: Socket): Promise<boolean> {
		const username = await this.wsService.findUserByClientId(client.id);
		const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });

		if (chatRoom.user_list.find(element => element === username) === undefined) return false;
		return true;
	}

	async isOwner(username: string, room_id: number): Promise<boolean> {
		const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
		return username === chatRoom.owner ? true : false;
	}

	async isAdmin(username: string, room_id: number): Promise<boolean> {
		const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
		try {
			return chatRoom.admin_list.find(element => element === username) !== undefined ? true : false;
		} catch {
			return false;
		}
	}

	async isBanUser(room_id: number, client: Socket): Promise<boolean> {
		const username = await this.wsService.findUserByClientId(client.id);
		const chatRoom = await this.findRoomById(room_id);
		if (chatRoom.ban_list === null || chatRoom.ban_list.length === 0) return false;

		if (chatRoom.ban_list.find(element => element === username) !== undefined) return true;
		return false;
	}

	async isMute(room_id: number, client: Socket): Promise<boolean> {
		const chatRoom = await this.findRoomById(room_id);
		const username = await this.wsService.findUserByClientId(client.id);
		if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) return false;
		if (chatRoom.mute_list.find(element => element === username) === undefined) return false;
		return true;
	}

	async removeUser(room_id: number, client: Socket, server: Server) {
		const username = await this.wsService.findUserByClientId(client.id);
		const chatRoom = await this.findRoomById(room_id);

		await this.userService.exitChatRoom(username, room_id);
		await client.leave('room' + room_id);

		// 방에 마지막 남은 유저가 한 명(소유자)인 경우
		if (chatRoom.user_list.length === 1) {
			await this.chatRoomRepository.delete({ room_id: room_id });
			await this.updateChatRoomList(server);
			return;
		}


		let index = chatRoom.user_list.findIndex(element => element === username);
		chatRoom.user_list.splice(index, 1);

		server.to('room' + room_id).emit('chat', {
			status: "notice",
			from: 'server',
			content: `${username}님이 퇴장하셨습니다.`,
		})



		// 나가는 유저가 방의 소유자이고, 방에 남은 인원이 2명 이상인 경우
		if (await this.isOwner(username, room_id)) {

			// 방에 관리자가 없는 경우 가장 빨리 들어온 유저가 소유자가 됨.
			if (chatRoom.admin_list === null || chatRoom.admin_list.length === 0) {
				chatRoom.owner = chatRoom.user_list[0];
			} else { // 방에 관리자가 있는 경우 첫 번째 관리자가 소유자가 됨
				chatRoom.owner = chatRoom.admin_list[0];
				chatRoom.admin_list.splice(0, 1);
			}
			server.to('room' + room_id).emit('chat', {
				status: "notice",
				from: 'server',
				content: `${chatRoom.owner}님이 새로운 소유자가 되었습니다.`,
			})
		}

		// 나가는 유저가 관리자인 경우
		if (await this.isAdmin(username, room_id)) {
			index = chatRoom.admin_list.findIndex(element => element === username);
			chatRoom.admin_list.splice(index, 1);
		}
		

		if (chatRoom.mute_list !== null && chatRoom.mute_list.length > 0) {
			index = chatRoom.mute_list.findIndex(element => element === username);
			if (index !== -1)
				chatRoom.mute_list.splice(index, 1);
		}

		await this.chatRoomRepository.save(chatRoom);
	}

	async addUser(room_id: number, client: Socket, server: Server) {
		const username = await this.wsService.findUserByClientId(client.id);
		const chatRoom = await this.findRoomById(room_id);

		if (chatRoom.user_list === null || chatRoom.user_list.length === 0) {
			chatRoom.user_list = [username];
		} else {
			if (await this.isExistUser(room_id, client)) return;
			chatRoom.user_list.push(username);
		}
		await this.chatRoomRepository.save(chatRoom);
		await this.userService.joinChatRoom(username, room_id);
		client.join('room' + room_id);
		server.to('room' + room_id).emit('chat', {
			status: "notice",
			from: 'server',
			content: `${username}님이 입장하셨습니다.`,
		})
	}



	
	async updateRoom(room_id: number, server: Server) {
		const roomUserList: {
			username: string,
			owner: boolean,
			admin: boolean,
			login: boolean,
		} [] = [];

		const chatRoom = await this.findRoomById(room_id);
		chatRoom.user_list.forEach(async user => {
			let isOwner: boolean = false;
			let isAdmin: boolean = false;

			if (chatRoom.owner === user) isOwner = true;
			if (chatRoom.admin_list !== null && chatRoom.admin_list.length > 0 ) {
				if (chatRoom.admin_list.find(element => element === user) !== undefined) isAdmin = true;
			}
			roomUserList.push({
				username: user,
				owner: isOwner,
				admin: isAdmin,
				login: await this.wsService.isLogin(undefined, user),
			})
		})

		server.to('room' + room_id).emit('updateRoom', {
			joinningUsers: roomUserList,
			muteList: chatRoom.mute_list,
			banList: chatRoom.ban_list,
		});
	}

	async updateChatRoomList(server: Server, client?: Socket) {
		const chatRooms = await this.chatRoomRepository.find();
		const chatRoomList: {
			status: string,
			title: string,
			roomId: number,
		} [] = [];

		chatRooms.forEach(room => {
			if (room.status !== 'dm') {
				chatRoomList.push({
					status: room.status,
					title: room.title,
					roomId: room.room_id,
				})
			}
		})

		if (client === undefined)
			server.emit('updateChatRoomList', chatRoomList);
		else
			client.emit('updateChatRoomList', chatRoomList);
	}

	async updateDmList(client: Socket) {

	}

	async updateMyChatRoomList(client: Socket) {
		const username = await this.wsService.findUserByClientId(client.id);
		const user = await this.userService.findOne(username);
		const roomList: {
			title: string,
			roomId: number,
		}[] = []
		if (user.chat_room_list === null || user.chat_room_list.length === 0) {}
		else {
			user.chat_room_list.forEach(async room_id => {
				let chatRoom = await this.findRoomById(room_id);
				roomList.push({
					title: chatRoom.title,
					roomId: chatRoom.room_id,
				})
			})
		}
		client.emit('updateMyChatRoomList', roomList);
	}


	async dmResult(client: Socket, status: string, detail?: string) {
		client.emit('dmResult', {
			status: status,
			detail: detail,
		})
	}

	async createChatRoomResult(client: Socket, status: string, detail?: string) {
		client.emit('createChatRoomResult', {
			status: status,
			detail: detail,
		})
	}


	async joinChatRoomResult(client: Socket, status: string, detail?: string) {
		client.emit('joinChatRoomResult', {
			status: status,
			detail: detail,
		})
	}

	async exitChatRoomResult(client: Socket, status: string, detail?: string) {
		client.emit('exitChatRoomResult', {
			status: status,
			detail: detail,
		})
	}

	async chatResult(client: Socket, status: string, detail?: string) {
		client.emit('chatResult', {
			status: status,
			detail: detail,
		})
	}

	async kickResult(client: Socket, status: string, detail?: string) {
		client.emit('kickResult', {
			status: status,
			detail: detail,
		})
	}

	async banResult(client: Socket, status: string, detail?: string) {
		client.emit('banResult', {
			status: status,
			detail: detail,
		})
	}

	async unbanResult(client: Socket, status: string, detail?: string) {
		client.emit('unbanResult', {
			status: status,
			detail: detail,
		})
	}

	async muteResult(client: Socket, status: string, detail?: string) {
		client.emit('muteResult', {
			status: status,
			detail: detail,
		})
	}

}
