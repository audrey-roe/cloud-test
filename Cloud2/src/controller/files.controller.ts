import { Request, Response } from 'express';
import { uploadToS3, uploadFileToDatabase, getFileFromDatabase, createFolder, markAndDeleteUnsafeFile, getFileHistory, downloadFromS3, streamFromR2 } from '../service/file.service';
import { Pool } from 'pg';
import logger from '../utils/logger';
import { createFolderSchema } from '../schema/file.schema';
import { z } from 'zod';
import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from 'stream'; 
import fs from 'fs';
import pool from '../utils/pool'

export const getS3Client = () => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.s3_ACCOUNT_ID!}.r2.cloudflarestorage.com/`,
    credentials: {
      accessKeyId: process.env.s3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.s3_SECRET_ACCESS_KEY!,
    },
  });
};

export const uploadFileHandler = async (req: Request, res: Response) => {

  if (!req.file) {
    throw new Error('Upload file failed');
  }

  const fileSizeLimit = 200 * 1024 * 1024; //200MB in bytes
  if (req.file.size > fileSizeLimit) {
    throw new Error('File size exceeds the 200MB limit');
  }

  const filename = req.file.originalname;
  const fileStream = req.file.buffer;
  const mediaType = req.file.mimetype;
  const contentType = req.file.mimetype;
  const user = res.locals.userId;

  try {
    const s3 = getS3Client();
    const s3Response = await uploadToS3(fileStream, filename, contentType, s3);
    if (s3Response && s3Response.ETag) {

      const fileUrl = s3Response.ETag;
      const client = await pool.connect();
      const fileDetails = await uploadFileToDatabase(filename, fileUrl, mediaType, user, client);
      
      res.status(201).json({ 
          message: 'File uploaded successfully', 
          fileId: fileDetails.fileId, 
          fileName: fileDetails.fileName 
      });
    } else {
      throw new Error('Failed to upload file to S3');
    }
  } catch (error: any) {
    if (error.message === 'Failed to upload file to S3') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'File size exceeds the 200MB limit') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
export const getFileHandler = async (req: Request, res: Response) => {

  const fileId = req.params.fileId;
  try {
    const client = await pool.connect();
    const result = await getFileFromDatabase(fileId, client);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileName = result.rows[0].file_name;
    const s3 = getS3Client();
    const fileBuffer = await downloadFromS3(fileName, s3);

    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-Type', result.rows[0].media_type);
    res.send(fileBuffer);
  } catch (error: any) {
    if (error.message === 'The specified key does not exist.') {
      res.status(404).json({ error: `The file you are looking for doesn't exist` });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
};

export async function handleCreateFolder(req: Request, res: Response) {

  try {
    const parsedBody = createFolderSchema.parse(req.body);
    let { name, parentFolderId } = parsedBody;
    const userId = res.locals.userId;
    const client = await pool.connect();

    // if parentFolderId is null, setting it to 1 (base folder id, which set to be created from the init sql in the migration folder.) 
    if (!parentFolderId) {
      parentFolderId = 1;
    }

    const newFolder = await createFolder(userId, name, client, parentFolderId);

    return res.status(201).json(newFolder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad Request', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAndDeleteUnsafeFileController(req: Request, res: Response) {
  const fileId = parseInt(req.body.file.id);

  try {
    const client = await pool.connect();
    await markAndDeleteUnsafeFile(fileId, client);
    res.status(200).json({ message: 'File marked as unsafe and deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'File not found.') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred while marking and deleting the file.' });
    }
  }
}

export async function getFileHistoryController(req: Request, res: Response) {
  const fileId = parseInt(req.params.fileId);

  try {
    const client = await pool.connect();
    const history = await getFileHistory(fileId, client);
    res.status(200).json({ history: history.rows });
  } catch (error) {

    res.status(500).json({ error: 'An error occurred while retrieving file history.' });
  }
}

export const streamFileController = async (req: Request, res: Response) => {
  const fileName = req.body.key;

  try {
    const s3 = getS3Client();

    const stream = await streamFromR2(fileName, s3);
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    
    if (stream instanceof Readable) {
      stream.pipe(res); 
    } else {
      throw new Error("Failed to get a readable stream.");
    }

  } catch (error:any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};