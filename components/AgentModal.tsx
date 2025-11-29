

import React, { useState, useEffect, useRef } from 'react';
import { AgentProfile, ChatMessage, PrivateChatMessage } from '../types';
import { formatCurrency, formatTime } from '../services/marketService';

interface AgentModalProps {
  agent: AgentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  publicMessages: ChatMessage[];
  privateMessages: PrivateChatMessage[];
  onSendMessage: (text: string) => void;
  currentPrice: number;
}

const AgentModal: React.FC<AgentModalProps> = ({ 
  agent, isOpen, onClose, publicMessages, privateMessages, onSendMessage, currentPrice 
}) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'THOUGHTS' | 'CHAT'>('STATS');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('STATS');
    }
  }, [isOpen]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'CHAT' || activeTab === 'THOUGHTS') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [privateMessages, activeTab, isOpen]);

  // Simulate typing effect
  useEffect(() => {
    if (privateMessages.length > 0 && privateMessages[privateMessages.length - 1].sender === 'USER') {
        setIsTyping(true);
        // "Typing" stops when new agent message arrives (handled by parent prop update)
    } else {
        setIsTyping(false);
    }
  }, [privateMessages]);

  if (!isOpen || !agent) return null;

  const agentThoughts = publicMessages.filter(m => m.agentId === agent.id);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="bg-[#13161c] w-full max-w-2xl rounded-2xl border border-gray-800 shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#1a202c] to-[#13161c]">
           <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-xl ${agent.color}`}>
                  {agent.avatar}
              </div>
              <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">{agent.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-1">
                      <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{agent.model}</span>
                      <span className="text-gray-500">|</span>
                      <span>{agent.style === 'Scalper' ? 'Агрессивный скальпер' : agent.style === 'Swing' ? 'Свинг трейдер' : 'Арбитраж бот'}</span>
                  </div>
              </div>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#0f1115]">
           <button 
             onClick={() => setActiveTab('STATS')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'STATS' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-gray-500 hover:text-gray-300'}`}
           >
             📊 Статистика
           </button>
           <button 
             onClick={() => setActiveTab('THOUGHTS')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'THOUGHTS' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-gray-500 hover:text-gray-300'}`}
           >
             🧠 Мысли ({agentThoughts.length})
           </button>
           <button 
             onClick={() => setActiveTab('CHAT')}
             className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'CHAT' ? 'text-green-400 border-b-2 border-green-500 bg-green-500/5' : 'text-gray-500 hover:text-gray-300'}`}
           >
             💬 Личный Чат
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#0b0d11] min-h-[300px] relative">
            
            {/* STATS TAB */}
            {activeTab === 'STATS' && (
                <div className="p-6 space-y-6 animate-fadeIn">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#13161c] p-4 rounded-xl border border-gray-800">
                         <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Live Equity (Текущий)</div>
                         <div className={`text-2xl font-mono font-bold ${agent.equity >= 1000 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(agent.equity)}
                         </div>
                         <div className="text-[10px] text-gray-600 mt-2 flex justify-between">
                            <span>Кэш (Realized): {formatCurrency(agent.balance)}</span>
                         </div>
                      </div>
                      <div className="bg-[#13161c] p-4 rounded-xl border border-gray-800">
                         <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Win Rate</div>
                         <div className="text-2xl font-mono font-bold text-yellow-400">
                            {agent.winRate}%
                         </div>
                         <div className="text-[10px] text-gray-600 mt-2">
                            Всего сделок: {agent.tradesCount}
                         </div>
                      </div>
                   </div>

                   <div className="bg-[#13161c] p-4 rounded-xl border border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Последние результаты</h3>
                      <div className="flex gap-2">
                         {agent.recentPerformance.length === 0 ? (
                            <span className="text-xs text-gray-600 italic">Нет завершенных сделок</span>
                         ) : (
                             agent.recentPerformance.map((res, i) => (
                                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${res === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {res === 'WIN' ? 'W' : 'L'}
                                </div>
                             ))
                         )}
                      </div>
                   </div>
                   
                   {agent.strategyAdaptation && (
                       <div className="p-4 bg-purple-900/10 border border-purple-500/30 rounded-xl">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Активная Адаптация</h3>
                          <p className="text-sm text-gray-300 italic">"{agent.strategyAdaptation}"</p>
                       </div>
                   )}
                </div>
            )}

            {/* THOUGHTS TAB */}
            {activeTab === 'THOUGHTS' && (
                <div className="p-4 space-y-3 animate-fadeIn">
                   {agentThoughts.length === 0 ? (
                       <div className="text-center text-gray-600 py-10">Агент пока молчит...</div>
                   ) : (
                       agentThoughts.map(msg => (
                           <div key={msg.id} className="bg-[#13161c] p-3 rounded-lg border border-gray-800">
                               <div className="flex justify-between items-baseline mb-1">
                                  <span className="text-[10px] font-mono text-gray-500">{formatTime(msg.timestamp)}</span>
                                  {msg.type === 'SIGNAL' && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1 rounded">СИГНАЛ</span>}
                               </div>
                               <p className="text-sm text-gray-300">{msg.text}</p>
                           </div>
                       ))
                   )}
                   <div ref={chatEndRef} />
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'CHAT' && (
                <div className="flex flex-col h-full h-[400px]">
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {privateMessages.length === 0 && (
                          <div className="text-center text-gray-600 py-10 text-sm">
                             Поздоровайся или спроси совет у {agent.name}.
                          </div>
                      )}
                      
                      {privateMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                                  msg.sender === 'USER' 
                                  ? 'bg-blue-600 text-white rounded-br-none' 
                                  : 'bg-[#1a202c] text-gray-200 border border-gray-700 rounded-bl-none'
                              }`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      
                      {isTyping && (
                          <div className="flex justify-start">
                             <div className="bg-[#1a202c] px-4 py-3 rounded-xl rounded-bl-none border border-gray-700 flex gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                             </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                   </div>

                   {/* Input Area */}
                   <div className="p-4 border-t border-gray-800 bg-[#13161c] flex gap-2">
                       <input 
                         type="text" 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                         placeholder={`Спросить ${agent.name}...`}
                         className="flex-1 bg-[#0b0d11] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                       />
                       <button 
                         onClick={handleSend}
                         disabled={!inputText.trim()}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                       </button>
                   </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AgentModal;