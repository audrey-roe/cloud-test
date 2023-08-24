import { createUser } from '../service/user.service'; 
import { UserInput } from '../models/user.model';

describe('createUser', () => {
      // Tests that createUser successfully creates a user with valid input
      it('should create a user with valid input', async () => {
        // Arrange
        const userInput: UserInput = {
          name: 'John Doe',
          email: 'johndoe@example.com',
          password: 'password123',
        };
        const existingUserResult = {
          rows: []
        };
        const insertUserResult = {
          rows: [{ id: 1, ...userInput }]
        };
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce(existingUserResult)
            .mockResolvedValueOnce(insertUserResult)
        };
        jest.mock('pg', () => ({
          Pool: jest.fn(() => client)
        }));
        jest.mock('bcrypt', () => ({
          hash: jest.fn().mockResolvedValue('hashedPassword')
        }));
  
        // Act
        const result = await createUser(userInput);

        // Assert
        expect(client.query).toHaveBeenCalledTimes(2);
        expect(client.query).toHaveBeenCalledWith({
          text: 'SELECT * FROM users WHERE email = $1',
          values: ['johndoe@example.com']
        });
        expect(client.query).toHaveBeenCalledWith({
          text: expect.stringContaining('INSERT INTO users (name, email, password)'),
          values: ['John Doe', 'johndoe@example.com', 'hashedPassword']
        });
        expect(result).toEqual({ id: 1, ...userInput });
      });
});
