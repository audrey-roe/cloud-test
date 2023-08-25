import { Request, Response } from 'express';
import { uploadToS3, uploadFileToDatabase, getFileFromDatabase, streamVideoOrAudio, createFolder, markAndDeleteUnsafeFile, getFileHistory } from '../service/file.service';
import { Pool } from 'pg';
import logger from '../utils/logger';

export const uploadFileHandler = async (req: Request, res: Response) => {
  console.log(req);
  const { fileName, fileStream, mediaType } = req.body; 
  const user = res.locals.userId
  try {
    // const fileUrl =  fileStream//comment out whe s3 working
    const s3Response = await uploadToS3(fileStream, fileName);
    if (s3Response && s3Response.ETag) {
      const fileUrl = s3Response.ETag;
    logger.info(user)
      await uploadFileToDatabase(fileName, fileUrl, mediaType, user);

      res.status(201).json({ message: 'File uploaded successfully' });
    } else {
      throw new Error('Failed to upload file to S3');
    }
    res.status(201).json({ message: 'File uploaded successfully' });
  } catch (error: any) {
    if (error.message === 'Failed to upload file to S3') {
      res.status(404).json({ error: error.message });
    } else {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getFileHandler = async (req: Request, res: Response) => {
  const fileName = req.params.fileName;
  try {
    const result = await getFileFromDatabase(fileName);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const streamFileHandler = async (req: Request, res: Response) => {
  const fileName = req.params.fileName;
  try {
    await streamVideoOrAudio(res, fileName);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export async function handleCreateFolder(req: Request, res: Response) {
  try {
    const { name, parentFolderId } = req.body;
    //   const userId = res.locals.user.id;
    const userId = 1
    const newFolder = await createFolder(userId, name, parentFolderId);

    return res.status(201).json(newFolder);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAndDeleteUnsafeFileController(req: Request, res: Response) {
  const fileId = parseInt(req.body.file.id);

  try {
    await markAndDeleteUnsafeFile(fileId);
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
    const history = await getFileHistory(fileId);
    res.status(200).json({ history: history.rows });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving file history.' });
  }
}