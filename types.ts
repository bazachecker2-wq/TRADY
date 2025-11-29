

export enum TradeAction {
  LONG = 'LONG',
  SHORT = 'SHORT',
  HOLD = 'HOLD',
  WAIT = 'WAIT',
  CLOSE = 'CLOSE'
}

export enum AppPhase {
  WORK = 'WORK', // 5 minutes: Trading only, no chat
  MEETING = 'MEETING' // 3 minutes: Discussion, reviewing the last 5 mins
}

export interface MarketData {
  timestamp: number;
  btcPrice: number;
  mexcPrice: number;
  bitgetPrice: number;
  volume24h: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  orderBook: {
    bids: [number, number][]; // [Price, Amount]
    asks: [number, number][];
  };
}

export interface ArbitrageOpportunity {
  spread: number;
  spreadValue: number;
  buyAt: 'MEXC' | 'Bitget';
  sellAt: 'MEXC' | 'Bitget';
  profitability: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Position {
  id: string;
  agentId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number; // in USDT
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  openTime: number;
  pnl: number;
  pnlPercent: number;
  status: 'OPEN' | 'CLOSED';
  closeReason?: 'TP' | 'SL' | 'MANUAL';
  trailingActive: boolean; 
}

export interface AgentProfile {
  id: string;
  name: string;
  model: string; // e.g., 'Gemini 2.5', 'Kimi K12 (Puter)'
  style: 'Scalper' | 'Swing' | 'Arbitrage';
  color: string;
  avatar: string;
  description: string;
  balance: number; // Realized Cash (Free to bet)
  equity: number; // Dynamic Wallet (Cash + Floating PnL + Locked Margin)
  winRate: number;
  tradesCount: number;
  recentPerformance: ('WIN' | 'LOSS')[]; // Memory for In-Context Learning
  strategyAdaptation?: string; // Learned logic from opponents
  decisionTimer: number; // Seconds until next AI decision
  lastActionTime: number; // Timestamp of last Open/Close action
}

export interface AISignal {
  agentId: string;
  action: TradeAction;
  entryZone: string;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  confidence: number;
  reasoning: string;
  betAmount?: number; // The calculated dollar amount for this trade
}

export interface ChatMessage {
  id: string;
  agentId: string;
  text: string;
  timestamp: number;
  type: 'SIGNAL' | 'COMMENT' | 'SYSTEM' | 'PREDICTION' | 'STRATEGY_UPDATE';
  relatedSignal?: AISignal;
  betAmount?: number;
}

export interface PrivateChatMessage {
  id: string;
  sender: 'USER' | 'AGENT';
  text: string;
  timestamp: number;
  type?: 'SYSTEM';
}

export interface AccountState {
  // Global aggregated state
  totalEquity: number;
  totalBalance: number;
  positions: Position[];
}

export interface MarketPrediction {
  id: string;
  timestamp: number; // Time prediction was made
  targetTime: number; // Time prediction is for
  priceMin: number;
  priceMax: number;
  predictedPrice: number; // Specific target prediction
  reasoning: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  finalPrice?: number;
}