import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const authorizationHeader = client.handshake.headers.authorization;

		console.log(authorizationHeader);
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer')) {
      return false;
    }

    const token = authorizationHeader.split(' ')[1];
		try {
			const payload = jwt.verify(token, process.env.SECRET);
			console.log(payload);

		} catch (error) {
			console.log(error);
			return false;
		}
		
  }
}
