import { createUser } from '../service/user.service';
import { UserInput } from '../models/user.model';
// import { createInstance } from 'pg-mem';

describe('createUser', () => {
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
  // Tests that createUser successfully creates a user with valid input
  it('should create a user with valid input', async () => {
    // Arrange
    jest.mock('bcrypt', () => ({
      hash: jest.fn().mockReturnValue('hashedPassword')
    }));

    // Act
    const result = await createUser(userInput, mockClient);

    // Assert
    expect(mockClient.query).toHaveBeenCalledTimes(2);
    expect(mockClient.query).toHaveBeenCalledWith({
      text: 'SELECT * FROM users WHERE email = $1',
      values: ['johndoe@example.com']
    });
    expect(mockClient.query).toHaveBeenCalledWith({
      text: expect.stringContaining('INSERT INTO users (name, email, password)'),
      values: ['John Doe', 'johndoe@example.com', 'hashedPassword']
    });
    expect(result).toEqual({ id: 1, ...userInput });
  });
});
