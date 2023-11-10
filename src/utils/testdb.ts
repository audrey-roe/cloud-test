import { Pool } from 'pg'; // Import the actual Pool class from database library

const mockConnect = jest.fn();
const mockQuery = jest.fn();
const mockRelease = jest.fn();

class MockedPool extends Pool {
  release: jest.Mock<any, any, any>;
  constructor() {
    super();
    this.connect = mockConnect;
    this.query = mockQuery;
    this.release = mockRelease;
  }
}

const originalPool = jest.requireActual('db-library'); // Import the original Pool class

const mockPool = new MockedPool();

// Merge the mock methods with the original methods
const mergedPool = {
  ...originalPool,
  Pool: jest.fn(() => mockPool),
};

export default mergedPool;
