import { Strategy } from "passport-jwt";
declare const SignupStrategy_base: new (...args: any[]) => Strategy;
export declare class SignupStrategy extends SignupStrategy_base {
    constructor();
    validate(payload: any): Promise<{
        unique_id: any;
        nickname: any;
    }>;
}
export {};
