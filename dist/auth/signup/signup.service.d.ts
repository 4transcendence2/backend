import { JwtService } from '@nestjs/jwt';
export declare class SignupService {
    private jwtService;
    constructor(jwtService: JwtService);
    signup(user: any): Promise<string>;
}
