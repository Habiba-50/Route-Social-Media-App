import { Types } from "mongoose";
import { IPost } from "../../common/interfaces";
import { PostRepository } from "../../DB/repository";



export class PostService {
    
    private readonly postRepository: PostRepository;

    constructor() {
        this.postRepository = new PostRepository();
    }
    
    public async createPost(post: IPost , user: any): Promise<any> {
        const createdPost = await this.postRepository.create({data:{...post , createdBy:user._id}});
        return createdPost;
    }

    public async updatePost(id: Types.ObjectId, post: IPost, user: any) : Promise<any> {
        const updatedPost = await this.postRepository.updateOne({
            filter: {
                _id: id,
                createdBy: user._id
            }, update: {
                $set: {
                    ...post,
                    updatedBy: user._id
                }
            }
        });
        if (updatedPost.modifiedCount === 0) {
            throw new Error("Post not found");
        }
        return updatedPost;
    }
    
    public async deletePost(id: Types.ObjectId) {
        const result = await this.postRepository.deleteOne({ filter: { _id: id } });
        if (result.deletedCount === 0) {
            throw new Error("Post not found");
        }
        return result;
    }
    
    public async getPost(id: Types.ObjectId) {
        const post = await this.postRepository.findOne({ filter: { _id: id } });
        if (!post) {
            throw new Error("Post not found");
        }
        return post;
    }
}

export default new PostService()