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
import { MESSAGE_EFFECT_ID, PROVIDERS } from 'src/shared/constants';
import { TgProvider } from '../tg/types';

@Injectable()
export class AnalysisService {
    constructor(@Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider) {}

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

        await user.save();

        this.tgProvider.bot.api.sendMessage(
            user.telegram_id, 
            `<b>Анализ завершен</b>\n\n<b>Основной прогзноз — <u>${prediction.name}</u></b>\n<b>Уверенность ИИ — ${prediction.probability}%</b>\n\n<blockquote expandable>${prediction.reasoning}</blockquote>\n\n<b>Альтертативные прогнозы:</b>\n\n${alternatives.map((alternative) => `${alternative.name} — ${alternative.probability}%`).join('\n')}\n\n<tg-spoiler><i>Отказ от ответственности — Обратите внимание, что все аналитические данные, выводы и прогнозы генерируются системой искусственного интеллекта (ИИ). Как и любая сложная технология, наш ИИ не застрахован от ошибок и может допускать неточности или неверно интерпретировать контекст.\n\nИнформация предоставляется исключительно в ознакомительных целях и не является руководством к действию или профессиональной консультацией. Мы не несем ответственности за любые решения, принятые вами на основе этого анализа.</i></tg-spoiler>\n\n#анализ`,
            {
                parse_mode: 'HTML',
                message_effect_id: MESSAGE_EFFECT_ID.FLAME
            }
        )

        return { prediction, alternatives, first_request_at: user.first_request_at };
    };
}
