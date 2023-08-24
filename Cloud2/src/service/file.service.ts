import { Pool, QueryResult } from 'pg';
// import { S3 } from 'aws-sdk';
import { PutObjectCommand, S3Client, S3, GetObjectCommand } from "@aws-sdk/client-s3";

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { nanoid } from 'nanoid';
import { Folder } from '../models/folder.models';

const pool = new Pool({
    user: "alex",
    password: "alex",
    database: "newdatabase",
    host: "localhost",
    port: 5432,
});

const ACCESS_KEY_ID = "a729c9d7845af9d306a45e0d1cbd0aed";
const SECRET_ACCESS_KEY = "04a51678e0a433647a8ff10337ddf5f036edda2093a229f17b666efa2f58f819";
const ACCOUNT_ID = "044c7053b2a25413acd0120a88ed749e";

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}r2.cloudflarestorage.com/`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

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
            params.Bucket +
            "/" +
            params.Key
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
    const response = await s3.send(new GetObjectCommand(params));
    return response.Body as unknown as Buffer;
};

export const uploadFileToDatabase = async (fileName: string, fileUrl: string): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start a transaction

        const insertQuery = 'INSERT INTO files (file_name, file_url) VALUES ($1, $2) RETURNING id';
        const insertValues = [fileName, fileUrl];
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

export const getFileFromDatabase = async (fileName: string): Promise<QueryResult> => {
    const client = await pool.connect();
    try {
        const query = 'SELECT * FROM files WHERE file_name = $1';
        const result = await client.query(query, [fileName]);

        if (result.rows.length > 0) {
            const fileId = result.rows[0].id;
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

        if (file.fileType === 'image' || file.fileType === 'video') {
            const updateQuery = 'UPDATE files SET is_unsafe = true WHERE id = $1';
            const updateValues = [fileId];
            await client.query(updateQuery, updateValues);

            const deleteQuery = 'DELETE FROM files WHERE id = $1';
            await client.query(deleteQuery, updateValues);

            await client.query('COMMIT');
        } else {
            throw new Error('File type is not supported for marking as unsafe and deleting.');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}

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