import { Strategy } from "passport-jwt";
declare const Login2Strategy_base: new (...args: any[]) => Strategy;
export declare class Login2Strategy extends Login2Strategy_base {
    constructor();
    validate(payload: any): Promise<{
        unique_id: any;
        nickname: any;
    }>;
}
export {};
