import { Request, Response } from 'express';
import { uploadToS3, uploadFileToDatabase, getFileFromDatabase, streamVideoOrAudio, createFolder, markAndDeleteUnsafeFile, getFileHistory, downloadFromS3 } from '../service/file.service';
import { Pool } from 'pg';
import logger from '../utils/logger';
import { createFolderSchema } from '../schema/file.schema';
import { z } from 'zod';
const pool = new Pool({
  user: "alex",
  password: "alex",
  database: "newdatabase",
  host: "localhost",
  port: 5432,
});

export const uploadFileHandler = async (req: Request, res: Response) => {
  const client = await pool.connect();

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
    const s3Response = await uploadToS3(fileStream, filename, contentType);
    if (s3Response && s3Response.ETag) {
      const fileUrl = s3Response.ETag;
      await uploadFileToDatabase(filename, fileUrl, mediaType, user, client);

      res.status(201).json({ message: 'File uploaded successfully' });
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
  const client = await pool.connect();

  const fileId = req.params.fileId;
  try {
      const result = await getFileFromDatabase(fileId, client);

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'File not found' });
      }

      const fileName = result.rows[0].file_name;
      const fileBuffer = await downloadFromS3(fileName);
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

export const streamFileHandler = async (req: Request, res: Response) => {
  const client = await pool.connect();

  const fileName = req.params.fileName;
  try {
    await streamVideoOrAudio(res, fileName, client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export async function handleCreateFolder(req: Request, res: Response) {
  const client = await pool.connect();

  try {

    const parsedBody = createFolderSchema.parse(req.body);
    console.log('hehr')
    const { name, parentFolderId } = parsedBody;
    const userId = res.locals.userId;
    console.log(userId)

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
  const client = await pool.connect();

  try {
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
  const client = await pool.connect();

  try {
    const history = await getFileHistory(fileId, client);
    res.status(200).json({ history: history.rows });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving file history.' });
  }
}