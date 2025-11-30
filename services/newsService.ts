
import { NewsItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SOURCES = ['Bloomberg Crypto', 'CoinDesk', 'WhaleAlert', 'Reuters', 'CryptoPanic', 'Glassnode'];

const BULLISH_TEMPLATES = [
  "BlackRock увеличивает долю Bitcoin в Глобальном Фонде на {amount}%.",
  "SEC намекает на одобрение Ethereum Spot ETF уже на следующей неделе.",
  "MicroStrategy докупает еще {amount}00 BTC на баланс.",
  "ФРС США сигнализирует о возможном снижении ставок раньше ожидаемого.",
  "Хешрейт Биткойна достиг нового исторического максимума, сеть в безопасности.",
  "Крупный кит вывел {amount}000 BTC на холодный кошелек (Накопление).",
  "Google интегрирует отображение балансов BTC прямо в поиске.",
  "Сальвадор полностью погасил долг МВФ, используя прибыль от Bitcoin."
];

const BEARISH_TEMPLATES = [
  "Попечитель Mt. Gox готовит распределение {amount}000 BTC среди кредиторов.",
  "SEC подает иск против крупной биржи за торговлю незарегистрированными бумагами.",
  "Данные по инфляции выше ожиданий, рынки падают.",
  "Кит перевел {amount}000 BTC на Binance (Возможный дамп).",
  "Резервы майнеров сокращаются, растут опасения капитуляции.",
  "Евросоюз ужесточает правила для анонимных криптокошельков.",
  "Tether сталкивается с новой проверкой обеспечения резервов.",
  "DeFi протокол взломан, украдено ${amount} млн."
];

const NEUTRAL_TEMPLATES = [
  "Сложность майнинга Биткойна скорректировалась на {amount}% в эту эпоху.",
  "Объем транзакций стейблкоинов обогнал Visa за месяц.",
  "Рынок консолидируется в ожидании данных по CPI.",
  "Открытый интерес по деривативам остается неизменным.",
  "Корреляция между S&P 500 и Биткойном достигла минимума за 6 месяцев."
];

export const generateNewsItem = (): NewsItem => {
  const rand = Math.random();
  let type: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let template = "";

  if (rand > 0.65) {
    type = 'BULLISH';
    template = BULLISH_TEMPLATES[Math.floor(Math.random() * BULLISH_TEMPLATES.length)];
  } else if (rand < 0.35) {
    type = 'BEARISH';
    template = BEARISH_TEMPLATES[Math.floor(Math.random() * BEARISH_TEMPLATES.length)];
  } else {
    type = 'NEUTRAL';
    template = NEUTRAL_TEMPLATES[Math.floor(Math.random() * NEUTRAL_TEMPLATES.length)];
  }

  const text = template.replace('{amount}', (Math.floor(Math.random() * 50) + 1).toString());
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];

  return {
    id: uuidv4(),
    text,
    sentiment: type,
    source,
    timestamp: Date.now()
  };
};

export const getMarketSentimentScore = (recentNews: NewsItem[]): number => {
    // Returns 0-100 (0 = Extreme Fear, 100 = Extreme Greed)
    if (recentNews.length === 0) return 50;
    
    let score = 50;
    recentNews.forEach(news => {
        if (news.sentiment === 'BULLISH') score += 5;
        if (news.sentiment === 'BEARISH') score -= 5;
    });
    
    return Math.max(0, Math.min(100, score));
};
