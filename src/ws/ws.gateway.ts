import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { ChatService } from "src/chat/chat.service";
import { Inject, UseGuards, forwardRef } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { TokenGuard } from "./guard/ws.token.guard";
import { AddFriendGuard, AppointAdminGuard, BanGuard, ChatGuard, CreateChatRoomGuard, ExitChatRoomGuard, InviteChatGuard, JoinChatRoomGuard, KickGuard, LoginGuard, MuteGuard, SubscribeGuard, UnbanGuard } from "./guard/ws.guard";
require('dotenv').config();

@WebSocketGateway({
	cors: { origin: '*' },
})
export class WsGateWay implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => ChatService))
    private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
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
		Subscribe
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SubscribeGuard)
	@SubscribeMessage('subscribe')
	async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.wsService.subscribe(client, body);
	}

	/*
		Unsubscribe
	/*



		Create Chat Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(CreateChatRoomGuard)
	@SubscribeMessage('createChatRoom')
	async createChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.createChatRoom(this.server, client, body);
	}


	/*
		Join Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinChatRoomGuard)
	@SubscribeMessage('joinChatRoom')
	async joinChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.joinChatRoom(this.server, client, body);
	}
	
	/*
		Exit Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitChatRoomGuard)
	@SubscribeMessage('exitChatRoom')
	async exitChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.exitChatRoom(this.server, client, body);
	}

	/*
		Chat
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChatGuard)
	@SubscribeMessage('chat')
	async chat(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.chat(this.server, client, body);
	}


	/*
		Kick
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(KickGuard)
	@SubscribeMessage('kick')
	async kick(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.kick(this.server, client, body);
	}


	/*
		Ban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(BanGuard)
	@SubscribeMessage('ban')
	async ban(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.ban(this.server, client, body);
	}


	/*
		Unban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnbanGuard)
	@SubscribeMessage('unban')
	async unBan(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.unban(this.server, client, body);
	}

	/*
		Mute
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(MuteGuard)
	@SubscribeMessage('mute')
	async mute(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.mute(this.server, client, body);
	}


	/*
		Invite Chat Rroom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(InviteChatGuard)
	@SubscribeMessage('InviteChat')
	async inviteChat(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.invite(this.server, client, body);
	}

	/*
		Block
	*/


	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AppointAdminGuard)
	@SubscribeMessage('appointAdmin')
	async appointAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.appointAdmin(this.server, client, body);
	}



	/*
		Block
	*/
	@SubscribeMessage('block')
	async blockUser(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		
	}




	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AddFriendGuard)
	@SubscribeMessage('addFriend')
	async addFriend(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.userService.addFriend(client, body);
	}




}