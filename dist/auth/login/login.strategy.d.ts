import { Strategy } from "passport-local";
declare const LoginStrategy_base: new (...args: any[]) => Strategy;
export declare class LoginStrategy extends LoginStrategy_base {
    constructor();
    validate(payload: any): Promise<{
        unique_id: any;
        nickname: any;
    }>;
}
export {};
