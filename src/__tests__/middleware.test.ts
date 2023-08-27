import isAdmin from '../middleware/isAdmin';
import { verifyAccessToken, createOrUpdateSession } from '../middleware/requrieUser';
import { Session, SessionData } from 'express-session';

import { getUserFromDatabase } from '../controller/user.controller';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../utils/pool';
import logger from '../utils/logger';

jest.mock('../controller/user.controller');
jest.mock('jsonwebtoken');
jest.mock('../utils/logger');
jest.mock('../utils/pool');

describe('Middelware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockReq = {
            header: jest.fn().mockReturnValue("headerValue"),
            session: {} as Session & Partial<SessionData>
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            locals: {}
        };
        mockNext = jest.fn();

        process.env.jwtSecret = 'test-secret';  // Set a mock JWT secret
    });

    describe('isAdmin Middleware', () => {

        beforeEach(() => {
            mockReq = {};
            mockRes = {
                locals: {
                    userId: 1
                },
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should call next if user is an admin', async () => {
            (getUserFromDatabase as jest.MockedFunction<typeof getUserFromDatabase>).mockResolvedValueOnce({
                id: 1,
                is_admin: true
            });

            await isAdmin(mockReq as Request, mockRes as Response, mockNext);

            expect(getUserFromDatabase).toHaveBeenCalledWith(1);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return a 403 if user is not an admin', async () => {
            (getUserFromDatabase as jest.MockedFunction<typeof getUserFromDatabase>).mockResolvedValueOnce({
                id: 1,
                is_admin: false
            });

            await isAdmin(mockReq as Request, mockRes as Response, mockNext);

            expect(getUserFromDatabase).toHaveBeenCalledWith(1);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Only admins can perform this action' });
        });
    });

    describe('verifyAccessToken Middleware', () => {

        it('should return 401 if no token is provided', async () => {
            const mockReq = {
                header: jest.fn().mockReturnValue("headerValue"),
            };
            mockReq.header.mockReturnValueOnce(null);

            await verifyAccessToken(mockReq as unknown as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access token not provided' });
        });

        it('should return 403 if token is invalid', async () => {
            const mockReq = {
                header: jest.fn().mockReturnValue("headerValue"),
            };
            mockReq.header.mockReturnValueOnce('Bearer invalidToken');
            (jwt.verify as jest.MockedFunction<typeof jwt.verify>).mockImplementationOnce(() => {
                throw new Error('Invalid Token');
            });

            await verifyAccessToken(mockReq as unknown as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid access token' });
        });
        
    });

    describe('createOrUpdateSession middleware', () => {


        beforeEach(() => {
            mockReq = {
                session: { id: 'sessionId123' } as Session & Partial<SessionData>
            };
            mockRes = {
                locals: {},
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            mockNext = jest.fn();

            (pool.connect as jest.Mock) = jest.fn().mockResolvedValue({
                query: jest.fn().mockResolvedValue(true),
                release: jest.fn()
            });

            (logger.error as jest.Mock) = jest.fn();
        });

        it('should update the session if userId is present', async () => {
            const mockRes = {
                locals: {
                    userId: {}
                },
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
            mockRes.locals.userId = 1;

            await createOrUpdateSession(mockReq as any, mockRes as any, mockNext);

            expect(pool.connect).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should not update the session if userId is missing', async () => {
            await createOrUpdateSession(mockReq as any, mockRes as any, mockNext);

            expect(pool.connect).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            const mockRes = {
                locals: {
                    userId: {}
                },
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            };
            
            mockRes.locals.userId = 1;
            (pool.connect as jest.Mock) = jest.fn().mockRejectedValue(new Error('DB Error'));
        
            await createOrUpdateSession(mockReq as any, mockRes as any, mockNext);
        
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith('Failed to create session');
            expect(logger.error).toHaveBeenCalledWith('Error during session creation:', expect.any(Error));
        });
        
    });
})

