
import React, { useState } from 'react';
import { WelcomeTask } from '../types.ts';
import { Image as ImageIcon, Plus, Play, Square, Trash2, X } from 'lucide-react';

interface WelcomeTabProps {
  tasks: WelcomeTask[];
  onAdd: (task: Partial<WelcomeTask>) => void;
  onStart: (id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ tasks, onAdd, onStart, onStop, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    topText: 'WELCOME',
    bottomText1: '',
    bottomText2: '',
    bottomText3: '',
    imageData: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageData: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageData || !formData.bottomText1) return;
    onAdd(formData);
    setShowAdd(false);
    setFormData({ topText: 'WELCOME', bottomText1: '', bottomText2: '', bottomText3: '', imageData: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-xl font-black text-slate-800">Broadcasts</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Screen Sync</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`${showAdd ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white shadow-indigo-200'} px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95`}
        >
          {showAdd ? <X size={16} /> : <><Plus size={16} /> New Template</>}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] shadow-xl border border-indigo-50 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Image</label>
            <label className="w-full aspect-[4/3] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-indigo-300 transition-colors">
              {formData.imageData ? (
                <img src={formData.imageData} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-4 rounded-full shadow-sm text-indigo-500">
                    <ImageIcon size={28} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Visual</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Top Text (Overlay)</label>
              <input 
                type="text" 
                placeholder="e.g. WELCOME" 
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 font-black uppercase tracking-widest text-sm" 
                value={formData.topText}
                onChange={e => setFormData(prev => ({ ...prev, topText: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bottom Text 1 (Headline)</label>
              <input 
                type="text" 
                required
                placeholder="Main Greeting" 
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 font-bold" 
                value={formData.bottomText1}
                onChange={e => setFormData(prev => ({ ...prev, bottomText1: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bottom Text 2 (Details)</label>
              <input 
                type="text" 
                placeholder="Subtext / Description" 
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-500" 
                value={formData.bottomText2}
                onChange={e => setFormData(prev => ({ ...prev, bottomText2: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bottom Text 3 (Footer)</label>
              <input 
                type="text" 
                placeholder="Slogan or Organization Name" 
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-500" 
                value={formData.bottomText3}
                onChange={e => setFormData(prev => ({ ...prev, bottomText3: e.target.value }))}
              />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">Save Template</button>
        </form>
      )}

      <div className="grid gap-6">
        {tasks.map(t => (
          <div key={t.id} className={`bg-white p-5 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 ${t.isActive ? 'border-emerald-400 bg-emerald-50 ring-8 ring-emerald-50/50 shadow-2xl' : 'border-white shadow-sm hover:border-slate-100'}`}>
            <div className="relative shrink-0">
               {/* Glowing Background Effect */}
               <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-[2rem] blur-lg opacity-30 animate-pulse" />
               
               {/* Main Image Container with Outline */}
               <div className="relative w-24 h-24 rounded-[1.75rem] overflow-hidden border-4 border-white shadow-xl bg-slate-100 ring-2 ring-indigo-500/20">
                 <img src={t.imageData} className="w-full h-full object-cover" />
               </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-wider">{t.topText}</span>
                {t.isActive && <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Live</span>}
              </div>
              <p className="text-base font-black text-slate-900 truncate leading-none mb-1">{t.bottomText1}</p>
              <p className="text-[11px] font-medium text-slate-400 truncate mb-4">{t.bottomText2 || 'No subtext'}</p>
              
              <div className="flex gap-2">
                {t.isActive ? (
                  <button onClick={() => onStop()} className="flex-1 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-100 transition-all active:scale-95"><Square size={12} fill="white" /> Stop</button>
                ) : (
                  <button onClick={() => onStart(t.id)} className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"><Play size={12} fill="white" /> Start</button>
                )}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(t.id);
                  }} 
                  className="bg-white text-rose-500 p-3 rounded-xl hover:bg-rose-50 transition-all border border-slate-200 shadow-sm active:scale-90 z-20 cursor-pointer"
                  title="Delete Template"
                >
                  <Trash2 size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && !showAdd && (
          <div className="py-24 text-center">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <Play size={24} />
            </div>
            <p className="text-slate-400 italic text-sm">Create templates to broadcast welcome messages to all users.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeTab;
