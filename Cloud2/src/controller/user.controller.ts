import { Request, Response, NextFunction } from 'express';
import { createUser, login, deleteUserByEmail } from '../service/user.service';
import logger from '../utils/logger';
import { User, UserInput} from '../models/user.model';

export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const userInput: UserInput = req.body;

    try {
        const createdUser = await createUser(userInput);
        res.locals.user = createdUser;
        return res.status(201).json(createdUser);
    } catch (error) {
        return res.status(409).send(error.message);
    }
};

export const loginUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    try {
        const loginResult = await login(email, password);

        if (typeof loginResult === 'string') {
            return res.status(401).send(loginResult);
        }
        const loggedInUser: User = loginResult;
        res.locals.user = loggedInUser;
        logger.info(res.locals.user);
        return res.status(200).send('Login successful');
    } catch (error) {
        return res.status(500).send('Login failed');
    }
};

export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    const uemail: string = req.body.email;

    try {
        await deleteUserByEmail(uemail);
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        return res.status(500).send(error.message);
    }
};