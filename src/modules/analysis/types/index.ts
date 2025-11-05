export type SportType = 'football' | 'basketball' | 'mma';

export interface Prediction {
    name: string;
    abbr: string;
    description: string;
    probability: number;
}

export interface Analysis {
    prediction: Prediction;
    alternative: Array<Omit<Prediction, 'description'>>;
}

export interface Variants {
    
}