import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { SocketValidation } from "../../../middleware";
import * as validators from "../chat.validation";
import { ChatService, chatService } from "../chat.service";
import { redisService, RedisService } from "../../../common/services";
// Event is the router of Socket.io
// And Gateway is the handler of event

export class ChatEvent {

    private readonly chatService: ChatService
    private readonly redisService: RedisService

    constructor() {
        this.chatService = chatService
        this.redisService = redisService
    }

    sayHi = async (socket: IAuthSocket) => {
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

    sendMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("sendMessage", async ({ sendTo, content }: { sendTo: string, content: string }): Promise<any> => {
            try {
                console.log(sendTo, content);
                await SocketValidation(validators.sendMessage, { sendTo, content })
                await this.chatService.sendMessage({ sendTo, content }, socket.data.user)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", { content, sendTo });

                const receiverSocketIds = await this.redisService.getSockets(sendTo)
                if (receiverSocketIds.length) {
                    socket.to(receiverSocketIds).emit("newMessage", { content, sendTo, from: socket.data.user });
                    // Using socket.to() instead of io.to() because I want to send the message only to the receiver
                }

            } catch (error) {
                return socket.emit("custom_error", error)
            }
        })
    }

    sendGroupMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("sendGroupMessage", async ({ groupId, content }: { groupId: string, content: string }): Promise<any> => {
            try {
                // console.log(groupId, content);
                await SocketValidation(validators.sendGroupMessage, { groupId, content })
                const roomId = await this.chatService.sendGroupMessage({ groupId, content }, socket.data.user)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", { content, groupId });
                socket.to(roomId).emit("newMessage", { content, groupId });

            } catch (error) {
                return socket.emit("custom_error", error)
            }
        })
    }

    joinRoom = async (socket: IAuthSocket, io: Server) => {
        return socket.on("join_room", async ({ roomId }: { roomId: string }): Promise<any> => {
            try {
                socket.join(roomId);

                const socketIds = await this.redisService.getSockets(roomId)
                io.to(socketIds).emit("successMessage", { content: "User joined the room", sendTo: roomId });

            } catch (error) {
                return socket.emit("custom_error", error)
            }
        })
    }

}

export const chatEvent = new ChatEvent();