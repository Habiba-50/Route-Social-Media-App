import { IBlock } from "../../common/interfaces";
import { BlockModel } from "../model";
import { DatabaseRepository } from "./base.repository";


export class blockRepository extends DatabaseRepository <IBlock>{

    constructor(){
        super(BlockModel)
    }
}

    