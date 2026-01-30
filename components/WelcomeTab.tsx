
import React, { useState } from 'react';
import { WelcomeTask } from '../types';
import { Image as ImageIcon, Plus, Play, Square, Trash2, X, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/image';

interface WelcomeTabProps {
  tasks: WelcomeTask[];
  onAdd: (task: Partial<WelcomeTask>) => Promise<boolean>;
  onStart: (id: string) => void;
  onStop: () => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ tasks, onAdd, onStart, onStop, onDelete, isAdmin }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ 
    topText: 'WELCOME', 
    bottomText1: '', 
    bottomText2: '', 
    bottomText3: '', 
    imageData: '' 
  });
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 1000, 0.6);
          setFormData(prev => ({ ...prev, imageData: compressed }));
        } catch (err) {
          console.error("Compression failed:", err);
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.imageData || !formData.bottomText1) return;
    
    setIsSaving(true);
    try {
      const success = await onAdd(formData);
      if (success) {
        setShowAdd(false);
        setFormData({ 
          topText: 'WELCOME', 
          bottomText1: '', 
          bottomText2: '', 
          bottomText3: '', 
          imageData: '' 
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 max-w-4xl mx-auto">
      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reception Broadcasts</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">View Display Gallery</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            disabled={isSaving}
            className={`${showAdd ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-indigo-200'} px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50`}
          >
            {showAdd ? <X size={18} /> : <><Plus size={18} strokeWidth={3} /> <span>Create Template</span></>}
          </button>
        )}
      </div>
      
      {showAdd && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] shadow-2xl border border-indigo-50 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <label className="w-full aspect-[4/5] bg-slate-50 border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-indigo-300 transition-all">
              {formData.imageData ? (
                <>
                  <img src={formData.imageData} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="text-white" size={32} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-3 text-slate-400">
                  {isCompressing ? <Loader2 size={40} className="animate-spin text-indigo-500" /> : <ImageIcon size={40} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Portrait Image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isCompressing || isSaving} />
            </label>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Header Text</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl px-5 py-4 outline-none font-black uppercase tracking-widest text-sm" value={formData.topText} onChange={e => setFormData(prev => ({ ...prev, topText: e.target.value }))} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Main Name / Greeting</label>
                <input type="text" required placeholder="e.g. Honorable Guest" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl px-5 py-4 outline-none font-bold text-lg" value={formData.bottomText1} onChange={e => setFormData(prev => ({ ...prev, bottomText1: e.target.value }))} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Sub-Text</label>
                <input type="text" placeholder="e.g. welcome message" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl px-5 py-4 outline-none font-medium" value={formData.bottomText2} onChange={e => setFormData(prev => ({ ...prev, bottomText2: e.target.value }))} />
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={isCompressing || isSaving} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-[0.98] transition-all">
            {isSaving ? "Syncing..." : "Commit Records"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2">
        {tasks.map(t => (
          <div key={t.id} className={`group bg-white p-5 rounded-[2.5rem] border-2 transition-all flex items-center space-x-5 ${t.isActive ? 'border-emerald-400 bg-emerald-50/30' : 'border-white shadow-md'}`}>
            <div className="relative w-28 h-28 rounded-[2rem] overflow-hidden bg-slate-100 shrink-0 shadow-lg border-2 border-white">
              <img src={t.imageData} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">{t.topText}</p>
              <p className="text-lg font-black text-slate-900 truncate mb-1 leading-tight">{t.bottomText1}</p>
              <p className="text-[10px] font-bold text-slate-400 truncate mb-4">{t.bottomText2}</p>
              
              {isAdmin && (
                <div className="flex space-x-2">
                  {t.isActive ? (
                    <button onClick={() => onStop()} className="flex-1 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center space-x-2">
                      <Square size={12} fill="white" /> <span>Stop</span>
                    </button>
                  ) : (
                    <button onClick={() => onStart(t.id)} className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center space-x-2">
                      <Play size={12} fill="white" /> <span>Go Live</span>
                    </button>
                  )}
                  <button onClick={() => onDelete(t.id)} className="bg-white text-rose-500 p-2.5 rounded-xl border border-slate-100 shadow-sm transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeTab;
