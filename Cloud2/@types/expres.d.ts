import express from 'express';

declare module 'express-session' {
    interface SessionData {
        user: any; 
    }
}
declare namespace Express {
    interface Request {
        userId?: number;
    }
}
