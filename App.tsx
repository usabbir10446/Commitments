
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tab, Task, TaskStatus, EmergencyMessage, WelcomeTask } from './types.ts';
import { storageService } from './services/storageService.ts';
import { getCurrentMinutesFromMidnight, parseTimeBlock, getTodayString, formatFriendlyDate } from './utils/time.ts';
import { supabase } from './services/supabase.ts';
import LiveClock from './components/LiveClock.tsx';
import TaskCard from './components/TaskCard.tsx';
import TaskModal from './components/TaskModal.tsx';
import EmergencyOverlay from './components/EmergencyOverlay.tsx';
import WelcomeOverlay from './components/WelcomeOverlay.tsx';
import WelcomeTab from './components/WelcomeTab.tsx';
import { Calendar, AlertCircle, Plus, Printer, Send, Search, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TASKS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [welcomeTasks, setWelcomeTasks] = useState<WelcomeTask[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutesFromMidnight());
  const [activeEmergency, setActiveEmergency] = useState<EmergencyMessage | null>(null);
  const [activeWelcome, setActiveWelcome] = useState<WelcomeTask | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState('');
  
  const [viewDate, setViewDate] = useState(getTodayString()); 
  const [searchDate, setSearchDate] = useState(getTodayString());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [fetchedTasks, fetchedEmergencies, fetchedWelcome] = await Promise.all([
          storageService.getTasks(),
          storageService.getEmergencies(),
          storageService.getWelcomeTasks()
        ]);
        setTasks(fetchedTasks);
        setEmergencies(fetchedEmergencies);
        setWelcomeTasks(fetchedWelcome);
        
        const active = fetchedWelcome.find(w => w.isActive);
        if (active) setActiveWelcome(active);
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Emergency Subscription
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
        setTimeout(() => setActiveEmergency(prev => prev?.id === newMsg.id ? null : prev), 10000);
      })
      .subscribe();

    // Welcome Sync Subscription
    const welcomeSubscription = supabase
      .channel('welcome_sync')
      .on('postgres_changes', { event: '*', table: 'welcome_tasks' }, async () => {
        const updated = await storageService.getWelcomeTasks();
        setWelcomeTasks(updated);
        const active = updated.find(w => w.isActive);
        setActiveWelcome(active || null);
      })
      .subscribe();

    // Task Change Subscription
    const taskSubscription = supabase
      .channel('task_sync')
      .on('postgres_changes', { event: '*', table: 'tasks' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        } else {
            const updatedTasks = await storageService.getTasks();
            setTasks(updatedTasks);
        }
      })
      .subscribe();

    const statusTimer = setInterval(() => setCurrentMinutes(getCurrentMinutesFromMidnight()), 10000);

    return () => {
      clearInterval(statusTimer);
      supabase.removeChannel(emergencySubscription);
      supabase.removeChannel(welcomeSubscription);
      supabase.removeChannel(taskSubscription);
    };
  }, []);

  const triggerEmergency = async (text: string) => {
    if (!text.trim()) return;
    await storageService.broadcastEmergency(text);
    setEmergencyInput('');
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const saved = await storageService.saveTask({ ...taskData, id: editingTask?.id });
    if (saved) {
      setIsModalOpen(false);
      setEditingTask(null);
      const updated = await storageService.getTasks();
      setTasks(updated);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!id) return;
    
    // GUARANTEED INSTANT REMOVAL
    setTasks(prev => prev.filter(t => t.id !== id));
    setIsModalOpen(false);
    setEditingTask(null);

    try {
      await storageService.deleteTask(id);
    } catch (err) {
      console.error("Deletion background sync failed:", err);
    }
  };

  const handleEditRequest = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
    setIsSearchOpen(false);
  };

  const handleAddWelcome = async (wt: Partial<WelcomeTask>) => {
    const success = await storageService.saveWelcomeTask(wt);
    if (success) {
      const updated = await storageService.getWelcomeTasks();
      setWelcomeTasks(updated);
    }
  };

  const handleStartWelcome = (id: string) => storageService.setWelcomeActive(id, true);
  const handleStopWelcome = () => storageService.setWelcomeActive('', false);
  
  const handleDeleteWelcome = async (id: string) => {
    if (!id) return;
    
    // GUARANTEED INSTANT REMOVAL
    setWelcomeTasks(prev => prev.filter(w => w.id !== id));

    try {
      await storageService.deleteWelcomeTask(id);
    } catch (error) {
      console.error("Welcome deletion background sync failed:", error);
    }
  };

  const homepageTasks = useMemo(() => {
    const isToday = viewDate === getTodayString();
    const dayTasks = tasks.filter(t => t.date === viewDate);
    
    const mappedTasks = dayTasks.map(t => ({
      ...t,
      times: parseTimeBlock(t.timeBlock)
    }));

    let activeTaskId: string | null = null;
    if (isToday) {
      const ongoing = mappedTasks
        .filter(t => currentMinutes >= t.times.start && currentMinutes < t.times.end)
        .sort((a, b) => a.times.start - b.times.start);
      if (ongoing.length > 0) activeTaskId = ongoing[0].id;
    }

    return mappedTasks.map(t => {
      let status = TaskStatus.UPCOMING;
      if (t.id === activeTaskId) status = TaskStatus.ACTIVE;
      else if (currentMinutes >= t.times.end && isToday) status = TaskStatus.COMPLETED;
      else if (new Date(t.date) < new Date(getTodayString())) status = TaskStatus.COMPLETED;
      return { ...t, status };
    }).sort((a, b) => a.times.start - b.times.start);
  }, [tasks, currentMinutes, viewDate]);

  const searchResults = useMemo(() => {
    const filtered = tasks.filter(t => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(query) ||
          t.venue.toLowerCase().includes(query) ||
          (t.remarks?.toLowerCase().includes(query))
        );
      }
      return t.date === searchDate;
    });

    return filtered.map(t => {
      const times = parseTimeBlock(t.timeBlock);
      const isToday = t.date === getTodayString();
      let status = TaskStatus.UPCOMING;
      
      if (isToday && currentMinutes >= times.start && currentMinutes < times.end) {
        status = TaskStatus.ACTIVE;
      } else if ((isToday && currentMinutes >= times.end) || new Date(t.date) < new Date(getTodayString())) {
        status = TaskStatus.COMPLETED;
      }
      
      return { ...t, status };
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aTimes = parseTimeBlock(a.timeBlock);
      const bTimes = parseTimeBlock(b.timeBlock);
      return aTimes.start - bTimes.start;
    });
  }, [tasks, searchQuery, searchDate, currentMinutes]);

  const handlePrint = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(captureRef.current!, { backgroundColor: '#ffffff', scale: 3, useCORS: true });
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const file = new File([blob], `Schedule-${viewDate}.png`, { type: 'image/png' });
          if (navigator.share) await navigator.share({ files: [file], title: 'Schedule' });
          else {
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

  return (
    <div className={`flex flex-col min-h-screen max-w-md mx-auto relative ${isCapturing ? 'bg-white' : 'bg-slate-50'}`} ref={captureRef}>
      <EmergencyOverlay message={activeEmergency} onClose={() => setActiveEmergency(null)} />
      <WelcomeOverlay task={activeWelcome} onStop={handleStopWelcome} />
      
      <header className={`px-6 pt-10 pb-4 sticky top-0 z-40 ${isCapturing ? 'relative' : 'bg-slate-50/80 backdrop-blur-md'}`}>
        <div className="flex justify-between items-start mb-6">
          <LiveClock />
          <div className={`flex gap-2 ${isCapturing ? 'hidden' : ''}`}>
            <button onClick={() => setIsSearchOpen(true)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all pointer-events-auto"><Search size={20} /></button>
            <button onClick={handlePrint} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all pointer-events-auto"><Printer size={20} /></button>
            <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all pointer-events-auto"><Plus size={24} /></button>
          </div>
        </div>
        
        {activeTab === Tab.TASKS && !isCapturing && (
          <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-white/50 shadow-sm">
            <button onClick={() => setViewDate(d => { const date = new Date(d); date.setDate(date.getDate()-1); return date.toISOString().split('T')[0]; })} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"><ChevronLeft size={20} /></button>
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-indigo-900 uppercase tracking-widest leading-none mb-1">{viewDate === getTodayString() ? 'TODAY' : 'SCHEDULED'}</span>
              <span className="text-xs font-bold text-slate-500">{formatFriendlyDate(new Date(viewDate))}</span>
            </div>
            <button onClick={() => setViewDate(d => { const date = new Date(d); date.setDate(date.getDate()+1); return date.toISOString().split('T')[0]; })} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"><ChevronRight size={20} /></button>
          </div>
        )}
      </header>

      <main className={`flex-1 px-6 ${isCapturing ? 'pb-10' : 'pb-24'} pt-2`}>
        {activeTab === Tab.TASKS ? (
          <div className="grid gap-8">
            {homepageTasks.length === 0 ? (
              <div className="py-24 text-center text-slate-400 italic">No tasks scheduled.</div>
            ) : (
              homepageTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  status={task.status} 
                  onEdit={t => { setEditingTask(t); setIsModalOpen(true); }} 
                  onDelete={handleDeleteTask} 
                  isCapturing={isCapturing} 
                />
              ))
            )}
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <WelcomeTab 
            tasks={welcomeTasks} 
            onAdd={handleAddWelcome} 
            onStart={handleStartWelcome} 
            onStop={handleStopWelcome} 
            onDelete={handleDeleteWelcome} 
          />
        ) : (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4">Control Center</h3>
              <textarea className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:border-rose-500 focus:bg-white transition-all outline-none font-medium resize-none" placeholder="Broadcast message..." rows={3} value={emergencyInput} onChange={(e) => setEmergencyInput(e.target.value)} />
              <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-4 bg-rose-600 text-white font-black uppercase tracking-widest py-5 rounded-3xl shadow-xl active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2"><Send size={20} /> Broadcast</button>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 text-center">History</h3>
              <div className="space-y-3">
                {emergencies.map(msg => <div key={msg.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-start gap-4"><div className="bg-rose-50 p-3 rounded-2xl text-rose-600"><AlertCircle size={20} /></div><div><p className="text-slate-800 font-bold leading-snug">{msg.text}</p><p className="text-slate-400 text-[10px] uppercase">{new Date(msg.createdAt).toLocaleString()}</p></div></div>)}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-around items-center z-50 ${isCapturing ? 'hidden' : ''}`}>
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><Calendar size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Tasks</span></button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><UserPlus size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Welcome</span></button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-300'}`}><AlertCircle size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Emergency</span></button>
      </nav>

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
          onSave={handleSaveTask} 
          onDelete={handleDeleteTask} 
        />
      )}
      
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in slide-in-from-right">
          <div className="bg-white px-6 pt-12 pb-6 border-b">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-all"><X size={20} /></button>
              <h2 className="text-xl font-black">Search Archive</h2>
            </div>
            <input type="text" placeholder="Search tasks..." className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {!searchQuery && <input type="date" className="w-full mt-4 bg-slate-50 border-2 rounded-2xl px-5 py-4" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {searchResults.map(t => <TaskCard key={t.id} task={t} status={t.status} onEdit={handleEditRequest} onDelete={handleDeleteTask} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
