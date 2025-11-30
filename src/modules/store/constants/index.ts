export const Routes = {
    PREFIX: 'store',
    GET_INVOICE: 'get-invoice/:productId',
    GET_PAID_STATUS: 'get-paid-status/:productId',
} as const;

export const STORE_EVENTS = {
    PRODUCT_BUY: 'product_buy',
} as const;