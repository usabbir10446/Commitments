
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tab, Task, EmergencyMessage, TaskStatus } from './types';
import { storageService } from './services/storageService';
import { getCurrentMinutesFromMidnight, getTaskStatus, getTodayString, getTomorrowString, formatFriendlyDate } from './utils/time';
import { supabase } from './services/supabase';
import LiveClock from './components/LiveClock';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import EmergencyOverlay from './components/EmergencyOverlay';
import { Calendar, AlertCircle, Plus, LayoutGrid, Printer, Send, Loader2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TASKS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutesFromMidnight());
  const [activeEmergency, setActiveEmergency] = useState<EmergencyMessage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState('');
  
  // View Control (Main Screen)
  const [viewDate, setViewDate] = useState(getTomorrowString());
  
  // Search Controls (Archive Modal)
  const [searchDate, setSearchDate] = useState(getTodayString());
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [fetchedTasks, fetchedEmergencies] = await Promise.all([
        storageService.getTasks(),
        storageService.getEmergencies()
      ]);
      setTasks(fetchedTasks);
      setEmergencies(fetchedEmergencies);
      setIsLoading(false);
    };

    loadData();

    // Subscribe to Real-time Emergencies
    const emergencySubscription = supabase
      .channel('emergency_broadcasts')
      .on('postgres_changes', { event: 'INSERT', table: 'emergencies' }, (payload) => {
        const newMsg: EmergencyMessage = {
          id: payload.new.id,
          text: payload.new.text,
          createdAt: new Date(payload.new.created_at).getTime()
        };
        
        setEmergencies(prev => [newMsg, ...prev]);
        setActiveEmergency(newMsg);
        
        setTimeout(() => {
          setActiveEmergency(prev => prev?.id === newMsg.id ? null : prev);
        }, 10000);
      })
      .subscribe();

    // Subscribe to Task Changes
    const taskSubscription = supabase
      .channel('task_sync')
      .on('postgres_changes', { event: '*', table: 'tasks' }, async () => {
        const updatedTasks = await storageService.getTasks();
        setTasks(updatedTasks);
      })
      .subscribe();

    const statusTimer = setInterval(() => {
      setCurrentMinutes(getCurrentMinutesFromMidnight());
    }, 30000);

    return () => {
      clearInterval(statusTimer);
      supabase.removeChannel(emergencySubscription);
      supabase.removeChannel(taskSubscription);
    };
  }, []);

  const triggerEmergency = async (text: string) => {
    if (!text.trim()) return;
    await storageService.broadcastEmergency(text);
    setEmergencyInput('');
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const saved = await storageService.saveTask({
      ...taskData,
      id: editingTask?.id
    });
    
    if (saved) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this task? This action cannot be undone.");
    if (!confirmed) return;

    const success = await storageService.deleteTask(id);
    if (success) {
      // Optimistically update the UI
      setTasks(prev => prev.filter(t => t.id !== id));
    } else {
      alert("Failed to delete task. Please check your connection.");
    }
  };

  // Logic for main schedule view
  const homepageTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === viewDate)
      .map(t => ({ ...t, status: getTaskStatus(t, currentMinutes, t.date === getTodayString()) }))
      .sort((a, b) => {
        if (a.status === TaskStatus.ACTIVE) return -1;
        if (b.status === TaskStatus.ACTIVE) return 1;
        return a.timeBlock.localeCompare(b.timeBlock);
      });
  }, [tasks, currentMinutes, viewDate]);

  // Logic for search modal results
  const searchResults = useMemo(() => {
    let list = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.venue.toLowerCase().includes(q) || 
        (t.remarks && t.remarks.toLowerCase().includes(q))
      );
    } else {
      // If query is empty, filter by the specific archive date
      list = list.filter(t => t.date === searchDate);
    }

    return list
      .map(t => ({ ...t, status: getTaskStatus(t, currentMinutes, t.date === getTodayString()) }))
      .sort((a, b) => {
        // Sort by date descending first, then time
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.timeBlock.localeCompare(b.timeBlock);
      });
  }, [tasks, currentMinutes, searchDate, searchQuery]);

  const handlePrint = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(captureRef.current!, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
        });
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const file = new File([blob], `Schedule-${viewDate}.png`, { type: 'image/png' });
          if (navigator.share) {
            await navigator.share({ files: [file], title: 'My Schedule' });
          } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `tasks-${viewDate}.png`;
            link.click();
          }
        }
      } catch (err) { console.error(err); }
      setIsCapturing(false);
    }, 200);
  };

  const changeDate = (days: number) => {
      const d = new Date(viewDate);
      d.setDate(d.getDate() + days);
      setViewDate(d.toISOString().split('T')[0]);
  };

  return (
    <div 
      className={`flex flex-col min-h-screen max-w-md mx-auto relative ${isCapturing ? 'overflow-visible bg-white' : 'overflow-x-hidden bg-slate-50'}`}
      ref={captureRef}
    >
      <EmergencyOverlay 
        message={activeEmergency} 
        onClose={() => setActiveEmergency(null)} 
      />

      <header className={`px-6 pt-10 pb-4 sticky top-0 z-40 ${isCapturing ? 'relative bg-white border-b-4 border-slate-100 mb-8' : 'bg-slate-50/80 backdrop-blur-md'}`}>
        <div className="flex justify-between items-start mb-6">
          <LiveClock />
          <div className={`flex gap-2 ${isCapturing ? 'hidden' : ''}`}>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-90"
              title="Search Archive"
            >
              <Search size={20} />
            </button>
            <button 
              onClick={handlePrint}
              className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-90"
              title="Print/Share Schedule"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg hover:shadow-indigo-200 transition-all active:scale-90"
              title="Add New Task"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        {activeTab === Tab.TASKS && !isCapturing && (
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <LayoutGrid size={12} className="text-indigo-500" />
                Cmt of Respected Comdt
                </span>
                {isLoading && <Loader2 size={12} className="animate-spin text-indigo-500" />}
            </div>
            
            <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-white/50 shadow-sm">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black text-indigo-900 uppercase tracking-widest leading-none mb-1">
                        {viewDate === getTodayString() ? 'TODAY' : viewDate === getTomorrowString() ? 'TOMORROW' : 'SCHEDULED'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{formatFriendlyDate(new Date(viewDate))}</span>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all">
                    <ChevronRight size={20} />
                </button>
            </div>
          </div>
        )}
      </header>

      <main className={`flex-1 px-6 ${isCapturing ? 'pb-10' : 'pb-24'} pt-2`}>
        {activeTab === Tab.TASKS ? (
          <div className="space-y-8">
            <div className="grid gap-8">
              {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <Loader2 size={40} className="animate-spin text-indigo-500/50" />
                  <span className="text-xs font-black uppercase tracking-widest">Loading Schedule...</span>
                </div>
              ) : homepageTasks.length === 0 ? (
                <div className="py-24 text-center text-slate-400 italic bg-white/50 rounded-[2.5rem] border border-dashed border-slate-200 px-6">
                  No tasks scheduled for {formatFriendlyDate(new Date(viewDate))}.
                </div>
              ) : (
                homepageTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    status={task.status} 
                    onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                    onDelete={handleDeleteTask}
                    isCapturing={isCapturing}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Control Center</h3>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                Compose a custom message to broadcast instantly to all users via Supabase Real-time.
              </p>
              
              <div className="space-y-4">
                <textarea
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-rose-500 focus:bg-white transition-all outline-none font-medium resize-none text-slate-800"
                  placeholder="Enter broadcast message here..."
                  rows={3}
                  value={emergencyInput}
                  onChange={(e) => setEmergencyInput(e.target.value)}
                />
                
                <button 
                  onClick={() => triggerEmergency(emergencyInput)}
                  disabled={!emergencyInput.trim()}
                  className={`w-full text-white font-black uppercase tracking-widest py-5 rounded-3xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${emergencyInput.trim() ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                >
                  <Send size={20} />
                  Broadcast Globally
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Broadcast History</h3>
              <div className="space-y-3">
                {emergencies.map(msg => (
                  <div key={msg.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-start gap-4">
                    <div className="bg-rose-50 p-3 rounded-2xl text-rose-600 shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-slate-800 font-bold leading-snug mb-1 break-words">{msg.text}</p>
                      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-around items-center safe-area-bottom z-50 ${isCapturing ? 'hidden' : ''}`}>
        <button 
          onClick={() => setActiveTab(Tab.TASKS)}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
        >
          <Calendar size={24} strokeWidth={activeTab === Tab.TASKS ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">Tasks</span>
        </button>
        
        <button 
          onClick={() => setActiveTab(Tab.EMERGENCY)}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-300'}`}
        >
          <AlertCircle size={24} strokeWidth={activeTab === Tab.EMERGENCY ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">Emergency</span>
        </button>
      </nav>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="bg-white px-6 pt-12 pb-6 border-b border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                      <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all">
                        <X size={20} />
                      </button>
                      <h2 className="text-xl font-black text-slate-800">Search & Archive</h2>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                              type="text"
                              autoFocus
                              placeholder="Search title, venue, or remarks..."
                              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                      
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                          <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Archive Date Viewer</label>
                          <input 
                              type="date"
                              className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-2 focus:border-indigo-500 outline-none font-bold text-indigo-900"
                              value={searchDate}
                              onChange={(e) => setSearchDate(e.target.value)}
                          />
                          <p className="mt-1.5 text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">
                            Select a date to view all commitments of that specific day.
                          </p>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                  <div className="grid gap-8">
                      {searchResults.map(task => (
                        <div key={task.id} className="relative">
                            <div className="absolute -top-4 left-4 bg-slate-200 text-slate-600 px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest z-10 border border-white">
                                {formatFriendlyDate(new Date(task.date))}
                            </div>
                            <TaskCard 
                                task={task} 
                                status={task.status} 
                                onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                                onDelete={handleDeleteTask}
                            />
                        </div>
                      ))}
                      {searchResults.length === 0 && (
                          <div className="text-center py-20 text-slate-400 italic">
                            {searchQuery ? 'No matching results found.' : `No archive entries for ${formatFriendlyDate(new Date(searchDate))}.`}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
          onSave={handleSaveTask} 
        />
      )}
    </div>
  );
};

export default App;
