import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";
import { Socket } from "socket.io";
import { WsService } from "../ws.service";
import { ChatService } from "src/chat/chat.service";
import { UserService } from "src/user/user.service";
import { RoomStatus } from "src/chat/chat.room.status";

@Injectable()
export class LoginGuard implements CanActivate {

	constructor(
		private wsService: WsService,
	) {}
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const client: Socket = context.switchToWs().getClient();
		return this.wsService.isLogin(client)
		.then(res => {
			return res
		})
	}
}

@Injectable()
export class CreateChatRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
	) {}
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 확인
		if (body === undefined) {
			this.chatService.result('createChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// status 프로퍼티 확인
		if (body.status === undefined) {
			this.chatService.result('createChatRoomResult', client, 'error', 'status 프로퍼티가 없습니다.');
			return false;
		}
		
		// status 프로퍼티 확인2
		if (body.status !== 'public' && body.status !== 'private' && body.status !== 'protected') {
			this.chatService.result('createChatRoomResult', client, 'error', 'status 프로퍼티가 잘못 되었습니다.');
			return false;
		}

		// title 프로퍼티 확인
		if (body.title === undefined) {
			this.chatService.result('createChatRoomResult', client, 'error', 'title 프로퍼티가 없습니다.');
			return false;
		}

		// password 프로퍼티 확인
		if (body.status === 'protected' && body.password === undefined) {
			this.chatService.result('createChatRoomResult', client, 'warning', '암호를 입력해주세요.');
			return false;
		}

		// password 프로퍼티 확인2
		if (body.status !== 'protected' && body.password !== undefined) {
			this.chatService.result('createChatRoomResult', client, 'error', '공개방 또는 비공개 방인데, 암호가 입력되었습니다.');
			return false;
		}

		return true;
	}
}

@Injectable()
export class JoinChatRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.chatService.result('joinChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.chatService.result('joinChatRoomResult', client, 'error', 'roomIid 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.chatService.result('joinChatRoomResult', client, 'error', '존재하지 않는 채팅방입니다.');
			return false;
		}

		// // 해당 방의 유저인지 확인
		// if (await this.chatService.isExistUser(body.roomId, client)) {
		// 	this.chatService.result('joinChatRoomResult', client, 'error', '이미 참여중인 방입니다.');
		// 	return false;
		// }


		return await this.chatService.findOne(body.roomId).then(async room => {
			// 비번방인데 password 프로퍼티가 있는지 확인
			if (room.status === RoomStatus.PROTECTED && body.password === undefined) {
				this.chatService.result('joinChatRoomResult', client, 'error', 'protected 방인데, password 프로퍼티가 없습니다.');
				return false;
			}
			
			// 비번방인데 비번을 확인
			if (room.status === RoomStatus.PROTECTED) {
				if (room.password !== body.password) {
					this.chatService.result('joinChatRoomResult', client, 'warning', '비밀번호가 틀렸습니다.');
					return false;
				}
			}
			
			// 밴 당한 유저인지 확인
			if (await this.chatService.isBan(body.roomId, client)) {
				this.chatService.result('joinChatRoomResult', client, 'warning', '밴 당하셨습니다.');
				return false;
			}
			
			// private 방인데, 참가하려고 하는지
			// 추가해야함

			return true;
		});
	}
}

@Injectable()
export class ExitChatRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.chatService.result('exitChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.chatService.result('exitChatRoomResult', client, 'error', 'roomIid 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.chatService.result('exitChatRoomResult', client, 'error', '존재하지 않는 채팅방입니다.');
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.chatService.result('exitChatRoomResult', client, 'error', '해당 채팅방의 유저가 아닙니다.');
			return false;
		}

		return true;
	}
}

@Injectable()
export class ChatGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.chatService.result('chatResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.chatService.result('chatResult', client, 'error', 'roomIid 프로퍼티가 없습니다.');
			return false;
		}
		
		// content 프로퍼티 확인
		if (body.content === undefined) {
			this.chatService.result('chatResult', client, 'error', 'content 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.chatService.result('chatResult', client, 'error', '존재하지 않는 채팅방입니다.');
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.chatService.result('chatResult', client, 'error', '해당 채팅방의 유저가 아닙니다.');
			return false;
		}

		// 대상이 muted인지 확인
		if (await this.chatService.isMute(body.roomId, client)) {
			this.chatService.result('chatResult' ,client, 'warning', 'mute 당하셨습니다.');
			return false;
		}
		return true;
	}
}

@Injectable()
export class KickGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.chatService.result('kickResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.chatService.result('kickResult', client, 'error', 'roomIid 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.chatService.result('kickResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.chatService.result('kickResult', client, 'error', '존재하지 않는 채팅방입니다.');
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.chatService.result('kickResult', client, 'error', '해당 채팅방의 유저가 아닙니다.');
			return false;
		}

		// 권한 확인
		


		return true;
	}
}