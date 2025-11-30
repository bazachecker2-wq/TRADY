
import { AgentProfile, MarketData, Position, TradeAction } from '../types';

// MCP (Model Context Protocol) Simulation
// In a real environment, these would be separate servers. 
// Here we simulate the modular architecture of specialized agents.

interface MemoryFragment {
  agentId: string;
  action: TradeAction;
  outcome: 'WIN' | 'LOSS';
  marketTrend: 'UP' | 'DOWN' | 'FLAT';
  reason: string;
  timestamp: number;
}

// 1. MEMORY SERVER (Long-term learning)
export const McpMemory = {
  saveExperience: (agentId: string, action: TradeAction, pnl: number, trend: 'UP' | 'DOWN' | 'FLAT') => {
    const memories: MemoryFragment[] = JSON.parse(localStorage.getItem('mcp_memory') || '[]');
    
    // Only memorize significant events to save tokens
    if (Math.abs(pnl) > 5) {
      const fragment: MemoryFragment = {
        agentId,
        action,
        outcome: pnl > 0 ? 'WIN' : 'LOSS',
        marketTrend: trend,
        reason: pnl > 0 ? 'Successful pattern match' : 'Failed against market structure',
        timestamp: Date.now()
      };
      
      // Keep last 50 significant memories
      const updated = [fragment, ...memories].slice(0, 50);
      localStorage.setItem('mcp_memory', JSON.stringify(updated));
    }
  },

  queryContext: (agentId: string, currentTrend: 'UP' | 'DOWN' | 'FLAT'): string => {
    const memories: MemoryFragment[] = JSON.parse(localStorage.getItem('mcp_memory') || '[]');
    
    // Find relevant past experiences for this agent in this trend
    const relevant = memories.filter(m => m.agentId === agentId && m.marketTrend === currentTrend);
    const failures = relevant.filter(m => m.outcome === 'LOSS');
    const successes = relevant.filter(m => m.outcome === 'WIN');

    if (failures.length === 0 && successes.length === 0) return "MCP Memory: New market condition. Proceed with standard protocol.";

    const badMove = failures.length > successes.length ? failures[0].action : null;
    
    if (badMove) {
      return `MCP ALERT: In previous ${currentTrend} markets, ${badMove} positions resulted in LOSSES. Suggest avoiding ${badMove} or reducing leverage.`;
    } else {
      return `MCP INSIGHT: You have a high win rate with ${successes[0].action} in these conditions.`;
    }
  }
};

// 2. ANALYTICAL SERVER (Hard Math & Indicators)
export const McpAnalysis = {
  getTechnicalSummary: (history: MarketData[]): string => {
    if (history.length < 20) return "MCP Analysis: Insufficient data for indicators.";

    const prices = history.slice(-20).map(d => d.btcPrice);
    const current = prices[prices.length - 1];
    
    // Simple SMA
    const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Simple RSI Approximation
    let gains = 0, losses = 0;
    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i-1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
    const rsi = 100 - (100 / (1 + rs));

    // Volatility
    const volatility = Math.abs(prices[prices.length - 1] - prices[0]);

    return `MCP INDICATORS: RSI=${rsi.toFixed(1)} | Price vs SMA20=${(current - sma20).toFixed(2)} | Volatility=${volatility.toFixed(2)}`;
  }
};

// 3. STRATEGY SERVER (Risk Management)
export const McpStrategy = {
  getRiskParams: (agent: AgentProfile): string => {
    if (agent.equity < 500) {
      return "MCP RISK PROTOCOL: CRITICAL. Account danger. Max Leverage x5. Max Bet 10%.";
    }
    if (agent.recentPerformance.slice(-3).every(r => r === 'LOSS')) {
      return "MCP RISK PROTOCOL: TILT DETECTED. Reduce bet size by 50%. Focus on high confidence only.";
    }
    return "MCP RISK PROTOCOL: STANDARD. Aggressive growth permitted.";
  }
};
