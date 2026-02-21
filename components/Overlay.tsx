import React from 'react';
import { AIResponse } from '../types';
import { VARIANT_COLORS, VARIANT_NAMES, WASTE_EMOJIS } from '../constants';

interface OverlayProps {
  aiState: AIResponse;
  level: number;
  maxLevels: number;
  zoneProgress: number[];
  levelComplete: boolean;
  gameComplete: boolean;
  gameOver: boolean;
  onCloseAI: () => void;
  onNextLevel: () => void;
  onReset: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
    aiState, level, maxLevels, zoneProgress, 
    levelComplete, gameComplete, gameOver, 
    onCloseAI, onNextLevel, onReset 
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* HUD */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-lg">
          <h1 className="text-xl font-bold text-slate-800">Eco-Sort Platformer</h1>
          <p className="text-sm font-semibold text-indigo-600 mb-1">Level {level} / {maxLevels}</p>
          <p className="text-xs text-slate-500 mb-2">Controls:</p>
          <ul className="text-xs text-slate-500 mt-1 space-y-1">
            <li><span className="font-bold text-slate-700">A / D</span> : Move</li>
            <li><span className="font-bold text-slate-700">Shift / S</span> : Run</li>
            <li><span className="font-bold text-slate-700">Space</span> : Jump</li>
            <li><span className="font-bold text-slate-700">F</span> : Talk / Read</li>
            <li><span className="font-bold text-slate-700">Tap E</span> : Place Item</li>
            <li><span className="font-bold text-slate-700">Hold E</span> : Throw Item</li>
            <li><span className="font-bold text-slate-700">R</span> : Restart Level</li>
            <li><span className="font-bold text-slate-700">I</span> : Inspect Waste (Gemini)</li>
          </ul>
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className={`bg-white/90 backdrop-blur border px-6 py-3 rounded-xl shadow-lg transition-colors ${levelComplete ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}>
                <span className="text-slate-600 text-sm font-semibold uppercase tracking-wider block text-right mb-2">
                    {levelComplete ? 'Zone Cleared!' : 'Waste Collection'}
                </span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {VARIANT_NAMES.map((name, index) => (
                        <div key={name} className="flex items-center gap-2 justify-end">
                             <div className="flex items-center gap-1">
                                <span className="text-lg">{WASTE_EMOJIS[index][0]}</span>
                                <span className="text-xs font-bold uppercase text-slate-400 hidden sm:inline">{name}</span>
                             </div>
                             <div 
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: VARIANT_COLORS[index] }}
                             />
                             <span className={`text-xl font-black ${zoneProgress[index] > 0 ? 'text-slate-300' : 'text-slate-700'}`}>
                                {zoneProgress[index]} left
                             </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 backdrop-blur-sm pointer-events-auto z-50">
             <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transform animate-in zoom-in duration-300 border-b-8 border-red-500">
                <div className="text-5xl mb-4">⚠️</div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">GAME OVER</h2>
                <p className="text-slate-600 text-base mb-6">You fell into the abyss.</p>
                <button 
                    onClick={onReset}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
                >
                    Try Again ↺
                </button>
             </div>
        </div>
      )}

      {/* Level Complete Screen */}
      {levelComplete && !gameComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto z-50">
             <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transform animate-in zoom-in duration-300 border-b-8 border-green-500">
                <div className="text-5xl mb-4">♻️</div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">LEVEL {level} CLEARED!</h2>
                <p className="text-slate-600 text-base mb-6">Area cleaned successfully.</p>
                <button 
                    onClick={onNextLevel}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
                >
                    Next Area ➜
                </button>
             </div>
        </div>
      )}

      {/* Game Complete Screen */}
      {gameComplete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto z-50">
             <div className="bg-white p-10 rounded-3xl shadow-2xl text-center transform animate-in zoom-in duration-300 border-b-8 border-indigo-500">
                <div className="text-6xl mb-4">🌏</div>
                <h2 className="text-4xl font-black text-slate-800 mb-2">PLANET SAVED!</h2>
                <p className="text-slate-600 text-lg">You are a Master of Recycling.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    Play Again
                </button>
             </div>
        </div>
      )}

      {/* AI Modal */}
      {aiState.visible && (
        <div className="pointer-events-auto self-center bg-black/80 text-white p-6 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-in fade-in zoom-in duration-300 border border-slate-700/50 backdrop-blur-md z-40">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {aiState.title || 'Waste Analysis'}
            </h2>
            <button onClick={onCloseAI} className="text-slate-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="min-h-[80px] text-lg leading-relaxed font-serif text-slate-200">
            {aiState.loading ? (
              <div className="flex items-center gap-3 text-slate-400 animate-pulse">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                {aiState.title === 'Village Headman' ? 'Thinking...' : 'Analyzing Composition...'}
              </div>
            ) : (
              aiState.text
            )}
          </div>
          <div className="mt-4 text-xs text-slate-500 text-right">Powered by Gemini 2.5</div>
        </div>
      )}
    </div>
  );
};