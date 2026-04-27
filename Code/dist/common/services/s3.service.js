"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Service = exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = require("fs");
const config_1 = require("../../config/config");
const crypto_1 = require("crypto");
const multer_enum_1 = require("../enums/multer.enum");
const exceptions_1 = require("../exceptions");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class S3Service {
    client;
    storageApproach;
    constructor() {
        this.client = new client_s3_1.S3Client({
            region: config_1.AWS_REGION,
            credentials: {
                accessKeyId: config_1.AWS_ACCESS_KEY_ID,
                secretAccessKey: config_1.AWS_SECRET_ACCESS_KEY,
            },
        });
        this.storageApproach = multer_enum_1.StorageApproachEnum.MEMORY;
    }
    async uploadAsset({ Bucket = config_1.AWS_BUCKET_NAME, file, path = "general", ACL = client_s3_1.ObjectCannedACL.private, ContentType, storageApproach = this.storageApproach, }) {
        const key = `${config_1.APPLICATION_NAME}/${path}/${(0, crypto_1.randomUUID)()}-${file.originalname}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: config_1.AWS_BUCKET_NAME,
            Key: key,
            ACL: client_s3_1.ObjectCannedACL.private,
            Body: storageApproach === multer_enum_1.StorageApproachEnum.MEMORY
                ? file.buffer
                : (0, fs_1.createReadStream)(file.path),
            ContentType: file.mimetype || ContentType,
        });
        try {
            await this.client.send(command);
            if (!command.input.Key) {
                throw new exceptions_1.BadRequestException("Failed to upload this asset");
            }
            return command.input.Key;
        }
        catch (error) {
            console.error("S3 Upload Error:", error);
            throw error;
        }
    }
    async uploadLargeAsset({ storageApproach = multer_enum_1.StorageApproachEnum.DISK, Bucket = config_1.AWS_BUCKET_NAME, file, path = "general", ACL = client_s3_1.ObjectCannedACL.private, ContentType, partSize = 5, }) {
        const key = `${config_1.APPLICATION_NAME}/${path}/${(0, crypto_1.randomUUID)()}-${file.originalname}`;
        const uploadFile = new lib_storage_1.Upload({
            client: this.client,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                ACL,
                Body: storageApproach === multer_enum_1.StorageApproachEnum.MEMORY
                    ? file.buffer
                    : (0, fs_1.createReadStream)(file.path),
                ContentType: file.mimetype || ContentType,
            },
            partSize: partSize * 1024 * 1024,
        });
        uploadFile.on("httpUploadProgress", (progress) => {
            console.log(`Uploaded : ${(progress.loaded / progress.total) * 100} %`);
        });
        return (await uploadFile.done());
    }
    async uploadAssets({ uploadApproach = multer_enum_1.UploadApproachEnum.SMALL, storageApproach = multer_enum_1.StorageApproachEnum.DISK, Bucket = config_1.AWS_BUCKET_NAME, files, path = "general", ACL = client_s3_1.ObjectCannedACL.private, ContentType, }) {
        let urls = [];
        if (uploadApproach === multer_enum_1.UploadApproachEnum.LARGE) {
            const data = await Promise.all(files.map(async (file) => {
                return await this.uploadLargeAsset({
                    storageApproach,
                    Bucket,
                    file,
                    path,
                    ACL,
                    ContentType
                });
            }));
            urls = data.map((ele) => ele.Key);
        }
        else {
            await Promise.all(files.map(async (file) => {
                return await this.uploadAsset({
                    storageApproach,
                    Bucket,
                    file,
                    path,
                    ACL,
                    ContentType
                });
            }));
        }
        return urls;
    }
    async createPresignedUploadLink({ Bucket = config_1.AWS_BUCKET_NAME, path = "general", ContentType, Originalname, expiresIn = config_1.AWS_EXPIRES_IN, }) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket,
            Key: `${config_1.APPLICATION_NAME}/${path}/${(0, crypto_1.randomUUID)()}-${Originalname}`,
            ContentType: ContentType,
        });
        const presignedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, {
            expiresIn,
        });
        return {
            presignedUrl,
            Key: command.input.Key
        };
    }
    async getAsset({ key, Bucket = config_1.AWS_BUCKET_NAME, }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key: key,
        });
        return await this.client.send(command);
    }
    async createPreSignedFetchLink({ Bucket = config_1.AWS_BUCKET_NAME, Key, expiresIn = config_1.AWS_EXPIRES_IN, fileName, download, }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true" ? `attachment; filename="${fileName || Key.split("/").pop()}"` : undefined,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        return url;
    }
    async deleteAsset({ Bucket = config_1.AWS_BUCKET_NAME, Key }) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket,
            Key,
        });
        return await this.client.send(command);
    }
    async deleteAssets({ Bucket = config_1.AWS_BUCKET_NAME, Keys }) {
        const command = new client_s3_1.DeleteObjectsCommand({
            Bucket,
            Delete: {
                Objects: Keys,
                Quiet: false
            }
        });
        return await this.client.send(command);
    }
}
exports.S3Service = S3Service;
exports.s3Service = new S3Service();
