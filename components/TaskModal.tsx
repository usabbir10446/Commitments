
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertCircle, Plus, MapPin } from 'lucide-react';
import { Task } from '../types';
import { getTomorrowString } from '../utils/time';

interface TaskModalProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const PREDEFINED_VENUES = [
  "Comdt's Office",
  "Conf Room-1",
  "MPTH",
  "Hybrid Class Room",
  "Call on Room",
  "BIPSOT Offrs Mess",
  "BIPSOT Trg Grd",
  "Helipad",
  "Academic Bldg Mini Auditorium"
];

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [selectedVenue, setSelectedVenue] = useState('');
  const [manualVenue, setManualVenue] = useState('');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    venue: '',
    remarks: '',
    date: getTomorrowString(),
    attended: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        venue: task.venue,
        remarks: task.remarks || '',
        date: task.date,
        attended: task.attended || ''
      });

      // Handle venue selection logic
      if (PREDEFINED_VENUES.includes(task.venue)) {
        setSelectedVenue(task.venue);
        setManualVenue('');
      } else {
        setSelectedVenue('Other');
        setManualVenue(task.venue);
      }

      if (task.timeBlock) {
        const clean = task.timeBlock.replace(/hrs/gi, '').trim();
        const parts = clean.split('-');
        if (parts.length === 2) {
          setStartTime(parts[0].trim());
          setEndTime(parts[1].trim());
        }
      }
    } else {
      setFormData({
        title: '',
        venue: '',
        remarks: '',
        date: getTomorrowString(),
        attended: ''
      });
      setStartTime('');
      setEndTime('');
      setSelectedVenue('');
      setManualVenue('');
    }
  }, [task]);

  const handleVenueChange = (val: string) => {
    setSelectedVenue(val);
    if (val !== 'Other') {
      setFormData(prev => ({ ...prev, venue: val }));
    } else {
      setFormData(prev => ({ ...prev, venue: manualVenue }));
    }
  };

  const handleManualVenueChange = (val: string) => {
    setManualVenue(val);
    setFormData(prev => ({ ...prev, venue: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!formData.title) { setErrorMsg("Please enter a task title"); return; }
    if (!startTime || startTime.length < 4) { setErrorMsg("Start time must be HHmm (e.g. 0900)"); return; }
    if (!endTime || endTime.length < 4) { setErrorMsg("End time must be HHmm (e.g. 1000)"); return; }
    if (!formData.venue) { setErrorMsg("Please specify a venue"); return; }

    const combinedTimeBlock = `${startTime}-${endTime} hrs`;
    onSave({ ...formData, timeBlock: combinedTimeBlock });
  };

  const handleDelete = () => { if (task?.id) onDelete(task.id); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
               {task ? <Save size={24} /> : <Plus size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{task ? 'Edit Schedule' : 'New Entry'}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Record Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Event Title / Purpose</label>
            <input type="text" required className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-bold text-lg placeholder:text-slate-200" placeholder="e.g. Executive Strategy Meeting" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} autoFocus />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Start (HHmm)</label>
              <input type="text" required maxLength={4} className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-black text-xl placeholder:text-slate-200" placeholder="0900" value={startTime} onChange={e => setStartTime(e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">End (HHmm)</label>
              <div className="relative">
                <input type="text" required maxLength={4} className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-black text-xl placeholder:text-slate-200" placeholder="1000" value={endTime} onChange={e => setEndTime(e.target.value.replace(/[^0-9]/g, ''))} />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 font-black text-[10px] uppercase">HRS</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Date</label>
              <input type="date" required className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-bold text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Venue / Platform</label>
              <select 
                required 
                className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-bold text-sm appearance-none"
                value={selectedVenue}
                onChange={e => handleVenueChange(e.target.value)}
              >
                <option value="" disabled>Select Venue</option>
                {PREDEFINED_VENUES.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {selectedVenue === 'Other' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Manual Venue Entry</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  required 
                  className="w-full bg-slate-50 border-4 border-transparent rounded-2xl pl-14 pr-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-bold text-sm placeholder:text-slate-200" 
                  placeholder="Enter custom venue..." 
                  value={manualVenue} 
                  onChange={e => handleManualVenueChange(e.target.value)} 
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Attendees / Required Presence</label>
            <input type="text" className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none font-bold text-sm placeholder:text-slate-200" placeholder="e.g. All Staff, Board Members" value={formData.attended} onChange={e => setFormData({ ...formData, attended: e.target.value })} />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Additional Particulars</label>
            <textarea className="w-full bg-slate-50 border-4 border-transparent rounded-2xl px-6 py-4 focus:border-indigo-100 focus:bg-white transition-all outline-none resize-none font-medium text-sm placeholder:text-slate-200" placeholder="Brief context or instructions..." rows={3} value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
          </div>

          <div className="pt-6 flex gap-4 shrink-0">
            {task && (
              <button type="button" onClick={handleDelete} className="px-6 bg-rose-50 text-rose-500 rounded-3xl hover:bg-rose-100 transition-all border border-rose-100 active:scale-95 flex items-center justify-center">
                <Trash2 size={24} />
              </button>
            )}
            <button type="submit" className="flex-1 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]">
              <Save size={20} />
              <span>{task ? 'Commit Changes' : 'Publish to Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
