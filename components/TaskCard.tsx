
import React from 'react';
import { Task, TaskStatus } from '../types';
import { Clock, MapPin, CheckCircle2, UserCheck, Edit3, Trash2, FileText } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  isNextUpcoming?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isCapturing?: boolean;
  isTVFeatured?: boolean;
  isTV?: boolean;
  fontSizeClass?: string;
  isAdmin?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, status, isNextUpcoming, onEdit, onDelete, isTVFeatured, fontSizeClass = 'text-xl lg:text-3xl', isAdmin }) => {
  const isSelected = status === TaskStatus.ACTIVE;
  const isCompleted = status === TaskStatus.COMPLETED;

  if (isTVFeatured) {
    return (
      <div className="relative h-full bg-[#F0FDF4] rounded-[1.5rem] lg:rounded-[4rem] p-4 lg:p-12 flex flex-col justify-between shadow-sm border border-emerald-100 group animate-in zoom-in duration-500 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 lg:w-80 h-48 lg:h-80 bg-white rounded-full blur-3xl opacity-80 pointer-events-none" />
        
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between mb-4 lg:mb-10 shrink-0 gap-2">
            <div className="flex items-center gap-2 lg:gap-6 min-w-0 flex-1">
              <div className="bg-white p-2 lg:p-5 rounded-xl lg:rounded-3xl border border-emerald-200 shadow-sm shrink-0">
                <Clock className="text-emerald-600 w-4 h-4 lg:w-10 lg:h-10" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[6px] lg:text-[12px] font-bold text-emerald-600 uppercase tracking-[0.2em] lg:tracking-[0.4em] mb-0.5">LIVE BROADCAST</p>
                <h2 className="text-sm lg:text-4xl font-black text-slate-900 tracking-tighter tabular-nums truncate">
                  {task.timeBlock}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-1 lg:gap-4 px-2 lg:px-8 py-1 lg:py-4 bg-white border-2 border-emerald-400 rounded-lg lg:rounded-2xl shadow-md shrink-0 whitespace-nowrap">
              <div className="w-1.5 h-1.5 lg:w-4 lg:h-4 bg-emerald-500 rounded-full animate-blink-intense" />
              <span className="text-emerald-700 font-black text-[7px] lg:text-xl uppercase tracking-widest">Active</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-lg lg:text-5xl font-black text-slate-900 leading-tight tracking-tight uppercase mb-4 lg:mb-12 line-clamp-2 overflow-hidden break-words">
              {task.title}
            </h3>

            <div className="space-y-2 lg:space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-8">
                <div className="flex items-start gap-2.5 lg:gap-6 bg-white/60 p-3 lg:p-8 rounded-xl lg:rounded-[2.5rem] border border-emerald-100 shadow-sm">
                  <MapPin className="text-emerald-500 mt-1 shrink-0 w-4 h-4 lg:w-8 lg:h-8" strokeWidth={2.5} />
                  <div className="min-w-0">
                    <p className="text-[6px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">LOCATION</p>
                    <p className="text-xs lg:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">{task.venue}</p>
                  </div>
                </div>
              </div>

              {task.remarks && (
                <div className="flex items-start gap-2.5 lg:gap-6 bg-emerald-50/50 p-3 lg:p-8 rounded-xl lg:rounded-[2.5rem] border border-emerald-200/50">
                  <FileText className="text-emerald-400 mt-1 shrink-0 w-4 h-4 lg:w-8 lg:h-8" strokeWidth={2.5} />
                  <div className="min-w-0">
                    <p className="text-[6px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">REMARKS</p>
                    <p className="text-[10px] lg:text-2xl font-medium text-slate-600 italic leading-snug">{task.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="absolute bottom-4 right-4 flex gap-2 no-capture">
             <button onClick={() => onEdit(task)} className="p-1.5 lg:p-4 bg-white text-slate-400 hover:text-emerald-600 rounded-lg lg:rounded-2xl shadow-md border border-slate-100 active:scale-90 transition-all">
               <Edit3 size={16} />
             </button>
             <button onClick={() => onDelete(task.id)} className="p-1.5 lg:p-4 bg-rose-50 text-rose-500 rounded-lg lg:rounded-2xl shadow-md border border-rose-100 active:scale-90 transition-all">
               <Trash2 size={16} />
             </button>
          </div>
        )}
      </div>
    );
  }

  const cardClasses = `
    relative p-2.5 lg:p-4 rounded-xl lg:rounded-[1.5rem] transition-all duration-300 border group flex items-center gap-3 lg:gap-6 h-full overflow-hidden
    ${isSelected 
      ? 'bg-white border-indigo-500 shadow-lg ring-2 ring-indigo-50' 
      : isCompleted 
          ? 'bg-slate-50 border-slate-100 opacity-60' 
          : 'bg-white border-slate-100 text-slate-900 hover:border-indigo-200'
    }
  `;

  return (
    <div className={cardClasses}>
      <div className="shrink-0 flex items-center justify-center border-r border-slate-100 pr-3 lg:pr-8 min-w-[70px] lg:min-w-[140px] h-full">
        <span className={`text-[9px] lg:text-2xl font-black italic tracking-tighter tabular-nums ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
          {task.timeBlock.split(' ')[0]}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
        <div className="flex items-start gap-2 mb-0.5">
          <h3 className={`font-black uppercase tracking-tight leading-tight ${fontSizeClass} ${isSelected ? 'text-slate-900' : 'text-slate-700'} truncate flex-1`}>
            {task.title}
          </h3>
          {isSelected && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 rounded-md border border-emerald-200">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-blink-intense" />
              <span className="text-[5px] lg:text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-2 lg:gap-x-6 text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="text-indigo-300 w-2 h-2 lg:w-4 lg:h-4" />
            <span className="text-[7px] lg:text-sm font-bold uppercase tracking-wide truncate">{task.venue}</span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-0 bottom-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-l from-white via-white to-transparent pl-4 no-capture">
           <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
           <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 bg-rose-50 rounded-lg border border-rose-100 shadow-xs text-rose-400 hover:text-rose-500"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
