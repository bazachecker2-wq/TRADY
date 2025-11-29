

import { GoogleGenAI, Type } from "@google/genai";
import { AISignal, TradeAction, MarketData, AgentProfile, MarketPrediction, Position } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ARCHITECTURE CONFIGURATION:
const MODEL_LIGHT = 'gemini-2.5-flash'; 
const MODEL_MAIN = 'gemini-3-pro-preview';

// --- OPENROUTER API ---
const OPENROUTER_API_KEY = "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";
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
        model: "deepseek/deepseek-r1", 
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.6, // Slightly lower temp for more stable JSON
      })
    });

    if (!response.ok) {
      console.warn(`OpenRouter Error: ${response.status}. Falling back to Gemini.`);
      return callGeminiFallback(systemInstruction, prompt, jsonMode);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    
    // CRITICAL FIX: DeepSeek R1 often includes <think>...</think> blocks. We must remove them for JSON parsing.
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
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
    if ((window as any).puter) {
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
       - Вместо "Close" пиши "Закрываю сделку".
    4. Будь краток. Максимум 15 слов в обосновании (reasoning).
    5. ОБЯЗАТЕЛЬНО: Твое обоснование (reasoning) должно быть понятным объяснением "почему". Например: "Вижу стену на продажу, цена отскочит вниз".
  `;

  // Learning Context
  let learningContext = "";
  if (agent.recentPerformance.length > 0) {
    const wins = agent.recentPerformance.filter(r => r === 'WIN').length;
    const losses = agent.recentPerformance.filter(r => r === 'LOSS').length;
    const winRate = agent.recentPerformance.length > 0 ? Math.round((wins / agent.recentPerformance.length) * 100) : 0;
    learningContext = `\nТВОЯ СТАТИСТИКА (последние 5): ${wins} Побед, ${losses} Поражений. Винрейт: ${winRate}%. ${winRate < 50 ? "ТЫ ТЕРЯЕШЬ ДЕНЬГИ! ИЗМЕНИ ПОДХОД!" : "ТЫ ТОРГУЕШЬ ОТЛИЧНО, ДЕРЖИ РИТМ."}`;
  }
  
  // Strategy Adaptation
  let adaptationContext = "";
  if (agent.strategyAdaptation) {
    adaptationContext = `\n🔥 НОВАЯ ИНСТРУКЦИЯ ОТ ГЛАВНОГО: "${agent.strategyAdaptation}". ПРИМЕНЯЙ ЭТО В СДЕЛКАХ ОБЯЗАТЕЛЬНО.`;
  }

  let roleInstruction = "";
  if (agent.style === 'Scalper') {
    roleInstruction = `Задача: Быстрый скальпинг. Смотри на дисбаланс в стакане.`;
  } else if (agent.style === 'Swing') {
    roleInstruction = `Задача: Умный свинг. Ищи развороты тренда. Глубокий анализ.`;
  } else if (agent.style === 'Arbitrage') {
    roleInstruction = `Задача: Арбитраж. Сравнивай цены MEXC и Bitget.`;
  }

  return `${baseInstruction} ${beginnerRules} ${learningContext} ${adaptationContext} ${roleInstruction} Отвечай строго валидным JSON.`;
};

export const analyzeMarket = async (
  data: MarketData[], 
  agent: AgentProfile, 
  currentPosition?: Position,
  recentChatContext: string = ""
): Promise<AISignal> => {
  const historySize = agent.model.includes('OpenRouter') ? 60 : 20;
  const recentHistory = data.slice(-historySize);
  const current = recentHistory[recentHistory.length - 1];
  
  const bidVol = current.orderBook.bids.reduce((acc, val) => acc + val[1], 0);
  const askVol = current.orderBook.asks.reduce((acc, val) => acc + val[1], 0);
  const volumeRatio = askVol > 0 ? bidVol / askVol : 1;
  
  const timeSinceAction = Date.now() - (agent.lastActionTime || Date.now());
  const isUrgent = timeSinceAction > 20 * 60 * 1000;
  
  let prompt = `
    РЫНОК СЕЙЧАС (BTC/USDT):
    Цена: $${current.btcPrice.toFixed(2)}
    Давление покупателей: ${bidVol.toFixed(3)} BTC
    Давление продавцов: ${askVol.toFixed(3)} BTC
    Дисбаланс: ${volumeRatio > 1.2 ? "Сильные покупки" : volumeRatio < 0.8 ? "Сильные продажи" : "Нейтрально"}
    Твой баланс: $${agent.balance.toFixed(2)}
    
    ЧАТ (КОНТЕКСТ):
    ${recentChatContext || "Тишина..."}
  `;

  // Specific Logic for Arbitrage Agent
  if (agent.style === 'Arbitrage') {
      prompt += `
        АРБИТРАЖНЫЕ ДАННЫЕ:
        MEXC Цена: $${current.mexcPrice.toFixed(2)}
        Bitget Цена: $${current.bitgetPrice.toFixed(2)}
        Спред: $${(Math.abs(current.mexcPrice - current.bitgetPrice)).toFixed(2)}
        
        Стратегия: Если спред > $50, торгуй агрессивно в сторону выравнивания.
      `;
  } else {
      prompt += `
        История (тиков): ${recentHistory.map(h => h.btcPrice.toFixed(1)).join(', ')}
      `;
  }

  let actionEnum: string[] = [];

  if (currentPosition) {
     prompt += `
       У ТЕБЯ ПОЗИЦИЯ:
       ${currentPosition.side} от $${currentPosition.entryPrice}
       PnL: $${currentPosition.pnl.toFixed(2)} (${currentPosition.pnlPercent.toFixed(2)}%)
       
       РЕШЕНИЕ:
       - HOLD (Держать)
       - CLOSE (Зафиксировать результат)
       
       ${isUrgent ? "⛔ ВНИМАНИЕ: Тайм-аут активности (20 мин). ЗАКРЫВАЙ ПОЗИЦИЮ, если нет 100% уверенности в росте." : ""}
     `;
     actionEnum = [TradeAction.HOLD, TradeAction.CLOSE];
  } else {
     prompt += `
       Позиций нет.
       РЕШЕНИЕ:
       - LONG (Рост)
       - SHORT (Падение)
       
       ⛔ "WAIT" ЗАПРЕЩЕНО. ТЫ ОБЯЗАН СДЕЛАТЬ СТАВКУ.
     `;
     actionEnum = [TradeAction.LONG, TradeAction.SHORT];
  }

  prompt += `\nНапиши JSON с ключами: action, reasoning (четкое объяснение почему), stopLoss, takeProfit, leverage (x10-x50), confidence (0-100).`;

  // --- HYBRID MODEL ROUTING ---
  if (agent.model.includes('OpenRouter')) {
     try {
       const system = getSystemInstruction(agent) + `\nExpected JSON Format: { "action": "${actionEnum.join('|')}", "entryZone": "market", "stopLoss": number, "takeProfit": number, "leverage": number, "confidence": number, "reasoning": "string" }`;
       const textResponse = await callOpenRouterAI(system, prompt, true);
       
       let result;
       try {
          result = JSON.parse(textResponse);
       } catch (e) {
          console.warn("OpenRouter JSON parse error, raw:", textResponse);
          // Fallback logic
          const isTrendUp = current.btcPrice > recentHistory[0].btcPrice;
          result = { 
            action: currentPosition ? "HOLD" : (isTrendUp ? "LONG" : "SHORT"), 
            reasoning: "Ошибка анализа, иду по тренду." 
          };
       }
       
       // Force valid action if model hallucinated "WAIT"
       if (!actionEnum.includes(result.action)) {
          if (!currentPosition) {
             const isTrendUp = current.btcPrice > recentHistory[0].btcPrice;
             result.action = isTrendUp ? TradeAction.LONG : TradeAction.SHORT;
             result.reasoning += " (Wait запрещен -> принудительный вход)";
          } else {
             result.action = TradeAction.HOLD; 
          }
       }

       // Smart default SL/TP if missing
       if (!result.stopLoss) result.stopLoss = result.action === 'LONG' ? current.btcPrice * 0.995 : current.btcPrice * 1.005;
       if (!result.takeProfit) result.takeProfit = result.action === 'LONG' ? current.btcPrice * 1.01 : current.btcPrice * 0.99;
       if (!result.leverage) result.leverage = 20;
       if (!result.confidence) result.confidence = 50;
       
       return { ...result, agentId: agent.id } as AISignal;
     } catch (e) {
       console.error("OpenRouter failed", e);
       return createFallbackSignal(agent, current, currentPosition, recentHistory);
     }
  } else {
    // Gemini Logic
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
        
        // Strict Validation
        if (!actionEnum.includes(result.action)) {
           if (!currentPosition) {
              const isTrendUp = current.btcPrice > recentHistory[0].btcPrice;
              result.action = isTrendUp ? TradeAction.LONG : TradeAction.SHORT;
              result.reasoning = "[Система] Wait запрещен. Вход по тренду.";
           } else {
             result.action = TradeAction.HOLD;
           }
        }
        return { ...result, agentId: agent.id } as AISignal;
      }
      throw new Error("No text");
    } catch (error: any) {
      return createFallbackSignal(agent, current, currentPosition, recentHistory);
    }
  }
};

// Helper for failures
const createFallbackSignal = (agent: AgentProfile, current: MarketData, currentPosition: Position | undefined, history: MarketData[]): AISignal => {
  const isTrendUp = current.btcPrice > history[0].btcPrice;
  return {
    agentId: agent.id,
    action: currentPosition ? TradeAction.HOLD : (isTrendUp ? TradeAction.LONG : TradeAction.SHORT), 
    entryZone: "---",
    stopLoss: isTrendUp ? current.btcPrice * 0.99 : current.btcPrice * 1.01,
    takeProfit: isTrendUp ? current.btcPrice * 1.01 : current.btcPrice * 0.99,
    leverage: 10,
    confidence: 0,
    reasoning: "Сбой связи, аварийный режим."
  };
};

export const getTeamDiscussion = async (
  agents: AgentProfile[], 
  marketHistory: MarketData[]
): Promise<{ agentId: string, text: string }[]> => {
  const recentData = marketHistory.slice(-60); 
  if (recentData.length === 0) return [];
  const sortedAgents = [...agents].sort((a, b) => b.balance - a.balance);
  const prompt = `
    СИТУАЦИЯ ЗА 5 МИНУТ: Цена BTC $${recentData[recentData.length-1].btcPrice}.
    ЛИДЕР: ${sortedAgents[0].name} (Баланс $${sortedAgents[0].balance}).
    АУТСАЙДЕР: ${sortedAgents[sortedAgents.length-1].name} (Баланс $${sortedAgents[sortedAgents.length-1].balance}).
    
    Сгенерируй диалог (3 реплики). 
    1. Лидер хвалит себя или ругает рынок.
    2. Аутсайдер оправдывается.
    3. Третий предлагает идею.
    
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
   const prompt = `Ты - Главный Наставник. Цена BTC: $${current.btcPrice.toFixed(2)}. Дай ОДИН совет новичку и объясни почему. "ВЫВОД: ... потому что ..."`;
   try {
     const response = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt });
     return response.text;
   } catch (e) { return "Вывод: Будьте осторожны на волатильности."; }
}

