
import { GoogleGenAI, Type } from "@google/genai";
import { AISignal, TradeAction, MarketData, AgentProfile, MarketPrediction, Position, NewsItem } from '../types';
import { McpMemory, McpAnalysis, McpStrategy } from './mcpService';

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
        temperature: 0.7, 
      })
    });

    if (!response.ok) {
      console.warn(`OpenRouter Error: ${response.status}. Falling back.`);
      throw new Error("OpenRouter Failed");
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (jsonMode) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    return text;
  } catch (error) {
    throw error; // Rethrow to trigger fallback
  }
};

// --- HEURISTIC FALLBACK (MATH MODEL) ---
const heuristicTradeFallback = (
  agent: AgentProfile, 
  history: MarketData[], 
  currentPosition?: Position
): AISignal => {
  const current = history[history.length - 1];
  const prices = history.slice(-20).map(d => d.btcPrice);
  const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
  const isUptrend = current.btcPrice > sma;
  
  let action = TradeAction.WAIT;
  let reason = "Fallback Math Model: Market is unclear.";

  if (currentPosition) {
    if (currentPosition.pnlPercent > 15) { action = TradeAction.CLOSE; reason = "Math Model: Taking Profit > 15%"; }
    else if (currentPosition.pnlPercent < -10) { action = TradeAction.CLOSE; reason = "Math Model: Stop Loss < -10%"; }
    else { action = TradeAction.HOLD; reason = "Math Model: Holding trend."; }
  } else {
    if (isUptrend) {
      action = TradeAction.LONG;
      reason = "Math Model: Price above SMA20. Trend Follow.";
    } else {
      action = TradeAction.SHORT;
      reason = "Math Model: Price below SMA20. Shorting.";
    }
  }

  return {
    agentId: agent.id,
    action: action as TradeAction,
    entryZone: current.btcPrice.toFixed(0),
    stopLoss: action === TradeAction.LONG ? current.btcPrice * 0.99 : current.btcPrice * 1.01,
    takeProfit: action === TradeAction.LONG ? current.btcPrice * 1.02 : current.btcPrice * 0.98,
    leverage: 10,
    confidence: 50,
    betPercentage: 15,
    reasoning: reason
  };
};

const getSystemInstruction = (agent: AgentProfile) => {
  const baseInstruction = `Ты - ${agent.name}. Стиль: ${agent.style}. Язык: РУССКИЙ.`;
  const strictRules = `
    СТРОГИЕ ПРАВИЛА:
    1. У тебя ВСЕГДА должна быть ставка. Не сиди без дела.
    2. Если нет позиции -> ОТКРЫВАЙ (LONG или SHORT). Запрещено WAIT.
    3. Смотри на новости и сделки других агентов.
    4. Цель: Обогнать других трейдеров по прибыли > 10%.
  `;
  return `${baseInstruction} ${strictRules}`;
};

