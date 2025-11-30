
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import PriceChart from './components/PriceChart';
import AgentBattlePanel from './components/AIAgentPanel';
import ThoughtTerminal from './components/ThoughtTerminal';
import PredictionPanel from './components/PredictionPanel';
import TradeHistory from './components/TradeHistory';
import NewsPanel from './components/NewsPanel'; 
import AgentModal from './components/AgentModal';
import PuterModal from './components/PuterModal';
import { MarketData, AISignal, AgentProfile, Position, TradeAction, ChatMessage, MarketPrediction, AppPhase, PrivateChatMessage, NewsItem } from './types';
import { subscribeToMarketData, formatCurrency } from './services/marketService';
import { analyzeMarket, getConsensusForecast, generateTradeReaction, chatWithAgent } from './services/geminiService';
import { generateNewsItem } from './services/newsService';
import { McpMemory } from './services/mcpService'; // NEW IMPORT

const INITIAL_AGENTS: AgentProfile[] = [
  { id: 'agent-1', name: 'Альфа', model: 'Gemini 2.5 Flash', style: 'Scalper', status: 'ACTIVE', color: 'bg-yellow-500/20 text-yellow-500', avatar: '⚡', description: 'Быстрые сделки (Google)', balance: 1000, equity: 1000, winRate: 0, wins: 0, losses: 0, tradesCount: 0, recentPerformance: [], decisionTimer: 5, lastActionTime: Date.now() },
  { id: 'agent-2', name: 'Омега', model: 'OpenRouter (DeepSeek R1)', style: 'Swing', status: 'ACTIVE', color: 'bg-purple-500/20 text-purple-500', avatar: '🧠', description: 'Deep reasoning', balance: 1000, equity: 1000, winRate: 0, wins: 0, losses: 0, tradesCount: 0, recentPerformance: [], decisionTimer: 20, lastActionTime: Date.now() },
  { id: 'agent-3', name: 'Дельта', model: 'Gemini 2.5 Flash', style: 'Arbitrage', status: 'ACTIVE', color: 'bg-blue-500/20 text-blue-500', avatar: '⚖️', description: 'Сравнение цен', balance: 1000, equity: 1000, winRate: 0, wins: 0, losses: 0, tradesCount: 0, recentPerformance: [], decisionTimer: 40, lastActionTime: Date.now() },
];

const WORK_DURATION = 300; 
const MEETING_DURATION = 120; 
const DECISION_INTERVAL = 30; 
const MAX_TRADE_DURATION = 3 * 60 * 60 * 1000;

