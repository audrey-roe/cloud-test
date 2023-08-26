import { Express, Request, Response } from "express";
import { loginUserHandler, createUserHandler, deleteUserHandler, revokeSession } from './controller/user.controller';
import { getFileHandler, streamFileController, uploadFileHandler, handleCreateFolder, markAndDeleteUnsafeFileController, getFileHistoryController} from "./controller/files.controller";
import {verifyAccessToken, createOrUpdateSession} from "./middleware/requrieUser";
import isAdmin from "./middleware/isAdmin";
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });
function routes(app: Express){
    app.get("/healthcheck", (req:Request, res: Response)=> res.sendStatus(200));
    app.post('/api/login', createOrUpdateSession, loginUserHandler);
    app.post('/api/user', createOrUpdateSession, createUserHandler);
    app.delete('/api/user', deleteUserHandler);
    app.post('/api/revokeSession', revokeSession);
    app.put('/api/file/upload', verifyAccessToken, upload.single('file'), uploadFileHandler);
    app.get('/api/file/download/:fileId', verifyAccessToken, getFileHandler); //done 
    app.get('/api/file/stream', verifyAccessToken, streamFileController);
    app.post('/api/create-folder', verifyAccessToken, handleCreateFolder);
    app.post('/api/file/mark-unsafe', verifyAccessToken, isAdmin, markAndDeleteUnsafeFileController )
    app.get('/api/file-history/:fileId',verifyAccessToken, getFileHistoryController);
}
export default routes