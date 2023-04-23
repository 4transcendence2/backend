import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dm } from 'src/dm/entity/dm.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';


@Controller('chat')
export class ChatController {

}
