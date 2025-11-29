import React from 'react';
import { MarketData, ArbitrageOpportunity } from '../types';
import { formatCurrency } from '../services/marketService';

interface ArbitrageCardProps {
  data: MarketData;
}

const ArbitrageCard: React.FC<ArbitrageCardProps> = ({ data }) => {
  const calculateArb = (): ArbitrageOpportunity => {
    const spread = Math.abs(data.mexcPrice - data.bitgetPrice);
    const spreadPercent = (spread / data.btcPrice) * 100;
    
    let buyAt: 'MEXC' | 'Bitget' = data.mexcPrice < data.bitgetPrice ? 'MEXC' : 'Bitget';
    let sellAt: 'MEXC' | 'Bitget' = data.mexcPrice < data.bitgetPrice ? 'Bitget' : 'MEXC';
    
    return {
      spread: spreadPercent,
      spreadValue: spread,
      buyAt,
      sellAt,
      profitability: spreadPercent > 0.05 ? 'HIGH' : spreadPercent > 0.02 ? 'MEDIUM' : 'LOW'
    };
  };

  const arb = calculateArb();
  const color = arb.profitability === 'HIGH' ? 'text-green-400' : arb.profitability === 'MEDIUM' ? 'text-yellow-400' : 'text-gray-500';

  return (
    <div className="bg-gray-850 rounded-xl p-4 border border-gray-800 shadow-lg h-full">
      <h3 className="text-gray-400 font-medium mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
        </svg>
        Арбитраж (MEXC / Bitget)
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-[10px] text-gray-500 uppercase">MEXC Цена</div>
          <div className="font-mono text-lg font-bold">{formatCurrency(data.mexcPrice)}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-[10px] text-gray-500 uppercase">Bitget Цена</div>
          <div className="font-mono text-lg font-bold">{formatCurrency(data.bitgetPrice)}</div>
        </div>
      </div>

      <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm text-gray-400">Спред</span>
          <span className={`text-xl font-mono font-bold ${color}`}>
            {arb.spread.toFixed(3)}%
          </span>
        </div>
        <div className="text-xs text-gray-500 flex justify-between mb-2">
          <span>Разница в USD:</span>
          <span className="font-mono">{formatCurrency(arb.spreadValue)}</span>
        </div>
        
        {arb.spread > 0.01 ? (
          <div className="mt-3 p-2 bg-purple-900/20 border border-purple-500/30 rounded text-center">
             <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
               Покупай {arb.buyAt} <span className="mx-1">→</span> Продавай {arb.sellAt}
             </span>
          </div>
        ) : (
          <div className="mt-3 text-center text-xs text-gray-600 italic">
            Нет выгодных возможностей
          </div>
        )}
      </div>
    </div>
  );
};

export default ArbitrageCard;