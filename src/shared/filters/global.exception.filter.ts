import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppException, AppExceptionCode } from '../exceptions/app.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
    private readonly isProduction: boolean;

    constructor(private readonly configService: ConfigService) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const { message, statusCode, errorCode, data } = this.getExceptionInfo(exception);

        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();

        this.logError({ request, exception, statusCode });

        ctx.getResponse<Response>().status(statusCode).json({
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            data,
            code: errorCode,
        });
    }

    private logError({ exception, request, statusCode }: { request: Request; exception: unknown; statusCode: number }) {
        const { method, url, query, headers } = request;

        const str = JSON.stringify(
            {
                method,
                url,
                statusCode,
                userAgent: headers['user-agent'] || 'Unknown',
                // body: this.sanitizeBody(body),
                query,
            },
            null,
            2,
        );

        if (statusCode >= 500) {
            this.logger.error(`Server Error: ${method} ${url}`, exception instanceof Error ? exception.stack : exception, str);
        } else if (statusCode >= 400) {
            this.logger.warn(`Client Error: ${method} ${url} - ${statusCode}`, str);
        }
    }

    private getExceptionInfo(exception: unknown): {
        message: string;
        statusCode: number;
        errorCode?: AppExceptionCode;
        data?: any;
    } {
        if (exception instanceof HttpException) {
            return {
                message: exception.message,
                statusCode: exception.getStatus(),
            };
        }

        if (exception instanceof AppException) {
            return {
                message: exception.message,
                statusCode: exception.statusCode,
                errorCode: exception.errorCode,
                data: exception.data
            };
        }

        return {
            message: 'Internal server error',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        };
    }
}