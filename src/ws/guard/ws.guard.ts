import { Injectable, CanActivate, ExecutionContext, Inject, forwardRef } from "@nestjs/common";
import { Observable } from "rxjs";
import { Socket } from "socket.io";
import { WsService } from "../ws.service";
import { ChatService } from "src/chat/chat.service";
import { UserService } from "src/user/user.service";
import { RoomStatus } from "src/chat/chat.room.status";
import { Type } from "../ws.type";
import { Rule } from "src/game/game.rule";
import { GameService } from "src/game/game.service";
import { DmService } from "src/dm/dm.service";

@Injectable()
export class LoginGuard implements CanActivate {

	constructor(
		@Inject(forwardRef(() => WsService))
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
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,


	) {}
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 확인
		if (body === undefined) {
			this.wsService.result('createChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// status 프로퍼티 확인
		if (body.status === undefined) {
			this.wsService.result('createChatRoomResult', client, 'error', 'status 프로퍼티가 없습니다.');
			return false;
		}
		
		// status 프로퍼티 확인2
		if (body.status !== 'public' && body.status !== 'private' && body.status !== 'protected') {
			this.wsService.result('createChatRoomResult', client, 'error', 'status 프로퍼티가 잘못 되었습니다.');
			return false;
		}

		// title 프로퍼티 확인
		if (body.title === undefined) {
			this.wsService.result('createChatRoomResult', client, 'error', 'title 프로퍼티가 없습니다.');
			return false;
		}

		// password 프로퍼티 확인
		if (body.status === 'protected' && body.password === undefined) {
			this.wsService.result('createChatRoomResult', client, 'warning', '암호를 입력해주세요.');
			return false;
		}

		// password 프로퍼티 확인2
		if (body.status !== 'protected' && body.password !== undefined) {
			this.wsService.result('createChatRoomResult', client, 'error', '공개방 또는 비공개 방인데, 암호가 입력되었습니다.');
			return false;
		}

		return true;
	}
}

@Injectable()
export class JoinChatRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('joinChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('joinChatRoomResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('joinChatRoomResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('joinChatRoomResult', client, 'error', '이미 참여중인 방입니다.', undefined, body.roomId);
			return false;
		}


		return await this.chatService.findOne(body.roomId).then(async room => {

			// private룸인 경우
			if (room.status === RoomStatus.PRIVATE) {
				this.wsService.result('joinChatRoomResult', client, 'error', 'private 룸에는 초대받은 대상만 들어갈 수 있습니다.', undefined, body.roomId);
				return false;
			}

			// 비번방인데 password 프로퍼티가 있는지 확인
			if (room.status === RoomStatus.PROTECTED && body.password === undefined) {
				this.wsService.result('joinChatRoomResult', client, 'error', 'protected 방인데, password 프로퍼티가 없습니다.', undefined, body.roomId);
				return false;
			}
			
			// 비번방인데 비번을 확인
			if (room.status === RoomStatus.PROTECTED) {
				if (room.password !== body.password) {
					this.wsService.result('joinChatRoomResult', client, 'warning', '비밀번호가 틀렸습니다.', undefined, body.roomId);
					return false;
				}
			}
			
			// 밴 당한 유저인지 확인
			if (await this.chatService.isBan(body.roomId, client)) {
				this.wsService.result('joinChatRoomResult', client, 'warning', '밴 당하셨습니다.', undefined, body.roomId);
				return false;
			}
			
			// private 방인데, 참가하려고 하는지

			return true;
		});
	}
}

@Injectable()
export class ExitChatRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('exitChatRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('exitChatRoomResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('exitChatRoomResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('exitChatRoomResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}

@Injectable()
export class ChatGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('chatResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('chatResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}
		
		// content 프로퍼티 확인
		if (body.content === undefined) {
			this.wsService.result('chatResult', client, 'error', 'content 프로퍼티가 없습니다.');
			return false;
		}
		
		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('chatResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('chatResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		// 대상이 muted인지 확인
		if (await this.chatService.isMute(body.roomId, client)) {
			this.wsService.result('chatResult' ,client, 'warning', 'mute 당하셨습니다.', undefined, body.roomId);
			return false;
		}
		return true;
	}
}

