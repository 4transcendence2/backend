import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { Response } from 'express';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    findOne(header: any): Promise<import("./entity/user.entity").User>;
    createUser(userInfo: CreateUserDto, res: Response): Promise<Response<any, Record<string, any>>>;
}
