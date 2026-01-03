import { Injectable } from '@nestjs/common';
import { ClientSession, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { createHash } from 'crypto';
import { ReferralsRepository } from './referrals.repository';
import { Referrals } from './schemas/referrals.schema';
import { REFERRAL_CODE_LENGTH } from './constants';

@Injectable()
export class ReferralsService {
    constructor(private readonly referralsRepository: ReferralsRepository) {}

    findById = (id: Types.ObjectId) => this.referralsRepository.findById(id);

    findOneAndUpdateCode = (
        filter?: RootFilterQuery<Referrals>,
        update?: UpdateQuery<Referrals>,
        options?: QueryOptions<Referrals>,
    ) => this.referralsRepository.findOneAndUpdateCode(filter, update, options);

    createUserReferralCode = async (userId: Types.ObjectId, session?: ClientSession) => {
        return this.referralsRepository.createUserReferralCode(userId, this.getHashCode(userId), session);
    };

    getHashCode = (userId: Types.ObjectId) => createHash('sha256').update(userId.toString()).digest('hex').slice(0, REFERRAL_CODE_LENGTH).toLowerCase();

    findOne = (
        filter?: RootFilterQuery<Referrals>,
        projection?: ProjectionType<Referrals>,
        options?: QueryOptions<Referrals>,
    ) => this.referralsRepository.findOne(filter, projection, options);
}