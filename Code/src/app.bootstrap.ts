import express, { NextFunction } from 'express';
import { authRouter, postRouter, userRouter } from './modules';
import { globalErrorHandler } from './middleware';
import { port } from './config/config';
import { connectDB } from './DB/connection.db';
import { redisService, s3Service } from './common/services';
import { pipeline } from 'node:stream';
import { promisify } from "node:util";
import { successResponse } from './common/response';

const s3WriteStream = promisify(pipeline);

const bootstrap = async () => {
    const app:express.Express = express();

    app.get('/', (req: express.Request, res: express.Response, next: NextFunction) => {
        res.status(200).json({ message: "Landing page" });
        // we don't need to use return statement here because we are sending the response and not doing any further processing in this route handler.
        //  Once we call res.status().json(), the response is sent back to the client and the route handler is effectively done. 
        // res => return 
    });

    // Middleware to parse JSON bodies
    app.use(express.json());

    // Application Routing
    app.use("/auth", authRouter);
    app.use("/user", userRouter);
    app.use("/post", postRouter);
    app.get("/uploads/*path", async (req: express.Request, res: express.Response, next: NextFunction): Promise<any> => {
        const {download , filename} = req.query as { download?: string , filename?: string }
        const { path } = req.params as { path: string[] }
        const key = path.join('/')
        const { Body , ContentType} = await s3Service.getAsset({key})
        
        // return successResponse({
        //     res,
        //     message : "Get s3 data",
        //     data : {params: req.params , key , response : {Body , ContentType}}
        // })

        res.setHeader(
            "Content-Type",
            ContentType as string || "application/octet-stream"
        )

        res.set("Cross-Origin-Resource-Policy", "cross-origin");

        if(download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${filename || key.split("/").pop()}"`);
        }
         


        return await s3WriteStream(
            Body as NodeJS.ReadableStream,
            res
        )
    })
    

    app.get("/pre-signed/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const { download, fileName } = req.query as { download: string, fileName: string }
        const { path } = req.params as { path: string[] }
        const Key = path.join("/")
        const url = await s3Service.createPreSignedFetchLink({ Key, download, fileName })
        return successResponse({ res, data: { url } })
    })


    app.get("/*dummy", (req: express.Request, res: express.Response, next: NextFunction) => {
        res.status(404).json({ message: "Invalid application routing" });
    });


    // Global Error Handling Middleware
    app.use(globalErrorHandler);

    // Connect DB
    await connectDB();
    await redisService.connent()
    // await connectRedis()

    app.listen(port, () => {
        console.log("Server is running on port 3000 🚀");
    });
    console.log("Application bootstrapped successfully!");
}

export default bootstrap;



