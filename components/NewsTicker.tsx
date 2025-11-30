
import React, { useEffect, useState } from 'react';
import { NewsItem } from '../types';

interface NewsTickerProps {
  news: NewsItem[];
}

const NewsTicker: React.FC<NewsTickerProps> = ({ news }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [news]);

  if (news.length === 0) return null;

  const currentItem = news[currentIndex];
  const sentimentColor = 
    currentItem.sentiment === 'BULLISH' ? 'text-green-400' : 
    currentItem.sentiment === 'BEARISH' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="bg-[#0b0d11] border-y border-gray-800 py-1 overflow-hidden relative h-8 flex items-center">
       <div className="absolute left-0 bg-[#0b0d11] z-10 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
         <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
         NEWS FEED:
       </div>
       
       <div className="flex-1 flex justify-center animate-fadeIn transition-all duration-500" key={currentItem.id}>
          <div className="flex items-center gap-3 text-xs font-mono">
             <span className="text-gray-600 bg-gray-800 px-1 rounded text-[10px]">{currentItem.source}</span>
             <span className={`${sentimentColor} font-medium`}>
               {currentItem.sentiment === 'BULLISH' ? '▲' : currentItem.sentiment === 'BEARISH' ? '▼' : '●'}
             </span>
             <span className="text-gray-300 truncate max-w-[300px] md:max-w-[600px]">{currentItem.text}</span>
          </div>
       </div>
    </div>
  );
};

export default NewsTicker;
