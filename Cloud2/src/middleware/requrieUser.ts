import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import pool from '../utils/pool';
import { QueryResult } from 'pg';

export const verifyAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access token not provided' });
    }
    
    try {
        const secret = process.env.jwtSecret;
        if (secret) {
            const decoded = jwt.verify(token, secret) as { userId: number };

            if (!decoded || !decoded.userId) {
                return res.status(403).json({ message: 'Invalid access token' });
            }

            // Session ID Validation
            const pgPool = await pool.connect();
            const query = 'SELECT session_id FROM users WHERE id = $1';
            const value = [decoded.userId];
            const result : QueryResult  = await pgPool.query({
                text: query,
                values: value
            });
            const sessionIdInDB = result.rows[0]?.session_id;
            console.log(req.session.id)
            console.log(sessionIdInDB)

            if (sessionIdInDB !== req.session.id) {
                return res.status(401).send('Session has been revoked');
            }

            res.locals.userId = decoded.userId;
            req.session.userId = decoded.userId;

            next();
        }
        
    } catch (error) {
        return res.status(403).json({ message: 'Invalid access token' });
    }
};

export const createOrUpdateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.userId;
        
        if (userId) {
            const pgPool = await pool.connect();
            const query = 'UPDATE users SET session_id = $1 WHERE id = $2';
            const values = [req.session.id, userId]
            
            await pgPool.query(query, values);
            pgPool.release();
        }
        next();
    } catch (error) {
        logger.error('Error during session creation:', error);
        return res.status(500).send('Failed to create session');
    }
};

