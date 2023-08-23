import { Express, Request, Response } from "express";
import { loginUserHandler, createUserHandler, deleteUserHandler } from './controller/user.controller';
import { getFileHandler, streamFileHandler, uploadFileHandler } from "./controller/files.controller";
function routes(app: Express){
    app.get("/healthcheck", (req:Request, res: Response)=> res.sendStatus(200));
    app.post('/api/login', loginUserHandler);
    app.post('/api/user', createUserHandler);
    app.delete('/api/user', deleteUserHandler);
    app.post('/upload', uploadFileHandler);
    app.get('/file/:fileName', getFileHandler);
    app.get('/stream/:fileName', streamFileHandler);
    
}
export default routes