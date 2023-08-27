import { uploadFileHandler, handleCreateFolder, getFileHandler, getFileHistoryController, markAndDeleteUnsafeFileController, getS3Client, streamFileController } from "../controller/files.controller";
import { Response, Request } from 'express';
import { uploadToS3, createFolder, getFileHistory, streamFromR2 } from '../service/file.service';
import { uploadFileToDatabase, markAndDeleteUnsafeFile } from '../service/file.service';
import { Readable } from "stream";
import * as fileService from '../service/file.service';
import { QueryResult } from "pg";
import pool from "../utils/pool";

jest.mock('../service/file.service');

describe('File', () => {

    describe('FileController', () => {
        let mockReq: Partial<Request>;
        let mockRes: Partial<Response>;
        let mockPoolConnect: jest.Mock;
        let mockS3Client: jest.Mock;
        beforeEach(() => {
            jest.clearAllMocks();

            (uploadToS3 as jest.Mock).mockResolvedValue({ ETag: 'mockETagValue' });
            (uploadFileToDatabase as jest.Mock).mockResolvedValue({});
        });
        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('uploadFileHandler', () => {
            const mockRequest: Partial<Request> = {};
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
                uploadFileToDatabaseSpy.mockResolvedValue({ fileId: 9999, fileName: 'string' });

                await uploadFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(201);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'File uploaded successfully', 'fileId': 9999, 'fileName': 'string' });
                // expect(uploadToS3).toHaveBeenCalledWith(Buffer.from('test file data'), 'testFile.jpg', 'image/jpeg');
                // expect(uploadFileToDatabase).toHaveBeenCalledWith('testFile.jpg', 'mockETagValue', 'image/jpeg', 123);

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
                        httpStatusCode: 404,//<==
                        requestId: 'someRequestId',
                        extendedRequestId: 'someExtendedRequestId',
                        cfId: 'someCfId',
                        attempts: 1,
                        totalRetryDelay: 0
                    }
                };
                jest.spyOn(fileService, 'uploadToS3').mockResolvedValue(mockS3Response);  // simulating S3 failure by returning a 404 object.

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

        describe('getFileHandler', () => {
            let mockRequest: Partial<Request>;
            let mockResponse: Partial<Response>;
            const mockNext = jest.fn();

            beforeEach(() => {
                mockRequest = {};
                mockResponse = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn(),
                    send: jest.fn(),
                    setHeader: jest.fn()
                };
            });

            it('should successfully retrieve a file', async () => {
                mockRequest.params = { fileId: '1234' };

                (fileService.getFileFromDatabase as jest.MockedFunction<typeof fileService.getFileFromDatabase>).mockResolvedValue({
                    command: 'SELECT',
                    rowCount: 1,
                    oid: null,
                    rows: [{
                        file_name: 'test.txt',
                        media_type: 'text/plain',
                    }],
                    fields: [],
                } as unknown as QueryResult);

                (fileService.downloadFromS3 as jest.MockedFunction<typeof fileService.downloadFromS3>).mockResolvedValue(Buffer.from('Hello World'));

                await getFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=test.txt');
                expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
                expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from('Hello World'));
            });

            it('should return a 404 when file not found in database', async () => {
                mockRequest.params = { fileId: '1234' };
                (fileService.getFileFromDatabase as jest.MockedFunction<typeof fileService.getFileFromDatabase>).mockResolvedValue({
                    command: 'SELECT',
                    rowCount: 0,
                    oid: null,
                    rows: [],
                    fields: [],
                } as unknown as QueryResult);


                await getFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'File not found' });
            });

            it('should return a 404 when specified key does not exist in S3', async () => {
                mockRequest.params = { fileId: '1234' };
                (fileService.getFileFromDatabase as jest.MockedFunction<typeof fileService.getFileFromDatabase>).mockResolvedValue({
                    command: 'SELECT',
                    rowCount: 1,
                    oid: null,
                    rows: [{
                        file_name: 'test.txt',
                        media_type: 'text/plain',
                    }],
                    fields: [],
                } as unknown as QueryResult);


                (fileService.downloadFromS3 as jest.MockedFunction<typeof fileService.downloadFromS3>).mockRejectedValue(new Error('The specified key does not exist.'));

                await getFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: `The file you are looking for doesn't exist` });
            });

            it('should handle unexpected errors', async () => {
                mockRequest.params = { fileId: '1234' };
                (fileService.getFileFromDatabase as jest.MockedFunction<typeof fileService.getFileFromDatabase>).mockRejectedValue(new Error('Unexpected error'));

                await getFileHandler(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Internal server error', error: 'Unexpected error' });
            });
        });

        describe('handleCreateFolder', () => {
            let mockRequest: Partial<Request>;
            let mockResponse: Partial<Response>;

            beforeEach(() => {
                mockRequest = {
                    body: {},
                };
                mockResponse = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn(),
                    send: jest.fn(),
                    setHeader: jest.fn(),
                    locals: { user: { id: 234 } }

                };
            });

            it('should successfully create a folder', async () => {
                mockRequest.body = {
                    name: 'New Folder',
                    parentFolderId: 1234,
                };

                (fileService.createFolder as jest.MockedFunction<typeof createFolder>).mockResolvedValue({
                    id: '5678',
                    name: 'New Folder',
                    parentFolderId: 1234,
                    ownerId: 234,
                    files: [],
                    subfolders: [],
                });

                await handleCreateFolder(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(201);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    id: '5678',
                    name: 'New Folder',
                    ownerId: 234,
                    parentFolderId: 1234,
                    files: expect.arrayContaining([]),
                    subfolders: expect.arrayContaining([])
                });

            });

            it('should handle missing name in request body', async () => {
                mockRequest.body = {
                    parentFolderId: 1234,
                };

                await handleCreateFolder(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({ error: 'Bad Request' })
                );
            });

            it('should handle missing parentFolderId in request body', async () => {
                mockRequest.body = {
                    name: 'New Folder',
                };

                await handleCreateFolder(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(201);
            });


            it('should handle database errors', async () => {
                mockRequest.body = {
                    name: 'New Folder',
                    parentFolderId: 1234,
                };

                (createFolder as jest.MockedFunction<typeof createFolder>).mockRejectedValue(new Error('Database error'));

                await handleCreateFolder(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
            });


        });

        describe('getFileHistoryController', () => {

            // mokcking the service function to control its behavior
            const mockGetFileHistory = getFileHistory as jest.MockedFunction<typeof getFileHistory>;
            let mockRequest: Partial<Request> & { params: { fileId: string } };
            let mockResponse: Partial<Response>;

            beforeEach(() => {
                mockRequest = {
                    params: { fileId: '1' }
                };
                mockResponse = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn()
                };
            });



            it('should return file history successfully', async () => {
                mockRequest.params.fileId = '2';

                const mockHistory: QueryResult = {
                    rows: [
                        { version: 1, change: 'create', actiondate: '2023-08-24 03:43:32.022321' },
                    ],
                    command: 'SELECT',
                    rowCount: 15,
                    oid: 0,
                    fields: [],
                };

                mockGetFileHistory.mockResolvedValue(mockHistory);

                await getFileHistoryController(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({ history: mockHistory.rows });
            });

            it('should handle errors while retrieving file history', async () => {
                mockRequest.params.fileId = '1';

                mockGetFileHistory.mockRejectedValue(new Error('Database error'));

                await getFileHistoryController(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: 'An error occurred while retrieving file history.' });
            });

        });

        describe('markAndDeleteUnsafeFileController', () => {


            beforeEach(() => {
                mockReq = {
                    body: {
                        file: {
                            id: '123',
                        },
                    },
                };

                mockRes = {
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn().mockReturnThis(),
                };

                mockPoolConnect = jest.fn();
                (pool.connect as jest.Mock) = mockPoolConnect;
            });

            it('should successfully mark and delete the file', async () => {
                mockPoolConnect.mockResolvedValueOnce({});
                (markAndDeleteUnsafeFile as jest.Mock).mockResolvedValueOnce({});

                await markAndDeleteUnsafeFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.status).toHaveBeenCalledWith(200);
                expect(mockRes.json).toHaveBeenCalledWith({ message: 'File marked as unsafe and deleted successfully.' });
            });

            it('should respond with 404 when file is not found', async () => {
                const errorMsg = 'File not found.';
                (markAndDeleteUnsafeFile as jest.Mock).mockRejectedValueOnce(new Error(errorMsg));

                await markAndDeleteUnsafeFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.json).toHaveBeenCalledWith({ error: errorMsg });
            });

            it('should handle other errors during marking and deletion', async () => {
                (markAndDeleteUnsafeFile as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

                await markAndDeleteUnsafeFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({ error: 'An error occurred while marking and deleting the file.' });
            });
        });

        describe('streamFileController', () => {
            interface MockResponse extends Response {
                locals: {
                    userId?: number;
                };
                setHeader: jest.Mock;
                status: jest.Mock;
                json: jest.Mock;
            }
            let mockRes: MockResponse;
            
            beforeEach(() => {
                mockReq = {
                    body: {
                        key: 'sample-file.jpg',
                    },
                };

                mockRes = {
                    locals: { userId: 123 },
                    setHeader: jest.fn(),
                    status: jest.fn().mockReturnThis(),
                    json: jest.fn().mockReturnThis(),
                } as MockResponse;                
                
                mockPoolConnect = jest.fn();
                mockS3Client = jest.fn();
                (pool.connect as jest.Mock) = mockPoolConnect;
                (getS3Client as jest.Mock) = mockS3Client;
            });

            it('should successfully stream the file', async () => {
                const mockStream = new Readable();
                mockStream.push('sample data');
                mockStream.push(null);

                mockPoolConnect.mockResolvedValueOnce({});
                mockS3Client.mockReturnValueOnce({});
                (streamFromR2 as jest.Mock).mockResolvedValueOnce(mockStream);

                await streamFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=sample-file.jpg');
            });

            it('should handle a failed stream', async () => {
                mockPoolConnect.mockResolvedValueOnce({});
                mockS3Client.mockReturnValueOnce({});
                (streamFromR2 as jest.Mock).mockResolvedValueOnce({});

                await streamFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error', error: "Failed to get a readable stream." });
            });

            it('should handle user not logged in', async () => {
                mockRes.locals.userId = undefined;

                await streamFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.json).toHaveBeenCalledWith('User not logged in, please login again');
            });

            it('should handle other server errors', async () => {
                mockPoolConnect.mockResolvedValueOnce({});
                mockS3Client.mockReturnValueOnce({});
                (streamFromR2 as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));

                await streamFileController(mockReq as Request, mockRes as Response);

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error', error: 'Unexpected error' });
            });
        });

    })
})