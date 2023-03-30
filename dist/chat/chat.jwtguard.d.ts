import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class WsJwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
