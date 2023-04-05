import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import * as jwt from 'jsonwebtoken';
import { ChatRoom } from "src/chat/entity/chat-room.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ChatService } from "src/chat/chat.service";
import { Inject, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";
require('dotenv').config();

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

			// 토큰 확인
			const token = client.handshake.headers.authorization.split(' ')[1];
			const decodedToken = jwt.verify(token, process.env.SECRET);
			const username = decodedToken['username'];


			// 현재 연결중인 유저 목록에 등록
			const result = await this.wsService.addUser(username, client.id);
			if (result === false) {
				client.emit('error', {
					status: 'error',
					detail: '이미 접속 중 입니다.'
				})
				client.disconnect();
				return;
			}


			// 유저 상태, 로그인으로 변경
			const user = await this.userService.findOne(username);
			user.status = 'login';
			await this.usersRepository.save(user);
			

			// 친구, 채팅방, 내 채팅방, DM, 게임방 업데이트
			await this.wsService.initUpdate(this.server, client);

			// console.log(`Client ${username} with Socket ID ${client.id} is connected.`);

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
		await this.wsService.updateFriend(this.server, client);
		// console.log(`Client ${username} with Socket ID ${client.id} is disconnected.`);
	}


	/*
	Join Room Event
	*/
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(client: Socket, body: any) {

		const room_id = body.roomId;

		// 로그인 중인 유저인지 확인
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.joinChatRoomResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}


		// room_id 프로퍼티가 있는지 확인
		if (room_id === undefined) {
			await this.chatService.joinChatRoomResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// 존재하는 방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.joinChatRoomResult(client, 'warning', '존재하지 않는 방입니다.');
			return
		}
		


		// 밴 당한 유저인지 확인
		if (await this.chatService.isBanUser(room_id, client)) {
			await this.chatService.joinChatRoomResult(client, 'warning', '해당 방에서 ban 당하셨습니다.');
			return;
		}


		// 비밀번호 확인
		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.status === 'protected') {
			if (body.password === undefined) {
				await this.chatService.joinChatRoomResult(client, 'warning', '비밀번호를 입력해주세요.');
				return;
			}

			if (chatRoom.password !== body.password) {
				await this.chatService.joinChatRoomResult(client, 'warning', '잘못된 비밀번호입니다.');
				return;
			}
		}




		/*
			Check user for private chat room
		*/
		// private room에 초대된 사람인지 아닌지 검사.


		await this.chatService.joinChatRoomResult(client, 'approved');

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
		const room_id = body.roomId;

		// room_id 프로퍼티 확인
		if (room_id === undefined) {
			this.chatService.exitChatRoomResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// 로그인 중인 유저인지 확인
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.exitChatRoomResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// 존재하는 방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.exitChatRoomResult(client, 'error', '존재하지 않는 방입니다.')
			return;
		}


		// 채팅방의 멤버인지 확인
		if (!(await this.chatService.isExistUser(room_id, client))) {
			await this.chatService.exitChatRoomResult(client, 'error', '해당 방의 유저가 아닙니다.');
			return;
		}

		await this.chatService.exitChatRoomResult(client, 'approved');

		// 유저, 채팅방 데이터베이스 업데이트
		await this.chatService.removeUser(room_id, client, this.server);
		
		// 자신이 현재 joinning 중인 채팅방 목록 업데이트.
		await this.chatService.updateMyChatRoomList(client);
		}



	/*
		Chat
	*/
	@SubscribeMessage('chat')
	async chat(client: Socket, body: any) {
		const username = await this.wsService.findUserByClientId(client.id);
		const room_id = body.roomId;
		const content = body.content;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.chatResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			await this.chatService.chatResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// content 프로퍼티가 입력되었는지 확인
		if (content === undefined) {
			await this.chatService.chatResult(client, 'error', 'content 프로퍼티가 없습니다.');
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.chatResult(client, 'error', '존재하지 않는 채팅방입니다.')
			return;
		}

		// 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, client))) {
			await this.chatService.chatResult(client, 'error', '해당 방의 유저가 아닙니다.');
			return;
		}


		// 대상이 muted인지 확인
		if (await this.chatService.isMute(room_id, client)) {
			await this.chatService.chatResult(client, 'warning', 'Mute 당하셨습니다.');
			return;
		}


		// 블락 확인해야함
		await this.chatService.chatResult(client, 'approved');

		this.server.to('room' + room_id).emit('chat', {
			status: 'plain',
			from: username,
			content: content,
		})
	}


	/*
		Kick
	*/
	@SubscribeMessage('kick')
	async kick(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.roomId;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.kickResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			await this.chatService.kickResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.kickResult(client, 'error', '존재하지 않는 채팅방입니다.');
			return;
		}


		// 킥 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			await this.chatService.kickResult(client, 'error', 'username 프로퍼티가 없습니다.')
			return;
		}

		// 킥 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername))) {
			await this.chatService.kickResult(client, 'error', '대상이 존재하지 않습니다.');
			return;
		}

		// 킥 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) {
			await this.chatService.kickResult(client, 'error', '방에 존재하는 유저가 아닙니다.');
			return;
		}

		// 킥 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			await this.chatService.kickResult(client, 'warning', '권한이 없습니다.');
			return;
		}

		// 킥 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			await this.chatService.kickResult(client, 'warning', '소유자는 kick 할 수 없습니다.');
			return;
		}

		// 자기 자신을 킥 하는지 확인.
		if (fromUsername === toUsername) {
			await this.chatService.kickResult(client, 'warning', '자신은 kick 할 수 없습니다.');
			return;
		}


		await this.chatService.removeUser(room_id, client, this.server);
		await this.chatService.kickResult(client, 'approved');
		this.server.to('room' + room_id).emit('chat', {
			status: "notice",
			from: 'server',
			content: `${fromUsername}님이 ${toUsername}님을 추방하셨습니다.`
		});
		await this.chatService.updateRoom(room_id, this.server);
		
		// 추방당한 유저 업데이트해줘야함
	}


	/*
		Ban
	*/
	@SubscribeMessage('ban')
	async ban(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.roomId;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.banResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			await this.chatService.banResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.banResult(client, 'error', '존재하지 않는 방입니다.');
			return;
		}


		// 밴 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			await this.chatService.banResult(client, 'error', 'username 프로퍼티가 없습니다.');
			return;
		}

		// 밴 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername))) {
			await this.chatService.banResult(client, 'error', '존재하지 않는 대상입니다.');
			return;
		}

		// 밴 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) {
			await this.chatService.banResult(client, 'error', '방에 존재하지 않는 대상입니다.');
			return;
		}

		// ban 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			await this.chatService.banResult(client, 'warning', '권한이 없습니다.');
			return;
		}


		// 밴 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			await this.chatService.banResult(client, 'warning', '소유자는 ban 할 수 없습니다.');
			return;
		}

		// 자기 자신을 밴 하는지 확인.
		if (fromUsername === toUsername) {
			await this.chatService.banResult(client, 'warning', '자신은 ban 할 수 없습니다.');
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
			from: 'server',
			content: `${fromUsername}님이 ${toUsername}님을 ban 하셨습니다.`
		});
		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);

		//밴 당한 유저 업데이트
	}


	/*
		Unban
	*/
	@SubscribeMessage('unban')
	async unBan(client: Socket, body: any) {
		const fromUsername = await this.wsService.findUserByClientId(client.id);
		const toUsername = body.username;
		const room_id = body.roomId;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.unbanResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			await this.chatService.unbanResult(client, 'error', 'room_id property가 없습니다.')
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.unbanResult(client, 'error', '존재하지 않는 채팅방입니다.');
			return;
		}

		// 언밴 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			await this.chatService.unbanResult(client, 'error', 'username 프로퍼티가 없습니다.');
			return;
		}

		// 언밴 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername))) {
			await this.chatService.unbanResult(client, 'error', '존재하지 않는 대상입니다.');
			return;
		}


		// 언밴 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			await this.chatService.unbanResult(client, 'warning', '권한이 없습니다.');
			return;
		}

		// 언밴 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			await this.chatService.unbanResult(client, 'warning', '소유자는 unban 할 수 없습니다.');
			return;
		}

		// 자기 자신을 언밴 하는지 확인.
		if (fromUsername === toUsername) {
			await this.chatService.unbanResult(client, 'warning', '자신은 unban 할 수 없습니다.');
			return;
		}

		// 밴 목록에 있는 유저인지 확인
		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.ban_list === null || chatRoom.ban_list.length === 0) {
			await this.chatService.unbanResult(client, 'warning', 'ban 목록에 등록되지 않은 유저입니다.')
			return;
		} else {
			let index = chatRoom.ban_list.findIndex(element => element === toUsername);
			if (index === -1) {
				await this.chatService.unbanResult(client, 'warning', 'ban 목록에 등록되지 않은 유저입니다.')
				return;
			} else {
				chatRoom.ban_list.splice(index, 1);
			}
		}

		await this.chatService.unbanResult(client, 'approved');
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
		const room_id = body.roomId;


		// 접속중인 유저의 요청인지 확인.
		if (!(await this.wsService.isLogin(client))) {
			await this.chatService.muteResult(client, 'error', '접속중인 유저가 아닙니다.');
			return;
		}

		// room_id 프로퍼티가 입력되었는지 확인
		if (room_id === undefined) {
			await this.chatService.muteResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
			return;
		}

		// 존재하는 채팅방인지 확인
		if (!(await this.chatService.isExist(room_id))) {
			await this.chatService.muteResult(client, 'error', '존재하지 않는 채팅방입니다.');
			return;
		}


		// mute 대상 유저 프로퍼티가 입력되었는지 확인
		if (toUsername === undefined) {
			await this.chatService.muteResult(client, 'error', 'username 프로퍼티가 없습니다.');
			return;
		}

		// mute 대상이 존재하는 유저인지 확인
		if (!(await this.userService.isExist(toUsername))) {
			await this.chatService.muteResult(client, 'error', '존재하지 않는 대상입니다.');
			return;
		}

		// mute 대상이 방에 존재하는 유저인지 확인
		if (!(await this.chatService.isExistUser(room_id, toUsername))) {
			await this.chatService.muteResult(client, 'error', '방에 존재하지 않는 대상입니다.');
			return;
		}

		// mute 권한이 있는지 확인
		if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
			await this.chatService.muteResult(client, 'warning', '권한이 없습니다.');
			return;
		}

		// 이미 mute된 대상인지
		const chatRoom = await this.chatService.findRoomById(room_id);
		if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) {
			chatRoom.mute_list = [toUsername];
		} else {
			if (chatRoom.mute_list.find(element => element === toUsername) === undefined) {
				chatRoom.mute_list.push(toUsername);
				setTimeout(async () => {
					let tmpChatRoom = await this.chatService.findRoomById(room_id);
					let index = tmpChatRoom.mute_list.findIndex(element => element === fromUsername);
					tmpChatRoom.mute_list.splice(index, 1);
					await this.chatRoomRepository.save(tmpChatRoom);
					await this.chatService.updateRoom(room_id, this.server);
				}, 60000);
			} else {
				await this.chatService.banResult(client, 'warning', '이미 mute된 대상입니다.');
				return;
			}
		}


		// mute 대상이 소유자인지 확인
		if (await this.chatService.isOwner(toUsername, room_id)) {
			await this.chatService.muteResult(client, 'warning', '소유자는 mute 할 수 없습니다.');
			return;
		}

		// 자기 자신을 mute 하는지 확인.
		if (fromUsername === toUsername) {
			await this.chatService.muteResult(client, 'warning', '자신은 mute 할 수 없습니다.');
			return;
		}

		await this.chatRoomRepository.save(chatRoom);
		await this.chatService.updateRoom(room_id, this.server);
	}


	/*
		Unmute
	*/
	// @SubscribeMessage('unmute')
	// async unmute(client: Socket, body: any) {
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;
	// 	const room_id = body.roomId;


	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) return;

	// 	// room_id 프로퍼티가 입력되었는지 확인
	// 	if (room_id === undefined) {
	// 		client.emit('error', {
	// 			status: "error",
	// 			detail: "room_id property가 없습니다."
	// 		})
	// 		return;
	// 	}

	// 	// 존재하는 채팅방인지 확인
	// 	if (!(await this.chatService.isExist(room_id, client))) return;


	// 	// unmute 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		client.emit('error', {
	// 			status: "error",
	// 			detail: "username property가 없습니다."
	// 		})
	// 		return;
	// 	}

	// 	// unmute 대상이 존재하는 유저인지 확인
	// 	if (!(await this.userService.isExist(toUsername, client))) return;

	// 	// unmute 대상이 방에 존재하는 유저인지 확인
	// 	if (!(await this.chatService.isExistUser(room_id, toUsername))) return;

	// 	// unmute 권한이 있는지 확인
	// 	if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
	// 		client.emit('notice', {
	// 			status: "notice",
	// 			detail: "권한이 없습니다."
	// 		})
	// 	}

	// 	// unmute 대상이 소유자인지 확인
	// 	if (await this.chatService.isOwner(toUsername, room_id)) {
	// 		client.emit('notice', {
	// 			status: "notice",
	// 			detail: "소유자는 unmute 할 수 없습니다."
	// 		})
	// 	}

	// 	// 자기 자신을 unmute 하는지 확인.
	// 	if (fromUsername === toUsername) {
	// 		client.emit('notice', {
	// 			status: "notice",
	// 			detail: "자신은 unmute 할 수 없습니다."
	// 		})
	// 		return;
	// 	}


	// 	const chatRoom = await this.chatService.findRoomById(room_id);
	// 	if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) {
	// 		client.emit('notice', {
	// 			status: "notice",
	// 			detail: "unmute 대상이 아닙니다."
	// 		})
	// 	} else {
	// 		let index = chatRoom.mute_list.findIndex(element => element === toUsername);
	// 		if (index === -1) {
	// 			client.emit('notice', {
	// 				status: "notice",
	// 				detail: "unmute 대상이 아닙니다."
	// 			})
	// 		} else {
	// 			chatRoom.mute_list.splice(index, 1);
	// 		}
	// 	}
	// 	await this.chatRoomRepository.save(chatRoom);
	// 	await this.chatService.updateRoom(room_id, this.server);

	// }




	/*
		Block
	*/
	@SubscribeMessage('block')
	async blockUser(client: Socket, body: any) {
		
	}


}