import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { jwtConstants } from "src/auth/constants";
import { WsService } from "./ws.service";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import * as jwt from 'jsonwebtoken';
import { ChatRoom } from "src/chat/entity/chat-room.entity";
import { InjectRepository } from "@nestjs/typeorm";

@WebSocketGateway({
	cors: { origin: '*' },
})
export class WsGateWay implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private wsService: WsService,
		
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,
		) {}
		
		@WebSocketServer()
		server: Server
		
		/*
		Socket connect Event
		*/
		async handleConnection(client: Socket) {
			try {
				const token = client.handshake.headers.authorization.split(' ')[1];
				// const decodedToken = jwt.verify(token, jwtConstants.otpSecret);
				const decodedToken = jwt.verify(token, jwtConstants.secret);
				await this.wsService.addUser(decodedToken['username'], client.id);
				console.log(`Client with IP ${client.id} is connected.`);
			} catch (error) {
				client.emit('error', {
				status: 'error',
				detail: 'Invalid Token.'
			})
		}
	}
	
	
	/*
	Socket Disconnect Event
	*/
	async handleDisconnect(client: Socket) {
		this.wsService.deleteUser(client.id);
		console.log(`Client with IP ${client.id} is disconnected.`);
	}
	
	
	
	/*
	Join Room Event
	*/
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(client: Socket, body: any) {

		
		const room_id = body.room_id;
		const username = await this.wsService.findUserByClientId(client.id);
		const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
		const user = await this.usersRepository.findOneBy({ username });


		/*
		Check body data format
		*/
		if (body.room_id === undefined) {
			client.emit('notice', {
				status: 'notice',
				content: '존재하지 않는 채팅방입니다.',
				detail: '`room_id` property is missing.'
			})
			return;
		}


		/*
			Check validation of room id
		*/
		if (chatRoom === null) {
			client.emit('notice', {
				status: 'notice',
				content: '존재하지 않는 채팅방입니다.',
				detail: 'nonexistent room_id.',
			})
			return;
		}
		

		/*
			Check if user is ban
		*/
		try {
			if (chatRoom.ban_list.find(element => element === username)) {
				client.emit('notice', {
					status: 'notice',
					content: '입장금지 목록에 등록되어 입장이 불가능합니다.',
					detail: 'This user is on ban list.'
				})
				return;
			}
		} catch {}


		/*
			Check Password for Protected chat room
		*/
		if (chatRoom.status === 'protected') {

			if (body.password === undefined){
				client.emit('notice', {
					status: 'notice',
					content: '비밀번호를 입력해주세요.',
					detail: '`password` property is missing. '
				})
				return;
			}

			if (chatRoom.password !== body.password) {
				client.emit('notice', {
					status: 'notice',
					content: '잘못된 비밀번호입니다.',
					detail: 'Invalid password.',
				})
				return;
			}
		}
		


		/*
			Check user for private chat room
		*/
		// private room에 초대된 사람인지 아닌지 검사.







		/*
			Insert user into chat room
		*/
		if (chatRoom.user_list === null) {
			chatRoom.user_list = [username];
		} else {
			if (chatRoom.user_list.find(element => element === username) === undefined)
				chatRoom.user_list.push(username);
		}
		await this.chatRoomRepository.save(chatRoom);
		
		
		/*
			Insert chat room into user
		*/
		if (user.chat_room_list === null ) {
			user.chat_room_list = [parseInt(room_id)];
		} else {
			if (user.chat_room_list.find(element => element === room_id) === undefined)
			{
				user.chat_room_list.push(room_id);
				this.server.to('room' + room_id).emit('chat', `${username}님이 채팅방에 입장하셨습니다.`);
				client.join('room' + room_id);
			}
		}
		await this.usersRepository.save(user);
			

	}
	

	/*
		Exit Room Event
	*/
	@SubscribeMessage('exitChatRoom')
	async exitChatRoom(client: Socket, body: any) {
		if (body.room_id === undefined) {
			client.emit('notice', {
				status: 'notice',
				content: '존재하지 않는 채팅방입니다.',
				detail: '`room_id` property is missing.'
			})
			return;
		}

		const room_id = body.room_id;
		const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
		if (chatRoom === null) {
			client.emit('notice', {
				status: 'notice',
				content: '존재하지 않는 채팅방입니다.',
				detail: 'nonexistent room_id.',
			})
			return;
		}

		const username = await this.wsService.findUserByClientId(client.id);
		let index = chatRoom.user_list.findIndex(element => element === username);
		if (index !== -1) chatRoom.user_list.splice(index, 1)
		else {
			client.emit('error', {
				status: 'error',
				detail: `This user is not a member of chat room id ${room_id}`,
			})
			return;
		}

		try {
			index = chatRoom.admin_list.findIndex(element => element === username);
			if (index !== -1) chatRoom.admin_list.splice(index, 1)
		} catch {}
		
		const user = await this.usersRepository.findOneBy({ username });
		index = user.chat_room_list.findIndex(element => element === room_id);
		if (index !== -1) user.chat_room_list.splice(index, 1)
		else {
			client.emit('error', {
				status: 'error',
				detail: `This user is not a member of chat room id ${room_id}`,
			})
			return;
		}


		client.leave('room' + room_id);
		this.server.to('room' + room_id).emit('chat', `${username}님이 채팅방에서 나가셨습니다.`);
		await this.usersRepository.save(user);
		await this.chatRoomRepository.save(chatRoom);


		if (chatRoom.user_list.length === 0) {
			await this.chatRoomRepository.delete({ room_id: room_id });
			return;
		}

		if (chatRoom.owner === username) {
			chatRoom.owner = chatRoom.user_list[0];
			
			index = chatRoom.admin_list.findIndex(element => element === chatRoom.user_list[0]);
			if (index !== -1) chatRoom.admin_list.splice(index, 1)

			this.server.to('room' + room_id).emit('chat', `${chatRoom.owner}님이 새로운 소유자가 되었습니다.`);
		}

		await this.chatRoomRepository.save(chatRoom);

	}



	/*
		Send Message Event
	*/
	@SubscribeMessage('chat')
	async chat(client: Socket, body: any) {

	}



	@SubscribeMessage('kickUser')
	async kickUser(client: Socket, body: any) {

	}


	@SubscribeMessage('banUser')
	async banUser(client: Socket, body: any) {

	}

	@SubscribeMessage('block')
	async blockUser(client: Socket, body: any) {
		
	}


}