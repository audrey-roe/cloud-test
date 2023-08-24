import { Express, Request, Response } from "express";
import { loginUserHandler, createUserHandler, deleteUserHandler } from './controller/user.controller';
import { getFileHandler, streamFileHandler, uploadFileHandler, handleCreateFolder, markAndDeleteUnsafeFileController, getFileHistoryController} from "./controller/files.controller";
import verifyAccessToken from "./middleware/requrieUser";
import isAdmin from "./middleware/isAdmin";

function routes(app: Express){
    app.get("/healthcheck", (req:Request, res: Response)=> res.sendStatus(200));
    app.post('/api/login', loginUserHandler);
    app.post('/api/user', createUserHandler);
    app.delete('/api/user', deleteUserHandler);
    app.post('/api/upload', uploadFileHandler);
    app.get('/file/:fileName', getFileHandler);
    app.get('/stream/:fileName', streamFileHandler);
    app.post('/api/create-folder', verifyAccessToken, handleCreateFolder);
    app.post('/api/file/mark-unsafe', verifyAccessToken, isAdmin, markAndDeleteUnsafeFileController )
    app.get('/api/file-history',verifyAccessToken, getFileHistoryController);
}
export default routes