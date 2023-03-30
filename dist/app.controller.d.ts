import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { User } from './user/entity/user.entity';
import { CreateUserDto } from './user/dto/create-user.dto';
export declare class AppController {
    private authService;
    private userService;
    constructor(authService: AuthService, userService: UserService);
    getOwnProfile(req: any): Promise<User>;
    login(req: any): Promise<{
        status: string;
        access_token: string;
    }>;
    createUser(userInfo: CreateUserDto): void;
}
