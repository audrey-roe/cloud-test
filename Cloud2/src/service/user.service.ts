import { QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { User, UserInput, Admin } from '../models/user.model'; 


export const createUser = async (userInput: UserInput, client: any): Promise<User> => {
    const { name, email, password, is_admin } = userInput;
    try {
        const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
        const existingUserResult: QueryResult = await client.query({
            text: existingUserQuery,
            values: [email]
          });

        if (existingUserResult.rows.length > 0) {
            const conflictError: any = new Error('User with this email already exists');
        conflictError.statusCode = 409;
        throw conflictError;
        }
        // if(!process.env.saltWorkFactor){
        //     throw new Error('Can not hash password');
        // }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery = `
            INSERT INTO users (name, email, password, is_admin)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [name, email, hashedPassword, is_admin];
        const insertUserResult: QueryResult = await client.query({
            text: insertUserQuery,
            values: values
        });
        return insertUserResult.rows[0];
    } catch (error:any) {
        if (error.statusCode === 409) {
            logger.error('User conflict error:', error);
            throw error;
        } else {
            logger.error('Error creating user:', error);
            throw new Error('Failed to create user');
        }
    } 
};

export const login = async (email: string, password: string,  client: any,): Promise<User | string> => {

    try {
            const findUserQuery = 'SELECT * FROM users WHERE email = $1';
            const findUserResult: QueryResult = await client.query({
                text: findUserQuery,
                values: [email]
              });        
            const user: User = findUserResult.rows[0];
            if (!user) {
                throw new Error('Invalid email');
            }

            const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            return user;
        } catch (error:any) {
            if (error.message === 'Invalid email') {
              throw new Error('Invalid email');
            } else if (error.message === 'Invalid password') {
              throw new Error('Invalid password');
            } else {
              logger.error('Error during login:', error);
              throw new Error('Login failed');
            }
        }
};

export const deleteUserByEmail = async (email: string,  client: any): Promise<void> => {

    try {
        const findUserQuery = 'SELECT * FROM users WHERE email = $1';
        const findUserResult: QueryResult = await client.query(findUserQuery, [email]);
        const user: User = findUserResult.rows[0];
            
        if (!user) {
            throw new Error('User not found');
        }
        const deleteUserQuery = 'DELETE FROM users WHERE email = $1';

        await client.query(deleteUserQuery, [email]);
    } catch (error:any) {
        logger.error('Error deleting user');
        throw new Error('Failed to delete user');
    }
};
