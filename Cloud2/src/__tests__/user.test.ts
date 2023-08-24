import { createUser } from '../service/user.service';
import { UserInput } from '../models/user.model';
import { createUserHandler } from '../controller/user.controller';
import * as userService from '../service/user.service'; 
import {Response, Request, NextFunction } from 'express';
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
        console.log(result)
        expect(sanitizeString(actualInsertQueryPart)).toEqual(sanitizeString(expectedInsertQueryPart));
        // expect(result).toEqual({ id: 1, ...userInput, is_admin: true });
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
      // Tests that the function successfully creates a user and returns a token
      it('should create a user with valid input', async () => {
        // Arrange
        const req = {
          body: userInput,
        } as Request; // Provide a mock request object
    
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
        } as unknown as Response; // Provide a mock response object
    
        userService.createUser = jest.fn().mockResolvedValue(insertUserResult);
    
        // Act
        await createUserHandler(req, res, jest.fn() as NextFunction);
    
        // Assert
        expect(userService.createUser).toHaveBeenCalledWith({ ...userInput, is_admin: false }, mockClient); // Check if userService.createUser was called with the expected input
        expect(res.status).toHaveBeenCalledWith(201); // Check if the response status was set correctly
        expect(res.json).toHaveBeenCalledWith({
          user: insertUserResult,
          token: expect.any(String), // Assuming you are generating a token
        }); // Check if the response was correctly sent
      });
    })

  })
})

function sanitizeString(input: string): string {
  return input.replace(/\s/g, ''); // to remove all whitespace characters
}