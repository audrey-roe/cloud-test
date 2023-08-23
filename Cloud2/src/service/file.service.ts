import { Pool, QueryResult } from 'pg';
// import { } from 'aws-sdk';
import { PutObjectCommand, S3Client, S3, GetObjectCommand } from "@aws-sdk/client-s3";

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const pool = new Pool({
    user: "alex",
    password: "alex",
    database: "newdatabase",
    host: "localhost",
    port: 5432,
});

const s3 = new S3Client({
    // forcePathStyle: false, 
    // endpoint: "https://heroku.com",
    region: 'us-west-1',
    // credentials:{
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //     secretAccessToken: process.env.AWS_ACCESS_TOKEN,

    // }
});

export const bucketParams = {
    Bucket: "example-bucket-name",
    Key: "example.txt",
    Body: "content"
};

export const uploadToS3 = async (fileStream: fs.ReadStream, fileName: string) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: fileStream,
        };
        const response = await s3.send(new PutObjectCommand(params));
        logger.info(
            "Successfully uploaded object: " +
            bucketParams.Bucket +
            "/" +
            bucketParams.Key
        );
        return response;
    } catch (err) {
    logger.info("Error", err);
  }
};

export const downloadFromS3 = async (fileName: string): Promise<Buffer> => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
    };
    const response = await s3.send(new GetObjectCommand(bucketParams));
    return response.Body as unknown as Buffer;
};

export const uploadFileToDatabase = async (fileName: string, fileUrl: string): Promise<void> => {
    const client = await pool.connect();
    try {
        const query = 'INSERT INTO files (file_name, file_url) VALUES ($1, $2)';
        await client.query(query, [fileName, fileUrl]);
    } finally {
        client.release();
    }
};

export const getFileFromDatabase = async (fileName: string): Promise<QueryResult> => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM files WHERE file_name = $1';
        const result = await client.query(query, [fileName]);
        return result;
    } finally {
        client.release();
    }
};

export const streamVideoOrAudio = async (res: any, fileName: string): Promise<void> => {
    const fileStream = await downloadFromS3(fileName);
    const extname = path.extname(fileName);
    const contentType = extname === '.mp4' ? 'video/mp4' : 'audio/mpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileStream.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const readStream = fs.createReadStream(fileStream);
    readStream.pipe(res);
};