export const performStrategicReview = async (agents: AgentProfile[]): Promise<{ agentId: string, adaptation: string }[]> => {
  const prompt = `
    Анализ стратегий. Напиши, что отстающим трейдерам скопировать у лидера.
    Format JSON: [{ "agentId": "id", "adaptation": "совет" }]
  `;
  try {
    const text = await callOpenRouterAI("Ты стратегический аналитик.", prompt, true);
    return JSON.parse(text);
  } catch (e) { return []; }
};

export const getConsensusForecast = async (marketData: MarketData): Promise<MarketPrediction | null> => {
  const prompt = `
    Ты - Главный Советник (DeepSeek R1). 
    Цена BTC: $${marketData.btcPrice.toFixed(2)}.
    Твоя задача: Дать точный прогноз на 15 минут вперед.
    
    Учти волатильность и стакан.
    
    Формат JSON: { "priceMin": number, "priceMax": number, "predictedPrice": number, "reasoning": "string (макс 10 слов)" }
  `;
  try {
    const text = await callOpenRouterAI("Ты аналитик рынка. Думай глубоко.", prompt, true);
    let json: any = {};
    
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn("Forecast JSON parse error, defaulting", text);
      json = {}; // Fallback logic below
    }

    const priceMin = typeof json.priceMin === 'number' ? json.priceMin : marketData.btcPrice * 0.998;
    const priceMax = typeof json.priceMax === 'number' ? json.priceMax : marketData.btcPrice * 1.002;
    const predictedPrice = typeof json.predictedPrice === 'number' ? json.predictedPrice : marketData.btcPrice;
    const reasoning = json.reasoning || "Консолидация цен...";

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      targetTime: Date.now() + (15 * 60 * 1000),
      priceMin,
      priceMax,
      predictedPrice,
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
  const prompt = `Ты ${agent.name}. Баланс $${agent.balance.toFixed(2)}. Цена BTC $${currentPrice}. История: ${historyText}. Вопрос: "${userMessage}". Ответь кратко (как в чате Telegram).`;
  
  if (agent.model.includes('OpenRouter')) {
     return await callOpenRouterAI(`Ты ${agent.name}.`, prompt, false);
  }
  const response = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt });
  return response.text || "...";
};