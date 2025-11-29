
import React, { useState, useEffect } from 'react';
import { MarketPrediction } from '../types';

interface PredictionPanelProps {
  prediction: MarketPrediction | null;
  currentPrice: number;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({ prediction, currentPrice }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!prediction) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = prediction.targetTime - now;
      
      if (diff <= 0) {
        setTimeLeft('Проверка...');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}ч ${minutes}м ${seconds}с`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prediction]);

  if (!prediction) {
    return (
      <div className="bg-[#13161c] rounded-xl border border-gray-800 p-6 flex flex-col items-center justify-center h-[120px] animate-pulse">
        <div className="text-gray-500 font-mono text-sm">Генерация прогноза Advisor AI...</div>
      </div>
    );
  }

  const isPending = prediction.status === 'PENDING';
  const isSuccess = prediction.status === 'SUCCESS';

  return (
    <div className={`rounded-xl border p-4 relative overflow-hidden transition-colors duration-500 ${
      isPending ? 'bg-[#13161c] border-gray-800' : 
      isSuccess ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
             <span className="text-white text-xs">AI</span>
          </div>
          <div>
            <h3 className="text-gray-200 font-bold text-sm uppercase tracking-wider">Прогноз "Advisor" (24ч)</h3>
            <div className="text-[10px] text-gray-500 font-mono">Консенсус моделей</div>
          </div>
        </div>
        
        <div className="text-right">
           <div className="text-[10px] text-gray-500 uppercase">Проверка через</div>
           <div className="text-lg font-mono font-bold text-blue-400">{timeLeft}</div>
        </div>
      </div>

      {/* Target & Reasoning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
         <div className="bg-black/20 rounded p-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-400 mb-1">ЦЕЛЕВОЙ ДИАПАЗОН</div>
            <div className="text-xl font-mono font-bold text-white">
              {/* Added safe optional chaining/nullish coalescing */}
              ${prediction.priceMin?.toLocaleString() ?? '...'} - ${prediction.priceMax?.toLocaleString() ?? '...'}
            </div>
         </div>
         <div className="bg-black/20 rounded p-2 border border-gray-700/50 flex flex-col justify-center">
             <div className="text-[10px] text-gray-400 mb-1">ОБОСНОВАНИЕ</div>
             <div className="text-xs text-gray-300 italic">"{prediction.reasoning ?? 'Анализ...'}"</div>
         </div>
      </div>

      {/* Status Overlay if completed */}
      {!isPending && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
           <div className={`px-6 py-3 rounded-xl border-2 font-bold text-xl uppercase tracking-widest transform -rotate-2 ${
             isSuccess ? 'border-green-500 text-green-400 bg-green-900/80' : 'border-red-500 text-red-400 bg-red-900/80'
           }`}>
             {isSuccess ? 'ПРОГНОЗ ВЕРЕН' : 'ОШИБКА ПРОГНОЗА'}
           </div>
        </div>
      )}
      
      {/* Decorative Gradient */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default PredictionPanel;
