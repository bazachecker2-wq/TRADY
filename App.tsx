
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from './components/Header';
import PriceChart from './components/PriceChart';
import ArbitrageCard from './components/ArbitrageCard';
import AgentBattlePanel from './components/AIAgentPanel';
import ThoughtTerminal from './components/ThoughtTerminal';
import PredictionPanel from './components/PredictionPanel';
import TradeHistory from './components/TradeHistory';
import AgentModal from './components/AgentModal';
import PuterModal from './components/PuterModal';
import { MarketData, AISignal, AgentProfile, AccountState, Position, TradeAction, ChatMessage, MarketPrediction, AppPhase, PrivateChatMessage } from './types';
import { subscribeToMarketData, formatCurrency } from './services/marketService';
import { analyzeMarket, getConsensusForecast, getTeamDiscussion, performStrategicReview, chatWithAgent, getMeetingConclusion } from './services/geminiService';

const INITIAL_AGENTS: AgentProfile[] = [
  { id: 'agent-1', name: 'Альфа', model: 'Gemini 2.5 Flash', style: 'Scalper', color: 'bg-yellow-500/20 text-yellow-500', avatar: '⚡', description: 'Быстрые сделки (Google)', balance: 1000, winRate: 68, tradesCount: 0, recentPerformance: [], decisionTimer: 10, lastActionTime: Date.now() },
  { id: 'agent-2', name: 'Омега', model: 'OpenRouter (DeepSeek R1)', style: 'Swing', color: 'bg-purple-500/20 text-purple-500', avatar: '🧠', description: 'Deep reasoning', balance: 1000, winRate: 54, tradesCount: 0, recentPerformance: [], decisionTimer: 30, lastActionTime: Date.now() },
  { id: 'agent-3', name: 'Дельта', model: 'Gemini 2.5 Flash', style: 'Arbitrage', color: 'bg-blue-500/20 text-blue-500', avatar: '⚖️', description: 'Сравнение цен', balance: 1000, winRate: 92, tradesCount: 0, recentPerformance: [], decisionTimer: 50, lastActionTime: Date.now() },
];

const WORK_DURATION = 300; 
const MEETING_DURATION = 180; 
const STRATEGY_REVIEW_INTERVAL = 1800; 
const DECISION_INTERVAL = 60; 

