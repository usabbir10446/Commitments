import React from 'react';
import { Task, TaskStatus } from '../types';
import { Clock, MapPin, CheckCircle2, UserCheck, Edit3, Trash2 } from 'lucide-react';

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
}

const TaskCard: React.FC<TaskCardProps> = ({ task, status, isNextUpcoming, onEdit, onDelete, isTVFeatured, fontSizeClass = 'text-xl lg:text-3xl' }) => {
  const isSelected = status === TaskStatus.ACTIVE;
  const isCompleted = status === TaskStatus.COMPLETED;

  // TV FEATURED STYLE (Priority Monitor)
  if (isTVFeatured) {
    return (
      <div className="relative h-full bg-[#F0FDF4] rounded-[1.5rem] lg:rounded-[3rem] p-5 lg:p-10 flex flex-col justify-between shadow-sm border border-emerald-100 group animate-in zoom-in duration-500 overflow-hidden">
        {/* Subtle accent glows */}
        <div className="absolute -top-24 -right-24 w-48 lg:w-80 h-48 lg:h-80 bg-white rounded-full blur-3xl opacity-80 pointer-events-none" />
        
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 lg:mb-8 shrink-0">
            <div className="flex items-center gap-3 lg:gap-5">
              <div className="bg-white p-2 lg:p-4 rounded-xl lg:rounded-2xl border border-emerald-200 shadow-sm">
                <Clock className="text-emerald-600 w-5 h-5 lg:w-8 lg:h-8" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[7px] lg:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] lg:tracking-[0.3em] mb-1">LIVE BROADCAST</p>
                <h2 className="text-lg lg:text-4xl font-black text-slate-900 tracking-tight tabular-nums">{task.timeBlock}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 lg:gap-3 px-2.5 lg:px-5 py-1 lg:py-2.5 bg-white border-2 border-emerald-400 rounded-lg lg:rounded-xl shadow-md shrink-0">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-500 rounded-full animate-blink-intense" />
              <span className="text-emerald-700 font-black text-[8px] lg:text-sm uppercase tracking-widest">Active</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xl lg:text-5xl font-black text-slate-900 leading-tight lg:leading-[1.1] tracking-tight uppercase mb-4 lg:mb-8 break-words text-wrap h-auto min-h-max">
              {task.title}
            </h3>

            <div className="space-y-3 lg:space-y-6 pb-6">
              <div className="flex items-start gap-3 lg:gap-6 bg-white p-3.5 lg:p-6 rounded-xl lg:rounded-[2rem] border border-emerald-100 shadow-sm">
                <MapPin className="text-emerald-500 mt-1 shrink-0 w-5 h-5 lg:w-7 lg:h-7" strokeWidth={2.5} />
                <div className="min-w-0">
                  <p className="text-[7px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">LOCATION</p>
                  <p className="text-sm lg:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug break-words">
                    {task.venue}
                  </p>
                </div>
              </div>
              
              {task.attended && (
                <div className="flex items-start gap-3 lg:gap-6 px-4 lg:px-6">
                  <UserCheck className="text-emerald-500 mt-1 shrink-0 w-4 h-4 lg:w-6 lg:h-6" />
                  <div className="min-w-0">
                    <p className="text-[7px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PARTICIPANTS</p>
                    <p className="text-xs lg:text-xl font-bold text-slate-800 tracking-tight leading-snug break-words">{task.attended}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
           <button onClick={() => onEdit(task)} className="p-2 lg:p-3 bg-white text-slate-400 hover:text-emerald-600 rounded-lg lg:rounded-xl shadow-md border border-slate-100 active:scale-90 transition-all">
             <Edit3 size={16} />
           </button>
           <button onClick={() => onDelete(task.id)} className="p-2 lg:p-3 bg-rose-50 text-rose-500 rounded-lg lg:rounded-xl shadow-md border border-rose-100 active:scale-90 transition-all">
             <Trash2 size={16} />
           </button>
        </div>
      </div>
    );
  }

  // LIST VIEW ITEM
  const cardClasses = `
    relative p-3 lg:p-4 rounded-xl lg:rounded-[1.5rem] transition-all duration-300 border group flex items-center gap-3 lg:gap-5 h-full overflow-hidden
    ${isSelected 
      ? 'bg-white border-indigo-500 shadow-lg ring-2 ring-indigo-50' 
      : isNextUpcoming
        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
        : isCompleted 
          ? 'bg-slate-50 border-slate-100 opacity-60' 
          : 'bg-white border-slate-100 text-slate-900 hover:border-indigo-200'
    }
  `;

  return (
    <div className={cardClasses}>
      <div className="shrink-0 flex items-center justify-center border-r border-slate-100 pr-3 lg:pr-6 min-w-[80px] lg:min-w-[160px] h-full">
        <span className={`text-[10px] lg:text-xl font-black italic tracking-tighter tabular-nums ${isSelected || isNextUpcoming ? 'text-indigo-600' : 'text-slate-400'}`}>
          {task.timeBlock}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
        <div className="flex items-start gap-2 mb-1">
          <h3 className={`font-black uppercase tracking-tight leading-tight ${fontSizeClass} ${isSelected || isNextUpcoming ? 'text-slate-900' : 'text-slate-700'} break-words text-wrap flex-1`}>
            {task.title}
          </h3>
          <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
            {isCompleted && <CheckCircle2 size={14} className="text-emerald-500 lg:w-5 lg:h-5" />}
            {isNextUpcoming && (
              <span className="text-[6px] lg:text-[7px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-100 px-1.5 py-0.5 rounded-md">NEXT</span>
            )}
            {isSelected && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 rounded-md border border-emerald-200">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-blink-intense" />
                <span className="text-[6px] lg:text-[8px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-3 lg:gap-x-5 gap-y-0.5 text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="text-indigo-300 w-2.5 h-2.5 lg:w-3 lg:h-3" />
            <span className="text-[8px] lg:text-xs font-bold uppercase tracking-wide truncate">{task.venue}</span>
          </div>
          {task.attended && (
            <div className="flex items-center gap-1 border-l border-slate-100 pl-2 lg:pl-4 min-w-0">
              <UserCheck className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
              <span className="text-[7px] lg:text-[10px] font-semibold uppercase truncate">{task.attended}</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-0 bottom-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-l from-white via-white to-transparent pl-4">
         <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
         <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 bg-rose-50 rounded-lg border border-rose-100 shadow-xs text-rose-400 hover:text-rose-500"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export default TaskCard;