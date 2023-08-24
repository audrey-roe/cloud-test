import { createUser } from '../service/user.service';
import { UserInput } from '../models/user.model';
import { createUserHandler } from '../controller/user.controller';
import * as userService from '../service/user.service'; 
import { mockCreateUser } from '../service/__mocks__/user.service.mock'; 
import express, {Response, Request, NextFunction } from 'express';



describe('User', () => {
  describe('UserService', () => {
    describe('createUser', () => {
      const userInput: UserInput = {
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'password123',
        is_admin: false

      };
      const existingUserResult = {
        rows: []
      };
      const insertUserResult = {
        rows: [{ id: 1, ...userInput }]
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce(existingUserResult)
        .mockResolvedValueOnce(insertUserResult);

      const mockClient = {
        query: mockQuery
      };
      jest.mock('pg', () => ({
        Pool: jest.fn(() => ({
          connect: jest.fn(),
          query: jest.fn(),
          end: jest.fn()
        }))
      }));
      jest.mock('bcrypt', () => ({
        hash: jest.fn().mockResolvedValue('hashedPassword')
      }));
      // // Tests that createUser successfully creates a user with valid input
      it('should create a user with valid input', async () => {
        // Arrange
        jest.mock('bcrypt', () => ({
          hash: jest.fn().mockResolvedValue('hashedPassword')
        }));

        // Act
        const result = await createUser(userInput, mockClient);

        // Assert
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        // Expect the SELECT query
        expect(mockClient.query).toHaveBeenNthCalledWith(1, {
          text: 'SELECT * FROM users WHERE email = $1',
          values: ['johndoe@example.com']
        });

        // Expect the INSERT query
        const expectedInsertQueryPart = `
              INSERT INTO users (name, email, password, is_admin)
              VALUES ($1, $2, $3, $4)
              RETURNING *;
        `;
        const actualInsertQueryPart = mockClient.query.mock.calls[1][0].text;
        expect(sanitizeString(actualInsertQueryPart)).toEqual(sanitizeString(expectedInsertQueryPart));


        expect(result).toEqual({ id: 1, ...userInput });
      });
      // Tests that createUser successfully creates a user with valid input and isAdmin=true
      it('should create a user with valid input and isAdmin=true', async () => {
        // Arrange
        const userInput: UserInput = {
          name: 'John Doe',
          email: 'johndoe@example.com',
          password: 'password123',
          is_admin: true
        };
        const existingUserResult = {
          rows: []
        };
        const insertUserResult = {
          rows: [{ id: 1, ...userInput }]
        };
        const mockQuery = jest.fn()
          .mockResolvedValueOnce(existingUserResult)
          .mockResolvedValueOnce(insertUserResult);

        const mockClient = {
          query: mockQuery
        };
        jest.mock('pg', () => ({
          Pool: jest.fn(() => ({
            connect: jest.fn(),
            query: jest.fn(),
            end: jest.fn()
          }))
        }));
        jest.mock('bcrypt', () => ({
          hash: jest.fn().mockResolvedValue('hashedPassword')
        }));
        // Act
        const result = await createUser(userInput, mockClient);

        // Assert
        expect(mockClient.query).toHaveBeenCalledTimes(2);
        // Expect the SELECT query
        expect(mockClient.query).toHaveBeenNthCalledWith(1, {
          text: 'SELECT * FROM users WHERE email = $1',
          values: ['johndoe@example.com']
        });

        // Expect the INSERT query
        const expectedInsertQueryPart = `
            INSERT INTO users (name, email, password, is_admin)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
      `;
        const actualInsertQueryPart = mockClient.query.mock.calls[1][0].text;
        expect(sanitizeString(actualInsertQueryPart)).toEqual(sanitizeString(expectedInsertQueryPart));
        expect(result).toEqual({ id: 1, ...userInput, is_admin: true });
      });
      // Tests that createUser throws a conflict Error when email already exists
      it('should throw a conflict Error when email already exists', async () => {
        // Arrange
        //...
        // Act and Assert
        await expect(createUser(userInput, mockClient)).rejects.toThrowError();
      });
    });
  })
  describe('UserController', () => {
    jest.mock('../service/user.service'); 

    describe('createUserHandler', () => {
      const userInput: UserInput = {
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'password123',
        is_admin: false

      };
      const existingUserResult = {
        rows: []
      };
      const insertUserResult = {
        rows: [{ id: 1, ...userInput }]
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce(existingUserResult)
        .mockResolvedValueOnce(insertUserResult);

      const mockClient = {
        query: mockQuery
      };
      jest.mock('pg', () => ({
        Pool: jest.fn(() => ({
          connect: jest.fn(),
          query: jest.fn(),
          end: jest.fn()
        }))
      }));
      jest.mock('bcrypt', () => ({
        hash: jest.fn().mockResolvedValue('hashedPassword')
      }));
      // Tests that the function successfully creates a user and returns a token
      it('should create a user with valid input', async () => {
        jest.spyOn(userService, 'createUser').mockImplementation(mockCreateUser);

        // Arrange
        const req = {
          body: userInput,
        } as Request; 
    
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
        } as unknown as Response; 

        // Act
        const mockClient = {}; // Create your mock client object
        await createUserHandler(req, res, jest.fn() as NextFunction, mockClient); // Pass the mock client

          // Assert
        expect(mockCreateUser).toHaveBeenCalledWith({ ...userInput}, mockClient); 
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          user: insertUserResult,
          token: expect.any(String),
        }); 
      });
    })
  })
})

function sanitizeString(input: string): string {
  return input.replace(/\s/g, ''); // to remove all whitespace characters
}