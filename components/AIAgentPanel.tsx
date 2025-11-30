
import React from 'react';
import { AgentProfile, AISignal, TradeAction } from '../types';
import { formatCurrency } from '../services/marketService';

interface AgentBattlePanelProps {
  agents: AgentProfile[];
  signals: Record<string, AISignal | null>;
  analyzing: Record<string, boolean>;
  onSelectAgent: (agent: AgentProfile) => void;
  onRefinance: (agentId: string) => void;
  topAgentId?: string;
}

const AgentBattlePanel: React.FC<AgentBattlePanelProps> = ({ agents, signals, analyzing, onSelectAgent, onRefinance, topAgentId }) => {
  // Sort for ranking: Active agents first, then by equity. Eliminated last.
  const sortedByEquity = [...agents].sort((a, b) => {
    if (a.status === 'ELIMINATED' && b.status !== 'ELIMINATED') return 1;
    if (a.status !== 'ELIMINATED' && b.status === 'ELIMINATED') return -1;
    return b.equity - a.equity;
  });
  
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Активные Агенты</h3>
          <span className="text-[10px] text-gray-600">Нажми для деталей</span>
      </div>
      
      {agents.map(agent => {
        const isEliminated = agent.status === 'ELIMINATED';
        const signal = signals[agent.id];
        const isLong = signal?.action === TradeAction.LONG;
        const isShort = signal?.action === TradeAction.SHORT;
        const isWait = !isLong && !isShort;
        const isProfitable = agent.equity >= 1000;
        
        // Ranking Logic
        const rank = sortedByEquity.findIndex(a => a.id === agent.id) + 1;
        const isLeader = rank === 1 && !isEliminated;
        const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-orange-400';
        
        // Progress for Timer
        const timerPercent = (agent.decisionTimer / 60) * 100;
        const inTradeAmount = agent.equity - agent.balance;
        
        return (
          <div 
            key={agent.id} 
            onClick={() => onSelectAgent(agent)}
            className={`relative bg-[#13161c] rounded-xl p-4 border overflow-hidden group transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-1 
              ${isEliminated ? 'opacity-50 grayscale border-red-900/50' : isLeader ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-gray-800 hover:border-blue-500/50'}
            `}
          >
            {/* Eliminated Overlay */}
            {isEliminated && (
               <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="text-red-500 font-black text-3xl rotate-[-15deg] border-4 border-red-500 px-4 py-2 rounded-xl opacity-80 tracking-widest">
                     ВЫБЫЛ
                  </div>
               </div>
            )}

            {/* Rank Badge */}
            <div className={`absolute top-2 right-2 font-black text-4xl opacity-10 ${rankColor}`}>
               #{rank}
            </div>
            
            {/* Crown for Leader */}
            {isLeader && (
               <div className="absolute -top-3 -left-3 text-2xl rotate-[-45deg] z-20 drop-shadow-md filter">
                  👑
               </div>
            )}

            {/* Timer Progress Bar (Background) */}
            {!isEliminated && (
              <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${agent.decisionTimer < 10 ? 'bg-red-500' : 'bg-blue-500/50'}`} 
                  style={{ width: `${timerPercent}%` }}
                ></div>
              </div>
            )}

            {/* Agent Header */}
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-lg ${agent.color} transition-transform group-hover:scale-110 duration-300`}>
                  {isEliminated ? '💀' : agent.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100 group-hover:text-blue-200 transition-colors flex items-center gap-2">
                     {agent.name}
                  </h3>
                  <div className="text-[10px] text-gray-400 font-mono">{agent.model}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500">EQUITY (LIVE)</div>
                <div className={`text-sm font-mono font-bold transition-all duration-300 ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(agent.equity, 2)}
                </div>
              </div>
            </div>
            
            {/* Stats Row: Balance & Win/Loss */}
            <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
               <div className="bg-[#0b0d11] p-1.5 rounded border border-gray-800 flex flex-col justify-center">
                  <div className="text-[8px] text-gray-500 uppercase">Счет (Wins/Loss)</div>
                  <div className="text-xs font-mono text-gray-300 flex items-center gap-2">
                     <span className="text-green-400 font-bold">{agent.wins}W</span>
                     <span className="text-gray-600">|</span>
                     <span className="text-red-400 font-bold">{agent.losses}L</span>
                  </div>
               </div>
               <div className="bg-[#0b0d11] p-1.5 rounded border border-gray-800">
                  <div className="text-[8px] text-gray-500 uppercase">В сделке</div>
                  <div className="text-xs font-mono text-blue-300">{inTradeAmount > 1 ? formatCurrency(inTradeAmount, 0) : '-'}</div>
               </div>
            </div>

            {/* Signal Display or Refinance Button */}
            <div className="bg-[#0b0d11] rounded-lg p-3 border border-gray-800 min-h-[70px] flex flex-col justify-center group-hover:border-gray-700 transition-colors relative overflow-hidden z-10">
              {isEliminated ? (
                 <div className="text-center">
                    <div className="text-xs text-red-500 font-bold mb-2">БАНКРОТ</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRefinance(agent.id); }}
                      className="bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] px-3 py-1 rounded border border-red-700 uppercase pointer-events-auto"
                    >
                       РЕФИНАНСИРОВАТЬ ($1000)
                    </button>
                 </div>
              ) : analyzing[agent.id] ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Анализ новостей и стакана...
                </div>
              ) : signal && !isWait ? (
                <div className="flex justify-between items-center relative z-10">
                   <div>
                      <div className={`text-xl font-black tracking-tighter ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                        {signal.action === 'LONG' ? 'ЛОНГ' : 'ШОРТ'} 
                      </div>
                      <div className="text-xs font-mono opacity-80 mt-0.5">
                         <span className="bg-gray-800 text-gray-300 px-1 rounded border border-gray-600">x{signal.leverage}</span>
                         <span className="ml-2 text-[10px] text-gray-500">Плечо</span>
                      </div>
                   </div>
                   <div className="text-right space-y-1">
                      <div className="text-[10px] text-gray-500">TP: <span className="text-green-400">{signal.takeProfit}</span></div>
                      <div className="text-[10px] text-gray-500">SL: <span className="text-red-400">{signal.stopLoss}</span></div>
                   </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs text-gray-500 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500/50 animate-pulse"></span>
                    Ожидание
                  </div>
                  <div className="font-mono text-[10px]">
                    След. решение: <span className="text-blue-400 font-bold">{agent.decisionTimer}с</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Active Glow */}
            {analyzing[agent.id] && !isEliminated && (
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AgentBattlePanel;
