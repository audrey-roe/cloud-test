import { QueryResult } from 'pg';
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import logger from '../utils/logger';
import { Folder } from '../models/folder.models';


export const uploadToS3 = async (fileStream: Buffer, fileName: string, contentType: string, s3: any) => {
    // const s3 = getS3Client();
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

export const downloadFromS3 = async (fileName: string, s3: any): Promise<Buffer> => {
    // const s3 = getS3Client();
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

export const uploadFileToDatabase = async (fileName: string, fileUrl: string, mediaType: string, userId: number, client: any): Promise<{ fileId: number, fileName: string }> => {
    try {
        await client.query('BEGIN');

        const DEFAULT_PARENT_FOLDER_ID = 1;

        const insertQuery = 'INSERT INTO files (file_name, upload_date, media_type, data, is_unsafe, is_pending_deletion, ownerid, folder_id) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, false, false, $4, $5) RETURNING id';

        const insertValues = [fileName, mediaType, fileUrl, userId, DEFAULT_PARENT_FOLDER_ID];
        const result = await client.query(insertQuery, insertValues);

        const fileId = result.rows[0].id;

        const historyQuery = 'INSERT INTO fileHistory (fileId, action) VALUES ($1, $2)';
        const historyValues = [fileId, 'create'];
        await client.query(historyQuery, historyValues);

        await client.query('COMMIT');
        return {
            fileId: fileId,
            fileName: fileName
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
};

export const getFileFromDatabase = async (fileId: string, client: any): Promise<QueryResult> => {
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

export async function createFolder(userId: number, name: string, client: any, parentFolderId?: number | null): Promise<Folder> {

    const queryText = `INSERT INTO folders (name, owner_id, parent_folder_id)
                VALUES ($1, $2, $3)
                RETURNING *
    `;
    const values = [name, userId, parentFolderId];

    try {
        const result = await client.query(queryText, values);

        return result.rows[0];
    } catch (error: any) {
        console.error("Database Query Error:", error.message);
        // console.error(error.stack); 
        throw error;
    }
}

export async function markAndDeleteUnsafeFile(fileId: number, client: any) {
    try {
        //start a transaction
        await client.query('BEGIN');

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

export const getFileHistory = async (fileId: number, client: any): Promise<QueryResult> => {
    try {
        const query = 'SELECT * FROM fileHistory WHERE fileId = $1';
        const result = await client.query(query, [fileId]);
        return result;
    } catch (error: any) {
        console.log("Fetching history for fileId:", fileId);

        console.error("Database error:", error.message);
        throw error;
    }
};

export const streamFromR2 = async (fileName: string, s3: any, userId: number, client: any) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
    };

    const response = await s3.send(new GetObjectCommand(params));
    try {


        await updateFileHistory(fileName, 'stream', userId, client);
    } catch (error: any) {
        if (error.message === 'File not found in the database') {
            throw new Error('File not found or failed to stream.');
        } else {
            throw error;
        }
    }
    if (response.Body) {
        return response.Body;
    }

    throw new Error("File not found or failed to stream.");
};

export const updateFileHistory = async (fileName: string, action: string, userId: number, client: any) => {
    try {
        await client.query('BEGIN');

        const fetchIdQuery = 'SELECT id FROM files WHERE file_name = $1 AND ownerid = $2';
        const fileIdResult = await client.query(fetchIdQuery, [fileName, userId]);

        if (!fileIdResult || !fileIdResult.rows.length) {
            throw new Error('File not found in the database');
        }

        const fileId = fileIdResult.rows[0].id;
        const historyQuery = 'INSERT INTO fileHistory (fileId, action) VALUES ($1, $2)';
        await client.query(historyQuery, [fileId, action]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
};