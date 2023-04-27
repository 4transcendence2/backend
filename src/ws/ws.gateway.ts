import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { ChatService } from "src/chat/chat.service";
import { Inject, UseGuards, forwardRef, Request } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { TokenGuard } from "./guard/ws.token.guard";
import { AddFriendGuard, AppointAdminGuard, BanGuard, BlockGuard, CancleSearchGuard, ChangePasswordGuard, ChatGuard, CreateChatRoomGuard, DismissAdminGuard, DmGuard, ExitChatRoomGuard, ExitDmGuard, ExitGameRoomGuard, InviteChatGuard, JoinChatRoomGuard, JoinGameRoomGuard, KickGuard, LoginGuard, MuteGuard, RemoveFriendGuard, RemovePasswordGuard, SearchGameGuard, SetPasswordGuard, SubscribeGuard, UnbanGuard, UnblockGuard, UnsubscribeGuard } from "./guard/ws.guard";
import { DmService } from "src/dm/dm.service";
import { GameService } from "src/game/game.service";
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

		@Inject(forwardRef(() => DmService))
		private dmService: DmService,

		@Inject(forwardRef(() => GameService))
		private gameService: GameService,

	) {
		// 매치 
		this.gameService.match();

	}

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
		this.wsService.handleQueue(client, body);
	}
	
	
	
	/*
	Unsubscribe
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnsubscribeGuard)
	@SubscribeMessage('unsubscribe')
	async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.wsService.handleQueue(client, body);
	}
	
	
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
	@SubscribeMessage('inviteChat')
	async inviteChat(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.invite(this.server, client, body);
	}

	/*
		Appoint Admin
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AppointAdminGuard)
	@SubscribeMessage('appointAdmin')
	async appointAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.appointAdmin(this.server, client, body);
	}
	

	/*
		Set PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SetPasswordGuard)
	@SubscribeMessage('setPassword')
	async setPassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.setPassword(this.server, client, body);
	}


	/*
		Change PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChangePasswordGuard)
	@SubscribeMessage('changePassword')
	async changePassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.changePassword(this.server, client, body);
	}


	/*
		Remove PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(RemovePasswordGuard)
	@SubscribeMessage('removePassword')
	async removePassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.removePassword(this.server, client, body);
	}

	
	/*
	Dismiss Admin
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(DismissAdminGuard)
	@SubscribeMessage('dismissAdmin')
	async dismissAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.dismissAdmin(this.server, client ,body);
	}
	

	/*
		Block
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(BlockGuard)
	@SubscribeMessage('block')
	async block(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.block(this.server, client, body);
	}



	/*
		Unblock
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnblockGuard)
	@SubscribeMessage('unblock')
	async unblock(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.chatService.unBlock(this.server, client, body);
	}


	/*
		AddFriend
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AddFriendGuard)
	@SubscribeMessage('addFriend')
	async addFriend(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.userService.addFriend(this.server, client, body);
	}


	/*
		Remove Friend
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(RemoveFriendGuard)
	@SubscribeMessage('removeFriend')
	async removeFriend(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.userService.removeFriend(this.server, client, body);
	}


	/*
		Dm
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(DmGuard)
	@SubscribeMessage('dm')
	dm(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.dmService.dm(this.server, client ,body);
	}
	
	
	/*
	Exit Dm
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitDmGuard)
	@SubscribeMessage('exitDm')
	exitDm(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.dmService.exit(this.server, client ,body);
	}




	/*
		SearchGame
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SearchGameGuard)
	@SubscribeMessage('searchGame')
	async searchGame(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.gameService.enrollQueue(client, body);
	}
	
	/*
		CancleSearch
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(CancleSearchGuard)
	@SubscribeMessage('cancleSearch')
	async cancleSearch(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.gameService.cancleQueue(client, body);
	}

	/*
		JoinGameRoom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinGameRoomGuard)
	@SubscribeMessage('joinGameRoom')
	async joinGameRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.joinGameRoom(client, body);
	}

	/*
		exitGameROom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitGameRoomGuard)
	@SubscribeMessage('exitGameRoom')
	async exitGameRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		await this.exitGameRoom(client, body);
	}


	/*
		inviteGame
	*/



	/*
		paadle up
	*/
	@SubscribeMessage('up')
	up(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.up(body.roomId, body.role);
	}


	/*
		paddle down
	*/
	@SubscribeMessage('down')
	down(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.down(body.roomId, body.role);
	}
	





}