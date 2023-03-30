"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsService = void 0;
const common_1 = require("@nestjs/common");
const userList = [];
let WsService = class WsService {
    constructor() { }
    async addUser(username, clientId) {
        const result = userList.find(element => element.username === username);
        if (result === undefined) {
            userList.push({
                username: username,
                clientId: clientId,
            });
        }
    }
    async deleteUser(clientId) {
        const index = userList.findIndex(element => element.clientId === clientId);
        if (index !== -1) {
            userList.splice(index, 1);
        }
    }
    async findUserByClientId(clientId) {
        return userList.find(element => element.clientId === clientId).username;
    }
    async findClientIdByUsername(username) {
        return userList.find(element => element.username === username).clientId;
    }
};
WsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WsService);
exports.WsService = WsService;
//# sourceMappingURL=ws.service.js.map