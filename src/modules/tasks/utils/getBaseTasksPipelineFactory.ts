import { PipelineStage, Types } from 'mongoose';

export const getBaseTasksPipelineFactory = (userId: Types.ObjectId): Array<PipelineStage> => [
    {
        $lookup: {
            let: { taskId: '$_id' },
            from: 'tasks_claims',
            as: 'claim',
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [{ $eq: ['$taskId', '$$taskId'] }, { $eq: ['$userId', userId] }],
                        },
                    },
                },
            ],
        },
    },
    {
        $addFields: {
            canClaim: {
                $cond: {
                    if: { $eq: [{ $size: '$claim' }, 0] },
                    then: true,
                    else: false,
                },
            },
        },
    },
    { $project: { claim: 0 } },
    { $sort: { canClaim: -1, createdAt: -1 } },
];