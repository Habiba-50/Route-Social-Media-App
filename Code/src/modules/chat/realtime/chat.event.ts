import { IAuthSocket } from "../../../common/types/express.types";
import { SocketValidation } from "../../../middleware";
import * as validators from "../chat.validation";

// Event is the router of Socket.io
// And Gateway is the handler of event

export class ChatEvent {
    constructor() { }

    sayHi = async(socket: IAuthSocket) => {
        try {
            return socket.on("sayHi", async (data) => {
                await SocketValidation(validators.sayHi, data)
                console.log({ data });
                socket.emit("sayHi", "Hello World from server")
            })
        } catch (error) {
            return socket.emit("custom_error", error)
        }

    }
}

export const chatEvent = new ChatEvent();