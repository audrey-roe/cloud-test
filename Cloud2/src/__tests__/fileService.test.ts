import { S3Client } from "@aws-sdk/client-s3";
import { downloadFromS3, getS3Client } from "../service/file.service";
import logger from "../utils/logger";

jest.mock("@aws-sdk/client-s3");
jest.mock("../utils/logger", () => ({
  error: jest.fn(),
  info: jest.fn()
}));

const mockSend = jest.fn().mockResolvedValue({
  Body: (async function*(): AsyncGenerator<Uint8Array, void, void> {
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
        const response = await uploadToS3(fileStream, "dummyFilename.txt", "text/plain");
        expect(logger.info).toHaveBeenCalledWith("Successfully uploaded object: test-bucket/dummyFilename.txt");
      });

      it("throws error when AWS credentials are missing", async () => {
        delete process.env.s3_ACCESS_KEY_ID;
        await expect(uploadToS3(Buffer.from("dummy data"), "dummyFilename.txt", "text/plain")).rejects.toThrow("AWS credentials are missing");
        expect(logger.error).toHaveBeenCalledWith("AWS credentials are not set!");
      });
    });

    describe("downloadFromS3 function", () => {
      it("throws an error when AWS credentials are missing", async () => {
        delete process.env.s3_ACCESS_KEY_ID;
        delete process.env.s3_SECRET_ACCESS_KEY;

        await expect(downloadFromS3('filename.txt')).rejects.toThrow("AWS credentials are missing");
        expect(logger.error).toHaveBeenCalledWith("AWS credentials are not set!");
      });

      it("downloads a file from S3 successfully", async () => {
        const mockResponse = {
          Body: (async function*() {
            yield new Uint8Array([1, 2, 3, 4]);
          })()
        };
        mockS3Client.send.mockResolvedValueOnce(mockResponse);

        const result = await downloadFromS3('filename.txt');
        expect(result).toEqual(Buffer.from([1, 2, 3, 4]));
      });

      it("throws an error when there's an S3 issue", async () => {
        const s3Error = new Error('S3 error');
        mockS3Client.send.mockRejectedValueOnce(s3Error);

        await expect(downloadFromS3('filename.txt')).rejects.toEqual(s3Error);
      });
    });
  });
});
