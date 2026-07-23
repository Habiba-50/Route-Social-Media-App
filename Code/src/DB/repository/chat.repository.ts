import { IChat } from "../../common/interfaces";
import { ChatModel } from "../model/index";
import { DatabaseRepository } from "./base.repository";

export class ChatRepository extends DatabaseRepository<IChat> {
    constructor() {
        super(ChatModel);
    }
}