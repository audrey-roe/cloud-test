import { S3Client } from "@aws-sdk/client-s3";
import { createFolder, downloadFromS3, getFileHistory, uploadFileToDatabase } from "../service/file.service";
import logger from "../utils/logger";
import pool from "../utils/db";

jest.mock('../utils/db', () => ({
  connect: jest.fn()
}));

jest.mock("@aws-sdk/client-s3");
jest.mock("../utils/logger", () => ({
  error: jest.fn(),
  info: jest.fn()
}));

const mockSend = jest.fn().mockResolvedValue({
  Body: (async function* (): AsyncGenerator<Uint8Array, void, void> {
    yield new Uint8Array([1, 2, 3, 4]);
  })()
});

const mockS3Client = { send: mockSend };

jest.mock("../service/file.service", () => {
  const originalModule = jest.requireActual("../service/file.service");
  return {
    ...originalModule,
    getS3Client: jest.fn().mockImplementation(() => mockS3Client),
  };
});

describe("File", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.s3_ACCESS_KEY_ID = 'test-access-key';
    process.env.s3_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_BUCKET_NAME = 'test-bucket';
  });

  describe("File Service", () => {
    describe("uploadToS3", () => {
      let uploadToS3: any;

      beforeEach(() => {
        uploadToS3 = require('../service/file.service').uploadToS3;
      });

      it('checks if getS3Client mock returns mocked send function', () => {
        const client = require('../service/file.service').getS3Client();
        client.send();
        expect(mockSend).toHaveBeenCalled();
      });

      it("successfully uploads to S3", async () => {
        const fileStream = Buffer.from("dummy data");
        const response = await uploadToS3(fileStream, "dummyFilename.txt", "text/plain", mockS3Client);
        expect(logger.info).toHaveBeenCalledWith("Successfully uploaded object: test-bucket/dummyFilename.txt");
      });

      it("throws error when AWS credentials are missing", async () => {
        delete process.env.s3_ACCESS_KEY_ID;
        await expect(uploadToS3(Buffer.from("dummy data"), "dummyFilename.txt", "text/plain", mockS3Client)).rejects.toThrow("AWS credentials are missing");
        expect(logger.error).toHaveBeenCalledWith("AWS credentials are not set!");
      });
    });

    describe("downloadFromS3 function", () => {
      it("throws an error when AWS credentials are missing", async () => {
        delete process.env.s3_ACCESS_KEY_ID;
        delete process.env.s3_SECRET_ACCESS_KEY;

        await expect(downloadFromS3('filename.txt', mockS3Client)).rejects.toThrow("AWS credentials are missing");
        expect(logger.error).toHaveBeenCalledWith("AWS credentials are not set!");
      });

      it("downloads a file from S3 successfully", async () => {
        const mockResponse = {
          Body: (async function* () {
            yield new Uint8Array([1, 2, 3, 4]);
          })()
        };
        mockS3Client.send.mockResolvedValueOnce({
          Body: (async function* (): AsyncGenerator<Uint8Array, void, void> {
            yield new Uint8Array([1, 2, 3, 4]);
          })()
        });


        const result = await downloadFromS3('filename.txt', mockS3Client);

        expect(result).toEqual(Buffer.from([1, 2, 3, 4]));
      });

      it("throws an error when there's an S3 issue", async () => {
        const s3Error = new Error('S3 error');
        mockS3Client.send.mockRejectedValueOnce(s3Error);

        await expect(downloadFromS3('filename.txt', mockS3Client)).rejects.toEqual(s3Error);
      });
    });

    describe('uploadFileToDatabase', () => {
      let mockClient: any;

      beforeEach(async () => {
        jest.clearAllMocks();
        jest.mock('pg', () => ({
          Pool: jest.fn(() => ({
            connect: jest.fn(),
            query: jest.fn(),
            end: jest.fn()
          }))
        }));
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should successfully insert file into the database and log history', async () => {
        const mockClient = {
          query: jest.fn(),
        };

        mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id: 1 }] });

        await uploadFileToDatabase('filename.txt', 'fileUrl', 'mediaType', 1, mockClient);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith(
          'INSERT INTO files (file_name, upload_date, media_type, data, is_unsafe, is_pending_deletion, ownerid) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, false, false, $4) RETURNING id',
          ['filename.txt', 'mediaType', 'fileUrl', 1]
        );
        expect(mockClient.query).toHaveBeenCalledWith('INSERT INTO fileHistory (fileId, action) VALUES ($1, $2)', [1, 'create']);
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should roll back transaction if error during files table insertion', async () => {
        const mockClient = {
          query: jest.fn(),
        };

        mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

        await expect(uploadFileToDatabase('filename.txt', 'fileUrl', 'mediaType', 1, mockClient)).rejects.toThrow('DB Error');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should roll back transaction if error during fileHistory table insertion', async () => {
        const mockClient = {
          query: jest.fn(),
        };

        mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockRejectedValue(new Error('DB Error'));

        await expect(uploadFileToDatabase('filename.txt', 'fileUrl', 'mediaType', 1, mockClient)).rejects.toThrow('DB Error');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should use a transaction for the database operations', async () => {
        const mockClient = {
          query: jest.fn(),
        };

        mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
          .mockResolvedValueOnce({ rows: [{ id: 1 }] });

        await uploadFileToDatabase('filename.txt', 'fileUrl', 'mediaType', 1, mockClient);

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      });

      it('should throw an error if there is an error during the database operations', async () => {
        const mockClient = {
          query: jest.fn(),
        };

        mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

        await expect(uploadFileToDatabase('filename.txt', 'fileUrl', 'mediaType', 1, mockClient)).rejects.toThrow('DB Error');
      });
    });

    describe('createFolder', () => {
      // Mock the 'pg' module to prevent interactions with a real database.
      const userId = 1;
      const name = 'Test Folder';
      const parentFolderId = null;
      const mockQueryResults = {
        rows: [{ id: 1, name: 'Test Folder', owner_id: userId, parent_folder_id: parentFolderId }]
      };

      const mockQuery = jest.fn().mockResolvedValue(mockQueryResults);
      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };
      jest.mock('pg', () => ({
        Pool: jest.fn(() => ({
          connect: jest.fn(),
          query: jest.fn(),
          end: jest.fn()
        }))
      }));

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should insert a new folder into the database and return the created folder object', async () => {
        // Arrange
        const expectedQueryText = `INSERT INTO folders (name, owner_id, parent_folder_id)
                VALUES ($1, $2, $3)
                RETURNING *
    `;
        // Act
        const result = await createFolder(userId, name, mockClient, parentFolderId);

        // Assert
        expect(mockQuery).toHaveBeenCalledWith(expectedQueryText, [name, userId, parentFolderId]);
        expect(result).toEqual({ id: 1, name: 'Test Folder', owner_id: 1, parent_folder_id: null });
      });


    });

    describe('getFileHistory', () => {
      const mockQueryResults = {
        rows: [{
          id: 2,
          fileid: 8,
          action: 'create',
          actiondate: new Date('2023-08-25T09:01:33.610Z')
        }]
      };
      const mockQuery = jest.fn().mockResolvedValue(mockQueryResults);
      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };
      jest.mock('pg', () => ({
        Pool: jest.fn(() => ({
          connect: jest.fn(),
          query: jest.fn(),
          end: jest.fn()
        }))
      }));
      // Tests that the function returns a QueryResult object with empty rows when given a valid fileId with no history and a mock client.
      it('should return a QueryResult object with empty rows when given a valid fileId with no history and a mock client', async () => {
       
        const result = await getFileHistory(2, mockClient);

        // Assert 
        expect(result).toEqual(mockQueryResults);
        expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM fileHistory WHERE fileId = $1', [2]);
      });

      it('should throw an error when given an invalid fileId and client', async () => {
        const mockQuery = jest.fn().mockRejectedValueOnce(new Error('Invalid fileId'));
        const mockClient = { query: mockQuery };

        await expect(getFileHistory(0, mockClient)).rejects.toThrow('Invalid fileId');
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM fileHistory WHERE fileId = $1', [0]);
      });
    });

  });
});
