import React from 'react';
import { Task, TaskStatus } from '../types';
import { Clock, MapPin, Info, CheckCircle2, UserCheck, Edit3, Trash2 } from 'lucide-react';

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

const TaskCard: React.FC<TaskCardProps> = ({ task, status, isNextUpcoming, onEdit, onDelete, isTVFeatured, fontSizeClass = 'text-2xl xl:text-3xl' }) => {
  const isSelected = status === TaskStatus.ACTIVE;
  const isCompleted = status === TaskStatus.COMPLETED;

  // TV FEATURED STYLE (Priority Monitor)
  if (isTVFeatured) {
    return (
      <div className="relative h-full bg-[#F0FDF4] rounded-[3rem] p-8 xl:p-10 flex flex-col justify-between shadow-sm border border-emerald-100 group animate-in zoom-in duration-500 overflow-hidden">
        {/* Subtle accent glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white rounded-full blur-3xl opacity-80 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl opacity-40 pointer-events-none" />
        
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6 xl:mb-8 shrink-0">
            <div className="flex items-center gap-5">
              <div className="bg-white p-3 xl:p-4 rounded-2xl border border-emerald-200 shadow-sm">
                <Clock className="text-emerald-600" size={28} xl:size={32} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[9px] xl:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.3em] mb-1">CURRENT SESSION</p>
                <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-slate-900 tracking-tight tabular-nums">{task.timeBlock}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 xl:gap-3 px-4 xl:px-5 py-2 xl:py-2.5 bg-white border-2 border-emerald-400 rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.15)] shrink-0">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-blink-intense shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <span className="text-emerald-700 font-black text-[10px] xl:text-sm uppercase tracking-widest">Active now</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            <h3 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight uppercase mb-6 xl:mb-8 drop-shadow-sm break-words py-1 text-wrap h-auto min-h-max">
              {task.title}
            </h3>

            <div className="space-y-4 xl:space-y-6 pb-10">
              <div className="flex items-start gap-4 xl:gap-6 bg-white p-5 xl:p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
                <MapPin className="text-emerald-500 mt-1 shrink-0" size={24} xl:size={28} strokeWidth={2.5} />
                <div className="min-w-0">
                  <p className="text-[9px] xl:text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-1.5">LOCATION</p>
                  <p className="text-xl xl:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug break-words">
                    {task.venue}
                  </p>
                </div>
              </div>
              
              {task.attended && (
                <div className="flex items-start gap-4 xl:gap-6 px-5 xl:px-6">
                  <UserCheck className="text-emerald-500 mt-1 shrink-0" size={20} xl:size={24} />
                  <div className="min-w-0">
                    <p className="text-[9px] xl:text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-1.5">PARTICIPANTS</p>
                    <p className="text-lg xl:text-xl font-bold text-slate-800 tracking-tight leading-snug break-words">{task.attended}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
           <button onClick={() => onEdit(task)} className="p-3 bg-white text-slate-400 hover:text-emerald-600 rounded-xl shadow-md border border-slate-100 active:scale-90 transition-all">
             <Edit3 size={18} />
           </button>
           <button onClick={() => onDelete(task.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl shadow-md border border-rose-100 hover:bg-rose-500 hover:text-white active:scale-90 transition-all">
             <Trash2 size={18} />
           </button>
        </div>
      </div>
    );
  }

  // LIST VIEW ITEM (Records)
  const cardClasses = `
    relative p-3 xl:p-4 rounded-[1.5rem] transition-all duration-300 border group flex items-center gap-5 h-full overflow-hidden
    ${isSelected 
      ? 'bg-white border-indigo-500 shadow-lg ring-2 ring-indigo-50' 
      : isNextUpcoming
        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
        : isCompleted 
          ? 'bg-slate-50 border-slate-100 opacity-60' 
          : 'bg-white border-slate-100 text-slate-900 hover:border-indigo-200 hover:shadow-sm'
    }
  `;

  return (
    <div className={cardClasses}>
      {/* Time Section */}
      <div className="shrink-0 flex items-center justify-center border-r border-slate-100 pr-6 min-w-[160px] h-full">
        <span className={`text-lg xl:text-xl font-black italic tracking-tighter tabular-nums ${isSelected || isNextUpcoming ? 'text-indigo-600' : 'text-slate-400'}`}>
          {task.timeBlock}
        </span>
      </div>

      {/* Flexible Content Area */}
      <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
        <div className="flex items-start gap-3 mb-1">
          <h3 className={`font-black uppercase tracking-tight leading-[1.1] ${fontSizeClass} ${isSelected || isNextUpcoming ? 'text-slate-900' : 'text-slate-700'} break-words text-wrap flex-1 h-auto min-h-max`}>
            {task.title}
          </h3>
          <div className="shrink-0 flex items-center gap-2 mt-1">
            {isCompleted && <CheckCircle2 size={20} className="text-emerald-500" />}
            {isNextUpcoming && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 rounded-lg">
                <span className="text-[7px] font-black text-indigo-700 uppercase tracking-widest">NEXT</span>
              </div>
            )}
            {isSelected && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-100 rounded-lg border border-emerald-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-blink-intense shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5 text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={12} className="text-indigo-300 shrink-0" />
            <span className="text-[10px] xl:text-xs font-bold uppercase tracking-wide break-words">{task.venue}</span>
          </div>
          {task.attended && (
            <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4 min-w-0">
              <UserCheck size={12} className="shrink-0" />
              <span className="text-[9px] xl:text-[10px] font-semibold uppercase tracking-[0.1em] break-words">{task.attended}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Overlay */}
      <div className="absolute top-0 bottom-0 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-l from-white via-white to-transparent pl-8">
         <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
         <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-2 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 shadow-xs text-rose-400 hover:text-rose-500"><Trash2 size={16} /></button>
      </div>
    </div>
  );
};

export default TaskCard;