import { Pool, QueryResult } from 'pg';
import { PutObjectCommand, S3Client, S3, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { Folder } from '../models/folder.models';

const pool = new Pool({
    user: "alex",
    password: "alex",
    database: "newdatabase",
    host: "localhost",
    port: 5432,
});

const getS3Client = () => {
    return new S3Client({
        region: "auto",
        endpoint: `https://${process.env.s3_ACCOUNT_ID!}.r2.cloudflarestorage.com/`,
        credentials: {
            accessKeyId: process.env.s3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.s3_SECRET_ACCESS_KEY!,
        },
    });
};
export const uploadToS3 = async (fileStream: Buffer, fileName: string, contentType: string) => {
    const s3 = getS3Client();
    if (!process.env.s3_ACCESS_KEY_ID || !process.env.s3_SECRET_ACCESS_KEY) {
        logger.error("AWS credentials are not set!");
        throw new Error("AWS credentials are missing");
    }
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: fileStream,
            ContentType: contentType,
        };
        const response = await s3.send(new PutObjectCommand(params));
        logger.info(
            "Successfully uploaded object: " +
            params.Bucket +
            "/" +
            params.Key
        );
        return response;
    } catch (err: any) {
        logger.error("Error uploading to S3:", err.message, "\nStack trace:", err.stack);
        throw err;
    }
};
const asyncIteratorToBuffer = async (asyncIterator: AsyncIterable<Uint8Array>): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of asyncIterator) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};
export const downloadFromS3 = async (fileName: string): Promise<Buffer> => {
    const s3 = getS3Client();
    if (!process.env.s3_ACCESS_KEY_ID || !process.env.s3_SECRET_ACCESS_KEY) {
        logger.error("AWS credentials are not set!");
        throw new Error("AWS credentials are missing");
    }
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
        };
        const response = await s3.send(new GetObjectCommand(params));
        let fileBuffer: Buffer;


        const body = response.Body as unknown as AsyncIterable<Uint8Array>;
        if (body) {
            const fileBuffer = await asyncIteratorToBuffer(body);
            return fileBuffer;
        }
        return fileBuffer!;
    } catch (err: any) {
        throw err;
    };
};
export const uploadFileToDatabase = async (fileName: string, fileUrl: string, mediaType: string, userId: number): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const insertQuery = 'INSERT INTO files (file_name, upload_date, media_type, data, is_unsafe, is_pending_deletion, ownerid) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, false, false, $4) RETURNING id';
        const insertValues = [fileName, mediaType, fileUrl, userId];
        const result = await client.query(insertQuery, insertValues);

        const fileId = result.rows[0].id;

        const historyQuery = 'INSERT INTO fileHistory (fileId, action) VALUES ($1, $2)';
        const historyValues = [fileId, 'create'];
        await client.query(historyQuery, historyValues);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
};

export const getFileFromDatabase = async (fileId: string): Promise<QueryResult> => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM files WHERE id = $1';
        const result = await client.query(query, [fileId]);

        if (result.rows.length > 0) {
            const historyQuery = 'INSERT INTO fileHistory (fileId, action) VALUES ($1, $2)';
            const historyValues = [fileId, 'download'];
            await client.query(historyQuery, historyValues);
        }

        return result;
    } catch (error) {
        throw error;
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

export async function createFolder(userId: number, name: string, parentFolderId?: number): Promise<Folder> {

    const queryText = `
      INSERT INTO folders (name, owner_id, parent_folder_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [name, userId, parentFolderId];

    const client = await pool.connect();
    try {
        const result = await client.query(queryText, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export async function markAndDeleteUnsafeFile(fileId: number) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start a transaction

        const getFileQuery = 'SELECT * FROM files WHERE id = $1';
        const getFileValues = [fileId];
        const fileResult = await client.query(getFileQuery, getFileValues);
        if (fileResult.rows.length === 0) {
            throw new Error('File not found.');
        }

        const file = fileResult.rows[0];

        logger.info(file.media_type);
        if (file.media_type.startsWith('image/') || file.media_type.startsWith('video/')) {
            try {
                const updateQuery = 'UPDATE files SET is_unsafe = true WHERE id = $1';
                const updateValues = [fileId];

                await client.query(updateQuery, updateValues);

                const deleteHistoryQuery = 'DELETE FROM fileHistory WHERE fileid = $1';
                await client.query(deleteHistoryQuery, [fileId]);
                
                const deleteFileQuery = 'DELETE FROM files WHERE id = $1';
                await client.query(deleteFileQuery, [fileId]);
                
                logger.info('here is file');
                await client.query('COMMIT');
            } catch (error: any) {
                console.error('Database error:', error.message);
                console.error(error.stack);
            }
        } else {

            throw new Error('File type is not supported for marking as unsafe and deleting.');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    };
};

export const getFileHistory = async (fileId: number): Promise<QueryResult> => {
    const client = await pool.connect();

    try {
        const query = 'SELECT * FROM fileHistory WHERE fileId = $1';
        const result = await client.query(query, [fileId]);
        return result;
    } catch (error) {
        throw error;
    }
};