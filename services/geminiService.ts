
import { GoogleGenAI, Type } from "@google/genai";
import { AISignal, TradeAction, MarketData, AgentProfile, MarketPrediction, Position } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ARCHITECTURE CONFIGURATION:
const MODEL_LIGHT = 'gemini-2.5-flash'; 
const MODEL_MAIN = 'gemini-3-pro-preview';

// --- OPENROUTER API ---
const OPENROUTER_API_KEY = "sk-or-v1-placeholder-key-replace-me"; // Replace with real key for DeepSeek R1
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export const callOpenRouterAI = async (systemInstruction: string, prompt: string, jsonMode: boolean = true): Promise<string> => {
  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neurotrade.ai", 
        "X-Title": "NeuroTrade AI"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free", // Using Free Tier DeepSeek R1 or similar
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      // Graceful fallback if OpenRouter key is invalid or quota exceeded
      console.warn(`OpenRouter Error: ${response.status}. Falling back to Gemini.`);
      return callGeminiFallback(systemInstruction, prompt, jsonMode);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    
    // Clean up markdown code blocks if JSON is requested
    if (jsonMode) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    return text;
  } catch (error) {
    console.error("OpenRouter AI Error:", error);
    return callGeminiFallback(systemInstruction, prompt, jsonMode);
  }
};

// Fallback to Gemini if other APIs fail
const callGeminiFallback = async (system: string, prompt: string, jsonMode: boolean): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_LIGHT,
      contents: `${system}\n\n${prompt}`,
    });
    return response.text || (jsonMode ? "{}" : "Error");
  } catch (e) {
    return jsonMode ? "{}" : "Connection failed";
  }
};

// --- PUTER.JS INTEGRATION (Hidden in Modal) ---
export const launchPuterTask = async (taskDescription: string): Promise<string> => {
  try {
    // Check if Puter is loaded globally
    if ((window as any).puter) {
      // Use Puter AI (if available in v2 lib) or simple logic
      // Puter.ai.chat is the standard for their AI endpoint
      const response = await (window as any).puter.ai.chat(taskDescription);
      return typeof response === 'string' ? response : JSON.stringify(response);
    } else {
      return "Puter.js не загружен. Проверьте соединение.";
    }
  } catch (e) {
    console.error("Puter Error:", e);
    return "Ошибка выполнения задачи в Puter Cloud.";
  }
};


const getSystemInstruction = (agent: AgentProfile) => {
  const baseInstruction = `Ты - ${agent.name}. Твой стиль: ${agent.style}. Язык: РУССКИЙ.`;
  
  // Beginner Friendly Rules
  const beginnerRules = `
    ВАЖНОЕ ПРАВИЛО ОБЩЕНИЯ:
    1. Объясняй для новичка, который первый день в трейдинге.
    2. ЗАПРЕЩЕН СЛЕНГ: Не используй слова "шорт", "лонг", "бычий", "медвежий", "RSI", "MACD", "дивергенция", "тейк", "лось".
    3. ЗАМЕНЯЙ СЛОВА: 
       - Вместо "Шорт" пиши "Ставлю на падение".
       - Вместо "Лонг" пиши "Ставлю на рост".
       - Вместо "Стоп Лосс" пиши "Защита от убытка".
       - Вместо "Close" пиши "Закрываю сделку".
    4. Будь краток. Максимум 12 слов.
  `;

  // Learning Context
  let learningContext = "";
  if (agent.recentPerformance.length > 0) {
    const wins = agent.recentPerformance.filter(r => r === 'WIN').length;
    const losses = agent.recentPerformance.filter(r => r === 'LOSS').length;
    learningContext = `\nТвои прошлые успехи: ${wins} побед, ${losses} поражений. УЧИСЬ НА ЭТОМ.`;
  }
  
  // Strategy Adaptation (Learned from opponents)
  let adaptationContext = "";
  if (agent.strategyAdaptation) {
    adaptationContext = `\n🔥 КОРРЕКТИРОВКА СТРАТЕГИИ (на основе анализа конкурентов): "${agent.strategyAdaptation}". ПРИМЕНЯЙ ЭТО В СДЕЛКАХ.`;
  }

  let roleInstruction = "";
  if (agent.style === 'Scalper') {
    roleInstruction = `Твоя задача: Ловить быстрые движения цены (Скальпинг).`;
  } else if (agent.style === 'Swing') {
    roleInstruction = `Твоя задача: Искать надежные движения и не суетиться.`;
  } else {
    roleInstruction = `Твоя задача: Искать разницу цен на биржах.`;
  }

  return `${baseInstruction} ${beginnerRules} ${learningContext} ${adaptationContext} ${roleInstruction} Отвечай JSON.`;
};

