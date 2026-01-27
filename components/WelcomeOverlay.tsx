
import React from 'react';
import { WelcomeTask } from '../types';
import { X, Radio } from 'lucide-react';

interface WelcomeOverlayProps {
  task: WelcomeTask | null;
  onStop: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ task, onStop }) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 overflow-hidden">
      {/* Absolute Stop Button (Only visible to controllers usually, but here for demo) */}
      <div className="absolute top-8 right-8 z-[130]">
         <button 
           onClick={onStop}
           className="bg-slate-100/80 backdrop-blur-md text-slate-500 p-4 rounded-full shadow-lg active:scale-90 transition-all border border-slate-200"
         >
           <X size={28} />
         </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Main Image Container with Text Overlay */}
        <div className="relative w-full aspect-[4/5] max-w-md rounded-[3.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] mb-12 group">
          <img 
            src={task.imageData} 
            alt="Welcome" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Top Text Overlay */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 to-transparent pt-12 pb-20 px-6">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">
              {task.topText || 'WELCOME'}
            </h1>
          </div>
        </div>

        {/* Bottom Text Content */}
        <div className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <p className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
              {task.bottomText1}
            </p>
            <div className="h-1.5 w-24 bg-indigo-600 mx-auto rounded-full" />
          </div>
          
          <p className="text-2xl font-bold text-slate-600 leading-relaxed">
            {task.bottomText2}
          </p>
          
          <div className="pt-4">
            <p className="text-lg font-black text-indigo-600 tracking-[0.2em] uppercase bg-indigo-50 px-6 py-2 rounded-2xl inline-block border border-indigo-100">
              {task.bottomText3}
            </p>
          </div>
        </div>
      </div>
      
      {/* Global Status Bar */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl animate-pulse">
          <Radio size={18} className="text-rose-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">Live Broadcast Mode</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
