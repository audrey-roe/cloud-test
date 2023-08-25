import { User, UserInput } from '../models/user.model';
import { createUserHandler } from '../controller/user.controller';
import * as userService from '../service/user.service';
import { Response, Request, NextFunction } from 'express';
import process from 'process';
import * as tokenService from '../middleware/tokenService';

describe('User', () => {

    describe('UserController', () => {
        const mockToken: string = 'dafvdvqax123'

        jest.mock('../service/user.service');

        describe('createUserHandler', () => {
            let mockRequest: Partial<Request>;
            let mockResponse: Partial<Response> = {
                status: jest.fn(() => mockResponse) as unknown as jest.MockedFunction<Response['status']>,
            };
            let nextFunction = jest.fn();
            process.env.jwtSecret = 'jwtsecretszdvmsvpkmock'

            beforeEach(() => {
                mockRequest = {};
                mockResponse = {
                    status: jest.fn(() => mockResponse) as unknown as jest.MockedFunction<Response['status']>,
                    json: jest.fn(),
                    send: jest.fn()
                };

                jest.spyOn(tokenService, 'generateToken').mockImplementation(() => mockToken);
            });

            afterEach(() => {
                jest.clearAllMocks();
            });

            it('creates a user successfully', async () => {

                const userInput: UserInput = {
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User',
                    is_admin: false
                };

                const mockReturnedUser: User = {
                    ...userInput,
                    id: 1,
                    files: [],
                    folders: [],
                    rootFolders: [],
                    isSessionRevoked: false,
                    isAdmin: false,
                    hashPassword: jest.fn(),
                    createRootFolder: jest.fn()
                };

                jest.spyOn(userService, 'createUser').mockResolvedValue(mockReturnedUser);

                mockRequest.body = userInput;

                await createUserHandler(mockRequest as Request, mockResponse as Response, nextFunction);

                expect((mockResponse.status as jest.MockedFunction<any>).mock.calls.length).toBe(1);

                expect(mockResponse.status).toHaveBeenCalledWith(201);

                expect(mockResponse.json).toHaveBeenCalledWith({ user: mockReturnedUser, token: mockToken });
            });

            it('should return status code 500 if JWT secret is not configured', async () => {
                const mockRequest: Partial<Request> = {
                    body: {
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                        is_admin: false
                    }
                };

                const mockResponse: Partial<Response> = {
                    status: jest.fn(() => mockResponse) as unknown as jest.MockedFunction<Response['status']>,
                    send: jest.fn()
                };

                process.env.jwtSecret = '';

                await createUserHandler(mockRequest as Request, mockResponse as Response, nextFunction);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.send).toHaveBeenCalledWith('JWT secret is not configured.');
            });

            it('should return status code 409 and error message if createUser function throws an error', async () => {
                const mockRequest: Partial<Request> = {
                    body: {
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                        is_admin: false
                    }
                };

                const mockResponse: Partial<Response> = {
                    status: jest.fn(() => mockResponse) as unknown as jest.MockedFunction<Response['status']>,
                    send: jest.fn()
                };

                const mockError = new AppError('Failed to create user', 409);

                jest.spyOn(userService, 'createUser').mockRejectedValue(mockError);

                await createUserHandler(mockRequest as Request, mockResponse as Response, nextFunction);

                expect(mockResponse.status).toHaveBeenCalledWith(409);
                expect(mockResponse.send).toHaveBeenCalledWith('Failed to create user');
            });

            it('should not accept invalid full name', async () => {
                // Use a single-word name to trigger validation error
                mockRequest.body = {
                    name: 'Onlyname',
                    email: 'test@example.com',
                    password: 'password123',
                };
        
                await createUserHandler(mockRequest as Request, mockResponse as unknown as Response, jest.fn() as NextFunction);
        
                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                    error: 'Validation failed',
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            message: "Full name should have at least first name and last name"
                        })
                    ]),
                }));
            });

            it('should not accept invalid email', async () => {
                // Use an invalid email to trigger validation error
                mockRequest.body = {
                    name: 'John Doe',
                    email: 'invalidEmail',
                    password: 'password123',
                };
            
                await createUserHandler(mockRequest as Request, mockResponse as unknown as Response, jest.fn() as NextFunction);
            
                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                    error: 'Validation failed',
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            message: "Not a valid email"
                        })
                    ]),
                }));
            });
            
            
        })
    })
})

class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        Object.setPrototypeOf(this, AppError.prototype);
    }
}
