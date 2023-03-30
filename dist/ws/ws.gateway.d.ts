import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Socket, Server } from 'socket.io';
import { WsService } from "./ws.service";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import { ChatRoom } from "src/chat/entity/chat-room.entity";
export declare class WsGateWay implements OnGatewayConnection, OnGatewayDisconnect {
    private wsService;
    private usersRepository;
    private chatRoomRepository;
    constructor(wsService: WsService, usersRepository: Repository<User>, chatRoomRepository: Repository<ChatRoom>);
    server: Server;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    joinChatRoom(client: Socket, body: any): Promise<void>;
    exitChatRoom(client: Socket, body: any): Promise<void>;
    chat(client: Socket, body: any): Promise<void>;
    kickUser(client: Socket, body: any): Promise<void>;
    banUser(client: Socket, body: any): Promise<void>;
    blockUser(client: Socket, body: any): Promise<void>;
}