export const analyzeMarket = async (data: MarketData[], agent: AgentProfile, currentPosition?: Position): Promise<AISignal> => {
  const historySize = agent.model.includes('OpenRouter') ? 60 : 20;
  const recentHistory = data.slice(-historySize);
  const current = recentHistory[recentHistory.length - 1];
  
  const bidVol = current.orderBook.bids.reduce((acc, val) => acc + val[1], 0);
  const askVol = current.orderBook.asks.reduce((acc, val) => acc + val[1], 0);

  // Check 20-minute mandatory activity rule
  const timeSinceAction = Date.now() - (agent.lastActionTime || Date.now());
  const isUrgent = timeSinceAction > 20 * 60 * 1000;
  
  let prompt = `
    Данные (BTC/USDT):
    Цена сейчас: $${current.btcPrice.toFixed(2)}
    Покупателей (объем): ${bidVol.toFixed(3)}
    Продавцов (объем): ${askVol.toFixed(3)}
    Твой баланс: $${agent.balance.toFixed(2)}
    
    История цены (последние тики): ${recentHistory.map(h => h.btcPrice.toFixed(1)).join(', ')}
  `;

  let actionEnum = [];

  if (currentPosition) {
     prompt += `
       У ТЕБЯ ЕСТЬ ОТКРЫТАЯ ПОЗИЦИЯ:
       Тип: ${currentPosition.side}
       Вход: $${currentPosition.entryPrice}
       Текущий PnL: $${currentPosition.pnl.toFixed(2)} (${currentPosition.pnlPercent.toFixed(2)}%)
       
       РЕШАЙ ПРЯМО СЕЙЧАС:
       - ДЕРЖАТЬ (HOLD) - если уверен, что пойдет дальше в плюс.
       - ЗАКРЫТЬ (CLOSE) - чтобы зафиксировать прибыль или убыток.
       
       ${isUrgent ? "⛔ ВНИМАНИЕ: Прошло 20 минут без действий. Ты ОБЯЗАН ЗАКРЫТЬ позицию, чтобы сбросить таймер активности, если нет веских причин держать." : ""}
     `;
     actionEnum = [TradeAction.HOLD, TradeAction.CLOSE];
  } else {
     prompt += `
       Позиций нет.
       РЕШАЙ ПРЯМО СЕЙЧАС:
       - Покупаем (LONG)?
       - Продаем (SHORT)?
       - Ждем (WAIT)?
       
       ${isUrgent ? "⛔ ВНИМАНИЕ: Прошло 20 минут без действий. Ты ОБЯЗАН ОТКРЫТЬ СДЕЛКУ (LONG или SHORT) прямо сейчас. WAIT запрещен." : ""}
     `;
     actionEnum = [TradeAction.LONG, TradeAction.SHORT, TradeAction.WAIT];
  }

  prompt += `\nОбоснование: ОЧЕНЬ ПРОСТО, как для ребенка. Ответь строго JSON.`;

  // --- HYBRID MODEL ROUTING ---
  if (agent.model.includes('OpenRouter')) {
     try {
       const system = getSystemInstruction(agent) + `\nExpected JSON Format: { "action": "LONG"|"SHORT"|"WAIT"|"HOLD"|"CLOSE", "entryZone": "string", "stopLoss": number, "takeProfit": number, "leverage": number, "confidence": number, "reasoning": "string" }`;
       const textResponse = await callOpenRouterAI(system, prompt, true);
       
       let result;
       try {
          result = JSON.parse(textResponse);
       } catch (e) {
          console.warn("OpenRouter JSON parse error, raw:", textResponse);
          result = { action: "WAIT", reasoning: "Ошибка обработки мыслей DeepSeek..." };
       }
       
       if (!result.stopLoss) result.stopLoss = current.btcPrice * 0.99;
       if (!result.takeProfit) result.takeProfit = current.btcPrice * 1.01;
       if (!result.leverage) result.leverage = 20;
       if (!result.confidence) result.confidence = 50;
       
       return { ...result, agentId: agent.id } as AISignal;
     } catch (e) {
       console.error("OpenRouter failed", e);
       return {
         agentId: agent.id,
         action: currentPosition ? TradeAction.HOLD : TradeAction.WAIT,
         entryZone: "---",
         stopLoss: 0,
         takeProfit: 0,
         leverage: 1,
         confidence: 0,
         reasoning: "Потеряна связь с OpenRouter..."
       };
     }
  } else {
    // Gemini Logic (Standard)
    try {
      const response = await ai.models.generateContent({
        model: MODEL_LIGHT,
        contents: prompt,
        config: {
          systemInstruction: getSystemInstruction(agent),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: actionEnum },
              entryZone: { type: Type.STRING },
              stopLoss: { type: Type.NUMBER },
              takeProfit: { type: Type.NUMBER },
              leverage: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["action", "stopLoss", "takeProfit", "leverage", "confidence", "reasoning"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        return { ...result, agentId: agent.id } as AISignal;
      }
      throw new Error("No text");
    } catch (error: any) {
      // Rate limit or other error
      return {
        agentId: agent.id,
        action: currentPosition ? TradeAction.HOLD : TradeAction.WAIT,
        entryZone: "---",
        stopLoss: 0,
        takeProfit: 0,
        leverage: 1,
        confidence: 0,
        reasoning: "Раздумываю (API лимит)..."
      };
    }
  }
};

export const getTeamDiscussion = async (
  agents: AgentProfile[], 
  marketHistory: MarketData[]
): Promise<{ agentId: string, text: string }[]> => {
  const recentData = marketHistory.slice(-60); 
  if (recentData.length === 0) return [];
  const sortedAgents = [...agents].sort((a, b) => b.balance - a.balance);
  const prompt = `
    СИТУАЦИЯ ЗА 5 МИНУТ: Цена BTC изменилась.
    ЛИДЕР: ${sortedAgents[0].name}.
    ОСТАЛЬНЫЕ: ${sortedAgents.slice(1).map(a => a.name).join(', ')}.
    Сгенерируй диалог (3 реплики). Лидер говорит первый.
    Format: JSON Array [{ "agentId": "Name", "text": "..." }]
  `;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_LIGHT, 
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    if (response.text) {
      const messages = JSON.parse(response.text);
      return messages.map((m: any) => {
        const agent = agents.find(a => m.agentId.toLowerCase().includes(a.name.toLowerCase()) || a.name.includes(m.agentId));
        return { agentId: agent ? agent.id : sortedAgents[0].id, text: m.text };
      });
    }
    return [];
  } catch (e) { return []; }
};

export const getMeetingConclusion = async (agents: AgentProfile[], marketHistory: MarketData[]) => {
   const current = marketHistory[marketHistory.length - 1];
   const prompt = `Ты - Главный Наставник. Цена BTC: $${current.btcPrice.toFixed(2)}. Дай ОДИН совет новичку. "ВЫВОД: ..."`;
   // Using Gemini for conclusion to save OpenRouter calls
   try {
     const response = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt });
     return response.text;
   } catch (e) { return "Вывод: Будьте осторожны."; }
}

