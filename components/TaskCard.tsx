
import React from 'react';
import { Task, TaskStatus } from '../types';
import { Clock, MapPin, Info, CheckCircle2, UserCheck } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isCapturing?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, status, onEdit, onDelete, isCapturing }) => {
  const isSelected = status === TaskStatus.ACTIVE;
  const isCompleted = status === TaskStatus.COMPLETED;

  // Distinguishable Green (Emerald) for the Active Task
  const cardClasses = `
    relative p-5 rounded-[2rem] transition-all duration-300 border-2 group
    ${isSelected 
      ? 'bg-emerald-50 border-emerald-400 shadow-xl shadow-emerald-100 ring-4 ring-emerald-50' 
      : isCompleted 
        ? 'bg-slate-100 border-transparent opacity-60' 
        : 'bg-white border-white shadow-sm'
    }
    ${isCapturing ? 'border-slate-300 shadow-none mb-4 bg-white ring-0' : ''}
  `;

  const venueColorClass = isCapturing ? 'text-black' : 'text-slate-500';
  const remarksColorClass = isCapturing ? 'text-black' : 'text-slate-400';
  const iconColorClass = isSelected ? 'text-emerald-700' : (isCapturing ? 'text-slate-900' : 'text-slate-400');

  return (
    <div className={cardClasses}>
      {/* Side Accent for Active Task */}
      {isSelected && (
        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-emerald-500 rounded-r-full" />
      )}

      {isSelected && (
        <span className="absolute -top-3.5 left-8 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] flex items-center gap-2 shadow-xl z-20 border-2 border-white ring-2 ring-emerald-100 animate-bounce">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm"></span>
          ON GOING
        </span>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className={`flex items-center flex-wrap gap-2 font-black tracking-tight ${isSelected ? 'text-emerald-800' : 'text-indigo-700'}`}>
          <Clock size={isCapturing ? 20 : 16} className={isCapturing ? (isSelected ? 'text-emerald-900' : 'text-indigo-900') : ''} />
          <span className={`${isCapturing ? 'text-xl font-black' : 'text-base'}`}>{task.timeBlock}</span>
          {task.attended && task.attended.trim() !== '' && (
            <span className={`flex items-center gap-1 bg-white text-emerald-900 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200 ${isCapturing ? 'text-sm' : ''}`} title={task.attended}>
              <UserCheck size={12} strokeWidth={3} />
              {task.attended}
            </span>
          )}
        </div>
        {isCompleted && (
          <CheckCircle2 size={isCapturing ? 24 : 18} className="text-emerald-600" />
        )}
      </div>

      <h3 className={`font-black mb-3 leading-tight ${isSelected ? 'text-emerald-950' : 'text-slate-900'} ${isCapturing ? 'text-2xl mb-4' : 'text-lg'}`}>
        {task.title}
      </h3>

      <div className={`${isCapturing ? 'space-y-4' : 'space-y-2'}`}>
        {/* Venue Section */}
        <div className={`flex items-start gap-3 ${venueColorClass} ${isCapturing ? 'bg-slate-50 p-3 rounded-2xl border border-slate-200' : ''}`}>
          <MapPin size={isCapturing ? 22 : 14} className={`${iconColorClass} shrink-0 mt-0.5`} />
          <div className="flex flex-col">
            {isCapturing && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-0.5">Venue</span>}
            <span className={`${isCapturing ? 'text-lg font-bold' : 'text-sm font-semibold'}`}>
              {task.venue}
            </span>
          </div>
        </div>
        
        {/* Remarks Section (Info) */}
        {task.remarks && (
          <div className={`flex items-start gap-3 ${remarksColorClass} ${isCapturing ? 'bg-emerald-50/50 p-3 rounded-2xl border-2 border-emerald-100' : ''}`}>
            <Info size={isCapturing ? 22 : 14} className={`${iconColorClass} mt-0.5 shrink-0`} />
            <div className="flex flex-col w-full">
              {isCapturing && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-0.5">Info / Remarks</span>}
              <span className={`${isCapturing ? 'text-base font-bold' : 'text-[12px] font-medium italic'} leading-relaxed ${isCapturing ? '' : 'line-clamp-4'}`}>
                {task.remarks}
              </span>
            </div>
          </div>
        )}
      </div>

      {!isCapturing && (
        <div className="absolute top-4 right-4 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onEdit(task); }}
             className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl hover:bg-white text-slate-700 shadow-md border border-slate-100 transition-all active:scale-90"
             title="Edit Task"
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
             className="p-2.5 bg-rose-50/95 backdrop-blur-sm rounded-xl hover:bg-rose-100 text-rose-600 shadow-md border border-rose-100 transition-all active:scale-90"
             title="Delete Task"
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
           </button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
