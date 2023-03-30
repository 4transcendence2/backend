import { Repository } from 'typeorm';
import { CreateChatRoomDto } from './dto/chat-room-create.dto';
import { ChatRoom } from './entity/chat-room.entity';
import { User } from 'src/user/entity/user.entity';
import { WsGateWay } from 'src/ws/ws.gateway';
import { WsService } from 'src/ws/ws.service';
export declare class ChatService {
    private chatRoomRepository;
    private usersRepository;
    private wsGateway;
    private wsService;
    constructor(chatRoomRepository: Repository<ChatRoom>, usersRepository: Repository<User>, wsGateway: WsGateWay, wsService: WsService);
    createRoom(roomInfo: CreateChatRoomDto, username: string): Promise<{
        status: string;
        detail: string;
    }>;
}
