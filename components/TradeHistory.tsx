import React, { useState } from 'react';
import { Position, AgentProfile, MarketData } from '../types';
import { formatCurrency } from '../services/marketService';

interface TradeHistoryProps {
  positions: Position[]; // All positions (OPEN and CLOSED)
  agents: AgentProfile[];
  currentPrice: number;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ positions, agents, currentPrice }) => {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'HISTORY'>('OPEN');

  const openPositions = positions.filter(p => p.status === 'OPEN').sort((a, b) => b.openTime - a.openTime);
  const closedPositions = positions.filter(p => p.status === 'CLOSED').sort((a, b) => b.openTime - a.openTime);

  return (
    <div className="bg-[#13161c] rounded-xl border border-gray-800 overflow-hidden min-h-[300px] flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 bg-[#0b0d11] flex justify-between items-center">
        <div className="flex gap-4">
           <button 
             onClick={() => setActiveTab('OPEN')}
             className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'OPEN' ? 'text-gray-200 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
           >
             Открытые сделки ({openPositions.length})
           </button>
           <button 
             onClick={() => setActiveTab('HISTORY')}
             className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'text-gray-200 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
           >
             История ({closedPositions.length})
           </button>
        </div>
        
        {activeTab === 'OPEN' && (
             <span className="text-[10px] text-green-400 font-mono animate-pulse">● LIVE ТОРГИ</span>
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs text-gray-400">
          <thead className="bg-[#1a1d24] text-gray-500 font-medium uppercase">
            <tr>
              <th className="px-4 py-2">Агент</th>
              <th className="px-4 py-2">Действие</th>
              <th className="px-4 py-2">Цена Входа</th>
              {activeTab === 'OPEN' ? (
                  <th className="px-4 py-2">Тек. Цена</th>
              ) : (
                  <th className="px-4 py-2">Причина закрытия</th>
              )}
              {activeTab === 'OPEN' && <th className="px-4 py-2">Цели</th>}
              <th className="px-4 py-2 text-right">Результат (PnL)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {(activeTab === 'OPEN' ? openPositions : closedPositions).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600 italic">
                  {activeTab === 'OPEN' ? 'Нет открытых позиций. Агенты анализируют рынок...' : 'История сделок пуста.'}
                </td>
              </tr>
            ) : (
              (activeTab === 'OPEN' ? openPositions : closedPositions).map(pos => {
                const agent = agents.find(a => a.id === pos.agentId);
                return (
                  <tr key={pos.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      <span className="text-base">{agent?.avatar}</span> {agent?.name}
                    </td>
                    <td className={`px-4 py-3 font-bold ${pos.side === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                      {pos.side === 'LONG' ? 'РОСТ (Long)' : 'ПАДЕНИЕ (Short)'} <span className="text-gray-500 font-normal opacity-75">x{pos.leverage}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">${pos.entryPrice.toFixed(2)}</td>
                    
                    {activeTab === 'OPEN' ? (
                       <td className="px-4 py-3 font-mono text-white">${currentPrice.toFixed(2)}</td>
                    ) : (
                       <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.closeReason === 'TP' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                             {pos.closeReason === 'TP' ? 'TAKE PROFIT' : 'STOP LOSS'}
                          </span>
                       </td>
                    )}

                    {activeTab === 'OPEN' && (
                      <td className="px-4 py-3 font-mono">
                        <div className="flex flex-col">
                          <span className={pos.trailingActive ? "text-blue-400" : "text-red-400"}>Стоп: {pos.stopLoss.toFixed(2)}</span>
                          <span className="text-green-400 text-[10px]">Тейк: {pos.takeProfit.toFixed(2)}</span>
                        </div>
                      </td>
                    )}

                    <td className={`px-4 py-3 text-right font-mono font-bold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(pos.pnl)} <span className="opacity-75">({pos.pnlPercent.toFixed(2)}%)</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeHistory;