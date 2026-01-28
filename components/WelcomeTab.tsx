import React, { useState } from 'react';
import { WelcomeTask } from '../types';
import { Image as ImageIcon, Plus, Play, Square, Trash2, X } from 'lucide-react';
import { compressImage } from '../utils/image';

interface WelcomeTabProps {
  tasks: WelcomeTask[];
  onAdd: (task: Partial<WelcomeTask>) => void;
  onStart: (id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ tasks, onAdd, onStart, onStop, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [formData, setFormData] = useState({ topText: 'WELCOME', bottomText1: '', bottomText2: '', bottomText3: '', imageData: '' });
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setFormData(prev => ({ ...prev, imageData: compressed }));
        } catch (err) {
          console.error("Compression failed:", err);
          alert("Failed to process image. Try a smaller file.");
        } finally {
          setIsCompressing(false);
        }
      };
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
        <div><h2 className="text-xl font-black text-slate-800">Broadcasts</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Screen Sync</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className={`${showAdd ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white'} px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center space-x-2 transition-all active:scale-95`}>{showAdd ? <X size={16} /> : <><Plus size={16} /> <span>New Template</span></>}</button>
      </div>
      
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] shadow-xl border border-indigo-50 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <label className="w-full aspect-[4/3] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-indigo-300 transition-colors">
            {formData.imageData ? (
              <img src={formData.imageData} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <ImageIcon size={28} className={isCompressing ? 'animate-pulse text-indigo-400' : ''} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {isCompressing ? 'Processing...' : 'Select Visual'}
                </span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isCompressing} />
          </label>
          <input type="text" placeholder="e.g. WELCOME" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none font-black uppercase tracking-widest text-sm" value={formData.topText} onChange={e => setFormData(prev => ({ ...prev, topText: e.target.value }))} />
          <input type="text" required placeholder="Main Greeting" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none font-bold" value={formData.bottomText1} onChange={e => setFormData(prev => ({ ...prev, bottomText1: e.target.value }))} />
          <button type="submit" disabled={isCompressing} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50">
            {isCompressing ? 'Wait...' : 'Save Template'}
          </button>
        </form>
      )}

      <div className="space-y-6">
        {tasks.map(t => (
          <div key={t.id} className={`bg-white p-5 rounded-[2.5rem] border-2 transition-all flex items-center space-x-5 ${t.isActive ? 'border-emerald-400 bg-emerald-50 shadow-2xl' : 'border-white shadow-sm'}`}>
            <div className="relative w-24 h-24 rounded-[1.75rem] overflow-hidden border-4 border-white shadow-xl bg-slate-100 shrink-0"><img src={t.imageData} className="w-full h-full object-cover" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-slate-900 truncate mb-1">{t.bottomText1}</p>
              <div className="flex space-x-2">
                {t.isActive ? (
                  <button onClick={() => onStop()} className="flex-1 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-2">
                    <Square size={12} fill="white" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button onClick={() => onStart(t.id)} className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-2">
                    <Play size={12} fill="white" />
                    <span>Start</span>
                  </button>
                )}
                <button onClick={() => onDelete(t.id)} className="bg-white text-rose-500 p-3 rounded-xl hover:bg-rose-50 border border-slate-200 shadow-sm shrink-0">
                  <Trash2 size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeTab;
