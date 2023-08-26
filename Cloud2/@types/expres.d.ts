import express from 'express';

declare module 'express-session' {
    interface SessionData {
        user: any; 
        userId: number;

    }
}
declare namespace Express {
    interface Request {
        userId?: number;
    }
}
