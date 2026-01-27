
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { Task } from '../types.ts';
import { getTomorrowString } from '../utils/time.ts';

interface TaskModalProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    venue: '',
    remarks: '',
    date: getTomorrowString(), // Defaulting to tomorrow for planning
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
      
      // Parse "0900-1000 hrs" into "0900" and "1000"
      if (task.timeBlock) {
        const clean = task.timeBlock.replace(/hrs/gi, '').trim();
        const parts = clean.split('-');
        if (parts.length === 2) {
          setStartTime(parts[0].trim());
          setEndTime(parts[1].trim());
        }
      }
    } else {
      // Reset to tomorrow when opening fresh for a new task
      setFormData(prev => ({ ...prev, date: getTomorrowString() }));
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !startTime || !endTime || !formData.venue) return;
    
    // Combine into required format: "0900-1000 hrs"
    const combinedTimeBlock = `${startTime}-${endTime} hrs`;
    
    onSave({
      ...formData,
      timeBlock: combinedTimeBlock
    });
  };

  const handleDelete = () => {
    if (task?.id) {
      onDelete(task.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">
            {task ? 'Edit Schedule' : 'Plan Next Day'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Task Title</label>
            <input
              type="text"
              required
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
              placeholder="e.g. Project Presentation"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">From (HHmm)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={4}
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold"
                  placeholder="0900"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">To (HHmm)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={4}
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold"
                  placeholder="1000"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] uppercase tracking-tighter">hr</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Schedule Date</label>
            <input
              type="date"
              required
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
            <p className="mt-1.5 ml-1 text-[10px] text-slate-400 font-bold italic">Automatically set to tomorrow for preparation.</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Venue / Location</label>
            <input
              type="text"
              required
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
              placeholder="e.g. Office Hall A"
              value={formData.venue}
              onChange={e => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Atnd (Attendance Info)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
              placeholder="e.g. Present, Virtual"
              value={formData.attended}
              onChange={e => setFormData({ ...formData, attended: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Info / Remarks</label>
            <textarea
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none font-medium"
              placeholder="Any additional details or requirements..."
              rows={3}
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-5 rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              <Save size={20} />
              {task ? 'Update Entry' : 'Add to Schedule'}
            </button>

            {task && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full bg-rose-50 text-rose-600 font-black uppercase tracking-widest py-5 rounded-3xl hover:bg-rose-100 transition-all border-2 border-rose-100 flex items-center justify-center gap-2 active:scale-[0.97]"
              >
                <Trash2 size={20} />
                Delete Task
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
