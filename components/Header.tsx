
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onOpenPuter: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenPuter }) => {
  const [viewers, setViewers] = useState(12403);
  const [dailyVisits, setDailyVisits] = useState(452109);
  const [monthlyVisits, setMonthlyVisits] = useState(12890400);

  useEffect(() => {
    const storedDaily = localStorage.getItem('analytics_daily');
    const storedMonthly = localStorage.getItem('analytics_monthly');
    const lastVisit = localStorage.getItem('analytics_last_ts');

    let currentDaily = storedDaily ? parseInt(storedDaily) : 452109;
    let currentMonthly = storedMonthly ? parseInt(storedMonthly) : 12890400;

    const now = Date.now();
    if (!lastVisit || (now - parseInt(lastVisit) > 600000)) {
       currentDaily += Math.floor(Math.random() * 5) + 1;
       currentMonthly += Math.floor(Math.random() * 5) + 1;
       localStorage.setItem('analytics_daily', currentDaily.toString());
       localStorage.setItem('analytics_monthly', currentMonthly.toString());
       localStorage.setItem('analytics_last_ts', now.toString());
    }

    setDailyVisits(currentDaily);
    setMonthlyVisits(currentMonthly);

    const hour = new Date().getHours();
    const baseViewers = 12000 + (hour * 150);
    setViewers(baseViewers + Math.floor(Math.random() * 500));

    const interval = setInterval(() => {
      setViewers(prev => prev + (Math.floor(Math.random() * 15) - 7));
      if (Math.random() > 0.7) setDailyVisits(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-[#0b0d11] border-b border-gray-800 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-4 mb-2 md:mb-0">
        <div className="w-10 h-10 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          AI
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
            NeuroTrade <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">LIVE</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-mono tracking-wider">СЕРВЕР: ФРАНКФУРТ-1 (14ms)</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 overflow-x-auto">
        <button 
          onClick={onOpenPuter}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border border-gray-700 transition-all hover:scale-105"
        >
          <span className="text-xl">💻</span> Cloud OS
        </button>

        <div className="flex flex-col items-end min-w-[100px]">
           <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 px-2 py-1 rounded border border-red-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-mono font-bold">{viewers?.toLocaleString('ru-RU') ?? '...'} ОНЛАЙН</span>
          </div>
        </div>

        <div className="hidden lg:flex gap-6 border-l border-gray-800 pl-6">
           <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Визитов сегодня</div>
              <div className="text-xs font-mono font-bold text-gray-300">{dailyVisits?.toLocaleString('ru-RU') ?? '...'}</div>
           </div>
           <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Визитов за месяц</div>
              <div className="text-xs font-mono font-bold text-gray-300">{((monthlyVisits || 0) / 1000000).toFixed(2)}M+</div>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
