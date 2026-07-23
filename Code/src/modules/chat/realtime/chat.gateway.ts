import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { ChatEvent, chatEvent } from "./chat.event";


export class ChatGateway {
    private chatEvent: ChatEvent;

    constructor() {
        this.chatEvent = chatEvent
    }

    registeEvents = (socket: IAuthSocket, io: Server) => {
        this.chatEvent.sayHi(socket);
    }
}

export const chatGateway = new ChatGateway();