
import React from 'react';
import { NewsItem } from '../types';
import { formatTime } from '../services/marketService';

interface NewsPanelProps {
  news: NewsItem[];
}

const NewsPanel: React.FC<NewsPanelProps> = ({ news }) => {
  return (
    <div className="bg-[#13161c] rounded-xl border border-gray-800 shadow-xl overflow-hidden flex flex-col h-[350px]">
      <div className="px-4 py-3 border-b border-gray-800 bg-[#0b0d11] flex justify-between items-center">
        <h3 className="font-bold text-xs text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <span>📰</span> Лента Новостей (Real-Time)
        </h3>
        <span className="text-[10px] text-blue-400 animate-pulse">● LIVE UPDATE</span>
      </div>

      <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {news.length === 0 ? (
          <div className="p-4 text-center text-gray-600 text-xs italic">Загрузка новостных лент...</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {news.map((item) => {
              const sentimentColor = 
                item.sentiment === 'BULLISH' ? 'border-l-green-500' : 
                item.sentiment === 'BEARISH' ? 'border-l-red-500' : 'border-l-gray-500';
              
              const sentimentIcon = 
                item.sentiment === 'BULLISH' ? 'text-green-400 ▲' : 
                item.sentiment === 'BEARISH' ? 'text-red-400 ▼' : 'text-gray-400 ●';

              return (
                <div key={item.id} className={`p-3 hover:bg-gray-800/30 transition-colors border-l-2 ${sentimentColor}`}>
                   <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] text-blue-400 font-bold bg-blue-900/20 px-1.5 py-0.5 rounded">{item.source}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{formatTime(item.timestamp)}</span>
                   </div>
                   <p className="text-xs text-gray-300 leading-snug">
                     {item.text}
                   </p>
                   <div className="mt-1 flex items-center gap-1 text-[9px] font-mono opacity-70">
                      <span className={sentimentColor.replace('border-l-', 'text-')}>Влияние:</span>
                      <span className="font-bold">{sentimentIcon}</span>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPanel;
