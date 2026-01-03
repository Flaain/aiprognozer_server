import { HttpStatus } from '@nestjs/common';

export type AppExceptionCode = 'REFERRAL_NOT_EXISTS' | 'REFERRAL_ALREADY_TAKEN' | 'ALREADY_VERIFIED' | 'REQUEST_LIMIT_EXCEEDED';

export class AppException extends Error {
    private readonly errorCode?: AppExceptionCode;
    public readonly first_request_at?: Date;

    constructor(
        error: { message: string; errorCode?: AppExceptionCode; first_request_at?: Date },
        private readonly statusCode: HttpStatus,
    ) {
        super(error.message);

        this.errorCode = error.errorCode;
        this.first_request_at = error.first_request_at;
    }

    getStatusCode() {
        return this.statusCode;
    }

    getErrorCode() {
        return this.errorCode;
    }
}
