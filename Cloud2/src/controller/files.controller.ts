import { Request, Response } from 'express';
import { uploadToS3, uploadFileToDatabase, getFileFromDatabase, streamVideoOrAudio } from '../service/file.service';

export const uploadFileHandler = async (req: Request, res: Response) => {
    const { fileName, fileStream } = req.body;
    try {
        const s3Response = await uploadToS3(fileStream, fileName);
        if (s3Response && s3Response.ETag) {
            const fileUrl = s3Response.ETag; 
            await uploadFileToDatabase(fileName, fileUrl);
            res.status(201).json({ message: 'File uploaded successfully' });
        } else {
            res.status(500).json({ message: 'Failed to upload file to S3' });
        } 
        res.status(201).json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
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
