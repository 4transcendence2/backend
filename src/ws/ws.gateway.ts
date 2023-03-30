import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { jwtConstants } from "src/auth/constants";
import { WsService } from "./ws.service";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import * as jwt from 'jsonwebtoken';
import { ChatRoom } from "src/chat/entity/chat-room.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ChatService } from "src/chat/chat.service";
import { Inject, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";

@WebSocketGateway({
	cors: { origin: '*' },
})
export class WsGateWay implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private wsService: WsService,

		@Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
		
		private userService: UserService,

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
			const decodedToken = jwt.verify(token, jwtConstants.secret);
			const username = decodedToken['username'];
			await this.wsService.addUser(username, client.id);

			const user = await this.usersRepository.findOneBy({ username });
			user.status = 'login';
			await this.usersRepository.save(user);
			await this.wsService.updateUsers(this.server);
			await this.wsService.updateFriends(client, this.server);
			await this.chatService.updateMyRooms(client);
			await this.chatService.updateRoomsToOne(client);
			console.log(`Client ${username} with Socket ID ${client.id} is connected.`);
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
		const username = await this.wsService.findUserByClientId(client.id);
		const user = await this.usersRepository.findOneBy({ username });
		user.status = 'logout';
		this.usersRepository.save(user)
		await this.wsService.deleteUser(client.id);
		await this.wsService.updateUsers(this.server);
		await this.wsService.updateFriends(client, this.server);
		console.log(`Client ${username} with Socket ID ${client.id} is disconnected.`);
	}


	/*
	Join Room Event
	*/
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(client: Socket, body: any) {

		const room_id = body.room_id;

		// 로그인 중인 유저인지 확인
		if (!(await this.wsService.isLogin(client))) return;


		// room_id 프로퍼티가 있는지 확인
		if (room_id === undefined) {
			client.emit('notice', {
				status: 'notice',
				detail: 'room_id 프로퍼티가 없습니다.'
			})
			return;
		}

		// 존재하는 방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;
		

		// 밴 당한 유저인지 확인
		if (await this.chatService.isBanUser(room_id, client)) return;


		// 비밀번호 확인
		const chatRoom = await this.chatService.findRoomById(room_id);
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





		// 유저, 채팅방 데이터베이스 업데이트
		await this.chatService.addUser(room_id, client, this.server);

		// 채팅방 업데이트
		await this.chatService.updateRoom(room_id, this.server);

	}
	
	/*
		Exit Room Event
	*/
	@SubscribeMessage('exitChatRoom')
	async exitChatRoom(client: Socket, body: any) {
		const room_id = body.room_id;

		// room_id 프로퍼티 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id 프로퍼티가 없습니다."
			})
			return;
		}

		// 로그인 중인 유저인지 확인
		if (!(await this.wsService.isLogin(client))) return;

		// 존재하는 방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;


		// 채팅방의 멤버인지 확인
		if (!(await this.chatService.isExistUser(room_id, client))) return;


		// 유저, 채팅방 데이터베이스 업데이트
		await this.chatService.removeUser(room_id, client, this.server);

		// 자신이 현재 joinning 중인 채팅방 목록 업데이트.
		await this.chatService.updateMyRooms(client);

	}



	/*
		Chat
	*/
	@SubscribeMessage('chat')
	async chat(client: Socket, body: any) {
		const username = await this.wsService.findUserByClientId(client.id);
		const room_id = body.room_id;
		const content = body.content;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// content 프로퍼티가 입력되었는지 확인
		if (content === undefined) {
			client.emit('error', {
				status: "error",
				detail: "content property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;

		// 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, client))) return;

		// 대상이 muted인지 확인
		if (await this.chatService.isMute(room_id, client)) return;


		// 블락 확인해야함
		this.server.to('room' + room_id).emit('chat', {
			status: 'chat',
			who: username,
			detail: content,
		})
	}


	/*
		Kick
	*/
	@SubscribeMessage('kick')
	async kick(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.room_id;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;


		// 킥 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			client.emit('error', {
				status: "error",
				detail: "username property가 없습니다."
			})
			return;
		}

		// 킥 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername, client))) return;

		// 킥 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) return;

		// 킥 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			client.emit('notice', {
				status: "notice",
				detail: "권한이 없습니다."
			})
		}

		// 킥 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			client.emit('notice', {
				status: "notice",
				detail: "소유자는 ban 할 수 없습니다."
			})
		}

		// 자기 자신을 킥 하는지 확인.
		if (fromUsername === toUsername) {
			client.emit('notice', {
				status: "notice",
				detail: "자신은 kick 할 수 없습니다."
			})
			return;
		}

		await this.chatService.removeUser(room_id, client, this.server);
		this.server.to('room' + room_id).emit('chat', {
			status: "notice",
			detail: `${fromUsername}님이 ${toUsername}님을 추방하셨습니다.`
		});
		await this.chatService.updateRoom(room_id, this.server);

	}


	/*
		Ban
	*/
	@SubscribeMessage('ban')
	async ban(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.room_id;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;


		// 밴 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			client.emit('error', {
				status: "error",
				detail: "username property가 없습니다."
			})
			return;
		}

		// 밴 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername, client))) return;

		// 밴 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) return;

		// ban 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			client.emit('notice', {
				status: "notice",
				detail: "권한이 없습니다."
			})
		}

		// 밴 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			client.emit('notice', {
				status: "notice",
				detail: "소유자는 ban 할 수 없습니다."
			})
		}

		// 자기 자신을 밴 하는지 확인.
		if (fromUsername === toUsername) {
			client.emit('notice', {
				status: "notice",
				detail: "자신은 ban 할 수 없습니다."
			})
			return;
		}


		await this.chatService.removeUser(room_id, client, this.server);

		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.ban_list === null || chatRoom.ban_list.length === 0) {
			chatRoom.ban_list = [toUsername];
		} else {
			chatRoom.ban_list.push(toUsername);
		}
		this.server.to('room' + room_id).emit('chat', {
			status: "notice",
			detail: `${fromUsername}님이 ${toUsername}님을 ban 하셨습니다.`
		});
		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);
	}


	/*
		Unban
	*/
	@SubscribeMessage('unban')
	async unBan(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.room_id;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;

		// 언밴 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			client.emit('error', {
				status: "error",
				detail: "username property가 없습니다."
			})
			return;
		}

		// 언밴 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername, client))) return;


		// 언밴 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			client.emit('notice', {
				status: "notice",
				detail: "권한이 없습니다."
			})
		}

		// 언밴 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			client.emit('notice', {
				status: "notice",
				detail: "소유자는 unban 할 수 없습니다."
			})
		}

		// 자기 자신을 언밴 하는지 확인.
		if (fromUsername === toUsername) {
			client.emit('notice', {
				status: "notice",
				detail: "자신은 unban 할 수 없습니다."
			})
			return;
		}

		// 밴 목록에 있는 유저인지 확인
		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.ban_list === null || chatRoom.ban_list.length ===0) {
			client.emit('notice', {
				status: 'notice',
				detail: 'unban할 유저가 없습니다.'
			})
			return;
		} else {
			let index = chatRoom.ban_list.findIndex(element => element === toUsername);
			if (index === -1) {
				client.emit('notice', {
					status: "notice",
					detail: 'unban할 유저가 없습니다.'
				})
				return;
			} else {
				chatRoom.ban_list.splice(index, 1);
			}
		}
		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);


	}

	/*
		Mute
	*/
	@SubscribeMessage('mute')
	async mute(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.room_id;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;


		// mute 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			client.emit('error', {
				status: "error",
				detail: "username property가 없습니다."
			})
			return;
		}

		// mute 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername, client))) return;

		// mute 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) return;

		// mute 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			client.emit('notice', {
				status: "notice",
				detail: "권한이 없습니다."
			})
		}

		// mute 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			client.emit('notice', {
				status: "notice",
				detail: "소유자는 mute 할 수 없습니다."
			})
		}

		// 자기 자신을 mute 하는지 확인.
		if (fromUsername === toUsername) {
			client.emit('notice', {
				status: "notice",
				detail: "자신은 mute 할 수 없습니다."
			})
			return;
		}

		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) {
			chatRoom.mute_list = [toUsername];
		} else {
			if (chatRoom.mute_list.find(element => element === toUsername) === undefined) {
				chatRoom.mute_list.push(toUsername);
			}
		}
		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);
	}


	/*
		Unmute
	*/
	@SubscribeMessage('unmute')
	async unmute(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.room_id;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) return;

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			client.emit('error', {
				status: "error",
				detail: "room_id property가 없습니다."
			})
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id, client))) return;


		// unmute 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			client.emit('error', {
				status: "error",
				detail: "username property가 없습니다."
			})
			return;
		}

		// unmute 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername, client))) return;

		// unmute 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) return;

		// unmute 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			client.emit('notice', {
				status: "notice",
				detail: "권한이 없습니다."
			})
		}

		// unmute 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			client.emit('notice', {
				status: "notice",
				detail: "소유자는 unmute 할 수 없습니다."
			})
		}

		// 자기 자신을 unmute 하는지 확인.
		if (fromUsername === toUsername) {
			client.emit('notice', {
				status: "notice",
				detail: "자신은 unmute 할 수 없습니다."
			})
			return;
		}


		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) {
			client.emit('notice', {
				status: "notice",
				detail: "unmute 대상이 아닙니다."
			})
		} else {
			let index = chatRoom.mute_list.findIndex(element => element === toUsername);
			if (index === -1) {
				client.emit('notice', {
					status: "notice",
					detail: "unmute 대상이 아닙니다."
				})
			} else {
				chatRoom.mute_list.splice(index, 1);
			}
		}
		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);

	}




	/*
		Block
	*/
	@SubscribeMessage('block')
	async blockUser(client: Socket, body: any) {
		
	}


}