class CustomError extends Error {
    constructor(message: string | undefined, statusCode: any) {
        super(message);
        this.statusCode = statusCode;
    }
}