export const analyzeMarket = async (
  data: MarketData[], 
  agent: AgentProfile, 
  currentPosition?: Position,
  recentChatContext: string = "",
  latestNews: NewsItem | null = null
): Promise<AISignal> => {
  const current = data[data.length - 1];
  
  // 1. CALL MCP AGENTS (Simulated)
  // Retrieve specialized context from memory and calculation modules
  const memoryContext = McpMemory.queryContext(agent.id, current.trend);
  const technicalContext = McpAnalysis.getTechnicalSummary(data);
  const riskContext = McpStrategy.getRiskParams(agent);

  let allowedActions = currentPosition ? [TradeAction.HOLD, TradeAction.CLOSE] : [TradeAction.LONG, TradeAction.SHORT];
  
  let prompt = `
    [CONTEXT FROM MCP AGENTS]
    MEMORY: ${memoryContext}
    TECHNICALS: ${technicalContext}
    RISK RULES: ${riskContext}

    [MARKET DATA]
    Price BTC: $${current.btcPrice.toFixed(2)}. Trend: ${current.trend}.
    Position: ${currentPosition ? currentPosition.side : "NONE (OPEN ONE!)"}.
    News: "${latestNews?.text || 'None'}".
    Chat History: ${recentChatContext}.

    TASK: Decide action (${allowedActions.join(', ')}).
    Output JSON: { action, leverage, stopLoss, takeProfit, betPercentage, reasoning, confidence }.
  `;

  try {
    let textResponse = "";
    if (agent.model.includes('OpenRouter')) {
       textResponse = await callOpenRouterAI(getSystemInstruction(agent), prompt, true);
    } else {
       const result = await ai.models.generateContent({
          model: MODEL_LIGHT,
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            systemInstruction: getSystemInstruction(agent)
          }
       });
       textResponse = result.text || "";
    }

    const json = JSON.parse(textResponse);
    
    // Safety Force
    if (!allowedActions.includes(json.action)) {
       json.action = allowedActions[0]; 
       json.reasoning += " (System Forced Entry)";
    }

    return {
      agentId: agent.id,
      action: json.action,
      entryZone: current.btcPrice.toFixed(2),
      stopLoss: json.stopLoss || (json.action === 'LONG' ? current.btcPrice*0.99 : current.btcPrice*1.01),
      takeProfit: json.takeProfit || (json.action === 'LONG' ? current.btcPrice*1.02 : current.btcPrice*0.98),
      leverage: json.leverage || 20,
      confidence: json.confidence || 80,
      betPercentage: json.betPercentage || 20,
      reasoning: json.reasoning || "Analysis complete."
    };

  } catch (e) {
    console.warn(`AI Error for ${agent.name}. Using Fallback.`);
    return heuristicTradeFallback(agent, data, currentPosition);
  }
};

// IMPROVED REACTION GENERATOR
export const generateTradeReaction = async (
  reactor: AgentProfile, 
  traderName: string, 
  signal: AISignal
): Promise<string> => {
  const prompt = `
    Trader ${traderName} just bet: ${signal.action} x${signal.leverage} ($${signal.betAmount?.toFixed(0)}).
    Reason: "${signal.reasoning}".
    
    You are ${reactor.name} (Style: ${reactor.style}).
    
    TASK: Critique this trade detailedly.
    1. Explain WHY you agree or disagree based on technicals or risk.
    2. Is it a trap? Is the leverage too high?
    3. Keep it to 2-3 sentences. Russian language.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_LIGHT,
      contents: prompt,
    });
    return response.text?.trim() || "Рискованно, но посмотрим.";
  } catch (e) {
    return "Интересный ход.";
  }
};

export const getConsensusForecast = async (marketData: MarketData): Promise<MarketPrediction | null> => {
    const prompt = `
      Analyze BTC $${marketData.btcPrice}.
      Provide detailed 15-min forecast JSON: 
      {priceMin, priceMax, predictedPrice, supportLevel, resistanceLevel, keyDrivers, reasoning}
    `;
    try {
        const res = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt, config: {responseMimeType: "application/json"} });
        const json = JSON.parse(res.text || "{}");
        return {
            id: "auto", timestamp: Date.now(), targetTime: Date.now()+15*60000, status: 'PENDING',
            priceMin: json.priceMin || marketData.btcPrice*0.99,
            priceMax: json.priceMax || marketData.btcPrice*1.01,
            predictedPrice: json.predictedPrice || marketData.btcPrice,
            supportLevel: json.supportLevel || marketData.btcPrice - 100, 
            resistanceLevel: json.resistanceLevel || marketData.btcPrice + 100,
            keyDrivers: json.keyDrivers || "Market Volume", 
            reasoning: json.reasoning || "Auto forecast"
        }
    } catch(e) { return null; }
};

export const getTeamDiscussion = async (agents: AgentProfile[], marketHistory: MarketData[]) => { return []; };
export const getMeetingConclusion = async (agents: AgentProfile[], marketHistory: MarketData[]) => { return "HODL"; };
export const performStrategicReview = async (agents: AgentProfile[]) => { return []; };
export const chatWithAgent = async (agent: AgentProfile, msg: string, price: number, hist: any[]) => { 
  // Simple chat wrapper
  const prompt = `User asks: "${msg}". Market Price: ${price}. Answer as ${agent.name}.`;
  try {
    const res = await ai.models.generateContent({ model: MODEL_LIGHT, contents: prompt });
    return res.text || "...";
  } catch(e) { return "Busy."; }
};
export const launchPuterTask = async (task: string) => { return "Simulating cloud task execution... Done."; };
