import { JwtService } from "@nestjs/jwt";
import { User } from "src/user/entity/user.entity";
export declare class LoginService {
    private jwtService;
    constructor(jwtService: JwtService);
    login(user: User): Promise<string>;
}
