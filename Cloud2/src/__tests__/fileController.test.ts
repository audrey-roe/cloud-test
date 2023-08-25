import { uploadFileHandler } from "../controller/files.controller";
import { Response, Request } from 'express';
import { uploadToS3 } from '../service/file.service';
import { uploadFileToDatabase } from '../service/file.service';
import { Readable } from "stream";
import * as fileService from '../service/file.service';

jest.mock('../service/file.service');
jest.mock('./../service/file.service');
describe('File', () => {

    describe('FileController', () => {
        beforeEach(() => {
            jest.clearAllMocks();

            (uploadToS3 as jest.Mock).mockResolvedValue({ ETag: 'mockETagValue' });
            (uploadFileToDatabase as jest.Mock).mockResolvedValue({});
        });

        describe('uploadFileHandler', () => {
            const mockRequest: Partial<Request> = {}; // Initialize with common properties.
            const mockResponse: Partial<Response> = {
                status: jest.fn(() => mockResponse) as unknown as jest.MockedFunction<Response['status']>,
                json: jest.fn().mockReturnThis() as jest.MockedFunction<Response['json']>,
            };
            const nextFunction = jest.fn();
            const uploadToS3Spy = jest.spyOn(fileService, 'uploadToS3');
            const uploadFileToDatabaseSpy = jest.spyOn(fileService, 'uploadFileToDatabase');

            beforeEach(() => {
                jest.clearAllMocks();
            });
            afterEach(() => {
                uploadToS3Spy.mockRestore();
                uploadFileToDatabaseSpy.mockRestore();
            });

            it('should upload a file successfully and return status code 201', async () => {
                mockRequest.file = {
                    originalname: 'testFile.jpg',
                    buffer: Buffer.from('test file data'),
                    mimetype: 'image/jpeg',
                    fieldname: 'testFile.jpg',
                    encoding: 'base64',
                    size: 1234,
                    stream: new Readable({
                        read() {
                            this.push('mock data for stream');
                            this.push(null);  //signal end of data
                        }
                    }),

                    destination: '/mock/path/to/destination/',
                    filename: 'mockFilename.jpg',
                    path: '/mock/path/to/destination/mockFilename.jpg'
                };
                mockResponse.locals = { userId: 123 };

                const mockS3Response = {
                    ETag: "mockETagValue",
                    $metadata: {
                        httpStatusCode: 200,
                        requestId: 'someRequestId',
                        extendedRequestId: 'someExtendedRequestId',
                        cfId: 'someCfId',
                        attempts: 1,
                        totalRetryDelay: 0
                    }
                };

                uploadToS3Spy.mockResolvedValue(mockS3Response)
                uploadFileToDatabaseSpy.mockResolvedValue();

                await uploadFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(201);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'File uploaded successfully' });
                expect(uploadToS3).toHaveBeenCalledWith(Buffer.from('test file data'), 'testFile.jpg', 'image/jpeg');
                expect(uploadFileToDatabase).toHaveBeenCalledWith('testFile.jpg', 'mockETagValue', 'image/jpeg', 123);

            });
            it('should throw an error when file size is more than 200MB', async () => {
                mockRequest.file = {
                    originalname: 'testFile.jpg',
                    buffer: Buffer.from('test file data'),
                    mimetype: 'image/jpeg',
                    fieldname: 'testFile.jpg',
                    encoding: 'base64',
                    size: 201 * 1024 * 1024, // 201MB in bytes
                    stream: new Readable({
                        read() {
                            this.push('mock data for stream');
                            this.push(null);  //signal end of data
                        }
                    }),
                    destination: '/mock/path/to/destination/',
                    filename: 'mockFilename.jpg',
                    path: '/mock/path/to/destination/mockFilename.jpg'
                };
            
                await expect(uploadFileHandler(mockRequest as Request, mockResponse as Response))
                      .rejects.toThrow('File size exceeds the 200MB limit');
            });
            

            it('should throw an error if no file is provided', async () => {
                mockRequest.file = undefined;

                await expect(uploadFileHandler(mockRequest as Request, mockResponse as Response)).rejects.toThrow('Upload file failed');
            });

            it('should return 404 if S3 upload fails', async () => {
                mockRequest.file = {
                    originalname: 'testFile.jpg',
                    buffer: Buffer.from('test file data'),
                    mimetype: 'image/jpeg',
                    fieldname: 'testFile.jpg',
                    encoding: 'base64',
                    size: 1234,
                    stream: new Readable({
                        read() {
                            this.push('mock data for stream');
                            this.push(null);
                        }
                    }),

                    destination: '/mock/path/to/destination/',
                    filename: 'mockFilename.jpg',
                    path: '/mock/path/to/destination/mockFilename.jpg'
                };
                mockResponse.locals = { userId: 123 };
                const mockS3Response = {
                    $metadata: {
                        httpStatusCode: 404,
                        requestId: 'someRequestId',
                        extendedRequestId: 'someExtendedRequestId',
                        cfId: 'someCfId',
                        attempts: 1,
                        totalRetryDelay: 0
                    }
                };
                jest.spyOn(fileService, 'uploadToS3').mockResolvedValue(mockS3Response);  // Simulate S3 failure by returning a 404 object.

                await uploadFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to upload file to S3' });
            });

            it('should return 500 for generic errors', async () => {
                mockRequest.file = {
                    originalname: 'testFile.jpg',
                    buffer: Buffer.from('test file data'),
                    mimetype: 'image/jpeg',
                    fieldname: 'testFile.jpg',
                    encoding: 'base64',
                    size: 1234,
                    stream: new Readable({
                        read() {
                            this.push('mock data for stream');
                            this.push(null);
                        }
                    }),

                    destination: '/mock/path/to/destination/',
                    filename: 'mockFilename.jpg',
                    path: '/mock/path/to/destination/mockFilename.jpg'
                };
                mockResponse.locals = { userId: 123 };

                jest.spyOn(fileService, 'uploadToS3').mockRejectedValue(new Error('Generic error'));

                await uploadFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Internal server error' });
            });
        });
        

    })
})