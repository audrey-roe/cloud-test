import { Request, Response, NextFunction } from 'express';
import { createUser, login, deleteUserByEmail } from '../service/user.service';
import logger from '../utils/logger';
import { generateToken } from '../middleware/tokenService';
import {createUserSchema} from '../schema/user.schema';
import { z } from 'zod';
import { createClient } from 'redis';
import pool from '../utils/pool'
import { QueryResult } from 'pg';

const redisClient = createClient();


export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const validInput = createUserSchema.parse(req);
        const is_admin = validInput.body.is_admin || false;
        const session_id = req.session.id;
        
        const user = await createUser({ ...validInput.body, is_admin: is_admin }, pool, session_id);

        if (!process.env.jwtSecret) {
            return res.status(500).send('JWT secret is not configured.');
        }

        if (typeof user.id !== 'undefined') {
            const token = generateToken(user.id);
            return res.status(201).json({ user: user, token });
        }

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        return res.status(409).send(error.message);
    }
}

export const loginUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const session_id = req.session.id;
    try {
        const user = await login(email, password, pool, session_id);
        
        if (!process.env.jwtSecret) {
            return res.status(500).send('JWT secret is not configured.');
        }

        if (typeof user === 'string') {
            return res.status(401).send(user);
        }

        if (typeof user.id !== 'undefined') {
            const token = generateToken(user.id);
            return res.status(201).json({ user: user, token });
        }

    } catch (error) {
        return res.status(500).send('Login failed');
    }
};

export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const uemail: string = req.body.email;
    try {
        await deleteUserByEmail(uemail, pool);
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error:any) {
        return res.status(500).send(error.message);
    }
};

export async function getUserFromDatabase(userId: number): Promise<any | null> {
    const queryText = 'SELECT * FROM users WHERE id = $1';
    const values = [userId];
  
    try {
      const res = await pool.query(queryText, values);
      
      if (res.rowCount === 0) {
        return null;
      }
  
      return res.rows[0]; 
    } catch (err) {
      console.error('Error querying for user:', err);
      throw err;
    }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
    const userId = req.session.userId;
    const pgPool = await pool.connect();

    const query = 'SELECT session_id FROM users WHERE id = $1'
    const value =  [userId];
    const result: QueryResult = await pgPool.query({
        text: query,
        values: value
    });
    const sessionId = result.rows[0].session_id;

    await pgPool.query('UPDATE users SET session_id = NULL WHERE id = $1', [userId]);

    redisClient.del(`sess:${sessionId}`);

    res.send('Session revoked');
}