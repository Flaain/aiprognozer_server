import { HttpStatus } from '@nestjs/common';

export type AppExceptionCode =
    | 'REFERRAL_NOT_EXISTS'
    | 'REFERRAL_ALREADY_TAKEN'
    | 'ALREADY_VERIFIED'
    | 'REQUEST_LIMIT_EXCEEDED'
    | 'TASK_NOT_EXISTS'
    | 'TASK_ALREADY_CLAIMED'
    | 'NOT_MEMBER_OF_CHAT';

export class AppException extends Error {
    private readonly _errorCode?: AppExceptionCode;
    private readonly _data?: any;

    constructor(
        error: { message: string; errorCode?: AppExceptionCode; data?: any },
        private readonly _statusCode: HttpStatus,
    ) {
        super(error.message);

        this._data = error.data;
        this._errorCode = error.errorCode;
    }

    get data() {
        return this._data;
    }

    get statusCode() {
        return this._statusCode;
    }

    get errorCode() {
        return this._errorCode;
    }
}