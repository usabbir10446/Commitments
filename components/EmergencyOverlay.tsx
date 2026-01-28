import React from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { EmergencyMessage } from '../types';

interface EmergencyOverlayProps {
  message: EmergencyMessage | null;
  onClose: () => void;
}

const EmergencyOverlay: React.FC<EmergencyOverlayProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-rose-950/80 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-rose-900/20 animate-pulse pointer-events-none" />
      <div className="relative w-full max-w-lg overflow-hidden bg-rose-700 rounded-[3rem] shadow-[0_0_100px_rgba(225,29,72,0.6)] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-white/20">
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
        <div className="relative px-8 pt-10 pb-6 bg-rose-600">
          <div className="flex items-center space-x-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-white rounded-2xl blur-lg opacity-40 animate-pulse" />
              <div className="relative bg-white text-rose-600 p-4 rounded-2xl shadow-2xl flex items-center justify-center">
                <AlertTriangle className="animate-bounce" size={32} strokeWidth={3} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <ShieldAlert size={16} className="text-rose-200 shrink-0" />
                <span className="text-rose-100 text-[10px] font-black tracking-[0.4em] uppercase opacity-90">Priority System Broadcast</span>
              </div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mt-1 drop-shadow-lg">
                URGENT ALERT
              </h2>
            </div>
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90 text-white border border-white/10 shrink-0">
              <X size={28} strokeWidth={3} />
            </button>
          </div>
        </div>
        <div className="px-8 pb-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-400 to-orange-400 rounded-[2rem] blur opacity-25" />
            <div className="relative bg-rose-900/40 rounded-[2rem] p-8 border border-white/10 shadow-inner overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-3xl" />
              <p className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-center break-words italic">
                "{message.text}"
              </p>
            </div>
          </div>
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-[10px] font-black text-rose-200 tracking-widest uppercase">Safety Protocol Active</span>
              <span className="text-[10px] font-black text-white bg-rose-900/50 px-2 py-0.5 rounded-md">SECURE CHANNEL</span>
            </div>
            <div className="h-3 w-full bg-rose-950/50 rounded-full p-0.5 border border-white/5">
              <div className="h-full bg-gradient-to-r from-rose-400 via-white to-rose-400 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)] animate-[shrink_10s_linear_forwards]" />
            </div>
            <div className="mt-4 flex justify-center">
               <p className="text-[9px] font-black text-rose-300 uppercase tracking-[0.5em] animate-pulse">Dismissing Automatically</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </div>
  );
};

export default EmergencyOverlay;