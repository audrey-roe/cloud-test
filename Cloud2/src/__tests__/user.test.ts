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
          INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3)
          RETURNING *;
    `;
    const actualInsertQueryPart = mockClient.query.mock.calls[1][0].text;
    expect(sanitizeString(actualInsertQueryPart)).toEqual(sanitizeString(expectedInsertQueryPart));


    expect(result).toEqual({ id: 1, ...userInput });
  });
});


function sanitizeString(input: string): string {
  return input.replace(/\s/g, ''); // to remove all whitespace characters
}