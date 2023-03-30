import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class WsExistGuard implements CanActivate {

	constructor(
	) {}
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {


		return true;
	}
}