@Injectable()
export class KickGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('kickResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('kickResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('kickResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('kickResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('kickResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('kickResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('kickResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}


		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client) && !await this.chatService.isAdmin(body.roomId, client)) {
			this.wsService.result('kickResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		return await this.userService.findOne(body.username).then(async user => {
			// 대상이 소유자인지 확인
			if (await this.chatService.isOwner(body.roomId, client, user.name)) {
				this.wsService.result('kickResult', client, 'warning', '소유자는 kick 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			
			// 자기 자신을 킥 하는지 확인
			if (await this.wsService.findName(client) === user.name) {
				this.wsService.result('kickResult', client, 'warning', '자기 자신은 kick 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			return true;
		});
	}
}

@Injectable()
export class BanGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('banResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('banResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('banResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('banResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('banResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('banResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('banResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}


		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client) && !await this.chatService.isAdmin(body.roomId, client)) {
			this.wsService.result('banResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		return await this.userService.findOne(body.username).then(async user => {
			// 대상이 소유자인지 확인
			if (await this.chatService.isOwner(body.roomId, client, user.name)) {
				this.wsService.result('banResult', client, 'warning', '소유자는 ban 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			
			// 자기 자신을 밴 하는지 확인
			if (await this.wsService.findName(client) === user.name) {
				this.wsService.result('banResult', client, 'warning', '자기 자신은 ban 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			return true;
		});
	}
}

@Injectable()
export class UnbanGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('unbanResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('unbanResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('unbanResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('unbanResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('unbanResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('unbanResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}

		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client) && !await this.chatService.isAdmin(body.roomId, client)) {
			this.wsService.result('unbanResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		// 밴 당한 대상인지 확인
		if (!await this.chatService.isBan(body.roomId, client, body.username)) {
			this.wsService.result('unbanResult', client, 'warning', '밴 당한 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}

@Injectable()
export class MuteGuard implements CanActivate {
	constructor(
		private chatService: ChatService,
		@Inject(forwardRef(() => UserService))
		private userService: UserService,
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('muteResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('muteResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('muteResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('muteResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('muteResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('muteResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('muteResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		//이미 mute 당한 대상인지
		if (await this.chatService.isMute(body.roomId, client, body.username)) {
			this.wsService.result('muteResult', client, 'warning', '이미 mute된 유저입니다.', undefined, body.roomId);
			return false;
		}
		

		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client) && !await this.chatService.isAdmin(body.roomId, client)) {
			this.wsService.result('muteResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		return await this.userService.findOne(body.username).then(async user => {
			// 대상이 소유자인지 확인
			if (await this.chatService.isOwner(body.roomId, client, user.name)) {
				this.wsService.result('muteResult', client, 'warning', '소유자는 mute 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			
			// 자기 자신을 mute 하는지 확인
			if (await this.wsService.findName(client) === user.name) {
				this.wsService.result('muteResult', client, 'warning', '자기 자신은 mute 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			return true;
		});
	}
}

@Injectable()
export class AppointAdminGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,


		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('appointAdminResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('appointAdminResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('appointAdminResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('appointAdminResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('appointAdminResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('appointAdminResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('appointAdminResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client) && !await this.chatService.isAdmin(body.roomId, client)) {
			this.wsService.result('appointAdminResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}
		
		// 소유자인지 확인
		if (await this.chatService.isOwner(body.roomId, client, body.username)) {
			this.wsService.result('appointAdminResult', client, 'warning', '소유자를 관리자로 임명할 수 없습니다.', undefined, body.roomId);
			return false;
		}

		//이미 admin인지 확인
		if (await this.chatService.isAdmin(body.roomId, client, body.username)) {
			this.wsService.result('appointAdminResult', client, 'warning', '이미 관리자입니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}

@Injectable()
export class DismissAdminGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('dismissAdminResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('dismissAdminResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('dismissAdminResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('dismissAdminResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('dismissAdminResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('dismissAdminResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('dismissAdminResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		// 권한 확인
		if (!await this.chatService.isOwner(body.roomId, client)) {
			this.wsService.result('dismissAdminResult', client, 'warning', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		//이미 admin인지 확인
		if (!await this.chatService.isAdmin(body.roomId, client, body.username)) {
			this.wsService.result('dismissAdminResult', client, 'warning', '관리자가 아닙니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}

@Injectable()
export class AddFriendGuard implements CanActivate {
	constructor(

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('addFriendResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('addFriendResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('addFriendResult', client, 'error', '존재하지 않는 대상입니다.');
			return false;
		}
		
		// 자기 자신인지
		if (await this.wsService.findName(client) === body.username) {
			this.wsService.result('addFriendResult', client, 'error', '자기 자신은 친구추가를 할 수 없습니다.');
			return false;
		}

		// 이미 친구인지 확인
		if (await this.userService.isFriend(await this.wsService.findName(client), body.username)) {
			this.wsService.result('addFriendResult', client, 'warning', '이미 친구입니다.');
			return false;
		}

		return true;
	}
}

@Injectable()
export class SubscribeGuard implements CanActivate {

	constructor(
		private chatService: ChatService,


		@Inject(forwardRef(() => DmService))
		private dmService: DmService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() =>  GameService))
		private gameService: GameService,
	) {}
	
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('subscribeResult', client, 'error', '전달받은 데이터가 없습니다.')
			return false;
		}

		// type 프로퍼티 확인
		if (body.type === undefined) {
			this.wsService.result('subscribeResult', client, 'error', 'type 프로퍼티가 없습니다.');
			return false;
		}

		// type 유효성 확인
		if (!Object.values(Type).includes(body.type)) {
			this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 type입니디ㅏ.');
			return true;
		}

		// roomId 프로퍼티 확인
		if ((body.type === Type.CHAT_ROOM || body.type === Type.GAME_ROOM) && body.roomId === undefined) {
			this.wsService.result('subscribeResult', client, 'error', 'roomId 프로퍼티가 없습니다.', body.type);
			return false;
		}

		// username 프로퍼티 확인
		if (body.type === Type.DM && body.username === undefined) {
			this.wsService.result('subscribeResult', client, 'error', 'username 프로퍼티가 없습니다.', body.type);
			return false;
		}

		// username 유효성 검사
		if (body.type === Type.DM && !(await this.userService.isExist(body.username))) {
			this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 username입니다.', body.type);
			return false;
		}

		// 채팅 roomId 유효성 검사
		if (body.type === Type.CHAT_ROOM && !(await this.chatService.isExist(body.roomId))) {
			this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 roomId입니다.', body.type);
			return false;
		}
		
		// dm id 유효성 검사
		// if (body.type=== Type.DM) {
		// 	let user1 = await this.userService.findOne(await this.wsService.findName(client));
		// 	let user2 = await this.userService.findOne(body.username);
			
		// 	if (!await this.dmService.isExist(user1, user2)) {
		// 		this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 dm입니다.', body.type);
		// 		return false;
		// 	}
		// }
		
		// game id 유효성 검사
		if (body.Type === Type.GAME_ROOM && !(await this.gameService.isExist(body.roomId))) {
			this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 roomId입니다.', body.type);
			return false;
		}

		this.wsService.result('subscribeResult', client, 'approved', undefined, body.type);
		return true;
	}
}

@Injectable()
export class UnsubscribeGuard implements CanActivate {

	constructor(

		private chatService:ChatService,

		@Inject(forwardRef(() => UserService))
		private userService:UserService,
		
		
		@Inject(forwardRef(() => WsService))
		private wsService:WsService,

		@Inject(forwardRef(() => DmService))
		private dmService: DmService,
		
		@Inject(forwardRef(() =>  GameService))
		private gameService: GameService,

	) {}
	
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('unsubscribeResult', client, 'error', '전달받은 데이터가 없습니다.');
			return false;
		}

		// type 프로퍼티 확인
		if (body.type === undefined) {
			this.wsService.result('unsubscribeResult', client, 'error', 'type 프로퍼티가 없습니다.');
			return false;
		}

		// type 유효성 확인
		if (!Object.values(Type).includes(body.type)) {
			this.wsService.result('unsubscribeResult', client, 'error', '유효하지 않는 type입니디ㅏ.');
			return true;
		}

		// roomId 프로퍼티 확인
		if ((body.type === Type.CHAT_ROOM || body.type === Type.GAME_ROOM) && body.roomId === undefined) {
			this.wsService.result('unsubscribeResult', client, 'error', 'roomId 프로퍼티가 없습니다.', body.type);
			return false;
		}

		// username 프로퍼티 확인
		if (body.type === Type.DM && body.username === undefined) {
			this.wsService.result('unsubscribeResult', client, 'error', 'username 프로퍼티가 없습니다.', body.type);
			return false;
		}

		// 채팅 roomId 유효성 검사
		if (body.type === Type.CHAT_ROOM && !(await this.chatService.isExist(body.roomId))) {
			this.wsService.result('unsubscribeResult', client, 'error', '유효하지 않는 roomId입니다.', body.type);
			return false;
		}

		// dm id 유효성 검사
		if (body.type=== Type.DM) {
			let user1 = await this.userService.findOne(await this.wsService.findName(client));
			let user2 = await this.userService.findOne(body.username);
			
			if (!await this.dmService.isExist(user1, user2)) {
				return false;
			}
		}

		// game id 유효성 검사
		if (body.Type === Type.GAME_ROOM && !(await this.gameService.isExist(body.roomId))) {
			this.wsService.result('subscribeResult', client, 'error', '유효하지 않는 roomId입니다.', body.type);
			return false;
		}

		// username 유효성 검사
		if (body.type === Type.DM && !(await this.userService.isExist(body.username))) {
			this.wsService.result('unsubscribeResult', client, 'error', '유효하지 않는 username입니다.', body.type);
			return false;
		}

		this.wsService.result('unsubscribeResult', client, 'approved', undefined, body.type);
		return true;
	}
}


@Injectable()
export class InviteChatGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('inviteChatResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('inviteChatResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('inviteChatResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('inviteChatResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('inviteChatResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}
		
		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('inviteChatResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}
		
		
		// 상대방이 해당 채팅방에 존재하는지 확인
		if (await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('inviteChatResult', client, 'error', '이미 해당 채팅방에 있는 대상입니다.', undefined, body.roomId);
			return false;
		}
		

		return true;
	}
}


@Injectable()
export class DmGuard implements CanActivate {
	constructor(

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('inviteChatResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('inviteChatResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('inviteChatResult', client, 'error', '존재하지 않는 대상입니다.');
			return false;
		}
		
		return true;
	}
}




@Injectable()
export class BlockGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('blockResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('blockResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('blockResult', client, 'error' , 'username 프로퍼티가 없습니다.');
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('blockResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('blockResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('blockResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}

		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('blockResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}

		// 이미 블락을 했던 상대인지 확인
		if (await this.chatService.isBlock(body.roomId, client, body.username)) {
			this.wsService.result('blockResult', client, 'warning', '이미 block한 대상입니다.', undefined, body.roomId);
			return false;
		}

		return await this.userService.findOne(body.username).then(async user => {
			// 자기 자신을 밴 하는지 확인
			if (await this.wsService.findName(client) === user.name) {
				this.wsService.result('blockResult', client, 'warning', '자기 자신은 block 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			return true;
		});
	}
}

@Injectable()
export class UnblockGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('blockResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 프로퍼티 확인
		if (body.roomId === undefined) {
			this.wsService.result('blockResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// username 프로퍼티 확인
		if (body.username === undefined) {
			this.wsService.result('blockResult', client, 'error' , 'username 프로퍼티가 없습니다.');
			return false;
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('blockResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 유저인지 확인
		if (!await this.chatService.isExistUser(body.roomId, client)) {
			this.wsService.result('blockResult', client, 'error', '해당 채팅방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		// 존재하는 상대방인지 확인
		if (!await this.userService.isExist(body.username)) {
			this.wsService.result('blockResult', client, 'error', '존재하지 않는 대상입니다.', undefined, body.roomId);
			return false;
		}

		// 상대방이 해당 채팅방에 존재하는지 확인
		if (!await this.chatService.isExistUser(body.roomId, client, body.username)) {
			this.wsService.result('blockResult', client, 'error', '해당 채팅방에 없는 대상입니다.', undefined, body.roomId);
			return false;
		}

		// 블락 아닌 사람들 unblock 하는지 확인
		if (!await this.chatService.isBlock(body.roomId, client, body.username)) {
			this.wsService.result('blockResult', client, 'warning', 'block한 대상이 아닙니다.', undefined, body.roomId);
			return false;
		}


		return await this.userService.findOne(body.username).then(async user => {
			// 자기 자신을 밴 하는지 확인
			if (await this.wsService.findName(client) === user.name) {
				this.wsService.result('blockResult', client, 'warning', '자기 자신은 block 할 수 없습니다', undefined, body.roomId);
				return false;
			}
			return true;
		});
	}
}


@Injectable()
export class SearchGameGuard implements CanActivate {
	constructor(
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => GameService))
		private gameSerivce: GameService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('searchGameResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// rule 프로퍼티 확인
		if (body.rule === undefined) {
			this.wsService.result('searchGameResult', client, 'error', 'rule 프로퍼티가 없습니다.');
			return false;
		}

		// rule 유효성 확인
		if (!Object.values(Rule).includes(body.rule)) {
			this.wsService.result('searchGameResult', client, 'error', '올바른 rule이 아닙니다. rank, normal, arcade 셋 중 하나를 입력해주세요.');
			return false;
		}

		// 이미 게임을 찾고 있는 유저인경우
		if (this.gameSerivce.normal.find(elem => elem.client) !== undefined) {
			this.wsService.result('searchGameResult', client, 'error', '이미 게임을 찾고 있습니다.');
			return false;
		}
		if (this.gameSerivce.rank.find(elem => elem.client) !== undefined) {
			this.wsService.result('searchGameResult', client, 'error', '이미 게임을 찾고 있습니다.');
			return false;
		}
		if (this.gameSerivce.arcade.find(elem => elem.client) !== undefined) {
			this.wsService.result('searchGameResult', client, 'error', '이미 게임을 찾고 있습니다.');
			return false;
		}

		return true;
	}
}

@Injectable()
export class CancleSearchGuard implements CanActivate {
	constructor(

		@Inject(forwardRef(() => GameService))
		private gameSerivce: GameService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,


	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('cancleSearchResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// rule 프로퍼티 확인
		if (body.rule === undefined) {
			this.wsService.result('cancleSearchResult', client, 'error', 'rule 프로퍼티가 없습니다.');
			return false;
		}
		
		// rule 유효성 확인
		if (!Object.values(Rule).includes(body.type)) {
			this.wsService.result('cancleSearchResult', client, 'error', '올바른 rule이 아닙니다. rank, normal, arcade 셋 중 하나를 입력해주세요.');
			return false;
		}
		
		// 해당 큐에 등록이 된 유저인지 확인
		let name = await this.wsService.findName(client);
		
		if (body.rule === Rule.RANK) {
			if (this.gameSerivce.rank.find(elem => elem.name === name) === undefined) {
				this.wsService.result('cancleSearchResult', client, 'error', 'rank 큐에 등록된 유저가 아닙니다.');
				return false;
			}
		}
		
		if (body.rule === Rule.NORMAL) {
			if (this.gameSerivce.normal.find(elem => elem.name === name) === undefined) {
				this.wsService.result('cancleSearchResult', client, 'error', 'normal 큐에 등록된 유저가 아닙니다.');
				return false;
			}
		}
		
		if (body.rule === Rule.ARCADE) {
			if (this.gameSerivce.arcade.find(elem => elem.name === name) === undefined) {
				this.wsService.result('cancleSearchResult', client, 'error', 'arcade 큐에 등록된 유저가 아닙니다.');
				return false;
			}
		}

		return true;
	}
}



@Injectable()
export class JoinGameRoomGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => GameService))
		private gameSerivce: GameService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('joinGameRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 데이터 확인
		if (body.roomId === undefined) {
			this.wsService.result('joinGameRoomResult', client, 'error', 'roomId 프로퍼티가 없습니다.', undefined, body.roomId);
			return false;
		}

		// 유효한 게임방인지 확인
		if (!await this.gameSerivce.isExist(body.roomId)) {
			this.wsService.result('joinGameRoomResult', client, 'error', '존재하지 않는 방입니다.', undefined, body.roomId);
			return false;
		}
		
		// 이미 해당 방에 참여중인 유저인지
		if (await this.gameSerivce.isExistUser(body.roomId, client)) {
			this.wsService.result('joinGameRoomResult', client, 'error', '이미 참여중입니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}
@Injectable()
export class ExitGameRoomGuard implements CanActivate {
	constructor(
		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => GameService))
		private gameSerivce: GameService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('exitGameRoomResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 데이터 확인
		if (body.roomId === undefined) {
			this.wsService.result('exitGameRoomResult', client, 'error', 'roomId 프로퍼티가 없습니다.', undefined, body.roomId);
			return false;
		}

		// 유효한 게임방인지 확인
		if (!await this.gameSerivce.isExist(body.roomId)) {
			this.wsService.result('exitGameRoomResult', client, 'error', '존재하지 않는 방입니다.', undefined, body.roomId);
			return false;
		}
		
		// 해당 방의 유저인지 확인
		if (!await this.gameSerivce.isExistUser(body.roomId, client)) {
			this.wsService.result('exitGameRoomResult', client, 'error', '해당 방의 유저가 아닙니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}



@Injectable()
export class SetPasswordGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('setPasswordResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 데이터 확인
		if (body.roomId === undefined) {
			this.wsService.result('setPasswordResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// password데이터 확인
		if (body.password === undefined) {
			this.wsService.result('setPasswordResult', client, 'error', 'password 프로퍼티가 없습니다.');
			return false;
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('setPasswordResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}
		
		// 해당 방이 protected인지 확인
		const room = await this.chatService.findOne(body.roomId);
		if (room.status !== RoomStatus.PULBIC) {
			this.wsService.result('setPasswordResult', client, 'error', '공개 방이 아닙니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방의 소유자인지 확인
		if (!await this.chatService.isOwner(body.roomId, client)) {
			this.wsService.result('setPasswordResult', client, 'error', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}


		return true;
	}
}

@Injectable()
export class ChangePasswordGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('changePasswordResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 데이터 확인
		if (body.roomId === undefined) {
			this.wsService.result('changePasswordResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// password 데이터 확인
		if (body.password === undefined) {
			this.wsService.result('changePasswordResult', client, 'error', 'password 프로퍼티가 없습니다.');
			return false;
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('changePasswordResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}
		
		// 해당 방이 protected인지 확인
		const room = await this.chatService.findOne(body.roomId);
		if (room.status !== RoomStatus.PROTECTED) {
			this.wsService.result('changePasswordResult', client, 'error', '비밀번호 방이 아닙니다.', undefined, body.roomId);
			return false;
		}


		// 해당 방으 소유자인지 확인
		if (!await this.chatService.isOwner(body.roomId, client)) {
			this.wsService.result('changePasswordResult', client, 'error', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}


		return true;
	}
}

@Injectable()
export class RemovePasswordGuard implements CanActivate {
	constructor(
		private chatService: ChatService,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient();
		const body = context.switchToWs().getData();

		// body 데이터 확인
		if (body === undefined) {
			this.wsService.result('removePasswordResult', client, 'error', '전달받은 바디 데이터가 없습니다.');
			return false;
		}

		// roomId 데이터 확인
		if (body.roomId === undefined) {
			this.wsService.result('removePasswordResult', client, 'error', 'roomId 프로퍼티가 없습니다.');
			return false;
		}

		// 존재하는 방인지 확인
		if (!await this.chatService.isExist(body.roomId)) {
			this.wsService.result('removePasswordResult', client, 'error', '존재하지 않는 채팅방입니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방으 소유자인지 확인
		if (!await this.chatService.isOwner(body.roomId, client)) {
			this.wsService.result('removePasswordResult', client, 'error', '권한이 없습니다.', undefined, body.roomId);
			return false;
		}

		// 해당 방이 protected인지 확인
		const room = await this.chatService.findOne(body.roomId);
		if (room.status !== RoomStatus.PROTECTED) {
			this.wsService.result('removePasswordResult', client, 'error', '비밀번호 방이 아닙니다.', undefined, body.roomId);
			return false;
		}

		return true;
	}
}