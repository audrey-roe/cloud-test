import { Request, Response, NextFunction } from 'express';
import { createUser, login, deleteUserByEmail } from '../service/user.service';
import logger from '../utils/logger';
import { Pool } from 'pg';
import { generateToken } from '../middleware/tokenService';
import {createUserSchema} from '../schema/user.schema';
import { z } from 'zod';

const client = new Pool({
    user: "alex",
    password: "alex",
    database: "newdatabase",
    host: "localhost",
    port: 5432,
});


export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log(req.body)

        const validInput = createUserSchema.parse(req);
        const is_admin = validInput.body.is_admin || false;
        const user = await createUser({ ...validInput.body, is_admin: is_admin }, client);

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
    
    try {
        const user = await login(email, password, client);
        
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
        await deleteUserByEmail(uemail, client);
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error:any) {
        return res.status(500).send(error.message);
    }
};

export async function getUserFromDatabase(userId: number): Promise<any | null> {
    const queryText = 'SELECT * FROM users WHERE id = $1';
    const values = [userId];
  
    try {
      const res = await client.query(queryText, values);
      
      if (res.rowCount === 0) {
        // No user found with the given userId
        return null;
      }
  
      return res.rows[0]; // Return the found user
    } catch (err) {
      console.error('Error querying for user:', err);
      throw err;
    }
  }