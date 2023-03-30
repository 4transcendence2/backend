import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatRoomDto } from './dto/chat-room-create.dto';
import { ChatRoom } from './entity/chat-room.entity';
import { User } from 'src/user/entity/user.entity';
import { WsGateWay } from 'src/ws/ws.gateway';
import { WsService } from 'src/ws/ws.service';


@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,

		@InjectRepository(User)
		private usersRepository: Repository<User>,

		private wsGateway: WsGateWay,
		private wsService: WsService,
	) {}

	async createRoom(roomInfo: CreateChatRoomDto, username: string) {
		const newRoom: ChatRoom = this.chatRoomRepository.create({
			status: roomInfo.status,
			title: roomInfo.title,
			owner: username,
			password: roomInfo.password,
		});

		try {
			await this.chatRoomRepository.insert(newRoom);

			const room_id = newRoom.room_id;
			const user = await this.usersRepository.findOneBy({ username });
			const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });


			if (chatRoom.user_list === null) {
				chatRoom.user_list = [username];
			} else {
				if (chatRoom.user_list.find(element => element === username) === undefined)
					chatRoom.user_list.push(username);
			}
			await this.chatRoomRepository.save(chatRoom);

			if (user.chat_room_list === null ) {
				user.chat_room_list = [room_id];
			} else {
				if (user.chat_room_list.find(element => element === room_id) === undefined)
					user.chat_room_list.push(room_id);
			}
			await this.usersRepository.save(user);

			const server = this.wsGateway.server;
			const clientId = await this.wsService.findClientIdByUsername(username);

			const client = server.sockets.sockets.get(clientId);
			client.join('room' + room_id);

		} catch(error) {
			console.log(error);
			const detail: string = newRoom.status === 'protected' ? 'Password is required for protected room.' : 'Password is not required for public or private room.';
			return {
				status: "error",
				detail: detail,
			}
		}

		return {
			status: "approved",
			detail: "Chat room is created.",
		};
	}

}
