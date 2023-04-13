import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { ChatService } from "src/chat/chat.service";
import { Inject, UseGuards, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { TokenGuard } from "./guard/ws.token.guard";
import { AddFriendGuard, AppointAdminGuard, BanGuard, ChatGuard, CreateChatRoomGuard, ExitChatRoomGuard, JoinChatRoomGuard, KickGuard, LoginGuard, MuteGuard, UnbanGuard } from "./guard/ws.guard";
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
		await this.chatService.createChatRoom(this.server, client, body);
	}


	/*
		Join Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinChatRoomGuard)
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(client: Socket, body: any) {
		await this.chatService.joinChatRoom(this.server, client, body);
	}
	
	/*
		Exit Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitChatRoomGuard)
	@SubscribeMessage('exitChatRoom')
	async exitChatRoom(client: Socket, body: any) {
		await this.chatService.exitChatRoom(this.server, client, body);
	}

	/*
		Chat
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChatGuard)
	@SubscribeMessage('chat')
	async chat(client: Socket, body: any) {
		await this.chatService.chat(this.server, client, body);
	}


	/*
		Kick
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(KickGuard)
	@SubscribeMessage('kick')
	async kick(client: Socket, body: any) {
		await this.chatService.kick(this.server, client, body);
	}


	/*
		Ban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(BanGuard)
	@SubscribeMessage('ban')
	async ban(client: Socket, body: any) {
		await this.chatService.ban(this.server, client, body);
	}


	/*
		Unban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnbanGuard)
	@SubscribeMessage('unban')
	async unBan(client: Socket, body: any) {
		await this.chatService.unban(this.server, client, body);
	}

	/*
		Mute
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(MuteGuard)
	@SubscribeMessage('mute')
	async mute(client: Socket, body: any) {
		await this.chatService.mute(this.server, client, body);
	}


	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AppointAdminGuard)
	@SubscribeMessage('appointAdmin')
	async appointAdmin(client: Socket, body: any) {

	}


	/*
		Block
	*/
	@SubscribeMessage('block')
	async blockUser(client: Socket, body: any) {
		
	}




	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AddFriendGuard)
	@SubscribeMessage('addFriend')
	async addFriend(client: Socket, body: any) {
		await this.userService.addFriend(client, body);
	}



}