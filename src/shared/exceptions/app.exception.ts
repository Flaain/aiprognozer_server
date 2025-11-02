import { HttpStatus } from '@nestjs/common';

export type AppExceptionCode = 'REFERALL_NOT_EXISTS' | 'REFERALL_ALREADY_TAKEN' | 'ALREADY_VERIFIED';

export class AppException extends Error {
    private readonly errorCode?: AppExceptionCode;

    constructor(
        error: { message: string; errorCode?: AppExceptionCode },
        private readonly statusCode: HttpStatus,
    ) {
        super(error.message);

        this.errorCode = error.errorCode;
    }

    getStatusCode() {
        return this.statusCode;
    }

    getErrorCode() {
        return this.errorCode;
    }
}
