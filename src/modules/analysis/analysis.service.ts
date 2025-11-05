import { Inject, Injectable } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { readFile } from 'node:fs/promises';
import { SportType } from './types';
import {
    MAX_ALTERNATIVE_PROBABILITY_PERCENT,
    MAX_PREDICTION_PROBABILITY_PERCENT,
    MIN_ALTERNATIVE_PROBABILITY_PERCENT,
    MIN_PREDICTION_PROBABILITY_PERCENT,
    PREDICTION_SIZE,
} from './constants';
import { PROVIDERS } from 'src/shared/constants';
import { Bot } from 'grammy';

@Injectable()
export class AnalysisService {
    constructor(@Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot) {}

    analysis = async (user: UserDocument, type: SportType, _: Express.Multer.File) => {
        const variants = JSON.parse(await readFile('./variants.json', 'utf-8'));

        const indexes = new Set<number>();
        const alternativeProbability = new Set<number>();
        
        while (indexes.size < PREDICTION_SIZE || alternativeProbability.size < PREDICTION_SIZE - 1) {
            indexes.size < PREDICTION_SIZE && indexes.add(Math.floor(Math.random() * variants[type].markets.length));
            alternativeProbability.size < PREDICTION_SIZE - 1 && alternativeProbability.add(Math.floor(Math.random() * (MAX_ALTERNATIVE_PROBABILITY_PERCENT - MIN_ALTERNATIVE_PROBABILITY_PERCENT + 1)) + MIN_ALTERNATIVE_PROBABILITY_PERCENT);
        };

        const alternativesArr = Array.from(alternativeProbability);

        const [prediction, ...alternatives] = Array.from(indexes).map((market_index, index) => {
            const { name, abbr, descriptions } = variants[type].markets[market_index];

            if (!index) {
                return {
                    name,
                    abbr,
                    reasoning: descriptions[Math.floor(Math.random() * descriptions.length)],
                    probability: Math.floor(Math.random() * (MAX_PREDICTION_PROBABILITY_PERCENT - MIN_PREDICTION_PROBABILITY_PERCENT + 1)) + MIN_PREDICTION_PROBABILITY_PERCENT,
                }
            }

            return {
                name,
                abbr,
                probability: alternativesArr[index - 1]
            }
        });

        const last_request_at = new Date();

        await user.updateOne({ 
            $inc: { request_count: 1 }, 
            $set: { last_request_at }
        });

        this.tgBot.api.sendMessage(
            user.telegram_id, 
            `*Анализ завершен*\n\n*Основной прогзноз - ${prediction.name}*\n\nРассуждения - ${prediction.reasoning}\n\n*Вероятность успеха: ${prediction.probability}%*\n\n*Альтертативные прогнозы:*\n\n${alternatives.map((alternative) => `${alternative.name} - ${alternative.probability}%`).join('\n')}\n\n_Отказ от ответственности - Обратите внимание, что все аналитические данные, выводы и прогнозы генерируются системой искусственного интеллекта (ИИ). Как и любая сложная технология, наш ИИ не застрахован от ошибок и может допускать неточности или неверно интерпретировать контекст.\n\nИнформация предоставляется исключительно в ознакомительных целях и не является руководством к действию или профессиональной консультацией. Мы не несем ответственности за любые решения, принятые вами на основе этого анализа._`,
            {
                parse_mode: 'Markdown',
                message_effect_id: '5046509860389126442'
            }
        )

        return { prediction, alternatives, last_request_at };
    };
}
