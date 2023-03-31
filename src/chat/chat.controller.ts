import { Body, Controller, Post, Headers, Res, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/chat-room-create.dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';


@Controller('chat')
export class ChatController {
	constructor( 
		private readonly chatService: ChatService,
		
	) {}


	@UseGuards(AuthGuard('jwt'))
	@Post('create')
	async createRoom(@Body() body: CreateChatRoomDto, @Headers() header: any, @Res() res: Response) {
		const token = header['authorization'].split(' ')[1];
		const decodedToken = jwt.verify(token, process.env.SECRET);
		const result = await this.chatService.createRoom(body, decodedToken['username']);
		if (result.status === 'error') res.status(400);
		return res.json(result);
	}

}
