import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { ChatService } from "src/chat/chat.service";
import { Inject, UseGuards, forwardRef, Request } from "@nestjs/common";
import { UserService } from "src/user/user.service";
import { TokenGuard } from "./guard/ws.token.guard";
import { AcceptGameGuard, AddFriendGuard, AppointAdminGuard, BanGuard, BlockGuard, CancleSearchGuard, ChangePasswordGuard, ChatGuard, CreateChatRoomGuard, DeclineGameGuard, DismissAdminGuard, DmGuard, ExitChatRoomGuard, ExitDmGuard, ExitGameRoomGuard, InviteChatGuard, InviteGameGuard, JoinChatRoomGuard, JoinGameRoomGuard, KickGuard, LoginGuard, MuteGuard, RemoveFriendGuard, RemovePasswordGuard, SearchGameGuard, SetPasswordGuard, SubscribeGuard, UnbanGuard, UnblockGuard, UnsubscribeGuard } from "./guard/ws.guard";
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
	handleConnection(client: Socket) {
		this.wsService.login(client);
	}

	/*
		Socket Disconnect Event
	*/
	handleDisconnect(client: Socket) {
		this.wsService.logout(client);
	}

	/*
		Subscribe
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SubscribeGuard)
	@SubscribeMessage('subscribe')
	subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.wsService.handleQueue(client, body);
	}



	/*
	Unsubscribe
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnsubscribeGuard)
	@SubscribeMessage('unsubscribe')
	unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.wsService.handleQueue(client, body);
	}


	/*
	Create Chat Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(CreateChatRoomGuard)
	@SubscribeMessage('createChatRoom')
	createChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.createChatRoom(this.server, client, body);
	}


	/*
		Join Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinChatRoomGuard)
	@SubscribeMessage('joinChatRoom')
	joinChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.joinChatRoom(this.server, client, body);
	}

	/*
		Exit Room Event
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitChatRoomGuard)
	@SubscribeMessage('exitChatRoom')
	exitChatRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.exitChatRoom(this.server, client, body);
	}

	/*
		Chat
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChatGuard)
	@SubscribeMessage('chat')
	chat(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.chat(this.server, client, body);
	}


	/*
		Kick
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(KickGuard)
	@SubscribeMessage('kick')
	kick(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.kick(this.server, client, body);
	}


	/*
		Ban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(BanGuard)
	@SubscribeMessage('ban')
	ban(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.ban(this.server, client, body);
	}


	/*
		Unban
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnbanGuard)
	@SubscribeMessage('unban')
	unBan(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.unban(this.server, client, body);
	}

	/*
		Mute
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(MuteGuard)
	@SubscribeMessage('mute')
	mute(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.mute(this.server, client, body);
	}


	/*
		Invite Chat Rroom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(InviteChatGuard)
	@SubscribeMessage('inviteChat')
	inviteChat(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.invite(this.server, client, body);
	}

	/*
		Appoint Admin
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AppointAdminGuard)
	@SubscribeMessage('appointAdmin')
	appointAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.appointAdmin(this.server, client, body);
	}


	/*
		Set PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SetPasswordGuard)
	@SubscribeMessage('setPassword')
	setPassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.setPassword(this.server, client, body);
	}


	/*
		Change PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ChangePasswordGuard)
	@SubscribeMessage('changePassword')
	changePassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.changePassword(this.server, client, body);
	}


	/*
		Remove PW
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(RemovePasswordGuard)
	@SubscribeMessage('removePassword')
	removePassword(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.removePassword(this.server, client, body);
	}


	/*
	Dismiss Admin
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(DismissAdminGuard)
	@SubscribeMessage('dismissAdmin')
	dismissAdmin(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.dismissAdmin(this.server, client, body);
	}


	/*
		Block
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(BlockGuard)
	@SubscribeMessage('block')
	block(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.block(this.server, client, body);
	}



	/*
		Unblock
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(UnblockGuard)
	@SubscribeMessage('unblock')
	unblock(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.chatService.unBlock(this.server, client, body);
	}


	/*
		AddFriend
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AddFriendGuard)
	@SubscribeMessage('addFriend')
	addFriend(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.userService.addFriend(this.server, client, body);
	}


	/*
		Remove Friend
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(RemoveFriendGuard)
	@SubscribeMessage('removeFriend')
	removeFriend(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.userService.removeFriend(this.server, client, body);
	}


	/*
		Dm
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(DmGuard)
	@SubscribeMessage('dm')
	dm(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.dmService.dm(this.server, client, body);
	}


	/*
	Exit Dm
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitDmGuard)
	@SubscribeMessage('exitDm')
	exitDm(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.dmService.exit(this.server, client, body);
	}




	/*
		SearchGame
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(SearchGameGuard)
	@SubscribeMessage('searchGame')
	searchGame(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.enrollQueue(client, body);
	}

	/*
		CancleSearch
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(CancleSearchGuard)
	@SubscribeMessage('cancleSearch')
	cancleSearch(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.cancleQueue(client, body);
	}

	/*
		JoinGameRoom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(JoinGameRoomGuard)
	@SubscribeMessage('joinGameRoom')
	joinGameRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.joinGameRoom(client, body);
	}


	/*
		exitGameRoom
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(ExitGameRoomGuard)
	@SubscribeMessage('exitGameRoom')
	exitGameRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.exitGameRoom(client, body);
	}


	/*
		inviteGame
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(InviteGameGuard)
	@SubscribeMessage('inviteGame')
	inviteGame(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.inviteGame(client, body);
	}


	/*
		acceptGame
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(AcceptGameGuard)
	@SubscribeMessage('acceptGame')
	acceptGame(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.acceptGame(client, body);
	}


	/*
	declineGame
	*/
	@UseGuards(TokenGuard)
	@UseGuards(LoginGuard)
	@UseGuards(DeclineGameGuard)
	@SubscribeMessage('declineGame')
	delcineGame(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
		this.gameService.declineGame(client, body);
	}

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