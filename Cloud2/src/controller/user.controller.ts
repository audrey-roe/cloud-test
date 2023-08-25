import { Request, Response, NextFunction } from 'express';
import { createUser, login, deleteUserByEmail } from '../service/user.service';
import logger from '../utils/logger';
import { User, UserInput} from '../models/user.model';
import jwt from 'jsonwebtoken';
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
        console.log(validInput)
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