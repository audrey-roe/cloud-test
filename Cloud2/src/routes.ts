import { Express, Request, Response } from "express";
import { loginUserHandler, createUserHandler, deleteUserHandler } from './controller/user.controller';
function routes(app: Express){
    app.get("/healthcheck", (req:Request, res: Response)=> res.sendStatus(200));
    app.post('/api/login', loginUserHandler);
    app.post('/api/user', createUserHandler);
    app.delete('/api/user', deleteUserHandler);
}
export default routes