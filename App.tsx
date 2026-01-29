import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tab, Task, TaskStatus, EmergencyMessage, WelcomeTask } from './types';
import { storageService } from './services/storageService';
import { initializeDatabase } from './services/setupData';
import { getCurrentMinutesFromMidnight, parseTimeBlock, getTodayString, formatFriendlyDate } from './utils/time';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import LiveClock from './components/LiveClock';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import EmergencyOverlay from './components/EmergencyOverlay';
import WelcomeOverlay from './components/WelcomeOverlay';
import WelcomeTab from './components/WelcomeTab';
import { Calendar, AlertCircle, Plus, Search, X, UserPlus, Activity, LayoutDashboard } from 'lucide-react';

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
  const [emergencyInput, setEmergencyInput] = useState('');
  
  const [viewDate, setViewDate] = useState(getTodayString()); 
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsLoading(true);
    initializeDatabase().catch(console.error);

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), orderBy('timeBlock', 'asc')), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setIsLoading(false);
    });

    const unsubEmergencies = onSnapshot(query(collection(db, 'emergencies'), orderBy('createdAt', 'desc')), (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyMessage));
      setEmergencies(msgs);
      const latest = msgs[0];
      if (latest && Date.now() - latest.createdAt < 15000) {
        setActiveEmergency(latest);
        setTimeout(() => setActiveEmergency(null), 12000);
      }
    });

    const unsubWelcome = onSnapshot(collection(db, 'welcome_tasks'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WelcomeTask));
      setWelcomeTasks(list);
      setActiveWelcome(list.find(w => w.isActive) || null);
    });

    const timer = setInterval(() => setCurrentMinutes(getCurrentMinutesFromMidnight()), 10000);

    return () => {
      unsubTasks();
      unsubEmergencies();
      unsubWelcome();
      clearInterval(timer);
    };
  }, []);

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const saved = await storageService.saveTask({ ...taskData, id: editingTask?.id });
    if (saved) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (await storageService.deleteTask(id)) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const triggerEmergency = async (text: string) => {
    if (!text.trim()) return;
    const result = await storageService.broadcastEmergency(text);
    if (result) {
      setEmergencyInput('');
    }
  };

  const homepageTasks = useMemo(() => {
    const isToday = viewDate === getTodayString();
    const dayTasks = tasks.filter(t => t.date === viewDate);
    const mappedTasks = dayTasks.map(t => ({
      ...t,
      times: parseTimeBlock(t.timeBlock)
    })).sort((a, b) => a.times.start - b.times.start);

    let activeTaskId: string | null = null;
    if (isToday) {
      const ongoing = mappedTasks
        .filter(t => currentMinutes >= t.times.start && currentMinutes < t.times.end);
      if (ongoing.length > 0) activeTaskId = ongoing[0].id;
    }

    const processed = mappedTasks.map(t => {
      let status = TaskStatus.UPCOMING;
      if (t.id === activeTaskId) status = TaskStatus.ACTIVE;
      else if (currentMinutes >= t.times.end && isToday) status = TaskStatus.COMPLETED;
      else if (new Date(t.date) < new Date(getTodayString())) status = TaskStatus.COMPLETED;
      return { ...t, status };
    });

    const nextUpcoming = processed.find(t => t.status === TaskStatus.UPCOMING);
    return processed.map(t => ({
      ...t,
      isNextUpcoming: t.id === (nextUpcoming ? nextUpcoming.id : null)
    }));
  }, [tasks, currentMinutes, viewDate]);

  const activeTask = homepageTasks.find(t => t.status === TaskStatus.ACTIVE);
  const otherTasks = homepageTasks.filter(t => t.status !== TaskStatus.ACTIVE);

  const dynamicFontSize = useMemo(() => {
    const count = otherTasks.length;
    if (count === 0) return 'text-xl lg:text-3xl';
    const maxTitleLen = Math.max(...otherTasks.map(t => t.title.length));
    if (count <= 3) {
      if (maxTitleLen > 80) return 'text-lg lg:text-2xl';
      return 'text-xl lg:text-4xl';
    }
    if (count <= 6) {
      return 'text-base lg:text-2xl';
    }
    return 'text-sm lg:text-xl';
  }, [otherTasks]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.venue.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FBFBFD]" ref={captureRef}>
      <EmergencyOverlay message={activeEmergency} onClose={() => setActiveEmergency(null)} />
      <WelcomeOverlay task={activeWelcome} onStop={() => storageService.setWelcomeActive('', false)} />
      
      {/* HEADER - Unified 3-column layout */}
      <header className="px-6 lg:px-12 py-3 grid grid-cols-[1fr_2fr_1fr] lg:grid-cols-[1fr_3fr_1fr] items-center border-b border-slate-100 bg-white/90 backdrop-blur-xl z-40 shrink-0">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <Activity className="text-sky-400" size={16} lg:size={20} />
          </div>
          <div>
            <h1 className="text-xs lg:text-lg font-black tracking-tightest uppercase italic text-slate-900 leading-none">Daily <span className="text-sky-400">Cmt</span></h1>
            <p className="text-[5px] lg:text-[7px] font-black text-slate-400 uppercase tracking-[0.6em] mt-1">DASHBOARD 2.0</p>
          </div>
        </div>

        <div className="flex justify-center transform scale-75 sm:scale-90 lg:scale-100">
          <LiveClock isCompact />
        </div>

        <div className="flex items-center justify-end gap-2 lg:gap-3">
           <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-3 lg:px-5 py-2 lg:py-2.5 bg-indigo-600 text-white font-black text-[7px] lg:text-[9px] uppercase tracking-[0.2em] rounded-lg lg:rounded-xl hover:bg-slate-900 transition-all shadow-md active:scale-95 flex items-center gap-2">
             <Plus size={12} lg:size={14} strokeWidth={3} />
             <span className="hidden sm:inline">NEW CMT</span>
             <span className="sm:hidden">NEW</span>
           </button>
           <button onClick={() => setIsSearchOpen(true)} className="w-8 h-8 lg:w-10 lg:h-10 bg-white border border-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-90">
             <Search size={16} lg:size={18} />
           </button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-10 overflow-hidden min-h-0">
        {activeTab === Tab.TASKS ? (
          /* Fixed Dual-Column Dashboard Layout */
          <div className="h-full w-full flex flex-row gap-4 lg:gap-8 min-h-0">
            {/* Left Column: Priority Monitor (Fixed Width Proportion) */}
            <div className="w-[42%] lg:w-[42%] h-full flex flex-col min-h-0">
              <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4 px-2 shrink-0">
                <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-500 animate-blink-intense shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                <h2 className="text-[7px] lg:text-[10px] font-black uppercase tracking-[0.6em] text-slate-900">Priority Monitor</h2>
              </div>
              
              <div className="flex-1 min-h-0">
                {activeTask ? (
                  <TaskCard 
                    task={activeTask} 
                    status={TaskStatus.ACTIVE} 
                    onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} 
                    onDelete={handleDeleteTask}
                    isTVFeatured={true}
                  />
                ) : (
                  <div className="h-full bg-white rounded-[2rem] lg:rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center p-6 lg:p-10 text-center shadow-sm">
                    <Calendar className="text-slate-100 mb-4" size={40} lg:size={60} />
                    <h3 className="text-sm lg:text-xl font-black text-slate-200 uppercase tracking-tighter">System Idle</h3>
                    <p className="text-[7px] lg:text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Waiting for next session</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Timeline Records */}
            <div className="flex-1 h-full flex flex-col min-h-0">
               <div className="flex items-center justify-between mb-3 lg:mb-4 px-2 shrink-0">
                 <h2 className="text-[7px] lg:text-[10px] font-black uppercase tracking-[0.6em] text-slate-400">Daily Cmt Timeline</h2>
                 <div className="bg-white border border-slate-100 px-2 lg:px-4 py-1 rounded-lg shadow-xs">
                    <span className="text-[6px] lg:text-[8px] font-black uppercase tracking-widest text-indigo-600">{homepageTasks.length} Total</span>
                 </div>
               </div>

               <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                  <div className="flex flex-col gap-2 lg:gap-3 h-auto min-h-0 pb-10">
                    {otherTasks.length > 0 ? (
                      otherTasks.map(task => (
                        <div key={task.id} className="min-h-[80px] lg:min-h-0">
                          <TaskCard 
                            task={task} 
                            status={task.status} 
                            isNextUpcoming={(task as any).isNextUpcoming}
                            onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} 
                            onDelete={handleDeleteTask}
                            isTV={true}
                            fontSizeClass={dynamicFontSize}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center bg-white rounded-[2rem] lg:rounded-[3rem] border border-slate-100 text-slate-100 py-20">
                         <Calendar size={40} className="mb-4 opacity-10" />
                         <span className="italic font-black uppercase tracking-[0.3em] text-xs lg:text-lg">Timeline Clear</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 custom-scrollbar">
            <WelcomeTab 
              tasks={welcomeTasks} 
              onAdd={async (wt) => await storageService.saveWelcomeTask(wt)} 
              onStart={(id) => storageService.setWelcomeActive(id, true)} 
              onStop={() => storageService.setWelcomeActive('', false)} 
              onDelete={(id) => storageService.deleteWelcomeTask(id)} 
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center">
            <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[3rem] shadow-xl border border-slate-50 w-full">
              <div className="flex items-center gap-4 lg:gap-6 mb-8 lg:mb-10 justify-center">
                 <div className="w-12 h-12 lg:w-14 lg:h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <AlertCircle size={24} lg:size={30} />
                 </div>
                 <h3 className="text-sm lg:text-lg font-black text-rose-600 uppercase tracking-[0.4em] lg:tracking-[0.6em]">Real-Time Signal Broadcast</h3>
              </div>
              <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] lg:rounded-[2rem] px-6 lg:px-8 py-5 lg:py-6 focus:border-rose-300 focus:bg-white transition-all outline-none font-bold text-lg lg:text-2xl text-center leading-relaxed" placeholder="Critical announcement content..." rows={2} value={emergencyInput} onChange={(e) => setEmergencyInput(e.target.value)} />
              <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-6 lg:mt-8 bg-rose-600 text-white font-black uppercase tracking-[0.3em] lg:tracking-[0.4em] py-5 lg:py-6 rounded-[1.5rem] lg:rounded-[2rem] shadow-lg hover:bg-rose-700 transition-all disabled:opacity-30 active:scale-95">Push Signal Broadcast</button>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 lg:px-16 py-3 lg:py-6 bg-white border-t border-slate-100 flex justify-center gap-10 lg:gap-20 shrink-0">
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex items-center gap-2 lg:gap-3 transition-all group ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-105' : 'text-slate-300 hover:text-slate-500'}`}>
          <LayoutDashboard size={18} lg:size={22} />
          <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.4em]">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex items-center gap-2 lg:gap-3 transition-all group ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-105' : 'text-slate-300 hover:text-slate-500'}`}>
          <UserPlus size={18} lg:size={22} />
          <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.4em]">Reception</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex items-center gap-2 lg:gap-3 transition-all group ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-105' : 'text-slate-300 hover:text-rose-400'}`}>
          <AlertCircle size={18} lg:size={22} />
          <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.4em]">Priority</span>
        </button>
      </footer>

      {isModalOpen && (
        <TaskModal 
          task={editingTask} 
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
          onSave={handleSaveTask} 
          onDelete={handleDeleteTask} 
        />
      )}
      
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 lg:p-16 animate-in slide-in-from-top duration-500">
          <div className="flex justify-between items-center mb-6 lg:mb-10 max-w-7xl mx-auto w-full">
            <h2 className="text-xl lg:text-4xl font-black text-slate-900 tracking-tightest italic uppercase">Archive Access</h2>
            <button onClick={() => setIsSearchOpen(false)} className="p-3 lg:p-5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all active:scale-90"><X size={24} lg:size={30} /></button>
          </div>
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <input type="text" placeholder="Global search archive..." className="w-full bg-slate-50 border-[2px] lg:border-[3px] border-slate-100 rounded-[1.5rem] lg:rounded-[2rem] px-6 lg:px-10 py-5 lg:py-8 text-xl lg:text-3xl font-black outline-none focus:border-indigo-600 transition-all mb-6 lg:mb-10 shadow-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <div className="flex-1 overflow-y-auto pr-6 flex flex-col gap-5 content-start pb-16 custom-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map(t => <div key={t.id} className="min-h-max"><TaskCard task={t} status={t.date === getTodayString() ? TaskStatus.ACTIVE : TaskStatus.UPCOMING} onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); setIsSearchOpen(false); }} onDelete={handleDeleteTask} /></div>)
              ) : searchQuery && (
                <div className="col-span-full py-20 text-center">
                   <p className="text-xl lg:text-2xl font-black text-slate-200 uppercase tracking-widest">No matching records</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;