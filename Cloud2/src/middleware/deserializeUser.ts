import { get } from "lodash";
import {Request, Response, NextFunction} from 'express'
import { verifyJwt } from "../utils/jwt.utils";

const deserializeUser = async (req:Request, res:Response, next:NextFunction) =>{
    const accessToken = get(req, "headers.authorization", "").replace( /^Bearer\s/, "");
    const refreshToken = get(req, "headers.x-refresh");

    if(!accessToken){
        next();
    }
    const {decoded, expired} = verifyJwt(accessToken);
    if(decoded){
        res.locals.user = decoded;
        return next();
    }
    if(expired && refreshToken){
        console.log('we here')
        

    }
    return next();

}

export default deserializeUser;