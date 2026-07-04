import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export class NotificationService {

    private client: admin.app.App;
    
    constructor() {
        const serviceAccount = JSON.parse(
            readFileSync(resolve("./src/config/c45-route-74549-firebase-adminsdk-fbsvc-1e9726bc95.json")).toString()
        ) as unknown as string;

        this.client = admin.apps.length
            ? admin.app()
            : admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
    }

    async sendNotification({token , title , body}: {token : string , title : string , body : string}) {
        await this.client.messaging().send({
            token: token,
            notification: {
                title: title,
                body: body
            }
        });
    }

    async sendNotifications({ tokens, title, body }: { tokens: string[], title: string, body: string }) {
        await Promise.allSettled(
            tokens.map((token: string) => 
                this.sendNotification({ token, title, body })
            )
        );
    }

}

export const notificationService = new NotificationService();
