import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entity/user.entity';
import { LoginService } from '../login/login.service';
export declare class AuthService {
    private userService;
    private loginService;
    constructor(userService: UserService, loginService: LoginService);
    validateUser(id: string, password: string): Promise<User>;
    login(user: User): Promise<{
        status: string;
        access_token: string;
    }>;
    sendOtp(phoneNumber: string): Promise<void>;
    checkOtp(otp: string): Promise<any>;
}