const App: React.FC = () => {
  const [marketHistory, setMarketHistory] = useState<MarketData[]>([]);
  const [currentData, setCurrentData] = useState<MarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agents, setAgents] = useState<AgentProfile[]>(INITIAL_AGENTS);
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalEquity, setTotalEquity] = useState<number>(3000);
  const [consensusPrediction, setConsensusPrediction] = useState<MarketPrediction | null>(null);
  
  const [appPhase, setAppPhase] = useState<AppPhase>(AppPhase.WORK);
  const [phaseTimer, setPhaseTimer] = useState<number>(WORK_DURATION);
  const [strategyTimer, setStrategyTimer] = useState<number>(STRATEGY_REVIEW_INTERVAL);
  
  const [agentSignals, setAgentSignals] = useState<Record<string, AISignal | null>>({});
  const [agentAnalyzing, setAgentAnalyzing] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [privateChats, setPrivateChats] = useState<Record<string, PrivateChatMessage[]>>({});
  const [isPuterOpen, setIsPuterOpen] = useState(false);

  const hasGeneratedForecast = useRef<boolean>(false);
  const discussionTriggered = useRef<boolean>(false);

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

    setChatMessages([{
      id: 'system-1',
      agentId: 'system',
      text: 'Система запущена. Агент Омега использует OpenRouter.',
      timestamp: Date.now(),
      type: 'SYSTEM'
    }]);

    return () => {
      unsubscribe();
    };
  }, []);

  const handlePrivateMessage = async (text: string) => {
    if (!selectedAgent || !currentData) return;
    
    const agentId = selectedAgent.id;
    const newMessage: PrivateChatMessage = {
      id: uuidv4(),
      sender: 'USER',
      text: text,
      timestamp: Date.now()
    };

    setPrivateChats(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), newMessage]
    }));

    const responseText = await chatWithAgent(
      selectedAgent, 
      text, 
      currentData.btcPrice, 
      (privateChats[agentId] || [])
    );

    const replyMessage: PrivateChatMessage = {
      id: uuidv4(),
      sender: 'AGENT',
      text: responseText,
      timestamp: Date.now()
    };

    setPrivateChats(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), replyMessage]
    }));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseTimer(prev => {
        if (prev <= 1) {
          if (appPhase === AppPhase.WORK) {
            setAppPhase(AppPhase.MEETING);
            setChatMessages(curr => [...curr, {
              id: uuidv4(),
              agentId: 'system',
              text: '🔔 ПЯТИМИНУТКА. ЛИДЕР ГОВОРИТ ПЕРВЫМ.',
              timestamp: Date.now(),
              type: 'SYSTEM'
            }]);
            discussionTriggered.current = false;
            return MEETING_DURATION;
          } else {
            setAppPhase(AppPhase.WORK);
            setChatMessages(curr => [...curr, {
              id: uuidv4(),
              agentId: 'system',
              text: '🔔 ПЕРЕРЫВ ОКОНЧЕН. ТОРГУЕМ.',
              timestamp: Date.now(),
              type: 'SYSTEM'
            }]);
            return WORK_DURATION;
          }
        }
        return prev - 1;
      });

      if (appPhase === AppPhase.WORK) {
          setAgents(currentAgents => currentAgents.map(agent => {
              if (agent.decisionTimer <= 1) {
                  return { ...agent, decisionTimer: 0 }; 
              }
              return { ...agent, decisionTimer: agent.decisionTimer - 1 };
          }));
      }

    }, 1000);
    return () => clearInterval(interval);
  }, [appPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStrategyTimer(prev => {
         if (prev <= 1) {
           handleStrategyReview();
           return STRATEGY_REVIEW_INTERVAL;
         }
         return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [agents]);

  const handleStrategyReview = async () => {
    const adjustments = await performStrategicReview(agents);
    
    if (adjustments.length > 0) {
      setAgents(prev => prev.map(agent => {
        const adj = adjustments.find(a => a.agentId === agent.id);
        if (adj) {
          return { ...agent, strategyAdaptation: adj.adaptation };
        }
        return agent;
      }));
      
      adjustments.forEach(adj => {
         const agent = agents.find(a => a.id === adj.agentId);
         if (agent) {
             setChatMessages(prev => [...prev, {
               id: uuidv4(),
               agentId: agent.id,
               text: `Принято (Strategy). ${adj.adaptation}`,
               timestamp: Date.now(),
               type: 'STRATEGY_UPDATE'
             }]);
         }
      });
    }
  };

  useEffect(() => {
    if (appPhase === AppPhase.MEETING && !discussionTriggered.current && marketHistory.length > 10) {
      discussionTriggered.current = true;
      const runMeeting = async () => {
        await new Promise(r => setTimeout(r, 2000));
        
        const messages = await getTeamDiscussion(agents, marketHistory);
        for (const msg of messages) {
           await new Promise(r => setTimeout(r, 4000));
           setChatMessages(prev => [...prev, {
             id: uuidv4(),
             agentId: msg.agentId,
             text: msg.text,
             timestamp: Date.now(),
             type: 'COMMENT'
           }]);
        }

        await new Promise(r => setTimeout(r, 3000));
        const conclusion = await getMeetingConclusion(agents, marketHistory);
        if (conclusion) {
           setChatMessages(prev => [...prev, {
              id: uuidv4(),
              agentId: 'system',
              text: conclusion,
              timestamp: Date.now(),
              type: 'SYSTEM'
           }]);
        }
      };
      runMeeting();
    }
  }, [appPhase, marketHistory, agents]);

  useEffect(() => {
    if (currentData && !hasGeneratedForecast.current) {
      hasGeneratedForecast.current = true;
      getConsensusForecast(currentData).then(pred => {
        if (pred) setConsensusPrediction(pred);
      });
    }
    if (consensusPrediction && consensusPrediction.status === 'PENDING' && currentData) {
      if (Date.now() >= consensusPrediction.targetTime) {
        const success = currentData.btcPrice >= consensusPrediction.priceMin && currentData.btcPrice <= consensusPrediction.priceMax;
        setConsensusPrediction(prev => prev ? { ...prev, status: success ? 'SUCCESS' : 'FAILED', finalPrice: currentData.btcPrice } : null);
        setTimeout(() => {
           hasGeneratedForecast.current = false;
           setConsensusPrediction(null);
        }, 10000);
      }
    }
  }, [currentData, consensusPrediction]);

  useEffect(() => {
    if (!currentData) return;
    const currentPrice = currentData.btcPrice;
    let totalUnrealizedPnl = 0;
    
    const updatedPositions = positions.map(pos => {
        if (pos.status === 'CLOSED') return pos;

        const priceDiff = pos.side === 'LONG' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
        const rawPnl = priceDiff * (pos.size / pos.entryPrice); 
        const pnlPercent = (rawPnl / (pos.size / pos.leverage)) * 100;
        
        let newStopLoss = pos.stopLoss;
        let trailingActive = pos.trailingActive;
        if (!pos.trailingActive && pnlPercent > 0.3) {
          newStopLoss = pos.side === 'LONG' ? pos.entryPrice * 1.0005 : pos.entryPrice * 0.9995;
          trailingActive = true;
        } else if (pos.trailingActive) {
          if (pos.side === 'LONG') {
             const dynamicSL = currentPrice * 0.998; 
             if (dynamicSL > newStopLoss) newStopLoss = dynamicSL;
          } else {
             const dynamicSL = currentPrice * 1.002;
             if (dynamicSL < newStopLoss) newStopLoss = dynamicSL;
          }
        }

        const hitTP = (pos.side === 'LONG' && currentPrice >= pos.takeProfit) || (pos.side === 'SHORT' && currentPrice <= pos.takeProfit);
        const hitSL = (pos.side === 'LONG' && currentPrice <= pos.stopLoss) || (pos.side === 'SHORT' && currentPrice >= pos.stopLoss);

        if (hitTP || hitSL) {
           return { ...pos, pnl: rawPnl, pnlPercent, status: 'CLOSED', closeReason: hitTP ? 'TP' : 'SL' };
        }

        totalUnrealizedPnl += rawPnl;
        return { ...pos, pnl: rawPnl, pnlPercent, stopLoss: newStopLoss, trailingActive };
    });

    const justClosed = updatedPositions.filter(p => p.status === 'CLOSED' && positions.find(old => old.id === p.id && old.status === 'OPEN'));
    if (justClosed.length > 0) {
       setAgents(prevAgents => prevAgents.map(agent => {
          const agentTrades = justClosed.filter(p => p.agentId === agent.id);
          if (agentTrades.length === 0) return agent;
          
          const pnlChange = agentTrades.reduce((sum, p) => sum + p.pnl, 0);
          const marginsReturned = agentTrades.reduce((sum, p) => sum + (p.size / p.leverage), 0);
          const wins = agentTrades.filter(p => p.pnl > 0).length;
          
          return {
             ...agent,
             balance: agent.balance + pnlChange + marginsReturned,
             tradesCount: agent.tradesCount + agentTrades.length,
             winRate: Math.round(((agent.winRate * agent.tradesCount) + (wins * 100)) / (agent.tradesCount + agentTrades.length)),
             recentPerformance: [...agent.recentPerformance, ...agentTrades.map(p => p.pnl > 0 ? 'WIN' : 'LOSS' as const)].slice(-5),
             lastActionTime: Date.now()
          };
       }));
       
       justClosed.forEach(trade => {
          setChatMessages(prev => [...prev, {
              id: uuidv4(),
              agentId: trade.agentId,
              text: `Сделка закрыта (${trade.closeReason === 'TP' ? 'ПРИБЫЛЬ' : 'ЗАЩИТА'}). Профит: $${trade.pnl.toFixed(2)}.`,
              timestamp: Date.now(),
              type: 'COMMENT'
          }]);
       });
    }

    setPositions(updatedPositions);
    const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
    setTotalEquity(totalBalance + totalUnrealizedPnl);

  }, [currentData]);

  useEffect(() => {
    if (!currentData || marketHistory.length < 5) return;
    
    const readyAgents = agents.filter(a => a.decisionTimer <= 0 && !agentAnalyzing[a.id]);
    
    if (readyAgents.length === 0) return;

    readyAgents.forEach(activeAgent => {
        setAgents(prev => prev.map(a => a.id === activeAgent.id ? { ...a, decisionTimer: DECISION_INTERVAL } : a));

        const runAI = async () => {
            setAgentAnalyzing(prev => ({ ...prev, [activeAgent.id]: true }));
            try {
                const agentPosition = positions.find(p => p.agentId === activeAgent.id && p.status === 'OPEN');
                const signal = await analyzeMarket(marketHistory, activeAgent, agentPosition);
                setAgentSignals(prev => ({ ...prev, [activeAgent.id]: signal }));

                if (signal.action === TradeAction.CLOSE && agentPosition) {
                   executeClose(activeAgent.id, agentPosition, signal.reasoning);
                } else if ((signal.action === TradeAction.LONG || signal.action === TradeAction.SHORT)) {
                    if (signal.confidence > 60) {
                        executeTrade(activeAgent.id, signal);
                        setChatMessages(prev => [...prev, {
                            id: uuidv4(),
                            agentId: activeAgent.id,
                            text: signal.reasoning,
                            timestamp: Date.now(),
                            type: 'SIGNAL',
                            relatedSignal: signal
                        }]);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setAgentAnalyzing(prev => ({ ...prev, [activeAgent.id]: false }));
            }
        };
        runAI();
    });

  }, [agents, marketHistory, currentData, agentAnalyzing, positions]);

  const executeClose = (agentId: string, position: Position, reasoning: string) => {
    setPositions(prev => prev.map(p => {
       if (p.id === position.id) {
         return { ...p, status: 'CLOSED', closeReason: 'MANUAL' };
       }
       return p;
    }));
    
    setChatMessages(prev => [...prev, {
        id: uuidv4(),
        agentId: agentId,
        text: `ЗАКРЫВАЮ СДЕЛКУ ВРУЧНУЮ: ${reasoning}`,
        timestamp: Date.now(),
        type: 'COMMENT'
    }]);
  };

  const executeTrade = (agentId: string, signal: AISignal) => {
    if (!currentData) return;

    setAgents(prevAgents => {
      const agentIndex = prevAgents.findIndex(a => a.id === agentId);
      if (agentIndex === -1) return prevAgents;
      
      const agent = prevAgents[agentIndex];
      const existingPos = positions.find(p => p.agentId === agentId && p.status === 'OPEN');
      if (existingPos) return prevAgents;

      const riskFactor = signal.confidence / 100;
      const margin = Math.min(agent.balance * 0.1, 200); 
      
      if (margin < 10) return prevAgents;
      
      const newPos: Position = {
        id: uuidv4(),
        agentId,
        symbol: 'BTCUSDT',
        side: signal.action as 'LONG' | 'SHORT',
        entryPrice: currentData.btcPrice,
        size: margin * signal.leverage,
        leverage: signal.leverage,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        openTime: Date.now(),
        pnl: 0,
        pnlPercent: 0,
        status: 'OPEN',
        trailingActive: false
      };
      
      setPositions(prev => [...prev, newPos]);
      const newAgents = [...prevAgents];
      newAgents[agentIndex] = { ...agent, balance: agent.balance - margin, lastActionTime: Date.now() };
      return newAgents;
    });
  };

  if (!isConnected && !currentData) {
     return (
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center flex-col text-gray-400">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="font-mono text-sm">Подключение к Binance Live Stream...</p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 font-sans pb-10 transition-colors duration-500">
      <style>
        {`
          .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          * { transition-property: background-color, border-color, color, transform; transition-duration: 300ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
        `}
      </style>

      <Header onOpenPuter={() => setIsPuterOpen(true)} />
      
      <main className="container mx-auto p-4 flex flex-col gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-[#13161c] p-5 rounded-xl border border-gray-800 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.95V5h-2.93v2.63c-1.71.5-2.77 1.86-2.77 3.54 0 2.52 1.99 3.39 3.5 3.74 1.78.41 2.4.91 2.4 1.85 0 1.11-1 1.75-2.38 1.75-1.71 0-2.52-.91-2.55-1.92H8.38c.03 1.71 1.08 2.65 2.55 3.04V19h2.93v-2.75c1.9-.55 3.21-1.82 3.21-3.53 0-2.38-1.72-3.44-3.76-3.86z"/></svg>
                </div>
                <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Общий Портфель</h2>
                <div className="flex justify-between items-baseline">
                   <span className="text-3xl font-mono font-bold text-white tracking-tight">{formatCurrency(totalEquity)}</span>
                   <span className={`text-sm font-bold ${totalEquity >= 3000 ? 'text-green-400' : 'text-red-400'}`}>
                      {totalEquity >= 3000 ? '+' : ''}{((totalEquity - 3000) / 3000 * 100).toFixed(2)}%
                   </span>
                </div>
                <div className="mt-3 flex gap-4 text-xs font-mono text-gray-500">
                   <div>СТРАТЕГИЯ ЧЕРЕЗ: <span className="text-blue-400">{Math.floor(strategyTimer / 60)} мин</span></div>
                </div>
             </div>

             <div className="md:col-span-2">
                {currentData && <ArbitrageCard data={currentData} />}
             </div>
          </div>
          
          <div className="bg-[#13161c] p-4 rounded-xl border border-gray-800 flex flex-col justify-center items-center text-center hover:border-gray-700 transition-colors">
             <div className="text-4xl mb-2 animate-bounce">
                {currentData?.trend === 'UP' ? '🚀' : currentData?.trend === 'DOWN' ? '🐻' : '⚖️'}
             </div>
             <div className={`text-lg font-bold ${currentData?.trend === 'UP' ? 'text-green-400' : currentData?.trend === 'DOWN' ? 'text-red-400' : 'text-gray-400'}`}>
                {currentData?.trend === 'UP' ? 'БЫЧИЙ' : currentData?.trend === 'DOWN' ? 'МЕДВЕЖИЙ' : 'НЕЙТРАЛ'}
             </div>
             <div className="text-xs text-gray-500 mt-1 uppercase">Тренд рынка</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-3 space-y-4">
             <PriceChart data={marketHistory} />
             {currentData && (
                 <TradeHistory 
                    positions={positions} 
                    agents={agents} 
                    currentPrice={currentData.btcPrice} 
                 />
             )}
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
             <div className="flex-none">
                <AgentBattlePanel 
                   agents={agents} 
                   signals={agentSignals}
                   analyzing={agentAnalyzing}
                   onSelectAgent={setSelectedAgent}
                />
             </div>
             <div className="flex-1 min-h-[300px]">
                <ThoughtTerminal 
                    messages={chatMessages} 
                    agents={agents} 
                    phase={appPhase} 
                    timeLeft={phaseTimer} 
                />
             </div>
          </div>
        </div>

        <div className="mt-4">
           {currentData && <PredictionPanel prediction={consensusPrediction} currentPrice={currentData.btcPrice} />}
        </div>
      </main>

      {/* MODALS */}
      <AgentModal 
        agent={selectedAgent} 
        isOpen={!!selectedAgent} 
        onClose={() => setSelectedAgent(null)}
        publicMessages={chatMessages}
        privateMessages={selectedAgent ? (privateChats[selectedAgent.id] || []) : []}
        onSendMessage={handlePrivateMessage}
        currentPrice={currentData ? currentData.btcPrice : 0}
      />

      <PuterModal 
        isOpen={isPuterOpen}
        onClose={() => setIsPuterOpen(false)}
      />
    </div>
  );
};

export default App;
