import { PipelineStage, Types } from 'mongoose';

export const getThresholdBasePipelineFactory = (userId: Types.ObjectId, value: number): Array<PipelineStage> => [
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
            isAlreadyClaimed: {
                $cond: {
                    if: { $eq: [{ $size: '$claim' }, 1] },
                    then: true,
                    else: false,
                },
            },
            canClaim: {
                $cond: {
                    if: { $and: [{ $eq: [{ $size: '$claim' }, 0] }, { $gte: [value, '$threshold'] }] },
                    then: true,
                    else: false,
                },
            },
        },
    },
    { $project: { claim: 0 } },
    { $sort: { canClaim: -1, isAlreadyClaimed: 1, threshold: 1, createdAt: -1 } },
];