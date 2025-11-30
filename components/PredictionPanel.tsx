
import React, { useState, useEffect } from 'react';
import { MarketPrediction } from '../types';
import { formatCurrency } from '../services/marketService';

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
        setTimeLeft(`${minutes}м ${seconds}с`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prediction]);

  if (!prediction) {
    return (
      <div className="bg-[#13161c] rounded-xl border border-gray-800 p-6 flex flex-col items-center justify-center h-[180px] animate-pulse">
        <div className="text-gray-500 font-mono text-sm">Advisor AI анализирует рынок для подробного отчета...</div>
      </div>
    );
  }

  const isPending = prediction.status === 'PENDING';
  const isSuccess = prediction.status === 'SUCCESS';

  return (
    <div className={`rounded-xl border p-5 relative overflow-hidden transition-colors duration-500 ${
      isPending ? 'bg-[#13161c] border-gray-800' : 
      isSuccess ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10 border-b border-gray-700/50 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg border border-white/10">
             <span className="text-white text-xs font-bold">PRO</span>
          </div>
          <div>
            <h3 className="text-gray-200 font-bold text-sm uppercase tracking-wide">Развернутый Прогноз (15 мин)</h3>
            <div className="text-[10px] text-gray-400 font-mono flex gap-2">
               <span>ID: {prediction.id.slice(0,8)}</span>
               <span className="text-gray-600">|</span>
               <span>Таймер: <span className="text-blue-400 font-bold">{timeLeft}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10 mb-4">
         
         {/* Target Price */}
         <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20 md:col-span-1">
            <div className="text-[10px] text-blue-300 mb-1 uppercase font-bold tracking-wider">🎯 Цель</div>
            <div className="text-2xl font-mono font-bold text-white">
              ${prediction.predictedPrice?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) ?? '...'}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
               Ожидаемый вектор
            </div>
         </div>

         {/* Levels */}
         <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50 md:col-span-1">
            <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Ключевые Уровни</div>
            <div className="flex justify-between text-xs font-mono mb-1">
               <span className="text-red-400">Res:</span>
               <span className="text-gray-200">${prediction.resistanceLevel?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
               <span className="text-green-400">Sup:</span>
               <span className="text-gray-200">${prediction.supportLevel?.toFixed(0)}</span>
            </div>
         </div>
         
         {/* Range */}
         <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50 md:col-span-1">
             <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Диапазон</div>
             <div className="text-sm font-mono text-gray-300 font-bold">
                ${prediction.priceMin.toFixed(0)} - ${prediction.priceMax.toFixed(0)}
             </div>
             <div className="text-[10px] text-gray-600 mt-1">
                Волатильность
             </div>
         </div>

         {/* Drivers */}
         <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 md:col-span-1">
            <div className="text-[10px] text-purple-300 mb-1 uppercase font-bold tracking-wider">⚡ Драйверы</div>
            <div className="text-xs text-gray-300 leading-snug">
               {prediction.keyDrivers}
            </div>
         </div>
      </div>

      {/* Narrative */}
      <div className="bg-black/30 rounded-lg p-3 border border-gray-800 relative z-10">
         <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">Сценарий Аналитика</div>
         <p className="text-sm text-gray-300 italic leading-relaxed">
            "{prediction.reasoning ?? 'Формирование сценария...'}"
         </p>
      </div>

      {/* Result Overlay */}
      {!isPending && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
           <div className={`px-8 py-4 rounded-xl border-2 font-black text-2xl uppercase tracking-widest transform -rotate-3 shadow-2xl ${
             isSuccess ? 'border-green-500 text-green-400 bg-green-900/90' : 'border-red-500 text-red-400 bg-red-900/90'
           }`}>
             {isSuccess ? 'ПРОГНОЗ ИСПОЛНЕН' : 'ПРОГНОЗ НЕВЕРЕН'}
           </div>
        </div>
      )}
      
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default PredictionPanel;
