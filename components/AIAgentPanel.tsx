import React from 'react';
import { AgentProfile, AISignal, TradeAction } from '../types';
import { formatCurrency } from '../services/marketService';

interface AgentBattlePanelProps {
  agents: AgentProfile[];
  signals: Record<string, AISignal | null>;
  analyzing: Record<string, boolean>;
  onSelectAgent: (agent: AgentProfile) => void;
}

const AgentBattlePanel: React.FC<AgentBattlePanelProps> = ({ agents, signals, analyzing, onSelectAgent }) => {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Активные Агенты</h3>
          <span className="text-[10px] text-gray-600">Нажми на карту для деталей</span>
      </div>
      
      {agents.map(agent => {
        const signal = signals[agent.id];
        const isLong = signal?.action === TradeAction.LONG;
        const isShort = signal?.action === TradeAction.SHORT;
        const isWait = !isLong && !isShort;
        const isProfitable = agent.balance >= 1000;
        
        // Progress for Timer (Assuming max 60s for visual calculation)
        const timerPercent = (agent.decisionTimer / 60) * 100;
        
        return (
          <div 
            key={agent.id} 
            onClick={() => onSelectAgent(agent)}
            className="relative bg-[#13161c] rounded-xl p-4 border border-gray-800 overflow-hidden group hover:border-blue-500/50 hover:bg-[#1a1d24] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-900/10 hover:-translate-y-1"
          >
            {/* Timer Progress Bar (Background) */}
            <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${agent.decisionTimer < 10 ? 'bg-red-500' : 'bg-blue-500/50'}`} 
                style={{ width: `${timerPercent}%` }}
              ></div>
            </div>

            {/* Hover hint */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>

            {/* Agent Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-lg ${agent.color} transition-transform group-hover:scale-110 duration-300`}>
                  {agent.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100 group-hover:text-blue-200 transition-colors">{agent.name}</h3>
                  <div className="text-[10px] text-gray-400 font-mono">{agent.model} • {agent.style === 'Scalper' ? 'Скальпер' : agent.style === 'Swing' ? 'Свинг' : 'Арбитраж'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500">КОШЕЛЕК</div>
                <div className={`text-sm font-mono font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(agent.balance, 0)}
                </div>
              </div>
            </div>

            {/* Strategy Adaptation Display */}
            {agent.strategyAdaptation && (
              <div className="mb-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-300 italic">
                <span className="font-bold not-italic mr-1">🧠 Учимся:</span> 
                {agent.strategyAdaptation}
              </div>
            )}

            {/* Signal Display */}
            <div className="bg-[#0b0d11] rounded-lg p-3 border border-gray-800 min-h-[70px] flex flex-col justify-center group-hover:border-gray-700 transition-colors relative overflow-hidden">
              {analyzing[agent.id] ? (
                <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Принимаю решение...
                </div>
              ) : signal && !isWait ? (
                <div className="flex justify-between items-center relative z-10">
                   <div>
                      <div className={`text-xl font-black tracking-tighter ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                        {signal.action === 'LONG' ? 'ЛОНГ' : 'ШОРТ'} <span className="text-sm font-mono opacity-80">x{signal.leverage}</span>
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
            {analyzing[agent.id] && (
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AgentBattlePanel;