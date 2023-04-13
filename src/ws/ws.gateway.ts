import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import * as jwt from 'jsonwebtoken';
import { ChatRoom } from "src/chat/entity/chat.room.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ChatService } from "src/chat/chat.service";
import { Inject, UseGuards, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import Dm from "src/chat/entity/chat.dm.entity";
import { AuthService } from "src/auth/auth.service";
import { TokenGuard } from "./guard/ws.token.guard";
import { ChatGuard, CreateChatRoomGuard, ExitChatRoomGuard, JoinChatRoomGuard, KickGuard, LoginGuard } from "./guard/ws.guard";
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

		private authService: AuthService,

		@InjectRepository(User)
		private usersRepository: Repository<User>,
		
		@InjectRepository(ChatRoom)
		private chatRoomRepository: Repository<ChatRoom>,

		@InjectRepository(Dm)
		private dmRepository: Repository<Dm>,
	) {}

	@WebSocketServer()
	server: Server
	/*
		Socket connect Event
	*/
	async handleConnection(client: Socket) {
		await this.wsService.login(client);
	}

	/*
		Socket Disconnect Event
	*/
	async handleDisconnect(client: Socket) {
		await this.wsService.logout(client);
	}


	/*
		Create DM room
	*/


	/*
		DM
	*/


	/*
		Exit dm Room
	*/

	/*
		Create Chat Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(CreateChatRoomGuard)
	@SubscribeMessage('createChatRoom')
	async createChatRoom(client: Socket, body: any) {
		await this.chatService.createChatRoom(client, body);
	}


	/*
		Join Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinChatRoomGuard)
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(client: Socket, body: any) {
		await this.chatService.joinChatRoom(client, body);
	}
	
	/*
		Exit Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitChatRoomGuard)
	@SubscribeMessage('exitChatRoom')
	async exitChatRoom(client: Socket, body: any) {
		await this.chatService.exitChatRoom(client, body);
	}

	/*
		Chat
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChatGuard)
	@SubscribeMessage('chat')
	async chat(client: Socket, body: any) {
		await this.chatService.chat(client, body);
	}


	/*
		Kick
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(KickGuard)
	@SubscribeMessage('kick')
	async kick(client: Socket, body: any) {
	}
	// 	if (body === undefined) {
	// 		await this.chatService.kickResult(client, 'error', '전달받은 바디 데이터가 없습니다.');
	// 		return;
	// 	}
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;
	// 	const room_id = body.roomId;


	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) {
	// 		await this.chatService.kickResult(client, 'error', '접속중인 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// room_id 프로퍼티가 입력되었는지 확인
	// 	if (room_id === undefined) {
	// 		await this.chatService.kickResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 존재하는 채팅방인지 확인
	// 	if (!(await this.chatService.isExist(room_id))) {
	// 		await this.chatService.kickResult(client, 'error', '존재하지 않는 채팅방입니다.');
	// 		return;
	// 	}

	// 	// dm 룸인지 확인
	// 	const chatRoom = await this.chatService.findRoomById(room_id);
	// 	if (chatRoom.status === 'dm') {
	// 		await this.chatService.kickResult(client, 'warning', 'dm 방에서는 할 수 없습니다.')
	// 	}

	// 	// 킥 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		await this.chatService.kickResult(client, 'error', 'username 프로퍼티가 없습니다.')
	// 		return;
	// 	}

	// 	// 킥 대상이 존재하는 유저인지 확인
	// 	if (!(await this.userService.isExist(toUsername))) {
	// 		await this.chatService.kickResult(client, 'error', '대상이 존재하지 않습니다.');
	// 		return;
	// 	}

	// 	// 킥 대상이 방에 존재하는 유저인지 확인
	// 	if (!(await this.chatService.isExistUser(room_id, toUsername))) {
	// 		await this.chatService.kickResult(client, 'error', '방에 존재하는 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// 킥 권한이 있는지 확인
	// 	if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
	// 		await this.chatService.kickResult(client, 'warning', '권한이 없습니다.');
	// 		return;
	// 	}

	// 	// 킥 대상이 소유자인지 확인
	// 	if (await this.chatService.isOwner(toUsername, room_id)) {
	// 		await this.chatService.kickResult(client, 'warning', '소유자는 kick 할 수 없습니다.');
	// 		return;
	// 	}

	// 	// 자기 자신을 킥 하는지 확인.
	// 	if (fromUsername === toUsername) {
	// 		await this.chatService.kickResult(client, 'warning', '자신은 kick 할 수 없습니다.');
	// 		return;
	// 	}


	// 	await this.chatService.removeUser(room_id, client, this.server);
	// 	await this.chatService.kickResult(client, 'approved');
	// 	this.server.to('room' + room_id).emit('chat', {
	// 		status: "notice",
	// 		from: 'server',
	// 		content: `${fromUsername}님이 ${toUsername}님을 추방하셨습니다.`
	// 	});
	// 	await this.chatService.updateRoom(room_id, this.server);
		
	// 	// 추방당한 유저 업데이트해줘야함
	// }


	// /*
	// 	Ban
	// */
	// @SubscribeMessage('ban')
	// async ban(client: Socket, body: any) {
	// 	if (body === undefined) {
	// 		await this.chatService.banResult(client, 'error', '전달받은 바디 데이터가 없습니다.');
	// 		return;
	// 	}
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;
	// 	const room_id = body.roomId;


	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) {
	// 		await this.chatService.banResult(client, 'error', '접속중인 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// room_id 프로퍼티가 입력되었는지 확인
	// 	if (room_id === undefined) {
	// 		await this.chatService.banResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 존재하는 채팅방인지 확인
	// 	if (!(await this.chatService.isExist(room_id))) {
	// 		await this.chatService.banResult(client, 'error', '존재하지 않는 방입니다.');
	// 		return;
	// 	}

	// 	// dm 룸인지 확인
	// 	const chatRoom = await this.chatService.findRoomById(room_id);
	// 	if (chatRoom.status === 'dm') {
	// 		await this.chatService.banResult(client, 'warning', 'dm 방에서는 할 수 없습니다.')
	// 	}

	// 	// 밴 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		await this.chatService.banResult(client, 'error', 'username 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 밴 대상이 존재하는 유저인지 확인
	// 	if (!(await this.userService.isExist(toUsername))) {
	// 		await this.chatService.banResult(client, 'error', '존재하지 않는 대상입니다.');
	// 		return;
	// 	}

	// 	// 밴 대상이 방에 존재하는 유저인지 확인
	// 	if (!(await this.chatService.isExistUser(room_id, toUsername))) {
	// 		await this.chatService.banResult(client, 'error', '방에 존재하지 않는 대상입니다.');
	// 		return;
	// 	}

	// 	// ban 권한이 있는지 확인
	// 	if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
	// 		await this.chatService.banResult(client, 'warning', '권한이 없습니다.');
	// 		return;
	// 	}


	// 	// 밴 대상이 소유자인지 확인
	// 	if (await this.chatService.isOwner(toUsername, room_id)) {
	// 		await this.chatService.banResult(client, 'warning', '소유자는 ban 할 수 없습니다.');
	// 		return;
	// 	}

	// 	// 자기 자신을 밴 하는지 확인.
	// 	if (fromUsername === toUsername) {
	// 		await this.chatService.banResult(client, 'warning', '자신은 ban 할 수 없습니다.');
	// 		return;
	// 	}


	// 	await this.chatService.removeUser(room_id, client, this.server);
	// 	// if (chatRoom.ban_list === null || chatRoom.ban_list.length === 0) {
	// 	// 	chatRoom.ban_list = [toUsername];
	// 	// } else {
	// 	// 	chatRoom.ban_list.push(toUsername);
	// 	// }
	// 	// this.server.to('room' + room_id).emit('chat', {
	// 	// 	status: "notice",
	// 	// 	from: 'server',
	// 	// 	content: `${fromUsername}님이 ${toUsername}님을 ban 하셨습니다.`
	// 	// });
	// 	await this.chatRoomRepository.save(chatRoom);
	// 	await this.chatService.updateRoom(room_id, this.server);

	// 	//밴 당한 유저 업데이트
	// }


	// /*
	// 	Unban
	// */
	// @SubscribeMessage('unban')
	// async unBan(client: Socket, body: any) {
	// 	if (body === undefined) {
	// 		await this.chatService.unbanResult(client, 'error', '전달받은 바디 데이터가 없습니다.');
	// 		return;
	// 	}
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;
	// 	const room_id = body.roomId;


	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) {
	// 		await this.chatService.unbanResult(client, 'error', '접속중인 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// room_id 프로퍼티가 입력되었는지 확인
	// 	if (room_id === undefined) {
	// 		await this.chatService.unbanResult(client, 'error', 'room_id property가 없습니다.')
	// 		return;
	// 	}

	// 	// 존재하는 채팅방인지 확인
	// 	if (!(await this.chatService.isExist(room_id))) {
	// 		await this.chatService.unbanResult(client, 'error', '존재하지 않는 채팅방입니다.');
	// 		return;
	// 	}


	// 	// dm 룸인지 확인
	// 	const chatRoom = await this.chatService.findRoomById(room_id);
	// 	if (chatRoom.status === 'dm') {
	// 		await this.chatService.unbanResult(client, 'warning', 'dm 방에서는 할 수 없습니다.')
	// 	}

	// 	// 언밴 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		await this.chatService.unbanResult(client, 'error', 'username 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 언밴 대상이 존재하는 유저인지 확인
	// 	if (!(await this.userService.isExist(toUsername))) {
	// 		await this.chatService.unbanResult(client, 'error', '존재하지 않는 대상입니다.');
	// 		return;
	// 	}


	// 	// 언밴 권한이 있는지 확인
	// 	if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
	// 		await this.chatService.unbanResult(client, 'warning', '권한이 없습니다.');
	// 		return;
	// 	}

	// 	// 언밴 대상이 소유자인지 확인
	// 	if (await this.chatService.isOwner(toUsername, room_id)) {
	// 		await this.chatService.unbanResult(client, 'warning', '소유자는 unban 할 수 없습니다.');
	// 		return;
	// 	}

	// 	// 자기 자신을 언밴 하는지 확인.
	// 	if (fromUsername === toUsername) {
	// 		await this.chatService.unbanResult(client, 'warning', '자신은 unban 할 수 없습니다.');
	// 		return;
	// 	}

	// 	// 밴 목록에 있는 유저인지 확인
	// 	// const chatRoom = await this.chatService.findRoomById(room_id);
	// 	// if (chatRoom.ban_list === null || chatRoom.ban_list.length === 0) {
	// 	// 	await this.chatService.unbanResult(client, 'warning', 'ban 목록에 등록되지 않은 유저입니다.')
	// 	// 	return;
	// 	// } else {
	// 	// 	let index = chatRoom.ban_list.findIndex(element => element === toUsername);
	// 	// 	if (index === -1) {
	// 	// 		await this.chatService.unbanResult(client, 'warning', 'ban 목록에 등록되지 않은 유저입니다.')
	// 	// 		return;
	// 	// 	} else {
	// 	// 		chatRoom.ban_list.splice(index, 1);
	// 	// 	}
	// 	// }

	// 	await this.chatService.unbanResult(client, 'approved');
	// 	await this.chatRoomRepository.save(chatRoom);
	// 	await this.chatService.updateRoom(room_id, this.server);


	// }

	// /*
	// 	Mute
	// */
	// @SubscribeMessage('mute')
	// async mute(client: Socket, body: any) {
	// 	if (body === undefined) {
	// 		await this.chatService.muteResult(client, 'error', '전달받은 바디 데이터가 없습니다.');
	// 		return;
	// 	}
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;
	// 	const room_id = body.roomId;


	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) {
	// 		await this.chatService.muteResult(client, 'error', '접속중인 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// room_id 프로퍼티가 입력되었는지 확인
	// 	if (room_id === undefined) {
	// 		await this.chatService.muteResult(client, 'error', 'room_id 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 존재하는 채팅방인지 확인
	// 	if (!(await this.chatService.isExist(room_id))) {
	// 		await this.chatService.muteResult(client, 'error', '존재하지 않는 채팅방입니다.');
	// 		return;
	// 	}

	// 	// dm 룸인지 확인
	// 	const chatRoom = await this.chatService.findRoomById(room_id);
	// 	if (chatRoom.status === 'dm') {
	// 		await this.chatService.muteResult(client, 'warning', 'dm 방에서는 할 수 없습니다.')
	// 	}

	// 	// mute 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		await this.chatService.muteResult(client, 'error', 'username 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// mute 대상이 존재하는 유저인지 확인
	// 	if (!(await this.userService.isExist(toUsername))) {
	// 		await this.chatService.muteResult(client, 'error', '존재하지 않는 대상입니다.');
	// 		return;
	// 	}

	// 	// mute 대상이 방에 존재하는 유저인지 확인
	// 	if (!(await this.chatService.isExistUser(room_id, toUsername))) {
	// 		await this.chatService.muteResult(client, 'error', '방에 존재하지 않는 대상입니다.');
	// 		return;
	// 	}

	// 	// mute 권한이 있는지 확인
	// 	if (!(await this.chatService.isAdmin(fromUsername, room_id)) && !(await this.chatService.isOwner(fromUsername, room_id))) {
	// 		await this.chatService.muteResult(client, 'warning', '권한이 없습니다.');
	// 		return;
	// 	}

	// 	// 이미 mute된 대상인지
	// 	// if (chatRoom.mute_list === null || chatRoom.mute_list.length === 0) {
	// 	// 	chatRoom.mute_list = [toUsername];
	// 	// } else {
	// 	// 	if (chatRoom.mute_list.find(element => element === toUsername) === undefined) {
	// 	// 		chatRoom.mute_list.push(toUsername);
	// 	// 		setTimeout(async () => {
	// 	// 			let tmpChatRoom = await this.chatService.findRoomById(room_id);
	// 	// 			let index = tmpChatRoom.mute_list.findIndex(element => element === fromUsername);
	// 	// 			tmpChatRoom.mute_list.splice(index, 1);
	// 	// 			await this.chatRoomRepository.save(tmpChatRoom);
	// 	// 			await this.chatService.updateRoom(room_id, this.server);
	// 	// 		}, 60000);
	// 	// 	} else {
	// 	// 		await this.chatService.banResult(client, 'warning', '이미 mute된 대상입니다.');
	// 	// 		return;
	// 	// 	}
	// 	// }


	// 	// mute 대상이 소유자인지 확인
	// 	if (await this.chatService.isOwner(toUsername, room_id)) {
	// 		await this.chatService.muteResult(client, 'warning', '소유자는 mute 할 수 없습니다.');
	// 		return;
	// 	}

	// 	// 자기 자신을 mute 하는지 확인.
	// 	if (fromUsername === toUsername) {
	// 		await this.chatService.muteResult(client, 'warning', '자신은 mute 할 수 없습니다.');
	// 		return;
	// 	}

	// 	await this.chatRoomRepository.save(chatRoom);
	// 	await this.chatService.updateRoom(room_id, this.server);
	// }



	// /*
	// 	Block
	// */
	// @SubscribeMessage('block')
	// async blockUser(client: Socket, body: any) {
		
	// }



	// @SubscribeMessage('addFriend')
	// async addFriend(client: Socket, body: any) {
	// 	if (body === undefined) {
	// 		await this.userService.addFriendResult(client, 'error', '전달받은 바디 데이터가 없습니다.');
	// 		return;
	// 	}
	// 	const fromUsername = await this.wsService.findUserByClientId(client.id);
	// 	const toUsername = body.username;

	// 	// 접속중인 유저의 요청인지 확인.
	// 	if (!(await this.wsService.isLogin(client))) {
	// 		await this.userService.addFriendResult(client, 'error', '접속중인 유저가 아닙니다.');
	// 		return;
	// 	}

	// 	// 대상 유저 프로퍼티가 입력되었는지 확인
	// 	if (toUsername === undefined) {
	// 		await this.userService.addFriendResult(client, 'error', 'username 프로퍼티가 없습니다.');
	// 		return;
	// 	}

	// 	// 존재하는 대상인지 확인
	// 	if (!(await this.userService.isExist(toUsername))) {
	// 		await this.userService.addFriendResult(client, 'error', '존재하지 않는 대상입니다.');
	// 		return;
	// 	}

	// 	// 이미 친구인지 확인
	// 	// if (await this.userService.isFriend(fromUsername, toUsername)) {
	// 	// 	await this.userService.addFriendResult(client, 'warning', '해당 유저와 이미 친구입니다.');
	// 	// 	return;
	// 	// }


	// 	// 자기 자신인지
	// 	if (fromUsername === toUsername) {
	// 		await this.userService.addFriendResult(client, 'warning', '자기 자신과는 친구 추가를 할 수 없습니다.');
	// 		return;
	// 	}


	// 	await this.userService.addFriend(fromUsername, toUsername);
	// 	await this.userService.addFriendResult(client, 'approved');
	// 	await this.wsService.updateFriend(this.server, client, toUsername);

	// }


}