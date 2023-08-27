// Import required libraries and utilities
import { Request, Response } from 'express';
import { uploadToS3, uploadFileToDatabase, getFileFromDatabase, createFolder, markAndDeleteUnsafeFile, getFileHistory, downloadFromS3, streamFromR2, reviewFileService } from '../service/file.service';
import { createFolderSchema } from '../schema/file.schema';
import { z } from 'zod';
import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from 'stream'; 
import pool from '../utils/pool';

// Utility function to get an S3 client with predefined configurations
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

// Handler for uploading files, connects to uploadToS3 and uploadFileToDatabase functions in the service.ts file
export const uploadFileHandler = async (req: Request, res: Response) => {
  // Ensure a file is provided in the request
  if (!req.file) {
    throw new Error('Upload file failed');
  }

  // Limit the maximum file size to 200MB
  const fileSizeLimit = 200 * 1024 * 1024; 
  if (req.file.size > fileSizeLimit) {
    throw new Error('File size exceeds the 200MB limit');
  }

  // Extract relevant details from the uploaded file
  const filename = req.file.originalname;
  const fileStream = req.file.buffer;
  const mediaType = req.file.mimetype;
  const contentType = req.file.mimetype;
  const user = res.locals.userId;

  try {
    // Upload file to S3 storage
    const s3 = getS3Client();
    const s3Response = await uploadToS3(fileStream, filename, contentType, s3);

    // If successful, store file details in the database
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
    // eRROR HANDLING with appropriate status codes
    if (error.message === 'Failed to upload file to S3') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'File size exceeds the 200MB limit') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Handler to fetch a file based on its ID connects to getFileFromDatabase functions in the service.ts file
export const getFileHandler = async (req: Request, res: Response) => {
  const fileId = req.params.fileId;
  try {
    const client = await pool.connect();
    const result = await getFileFromDatabase(fileId, client);

    // If no file is found with the given ID
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileName = result.rows[0].file_name;
    const s3 = getS3Client();
    const fileBuffer = await downloadFromS3(fileName, s3);

    // Send the file to the client as a download
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-Type', result.rows[0].media_type);
    res.send(fileBuffer);
  } catch (error: any) {
    // Handling errors with appropriate status codes
    if (error.message === 'The specified key does not exist.') {
      res.status(404).json({ error: `The file you are looking for doesn't exist` });
    } else {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
};

// Handler to create a new folder connects to createFolder function on the service.ts file
export async function handleCreateFolder(req: Request, res: Response) {
  try {
    const parsedBody = createFolderSchema.parse(req.body);
    let { name, parentFolderId } = parsedBody;
    const userId = res.locals.userId;
    const client = await pool.connect();

    // Default to base folder if no parent folder is specified
    if (!parentFolderId) {
      parentFolderId = 1;
    }

    const newFolder = await createFolder(userId, name, client, parentFolderId);

    return res.status(201).json(newFolder);
  } catch (error) {
    // Handle   errors and other exceptions
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Bad Request', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handler to fetch the history of a file based on its Id, connests to getFileHistory function
export async function getFileHistoryController(req: Request, res: Response) {
  const fileId = parseInt(req.params.fileId);

  try {
    const client = await pool.connect();
    const history = await getFileHistory(fileId, client);
    res.status(200).json({ history: history.rows });
  } catch (error) {
    // Handle error when fetching file history
    res.status(500).json({ error: 'An error occurred while retrieving file history.' });
  }
}

// Handler to mark a file as unsafe and delete it connects to markAndDeletUnsafeFile function in the service  file
export async function markAndDeleteUnsafeFileController(req: Request, res: Response) {
  const fileId = parseInt(req.body.file.id);

  try {
    const client = await pool.connect();
    await markAndDeleteUnsafeFile(fileId, client);
    res.status(200).json({ message: 'File marked as unsafe and deleted successfully.' });
  } catch (error: any) {
    // Handle various errors with appropriate status codes
    if (error.message === 'File not found.') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An error occurred while marking and deleting the file.' });
    }
  }
}

// Handler to stream a file from s3 bucket, connects from streamFromR2 function in the service
export const streamFileController = async (req: Request, res: Response) => {
  const fileName = req.body.key;
  const userId = res.locals.userId;
  if(!userId){
    return res.json('User not logged in, please login again');
  }
  try {
    const s3 = getS3Client();
    const client = await pool.connect();
    const stream = await streamFromR2(fileName, s3, userId, client);

    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    
    // Ensure a valid readable stream is returned before piping it to the response
    if (stream instanceof Readable) {
      stream.pipe(res); 
    } else {
      throw new Error("Failed to get a readable stream.");
    }

  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Handler to allow admins to review a file called by reviewFileService function 
export const reviewFile = async (req: Request, res: Response) => {
  try {
      const fileId = parseInt(req.params.fileId, 10);
      const adminId = req.body.userId;
      const decision = req.body.decision; 
      const client = await pool.connect();

      const resultMessage = await reviewFileService(fileId, adminId, decision, client);

      // Check for success message to determine response
      if (resultMessage.includes("successfully")) {
          res.status(200).send({ message: resultMessage });
      } else {
          res.status(400).send({ message: resultMessage });
      }

  } catch (error) {
      res.status(500).send({ error: "An error occurred while reviewing the file" });
  }
};
