import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MarketData } from '../types';
import { formatTime } from '../services/marketService';

interface PriceChartProps {
  data: MarketData[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const current = data[data.length - 1];
  const isUp = current?.trend !== 'DOWN';
  
  // Neon Palette
  const color = isUp ? '#00ff9d' : '#ff3860'; 
  const secondaryColor = isUp ? '#00cc7d' : '#cc2d4d';

  return (
    <div className="h-[450px] w-full bg-[#0b0d11] rounded-2xl border border-gray-800 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Background Decor - "Wind Tunnel" Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             background: `radial-gradient(circle at 50% 50%, ${color}22 0%, transparent 70%)`
           }}>
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 p-4 relative z-10">
         {/* Floating Header */}
         <div className="absolute top-6 left-6 z-20 backdrop-blur-sm bg-black/30 p-2 rounded-lg border border-white/5">
            <h3 className="text-gray-400 font-medium text-[10px] uppercase tracking-[0.2em] mb-1">Поток Цены BTC/USDT</h3>
            <div className="flex items-end gap-3">
              <div className={`text-3xl font-mono font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] ${isUp ? 'text-[#00ff9d]' : 'text-[#ff3860]'}`}>
                ${current?.btcPrice.toFixed(2)}
              </div>
              <div className="text-xs font-mono text-gray-500 mb-1">REALTIME FLUID</div>
            </div>
         </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <defs>
              {/* 3D Volume Gradient */}
              <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="50%" stopColor={color} stopOpacity={0.1}/>
                <stop offset="100%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
              
              {/* Neon Glow Filter */}
              <filter id="neonGlow" height="200%" width="200%" x="-50%" y="-50%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="#ffffff" 
              opacity={0.05} 
              vertical={false} 
            />
            
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime} 
              stroke="#4b5563" 
              fontSize={10} 
              tickMargin={10}
              minTickGap={50}
              axisLine={false}
              tickLine={false}
              opacity={0.5}
            />
            
            <YAxis 
              domain={['auto', 'auto']} 
              orientation="right" 
              stroke="#4b5563" 
              fontSize={10} 
              tickFormatter={(val) => val.toFixed(0)}
              axisLine={false}
              tickLine={false}
              width={40}
              opacity={0.5}
            />
            
            <Tooltip 
              cursor={{ stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                borderColor: color, 
                color: '#e5e7eb', 
                fontSize: '12px',
                backdropFilter: 'blur(4px)',
                boxShadow: `0 0 15px ${color}33`,
                borderRadius: '8px'
              }}
              itemStyle={{ color: color }}
              labelFormatter={(label) => formatTime(label)}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Цена']}
            />
            
            {/* The "Airflow" Body */}
            <Area 
              type="monotone" // Smooth curve
              dataKey="btcPrice" 
              stroke="none"
              fill="url(#flowGradient)" 
              isAnimationActive={false}
              strokeWidth={0}
            />

            {/* The "Leading Edge" Streamline */}
            <Area 
              type="monotone"
              dataKey="btcPrice"
              stroke={color}
              strokeWidth={3}
              fill="none"
              filter="url(#neonGlow)" // Apply glow
              isAnimationActive={false}
            />
            
            {/* Secondary Streamline for 3D Effect */}
            <Area 
              type="monotone"
              dataKey={d => d.btcPrice * 0.9998} // Slight offset shadow
              stroke={secondaryColor}
              strokeWidth={1}
              strokeOpacity={0.3}
              fill="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3D Order Book (Stakan) - Styled as "Depth Gauges" */}
      <div className="w-full md:w-56 bg-[#080a0e] border-l border-gray-800 flex flex-col text-[10px] font-mono relative z-20">
        <div className="p-3 text-center text-gray-500 border-b border-gray-800 font-bold uppercase tracking-widest bg-[#0b0d11]">
          Глубина Рынка
        </div>
        
        {/* Asks (Sellers) - Top down */}
        <div className="flex-1 flex flex-col-reverse justify-end overflow-hidden pb-1">
          {current?.orderBook.asks.slice(0, 15).map((ask, i) => (
            <div key={`ask-${i}`} className="flex justify-between px-3 py-0.5 relative group cursor-crosshair transition-all duration-300">
               {/* 3D Bar Effect */}
               <div className="absolute right-0 top-[1px] bottom-[1px] bg-gradient-to-l from-red-500/20 to-transparent z-0 rounded-l-sm transition-all duration-300 group-hover:from-red-500/40" 
                    style={{ width: `${Math.min(ask[1] * 50, 100)}%` }}></div>
               <span className="text-red-400/80 z-10 relative font-medium group-hover:text-red-300">{ask[0].toFixed(1)}</span>
               <span className="text-gray-600 z-10 relative group-hover:text-gray-300">{ask[1].toFixed(3)}</span>
            </div>
          ))}
        </div>

        {/* Center Price Indicator */}
        <div className={`py-3 text-center font-black text-lg border-y border-gray-800/50 bg-[#0f1115] relative overflow-hidden`}>
           <div className={`absolute inset-0 opacity-10 ${isUp ? 'bg-green-500' : 'bg-red-500'}`}></div>
           <span className={isUp ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]'}>
             {current?.btcPrice.toFixed(1)}
           </span>
        </div>

        {/* Bids (Buyers) - Top down */}
        <div className="flex-1 overflow-hidden pt-1">
           {current?.orderBook.bids.slice(0, 15).map((bid, i) => (
            <div key={`bid-${i}`} className="flex justify-between px-3 py-0.5 relative group cursor-crosshair transition-all duration-300">
               {/* 3D Bar Effect */}
               <div className="absolute right-0 top-[1px] bottom-[1px] bg-gradient-to-l from-green-500/20 to-transparent z-0 rounded-l-sm transition-all duration-300 group-hover:from-green-500/40" 
                    style={{ width: `${Math.min(bid[1] * 50, 100)}%` }}></div>
               <span className="text-green-400/80 z-10 relative font-medium group-hover:text-green-300">{bid[0].toFixed(1)}</span>
               <span className="text-gray-600 z-10 relative group-hover:text-gray-300">{bid[1].toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceChart;