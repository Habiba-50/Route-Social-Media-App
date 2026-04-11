import express, { NextFunction } from 'express';
import { authRouter, userRouter } from './modules';
import { globalErrorHandler } from './middleware';
import { port } from './config/config';
import { connectDB } from './DB/connection.db';
import { redisService } from './common/services';


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



