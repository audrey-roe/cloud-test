import { QueryResult } from 'pg';
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import logger from '../utils/logger';
import { Folder } from '../models/folder.models';
import { query } from 'express';


/**
 * Upload a given file to S3 bucket.
 * 
 * @param {Buffer} fileStream - The file content in a Buffer.
 * @param {string} fileName - The name under which the file will be saved in S3.
 * @param {string} contentType - MIME type of the file.
 * @param {any} s3 - Instance of S3 client.
 * 
 * @returns - Response from S3.
 */

export const uploadToS3 = async (fileStream: Buffer, fileName: string, contentType: string, s3: any) => {
    // const s3 = getS3Client();
    if (!process.env.s3_ACCESS_KEY_ID || !process.env.s3_SECRET_ACCESS_KEY) {
        logger.error("AWS credentials are not set!");
        throw new Error("AWS credentials are missing");
    }
    try {
        // Parameters to be sent with the S3 put command

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

/**
 * Converts an async iterable of chunks (Uint8Array) to a single Buffer.
 * 
 * @param {AsyncIterable<Uint8Array>} asyncIterator - The iterable object.
 * 
 * @returns {Promise<Buffer>} - Combined Buffer.
 */

const asyncIteratorToBuffer = async (asyncIterator: AsyncIterable<Uint8Array>): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of asyncIterator) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

/**
 * Download a file from cloudflare r2 S3 bucket.
 * 
 * @param {string} fileName - Name of the file in S3 to be downloaded.
 * @param {any} s3 - Instance of S3 client.
 * 
 * @returns {Promise<Buffer>} - Downloaded file as Buffer.
 */

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

/**
 * Upload file details to the database.
 * 
 * @param {string} fileName - Name of the file.
 * @param {string} fileUrl - URL where the file resides.
 * @param {string} mediaType - MIME type of the file.
 * @param {number} userId - ID of the user uploading the file.
 * @param {any} client - Database client instance.
 * 
 * @returns - The ID and name of the uploaded file.
 */


export const uploadFileToDatabase = async (fileName: string, fileUrl: string, mediaType: string, userId: number, client: any): Promise<{ fileId: number, fileName: string }> => {
    try {
        // Database operations are wrapped in a transaction

        await client.query('BEGIN');

        const DEFAULT_PARENT_FOLDER_ID = 1;

        const insertQuery = 'INSERT INTO files (file_name, upload_date, media_type, data, is_unsafe, is_pending_deletion, ownerid, folder_id) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, false, false, $4, $5) RETURNING id';

        const insertValues = [fileName, mediaType, fileUrl, userId, DEFAULT_PARENT_FOLDER_ID];
        const result = await client.query(insertQuery, insertValues);

        const fileId = result.rows[0].id;
        
        // Record this file creation in the file history table

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

/**
 * Fetches a file from the database.
 * 
 * @param {string} fileId - ID of the file to fetch.
 * @param {any} client - Database client instance.
 * 
 * @returns {Promise<QueryResult>} - The result of the query.
 */

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

/**
 * Creates a new folder entry in the database.
 * 
 * @param {number} userId - ID of the user creating the folder.
 * @param {string} name - Name of the folder.
 * @param {any} client - Database client instance.
 * @param {number|null} [parentFolderId] - ID of the parent folder if applicable.
 * 
 * @returns {Promise<Folder>} - The created folder's details.
 */

export async function createFolder(userId: number, name: string, client: any, parentFolderId?: number | null): Promise<Folder> {
    const queryText = `INSERT INTO folders (name, owner_id, parent_folder_id)
                VALUES ($1, $2, $3)
                RETURNING *
    `;
    const values = [name, userId, parentFolderId];

    try {
        // Execute the SQL query 
        const result = await client.query(queryText, values);

        return result.rows[0];
    } catch (error: any) {
        // If an error occurs during the query execution, log the error message.
        console.error("Database Query Error:", error.message);
        // Uncomment the following line to  log the pg db error stack trace for debugging.
        // console.error(error.stack); 
        throw error;
    }
}


/**
 * Marks a file as unsafe in the database and then deletes it.
 * 
 * @param {number} fileId - ID of the file to mark and delete.
 * @param {any} client - Database client instance.
 */


// Mark a potentially unsafe file as unsafe and delete it from the database.
export async function markAndDeleteUnsafeFile(fileId: number, client: any) {
    try {
        // Start a database transaction.
        await client.query('BEGIN');

        // Get file details from the database.
        const getFileQuery = 'SELECT * FROM files WHERE id = $1';
        const getFileValues = [fileId];
        const fileResult = await client.query(getFileQuery, getFileValues);

        if (fileResult.rows.length === 0) {
            // If file doesn't exist, throw an error.
            throw new Error('File not found.');
        }

        const file = fileResult.rows[0];

        // Check if the file is an image or video.
        if (file.media_type.startsWith('image/') || file.media_type.startsWith('video/')) {
            try {
                // Mark the file as unsafe, delete history, and delete the file.
                const updateQuery = 'UPDATE files SET is_unsafe = true WHERE id = $1';
                const updateValues = [fileId];
                await client.query(updateQuery, updateValues);

                const deleteHistoryQuery = 'DELETE FROM fileHistory WHERE fileid = $1';
                await client.query(deleteHistoryQuery, [fileId]);

                const deleteFileQuery = 'DELETE FROM files WHERE id = $1';
                await client.query(deleteFileQuery, [fileId]);

                logger.info('File marked as unsafe and deleted.');

                // Commit the transaction.
                await client.query('COMMIT');
            } catch (error: any) {
                // Handle database error id any.
                console.error('Database error:', error.message);
                console.error(error.stack);
            }
        } else {
            // If the file type is unsupported, throw an error.
            throw new Error('File type is not supported for marking as unsafe and deleting.');
        }
    } catch (error) {
        // Handle error and rollback transaction.
        await client.query('ROLLBACK');
        throw error;
    }
};


/**
 * Fetches the history of a file from the database.
 * 
 * @param {number} fileId - ID of the file to fetch history for.
 * @param {any} client - Database client instance.
 * 
 * @returns {Promise<QueryResult>} - The result of the query.
 */

export const getFileHistory = async (fileId: number, client: any): Promise<QueryResult> => {
    try {
        const query = 'SELECT * FROM fileHistory WHERE fileId = $1';
        const result = await client.query(query, [fileId]);
        return result;
    } catch (error: any) {
        console.log("Fetching history for fileId:", fileId);

        // console.error("Database error:", error.message);
        throw error;
    }
};

/**
 * Stream a file from cloudflare r2 s3.
 * 
 * @param {string} fileName - Name of the file to stream.
 * @param {any} s3 - S3 client instance.
 * @param {number} userId - ID of the user streaming the file.
 * @param {any} client - Database client instance.
 * 
 * @returns {Promise<any>} - Streamed file content.
 */

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

/**
 * Update the file's history in the database.
 * 
 * @param {string} fileName - Name of the file to update history for.
 * @param {string} action - Action performed on the file .
 * @param {number} userId - ID of the user performing the action.
 * @param {any} client - Database client instance.
 */

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

/**
 * The number of approvals required to execute file deletion.
 */
const approvalNeeded = 2;

/**
 * Service function to handle file reviews by administrators.
 * 
 * @param {number} fileId - ID of the file to review.
 * @param {number} adminId - ID of the admin reviewing the file.
 * @param {boolean} decision - The decision made by the admin (true/false).
 * @param {any} client - Database client instance.
 * 
 * @returns {Promise<string>} - A message indicating the outcome of the review.
 */

export const reviewFileService = async (fileId: number, adminId: number, decision: boolean, client: any): Promise<string> => {
    try {
        // Insert the review decision into the admin_file_reviews table.
        const insertQuery = 'INSERT INTO admin_file_reviews (file_id, admin_id, decision) VALUES ($1, $2, $3)';
        await client.query(
            insertQuery,
            [fileId, adminId, decision]
        );
        // Query to get the count of approval decisions for the file.
        const threshold_query = `SELECT COUNT(*) as count FROM admin_file_reviews WHERE file_id = $1 AND decision = true`;
        const { rows } = await client.query(
            threshold_query,
            [fileId]
        );

        // Calculate the number of approvals needed and remaining.
        const approvalCount = parseInt(rows[0].count, 10);
        const approvalsRemaining = approvalNeeded - approvalCount;

        // If approvals meet the threshold, delete the file and its history.
        if (approvalCount >= approvalNeeded) {
            const deleteFileQuery = `DELETE FROM files WHERE id = $1`;
            const deleteHistoryQuery = `DELETE FROM fileHistory WHERE fileid = $1`;
            
            await client.query(deleteFileQuery, [fileId]);
            await client.query(deleteHistoryQuery, [fileId]);
            
            return "File and its history successfully deleted.";

        } else {
             // If approvals are not enough, inform about the deletion status.
            return `You have successfully marked the file for deletion. This file will be deleted when it is approved by ${approvalsRemaining} other administrative users.`;
        }

    } catch (error) {
        // Handle errors that might occur during the process.
        // console.error("Error in reviewFileService:", error);
        return "An error occurred during the file review process.";
    }
};

