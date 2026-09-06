export class AppError {
    public readonly message: string;
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
    }
}