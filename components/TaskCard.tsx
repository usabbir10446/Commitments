
import React from 'react';
import { Task, TaskStatus } from '../types.ts';
import { Clock, MapPin, Info, CheckCircle2, UserCheck, Edit3, Trash2 } from 'lucide-react';

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <div className={cardClasses}>
      {isSelected && <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-emerald-500 rounded-r-full" />}
      {isSelected && (
        <span className="absolute -top-3.5 left-8 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] flex items-center gap-2 shadow-xl z-20 border-2 border-white animate-bounce">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          ON GOING
        </span>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className={`flex items-center flex-wrap gap-2 font-black tracking-tight ${isSelected ? 'text-emerald-800' : 'text-indigo-700'}`}>
          <Clock size={isCapturing ? 20 : 16} />
          <span className={`${isCapturing ? 'text-xl font-black' : 'text-base'}`}>{task.timeBlock}</span>
          {task.attended && (
            <span className="flex items-center gap-1 bg-white text-emerald-900 px-2 py-0.5 rounded-lg text-[10px] font-black border border-emerald-200">
              <UserCheck size={12} strokeWidth={3} />
              {task.attended}
            </span>
          )}
        </div>
        {isCompleted && <CheckCircle2 size={isCapturing ? 24 : 18} className="text-emerald-600" />}
      </div>

      <h3 className={`font-black mb-3 leading-tight ${isSelected ? 'text-emerald-950' : 'text-slate-900'} ${isCapturing ? 'text-2xl mb-4' : 'text-lg'}`}>
        {task.title}
      </h3>

      <div className="space-y-2">
        <div className={`flex items-start gap-3 ${isCapturing ? 'text-black bg-slate-50 p-3 rounded-2xl' : 'text-slate-500'}`}>
          <MapPin size={isCapturing ? 22 : 14} className="shrink-0 mt-0.5" />
          <span className={`${isCapturing ? 'text-lg font-bold' : 'text-sm font-semibold'}`}>{task.venue}</span>
        </div>
        {task.remarks && (
          <div className={`flex items-start gap-3 ${isCapturing ? 'text-black bg-emerald-50/50 p-3 rounded-2xl' : 'text-slate-400'}`}>
            <Info size={isCapturing ? 22 : 14} className="shrink-0 mt-0.5" />
            <span className={`${isCapturing ? 'text-base font-bold' : 'text-[12px] font-medium italic'}`}>{task.remarks}</span>
          </div>
        )}
      </div>

      {!isCapturing && (
        <div className="absolute top-4 right-4 flex gap-2 z-50 pointer-events-auto">
           <button 
             type="button"
             onClick={handleEditClick}
             className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-md active:scale-90 transition-all pointer-events-auto cursor-pointer"
             title="Edit Task"
           >
             <Edit3 size={16} strokeWidth={2.5} />
           </button>
           <button 
             type="button"
             onClick={handleDeleteClick}
             className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-rose-500 shadow-md active:scale-90 transition-all pointer-events-auto cursor-pointer"
             title="Delete Task"
           >
             <Trash2 size={16} strokeWidth={2.5} />
           </button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
