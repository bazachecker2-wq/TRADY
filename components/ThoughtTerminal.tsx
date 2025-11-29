
import React, { useEffect, useRef } from 'react';
import { ChatMessage, AgentProfile } from '../types';
import { formatTime, formatCurrency } from '../services/marketService';

interface ThoughtTerminalProps {
  messages: ChatMessage[];
  agents: AgentProfile[];
  phase: 'WORK' | 'MEETING';
  timeLeft: number;
}

const ThoughtTerminal: React.FC<ThoughtTerminalProps> = ({ messages, agents, phase, timeLeft }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#13161c] rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col h-[300px] md:h-full">
      {/* Header with Phase Status */}
      <div className="px-4 py-3 border-b border-gray-800 bg-[#0b0d11] flex justify-between items-center">
        <h3 className="font-bold text-xs text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <span>💭</span> Чат Трейдеров
        </h3>
        
        <div className={`flex items-center gap-3 text-[10px] font-mono border px-2 py-1 rounded ${
            phase === 'WORK' 
            ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400' 
            : 'border-green-500/20 bg-green-500/5 text-green-400'
        }`}>
            <span className={`w-2 h-2 rounded-full ${phase === 'WORK' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
            <span className="uppercase font-bold">
                {phase === 'WORK' ? 'РАБОТА (ТИШИНА)' : 'ПЯТИМИНУТКА (ОБСУЖДЕНИЕ)'}
            </span>
            <span className="ml-2 font-bold text-gray-200 border-l border-gray-700 pl-2">
                {formatTimer(timeLeft)}
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
           <div className="text-center text-gray-600 text-xs italic mt-10">
             Ожидание...
           </div>
        )}
        
        {messages.map(msg => {
          const agent = agents.find(a => a.id === msg.agentId);
          const isSystem = msg.type === 'SYSTEM';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center py-2">
                <span className="text-[10px] text-gray-500 font-mono bg-gray-900/50 border border-gray-800 rounded px-3 py-1">
                  {msg.text}
                </span>
              </div>
            );
          }

          if (!agent) return null;

          return (
            <div key={msg.id} className={`flex gap-3 ${msg.type === 'SIGNAL' ? 'bg-gray-800/20 p-2 rounded-lg border border-gray-800/40' : ''} animate-fadeIn`}>
              <div className="flex-shrink-0 mt-1">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md ${agent.color}`}>
                    {agent.avatar}
                 </div>
              </div>
              
              <div className="flex-1 min-w-0">
                 <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-bold ${agent.id === 'agent-1' ? 'text-yellow-400' : agent.id === 'agent-2' ? 'text-purple-400' : 'text-blue-400'}`}>
                      {agent.name}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">{formatTime(msg.timestamp)}</span>
                 </div>
                 
                 <div className="text-xs text-gray-300 mt-1 leading-relaxed break-words">
                   {msg.type === 'SIGNAL' && (
                     <div className="font-mono text-[10px] text-gray-500 mb-1 flex items-center gap-2">
                        <span className={msg.relatedSignal?.action === 'LONG' ? 'text-green-500' : 'text-red-500'}>
                            {msg.relatedSignal?.action === 'LONG' ? '⬆ СТАВКА НА РОСТ' : '⬇ СТАВКА НА ПАДЕНИЕ'}
                        </span>
                        <span className="opacity-50">|</span>
                        <span>x{msg.relatedSignal?.leverage}</span>
                        {msg.betAmount && (
                            <>
                                <span className="opacity-50">|</span>
                                <span className="text-white font-bold">Ставка: {formatCurrency(msg.betAmount, 0)}</span>
                            </>
                        )}
                     </div>
                   )}
                   {msg.text}
                 </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ThoughtTerminal;