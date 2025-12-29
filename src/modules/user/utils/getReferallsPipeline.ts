import { PipelineStage, Types } from 'mongoose';
import { REFERALLS_BATCH } from '../constants';

export const getReferallsPipeLine = (referallCodeId: Types.ObjectId, cursor?: string): Array<PipelineStage> =>
    cursor
        ? [
              { $match: { invitedBy: referallCodeId, _id: { $lt: new Types.ObjectId(cursor) } } },
              { $sort: { createdAt: -1 } },
              {
                  $facet: {
                      items: [
                          { $limit: REFERALLS_BATCH },
                          { $project: { name: 1, isVerified: 1, createdAt: 1, telegram_id: 1 } },
                      ],
                      meta: [
                          { $count: 'total' },
                          {
                              $addFields: {
                                  hasMore: { $gt: ['$total', REFERALLS_BATCH] },
                                  perPage: REFERALLS_BATCH,
                                  itemsLeft: { $max: [{ $subtract: ['$total', REFERALLS_BATCH] }, 0] },
                              },
                          },
                      ],
                  },
              },
          ]
        : [
              { $match: { invitedBy: referallCodeId } },
              { $sort: { createdAt: -1 } },
              {
                  $facet: {
                      items: [
                          { $limit: REFERALLS_BATCH },
                          { $project: { name: 1, isVerified: 1, createdAt: 1, telegram_id: 1 } },
                      ],
                      meta: [
                          { $count: 'total' },
                          {
                              $addFields: {
                                  hasMore: { $gt: ['$total', REFERALLS_BATCH] },
                                  perPage: REFERALLS_BATCH,
                                  itemsLeft: { $max: [{ $subtract: ['$total', REFERALLS_BATCH] }, 0] },
                              },
                          },
                      ],
                      totalVerified: [{ $match: { isVerified: true } }, { $count: 'total' }],
                  },
              },
              { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
              {
                  $addFields: {
                      totalVerified: { $getField: { field: 'total', input: { $arrayElemAt: ['$totalVerified', 0] } } }
                  },
              },
          ];