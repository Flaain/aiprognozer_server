import { Injectable } from '@nestjs/common';
import { ClientSession, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { createHash } from 'crypto';
import { REFERALL_CODE_LENGTH } from './constants';
import { Referalls } from './schemas/referalls.schema';
import { ReferallsRepository } from './referalls.repository';

@Injectable()
export class ReferallsService {
    constructor(private readonly referallCodesRepository: ReferallsRepository) {}

    findOneAndUpdateCode = (
        filter?: RootFilterQuery<Referalls>,
        update?: UpdateQuery<Referalls>,
        options?: QueryOptions<Referalls>,
    ) => this.referallCodesRepository.findOneAndUpdateCode(filter, update, options);

    createUserReferralCode = async (userId: Types.ObjectId, session?: ClientSession) => {
        const hash = createHash('sha256').update(userId.toString()).digest('hex').slice(0, REFERALL_CODE_LENGTH).toLowerCase();
        
        return this.referallCodesRepository.createUserReferralCode(userId, hash, session);
    };

    findOne = (
        filter?: RootFilterQuery<Referalls>,
        projection?: ProjectionType<Referalls>,
        options?: QueryOptions<Referalls>,
    ) => this.referallCodesRepository.findOne(filter, projection, options);
}
