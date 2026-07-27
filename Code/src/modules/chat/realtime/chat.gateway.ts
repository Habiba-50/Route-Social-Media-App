import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { ChatEvent, chatEvent } from "./chat.event";


export class ChatGateway {
    private chatEvent: ChatEvent;

    constructor() {
        this.chatEvent = chatEvent
    }

    registerEvents = (socket: IAuthSocket, io: Server) => {
        this.chatEvent.sayHi(socket);
        this.chatEvent.sendMessage(socket, io);
        this.chatEvent.sendGroupMessage(socket, io);
    }
}

export const chatGateway = new ChatGateway();