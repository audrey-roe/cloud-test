import { Pool, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { User, UserInput, Admin } from '../models/user.model'; 
import pool from '../utils/db'

// const client = new Pool({
//     user: "alex",
//     password: "alex",
//     database: "newdatabase",
//     host: "localhost",
//     port: 5432,
// });

export const createUser = async (userInput: UserInput, client: any, isAdmin: boolean = false): Promise<User> => {
    const { name, email, password } = userInput;
    try {
        const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
        const existingUserResult: QueryResult = await client.query({
            text: existingUserQuery,
            values: [email]
          });
          console.log("begin")

          console.log(existingUserResult.rows.length)
          console.log('why not working???')
        if (existingUserResult.rows.length > 0) {
            throw new CustomError('User with this email already exists', 409);
        }
        // if(!process.env.saltWorkFactor){
        //     throw new Error('Can not hash password');
        // }
        
        console.log('here')
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword)
        const insertUserQuery = `
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [name, email, hashedPassword];
        const insertUserResult: QueryResult = await client.query({
            text: insertUserQuery,
            values: values
        });
        console.log(insertUserResult)

        return insertUserResult.rows[0];
    } catch (error) {
        logger.error('Error creating user:', error);
        throw new Error('Failed to create user');
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
            return 'Invalid email';
        }

        const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return 'Invalid password';
        }

        return user;
    } catch (error) {
        logger.error('Error during login:', error);
        throw new Error('Login failed');
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
