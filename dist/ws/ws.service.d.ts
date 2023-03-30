export declare class WsService {
    constructor();
    addUser(username: string, clientId: string): Promise<void>;
    deleteUser(clientId: string): Promise<void>;
    findUserByClientId(clientId: string): Promise<string>;
    findClientIdByUsername(username: string): Promise<string>;
}
