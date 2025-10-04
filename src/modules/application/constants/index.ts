export const Routes = {
    PREFIX: 'application',
    SEND: 'send',
    APPROVE: 'approve/:id',
    REJECT: 'reject/:id',
}

export const APPLICATION_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
} as const;

export const MIN_1WIN_NAME_LENGTH = 3;
export const MAX_1WIN_NAME_LENGTH = 64;