const App: React.FC = () => {
  const [marketHistory, setMarketHistory] = useState<MarketData[]>([]);
  const [currentData, setCurrentData] = useState<MarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [agents, setAgents] = useState<AgentProfile[]>(() => {
    const saved = localStorage.getItem('neurotrade_agents');
    return saved ? JSON.parse(saved) : INITIAL_AGENTS;
  });
  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem('neurotrade_positions');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('neurotrade_chat');
    return saved ? JSON.parse(saved) : [];
  });
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>(() => {
     const saved = localStorage.getItem('neurotrade_news');
     return saved ? JSON.parse(saved) : [];
  });

  const [totalEquity, setTotalEquity] = useState<number>(3000);
  const [consensusPrediction, setConsensusPrediction] = useState<MarketPrediction | null>(null);
  const [appPhase, setAppPhase] = useState<AppPhase>(AppPhase.WORK);
  const [phaseTimer, setPhaseTimer] = useState<number>(WORK_DURATION);
  const [agentSignals, setAgentSignals] = useState<Record<string, AISignal | null>>({});
  const [agentAnalyzing, setAgentAnalyzing] = useState<Record<string, boolean>>({});
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [privateChats, setPrivateChats] = useState<Record<string, PrivateChatMessage[]>>({});
  const [isPuterOpen, setIsPuterOpen] = useState(false);
  const [currentNews, setCurrentNews] = useState<NewsItem | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(() => {
     const saved = localStorage.getItem('neurotrade_session_timer');
     return saved ? parseInt(saved) : 8 * 60 * 60;
  });

  const hasGeneratedForecast = useRef<boolean>(false);
  const discussionTriggered = useRef<boolean>(false);
  const topAgentId = agents.reduce((prev, current) => (prev.equity > current.equity ? prev : current)).id;

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('neurotrade_agents', JSON.stringify(agents));
    localStorage.setItem('neurotrade_positions', JSON.stringify(positions));
    const chatToSave = chatMessages.length > 50 ? chatMessages.slice(chatMessages.length - 50) : chatMessages;
    localStorage.setItem('neurotrade_chat', JSON.stringify(chatToSave));
    localStorage.setItem('neurotrade_news', JSON.stringify(newsFeed));
    localStorage.setItem('neurotrade_session_timer', sessionTimeLeft.toString());
  }, [agents, positions, chatMessages, newsFeed, sessionTimeLeft]);

  // --- NEWS LOOP ---
  useEffect(() => {
    if (newsFeed.length === 0) {
       const initial = Array.from({length: 4}).map(() => generateNewsItem());
       setNewsFeed(initial);
       setCurrentNews(initial[0]);
    } else {
       setCurrentNews(newsFeed[0]);
    }
    const interval = setInterval(() => {
       const newItem = generateNewsItem();
       setNewsFeed(prev => [newItem, ...prev].slice(0, 20)); 
       setCurrentNews(newItem);
    }, 45000); 
    return () => clearInterval(interval);
  }, []);

  // --- MARKET DATA ---
  useEffect(() => {
    const unsubscribe = subscribeToMarketData((tick) => {
      setIsConnected(true);
      setCurrentData(tick);
      setMarketHistory(prev => {
        const newHistory = [...prev, tick];
        if (newHistory.length > 300) return newHistory.slice(newHistory.length - 300);
        return newHistory;
      });
    });
    return () => unsubscribe();
  }, []);

  // --- TIMER LOOPS ---
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseTimer(prev => {
        if (prev <= 1) {
          if (appPhase === AppPhase.WORK) {
            setAppPhase(AppPhase.MEETING);
            setChatMessages(c => [...c, { id: uuidv4(), agentId: 'system', text: '🔔 ПЕРЕРЫВ. ОБСУЖДЕНИЕ.', timestamp: Date.now(), type: 'SYSTEM' }]);
            discussionTriggered.current = false;
            return MEETING_DURATION;
          } else {
            setAppPhase(AppPhase.WORK);
            setChatMessages(c => [...c, { id: uuidv4(), agentId: 'system', text: '🔔 РАБОТАЕМ. СТАВКИ!', timestamp: Date.now(), type: 'SYSTEM' }]);
            return WORK_DURATION;
          }
        }
        return prev - 1;
      });

      if (appPhase === AppPhase.WORK) {
          setAgents(cur => cur.map(a => {
              if (a.status === 'ELIMINATED') return a;
              return { ...a, decisionTimer: a.decisionTimer <= 1 ? 0 : a.decisionTimer - 1 };
          }));
      }
      setSessionTimeLeft(p => Math.max(0, p - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [appPhase]);

  // --- FORECAST LOGIC ---
  useEffect(() => {
    if (currentData && !hasGeneratedForecast.current) {
      hasGeneratedForecast.current = true;
      getConsensusForecast(currentData).then(pred => pred && setConsensusPrediction(pred));
    }
  }, [currentData]);

  // --- PNL CALCULATION ---
  useEffect(() => {
    if (!currentData) return;
    const currentPrice = currentData.btcPrice;
    
    // Update Position PnL
    const updatedPositions = positions.map(pos => {
        if (pos.status === 'CLOSED') return pos;
        
        if (Date.now() - pos.openTime > MAX_TRADE_DURATION) {
             return { ...pos, status: 'CLOSED', closeReason: 'TIME_LIMIT' };
        }

        const priceDiff = pos.side === 'LONG' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
        const rawPnl = priceDiff * (pos.size / pos.entryPrice);
        const pnlPercent = (rawPnl / (pos.size / pos.leverage)) * 100;

        if ((pos.side === 'LONG' && currentPrice <= pos.stopLoss) || (pos.side === 'SHORT' && currentPrice >= pos.stopLoss)) {
            return { ...pos, pnl: rawPnl, pnlPercent, status: 'CLOSED', closeReason: 'SL' };
        }
        if ((pos.side === 'LONG' && currentPrice >= pos.takeProfit) || (pos.side === 'SHORT' && currentPrice <= pos.takeProfit)) {
            return { ...pos, pnl: rawPnl, pnlPercent, status: 'CLOSED', closeReason: 'TP' };
        }

        return { ...pos, pnl: rawPnl, pnlPercent };
    });

    setPositions(updatedPositions);

    const justClosed = updatedPositions.filter(p => p.status === 'CLOSED' && positions.find(old => old.id === p.id && old.status === 'OPEN'));
    
    // Update Agents and MCP Learning
    setAgents(prev => prev.map(agent => {
        const myClosed = justClosed.filter(p => p.agentId === agent.id);
        const myOpen = updatedPositions.filter(p => p.agentId === agent.id && p.status === 'OPEN');
        
        let newBalance = agent.balance;
        let newHistory = agent.recentPerformance;
        let newWins = agent.wins;
        let newLosses = agent.losses;

        if (myClosed.length > 0) {
             const pnlTotal = myClosed.reduce((sum, p) => sum + p.pnl, 0);
             const marginTotal = myClosed.reduce((sum, p) => sum + (p.size/p.leverage), 0);
             newBalance += pnlTotal + marginTotal;
             
             myClosed.forEach(p => {
                 if (p.pnl > 0) newWins++; else newLosses++;
                 newHistory = [...newHistory, p.pnl > 0 ? 'WIN' : 'LOSS'].slice(-10);
                 
                 // --- MCP LEARNING TRIGGER ---
                 McpMemory.saveExperience(agent.id, p.side, p.pnl, currentData.trend);
             });
        }
        
        const floatingPnl = myOpen.reduce((sum, p) => sum + p.pnl, 0);
        const marginLocked = myOpen.reduce((sum, p) => sum + (p.size/p.leverage), 0);
        const newEquity = newBalance + marginLocked + floatingPnl;

        if (newEquity <= 10 && agent.status !== 'ELIMINATED') {
             setChatMessages(c => [...c, { id: uuidv4(), agentId: 'system', text: `☠️ ${agent.name} ОБАНКРОТИЛСЯ!`, timestamp: Date.now(), type: 'SYSTEM' }]);
             return { ...agent, equity: 0, balance: 0, status: 'ELIMINATED' };
        }

        return { ...agent, balance: newBalance, equity: newEquity, wins: newWins, losses: newLosses, recentPerformance: newHistory };
    }));
    
    setTotalEquity(prev => agents.reduce((sum, a) => sum + a.equity, 0));
  }, [currentData]);

  // --- AI TRADING LOOP ---
  useEffect(() => {
    if (!currentData || marketHistory.length < 5) return;
    const readyAgents = agents.filter(a => a.status === 'ACTIVE' && a.decisionTimer <= 0 && !agentAnalyzing[a.id]);

    if (readyAgents.length > 0) {
        const recentChat = chatMessages.slice(-5).map(m => {
            const a = agents.find(ag => ag.id === m.agentId);
            return `${a?.name || 'System'}: ${m.text}`;
        }).join('\n');

        readyAgents.forEach(activeAgent => {
            setAgents(p => p.map(a => a.id === activeAgent.id ? { ...a, decisionTimer: DECISION_INTERVAL } : a));
            
            const runAI = async () => {
                setAgentAnalyzing(p => ({ ...p, [activeAgent.id]: true }));
                try {
                    const pos = positions.find(p => p.agentId === activeAgent.id && p.status === 'OPEN');
                    const signal = await analyzeMarket(marketHistory, activeAgent, pos, recentChat, currentNews);
                    
                    setAgentSignals(p => ({ ...p, [activeAgent.id]: signal }));

                    if (signal.action === TradeAction.CLOSE && pos) {
                        closePosition(pos, signal.reasoning);
                    } else if (signal.action === TradeAction.LONG || signal.action === TradeAction.SHORT) {
                         executeTrade(activeAgent.id, signal);
                    }
                } catch(e) { console.error(e); } 
                finally { setAgentAnalyzing(p => ({ ...p, [activeAgent.id]: false })); }
            };
            runAI();
        });
    }
  }, [agents, marketHistory, currentData, currentNews]);

  const closePosition = (pos: Position, reason: string) => {
      setPositions(p => p.map(prev => prev.id === pos.id ? { ...prev, status: 'CLOSED', closeReason: 'MANUAL' } : prev));
      setChatMessages(c => [...c, { id: uuidv4(), agentId: pos.agentId, text: `Закрываю: ${reason}`, timestamp: Date.now(), type: 'COMMENT' }]);
  };

  const executeTrade = (agentId: string, signal: AISignal) => {
      if (!currentData) return;
      if (positions.find(p => p.agentId === agentId && p.status === 'OPEN')) return;

      setAgents(prev => {
          const idx = prev.findIndex(a => a.id === agentId);
          const agent = prev[idx];
          if (!agent || agent.balance < 10) return prev;

          const betPercent = Math.min(Math.max(signal.betPercentage, 5), 50); 
          const margin = (agent.balance * betPercent) / 100;
          const slippage = 0.0002;
          const price = signal.action === 'LONG' ? currentData.btcPrice * (1+slippage) : currentData.btcPrice * (1-slippage);

          const newPos: Position = {
             id: uuidv4(), agentId, symbol: 'BTCUSDT', side: signal.action as any,
             entryPrice: price, size: margin * signal.leverage, leverage: signal.leverage,
             stopLoss: signal.stopLoss, takeProfit: signal.takeProfit, openTime: Date.now(),
             pnl: 0, pnlPercent: 0, status: 'OPEN', trailingActive: false
          };

          setPositions(pp => [...pp, newPos]);
          
          setChatMessages(cc => [...cc, {
             id: uuidv4(), agentId, text: signal.reasoning, timestamp: Date.now(), type: 'SIGNAL',
             relatedSignal: { ...signal, betAmount: margin }, betAmount: margin
          }]);

          // REACTION LOOP
          const others = agents.filter(a => a.id !== agentId && a.status === 'ACTIVE');
          others.forEach(async (reactor) => {
              await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
              const reaction = await generateTradeReaction(reactor, agent.name, signal);
              setChatMessages(cc => [...cc, {
                 id: uuidv4(), agentId: reactor.id, text: reaction, timestamp: Date.now(), type: 'COMMENT'
              }]);
          });

          const newAgents = [...prev];
          newAgents[idx] = { ...agent, balance: agent.balance - margin };
          return newAgents;
      });
  };

  const handlePrivateMessage = async (text: string) => {
      if (!selectedAgent || !currentData) return;
      const userMsg: PrivateChatMessage = { id: uuidv4(), sender: 'USER', text, timestamp: Date.now() };
      setPrivateChats(p => ({ ...p, [selectedAgent.id]: [...(p[selectedAgent.id] || []), userMsg] }));
      
      const responseText = await chatWithAgent(selectedAgent, text, currentData.btcPrice, marketHistory);
      const agentMsg: PrivateChatMessage = { id: uuidv4(), sender: 'AGENT', text: responseText, timestamp: Date.now() };
      setPrivateChats(p => ({ ...p, [selectedAgent.id]: [...(p[selectedAgent.id] || []), agentMsg] }));
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 font-sans pb-10">
      <Header onOpenPuter={() => setIsPuterOpen(true)} />
      
      <main className="container mx-auto p-4 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="md:col-span-3 bg-[#13161c] p-5 rounded-xl border border-gray-800 shadow-xl flex justify-between items-center relative overflow-hidden">
               <div className="relative z-10">
                  <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Общий Капитал Фонда</h2>
                  <div className="flex items-baseline gap-4">
                     <span className="text-4xl font-mono font-bold text-white tracking-tight">{formatCurrency(totalEquity)}</span>
                     <span className={`text-sm font-bold ${totalEquity >= 3000 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalEquity >= 3000 ? '+' : ''}{((totalEquity - 3000) / 3000 * 100).toFixed(2)}%
                     </span>
                  </div>
               </div>
               <div className="text-right relative z-10">
                   <div className="text-[10px] text-gray-500 uppercase">До конца сессии</div>
                   <div className="text-xl font-mono text-white font-bold">{Math.floor(sessionTimeLeft/3600)}ч {Math.floor((sessionTimeLeft%3600)/60)}м</div>
               </div>
               <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent pointer-events-none"></div>
           </div>

           <div className="bg-[#13161c] p-4 rounded-xl border border-gray-800 flex flex-col justify-center items-center text-center">
             <div className="text-4xl mb-2 animate-bounce">
                {currentData?.trend === 'UP' ? '🚀' : currentData?.trend === 'DOWN' ? '🐻' : '⚖️'}
             </div>
             <div className="text-sm font-bold text-gray-300">
                {currentData?.trend === 'UP' ? 'TREND UP' : currentData?.trend === 'DOWN' ? 'TREND DOWN' : 'FLAT'}
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
             <PriceChart data={marketHistory} />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TradeHistory positions={positions} agents={agents} currentPrice={currentData ? currentData.btcPrice : 0} />
                <NewsPanel news={newsFeed} />
             </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
             <div className="flex-none">
                <AgentBattlePanel 
                   agents={agents} 
                   signals={agentSignals}
                   analyzing={agentAnalyzing}
                   onSelectAgent={setSelectedAgent}
                   onRefinance={(id) => setAgents(p => p.map(a => a.id === id ? {...a, balance: 1000, equity: 1000, status: 'ACTIVE'} : a))}
                   topAgentId={topAgentId}
                />
             </div>
             <div className="flex-1 min-h-[400px]">
                <ThoughtTerminal messages={chatMessages} agents={agents} phase={appPhase} timeLeft={phaseTimer} />
             </div>
          </div>
        </div>
        <div className="mt-2">
           {currentData && <PredictionPanel prediction={consensusPrediction} currentPrice={currentData.btcPrice} />}
        </div>
      </main>

      <AgentModal 
        agent={selectedAgent} 
        isOpen={!!selectedAgent} 
        onClose={() => setSelectedAgent(null)}
        publicMessages={chatMessages}
        privateMessages={selectedAgent ? (privateChats[selectedAgent.id] || []) : []}
        onSendMessage={handlePrivateMessage}
        currentPrice={currentData ? currentData.btcPrice : 0}
      />
      <PuterModal isOpen={isPuterOpen} onClose={() => setIsPuterOpen(false)} />
    </div>
  );
};

export default App;
