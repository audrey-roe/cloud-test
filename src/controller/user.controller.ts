import { Request, Response, NextFunction } from 'express';
import { createUser, login, deleteUserByEmail } from '../service/user.service';
import logger from '../utils/logger';
import { generateToken } from '../middleware/tokenService';
import { createUserSchema } from '../schema/user.schema';
import { z } from 'zod';
import { createClient } from 'redis';
import pool from '../utils/pool';
import { QueryResult } from 'pg';

// Create a new Redis client instance
const redisClient = createClient();

/**
 * @param req - Express request object containing user details in the body.
 * @param res - Express response object to send the response.
 * @param next - Express middleware function to proceed to the next middleware.
 */

// * Create a new user.

export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate the request input against the user schema.
        const validInput = createUserSchema.parse(req);
        const is_admin = validInput.body.is_admin || false;
        const session_id = req.session.id;

        // Create the user in the database
        const user = await createUser({ ...validInput.body, is_admin: is_admin }, pool, session_id);

        // Check for the JWT secret configuration
        if (!process.env.jwtSecret) {
            return res.status(500).send('JWT secret is not configured.');
        }

        // Generate the JWT token if user creation was successful
        if (typeof user.id !== 'undefined') {
            const token = generateToken(user.id);
            return res.status(201).json({ user: user, token });
        }

    } catch (error: any) {
        // Handle validation errors specifically
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.errors });
        }
        // Handle other errors
        return res.status(409).send(error.message);
    }
}

// * user login functionality.
 
export const loginUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const session_id = req.session.id;
    try {
        const user = await login(email, password, pool, session_id);

        // Check for the JWT secret configuration
        if (!process.env.jwtSecret) {
            return res.status(500).send('JWT secret is not configured.');
        }

        // Handle login failures
        if (typeof user === 'string') {
            return res.status(401).send(user);
        }

        // Generate the JWT token if login was successful
        if (typeof user.id !== 'undefined') {
            const token = generateToken(user.id);
            return res.status(201).json({ user: user, token });
        }

    } catch (error) {
        return res.status(500).send('Login failed');
    }
};


// *  Delete a user using their email, becuase it is unique .

export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const uemail: string = req.body.email;
    try {
        await deleteUserByEmail(uemail, pool);
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
        return res.status(500).send(error.message);
    }
};

/**
 * @param userId - The ID of the user to fetch.
 * @returns User data or null if user is not found.
 */
// * Fetch a user from the database using their ID.

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
// * Revoke the session of a logged-in user.

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(400).send('User not logged in.');
    }

    const query = 'SELECT session_id FROM users WHERE id = $1';
    const value = [userId];

    try {
        const result: QueryResult = await pool.query({
            text: query,
            values: value
        });

        if (result.rows.length === 0) {
            return res.status(404).send('User not found or session already revoked.');
        }
        const sessionQuery = 'UPDATE users SET session_id = NULL WHERE id = $1';
        const sessionValue = [userId]
        await pool.query(sessionQuery, sessionValue);

        return res.status(200).send('Session revoked successfully.');
    } catch (error) {
        console.error('Database query error:', error);
        return res.status(500).send('Internal server error');
    }
}
