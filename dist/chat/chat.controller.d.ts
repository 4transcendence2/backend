import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/chat-room-create.dto';
import { Response } from 'express';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    createRoom(body: CreateChatRoomDto, header: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