export const performStrategicReview = async (agents: AgentProfile[]): Promise<{ agentId: string, adaptation: string }[]> => {
  const prompt = `
    Анализ стратегий. Напиши, что отстающим трейдерам скопировать у лидера.
    Format JSON: [{ "agentId": "id", "adaptation": "совет" }]
  `;
  try {
    // Try OpenRouter for deeper strategy if available
    const text = await callOpenRouterAI("Ты стратегический аналитик.", prompt, true);
    return JSON.parse(text);
  } catch (e) { return []; }
};

export const getConsensusForecast = async (marketData: MarketData): Promise<MarketPrediction | null> => {
  const prompt = `
    Главный Советник (OpenRouter/DeepSeek). 
    Цена BTC: $${marketData.btcPrice.toFixed(2)}.
    Дай прогноз на 15 минут вперед.
    Формат JSON: { "priceMin": number, "priceMax": number, "reasoning": "string" }
  `;
  try {
    const text = await callOpenRouterAI("Ты аналитик рынка.", prompt, true);
    let json: any = {};
    
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn("Forecast JSON parse error, defaulting", text);
    }

    // Safety Defaults: If AI returns malformed JSON, define defaults to prevent UI crash
    const priceMin = typeof json.priceMin === 'number' ? json.priceMin : marketData.btcPrice * 0.995;
    const priceMax = typeof json.priceMax === 'number' ? json.priceMax : marketData.btcPrice * 1.005;
    const reasoning = json.reasoning || "Анализ волатильности (данные ограничены)...";

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      targetTime: Date.now() + (15 * 60 * 1000),
      priceMin,
      priceMax,
      reasoning,
      status: 'PENDING'
    };
  } catch (e) { return null; }
};

export const chatWithAgent = async (
  agent: AgentProfile, 
  userMessage: string, 
  currentPrice: number,
  history: {sender: 'USER'|'AGENT', text: string}[]
): Promise<string> => {
  const historyText = history.slice(-5).map(h => `${h.sender === 'USER' ? 'Пользователь' : agent.name}: ${h.text}`).join('\n');
  const prompt = `Ты ${agent.name}. Баланс $${agent.balance}. Цена BTC $${currentPrice}. История: ${historyText}. Вопрос: "${userMessage}". Ответь кратко.`;
  
  if (agent.model.includes('OpenRouter')) {
     return await callOpenRouterAI(`Ты ${agent.name}.`, prompt, false);
  }
  const response = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt });
  return response.text || "...";
};
