import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const verifyAccessToken = (req: Request, res: Response, next: NextFunction) => {

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access token not provided' });
    }
    
    try {
        const secret = process.env.jwtSecret
        if(secret){
            const decoded = jwt.verify(token, secret ) as { userId: number };
            res.locals.userId = decoded.userId;
            next();
        }
        
    } catch (error) {
        return res.status(403).json({ message: 'Invalid access token' });
    }
};

export default verifyAccessToken;
