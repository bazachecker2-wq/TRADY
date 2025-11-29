
import React, { useState } from 'react';
import { launchPuterTask } from '../services/geminiService';

interface PuterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PuterModal: React.FC<PuterModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<{sender: string, text: string}[]>([
    { sender: 'System', text: 'Puter.js Cloud Environment v2.0 Initialized.' },
    { sender: 'System', text: 'Waiting for command...' }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!input.trim()) return;
    
    setLog(prev => [...prev, { sender: 'User', text: input }]);
    setLoading(true);
    setInput('');

    try {
      // Direct integration with the hidden service function
      const result = await launchPuterTask(input);
      setLog(prev => [...prev, { sender: 'Puter Cloud', text: result }]);
    } catch (e) {
      setLog(prev => [...prev, { sender: 'System', text: 'Error executing task.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-[#0d1117] w-full max-w-3xl rounded-lg border border-gray-700 shadow-2xl relative z-10 flex flex-col h-[600px] overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="bg-[#161b22] px-4 py-2 border-b border-gray-700 flex justify-between items-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500" onClick={onClose}></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="text-xs text-gray-400 font-bold">root@puter-cloud:~</div>
          <div></div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2 text-sm">
          {log.map((entry, i) => (
            <div key={i} className={`${entry.sender === 'User' ? 'text-blue-300' : entry.sender === 'System' ? 'text-gray-500' : 'text-green-400'}`}>
              <span className="opacity-50 select-none mr-2">
                {entry.sender === 'User' ? '>' : entry.sender === 'System' ? '#' : '$'}
              </span>
              {entry.text}
            </div>
          ))}
          {loading && (
            <div className="text-gray-500 animate-pulse">Processing...</div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-[#161b22] border-t border-gray-700 flex gap-2">
           <span className="text-green-500 font-bold">{'>'}</span>
           <input 
             className="flex-1 bg-transparent border-none outline-none text-white font-mono"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyPress={(e) => e.key === 'Enter' && handleRun()}
             placeholder="Введите команду для Puter Cloud AI..."
             autoFocus
           />
           <button 
             onClick={handleRun}
             disabled={loading}
             className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
           >
             RUN
           </button>
        </div>
      </div>
    </div>
  );
};

export default PuterModal;
