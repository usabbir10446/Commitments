import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tab, Task, TaskStatus, EmergencyMessage, WelcomeTask } from './types';
import { storageService } from './services/storageService';
import { initializeDatabase } from './services/setupData';
import { getCurrentMinutesFromMidnight, parseTimeBlock, getTodayString } from './utils/time';
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
    if (count === 0) return 'text-xl xl:text-3xl';
    const maxTitleLen = Math.max(...otherTasks.map(t => t.title.length));
    if (count <= 3) {
      if (maxTitleLen > 60) return 'text-lg xl:text-2xl';
      return 'text-xl xl:text-4xl';
    }
    if (count <= 6) return 'text-base xl:text-2xl';
    return 'text-sm xl:text-xl';
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
      
      {/* GLOBAL HEADER - Strict 3-column layout */}
      <header className="px-6 xl:px-12 py-3 grid grid-cols-[1.2fr_2fr_1.2fr] items-center border-b border-slate-100 bg-white/95 backdrop-blur-2xl z-40 shrink-0">
        <div className="flex items-center gap-3 xl:gap-4">
          <div className="w-9 h-9 xl:w-11 xl:h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="text-sky-400 w-[18px] h-[18px] xl:w-[22px] xl:h-[22px]" />
          </div>
          <div className="block">
            <h1 className="text-sm xl:text-xl font-black tracking-tightest uppercase italic text-slate-900 leading-none">Daily <span className="text-sky-400">Cmt</span></h1>
            <p className="text-[5px] xl:text-[8px] font-black text-slate-400 uppercase tracking-[0.5em] mt-1 whitespace-nowrap">DASHBOARD 2.0</p>
          </div>
        </div>

        <div className="flex justify-center transform scale-75 sm:scale-85 md:scale-90 xl:scale-100">
          <LiveClock isCompact />
        </div>

        <div className="flex items-center justify-end gap-2 xl:gap-4">
           <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-3 xl:px-6 py-2 xl:py-3 bg-indigo-600 text-white font-black text-[8px] xl:text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2">
             <Plus className="w-[14px] h-[14px] xl:w-[16px] xl:h-[16px]" strokeWidth={3} />
             <span>NEW CMT</span>
           </button>
           <button onClick={() => setIsSearchOpen(true)} className="w-9 h-9 xl:w-11 xl:h-11 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-90">
             <Search className="w-[18px] h-[18px] xl:w-[20px] xl:h-[20px]" />
           </button>
        </div>
      </header>

      <main className="flex-1 p-4 xl:p-10 overflow-hidden min-h-0">
        {activeTab === Tab.TASKS ? (
          /* FIXED DUAL-COLUMN LAYOUT (Always Side-by-Side) */
          <div className="h-full w-full flex flex-row gap-5 xl:gap-10 min-h-0">
            {/* Left: Priority Monitor (42%) */}
            <div className="w-[42%] h-full flex flex-col min-h-0">
              <div className="flex items-center gap-2 xl:gap-3 mb-4 px-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-blink-intense shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
                <h2 className="text-[8px] xl:text-[11px] font-black uppercase tracking-[0.5em] text-slate-900">Priority Monitor</h2>
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
                  <div className="h-full bg-white rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center p-10 text-center shadow-sm">
                    <Calendar className="text-slate-100 mb-6 w-[60px] h-[60px] xl:w-[80px] xl:h-[80px]" />
                    <h3 className="text-xl xl:text-3xl font-black text-slate-200 uppercase tracking-tighter italic">System Idle</h3>
                    <p className="text-[9px] xl:text-[11px] text-slate-400 font-bold uppercase tracking-[0.5em] mt-3">Ready for broadcast</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Daily Timeline (58%) */}
            <div className="flex-1 h-full flex flex-col min-h-0">
               <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                 <h2 className="text-[8px] xl:text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Daily Cmt Timeline</h2>
                 <div className="bg-white border border-slate-100 px-3 xl:px-5 py-1.5 rounded-xl shadow-xs">
                    <span className="text-[7px] xl:text-[9px] font-black uppercase tracking-widest text-indigo-600">{homepageTasks.length} Sessions Synchronized</span>
                 </div>
               </div>

               <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 xl:pr-4">
                  <div className="flex flex-col gap-3 xl:gap-4 h-auto min-h-0 pb-20">
                    {otherTasks.length > 0 ? (
                      otherTasks.map(task => (
                        <div key={task.id} className="min-h-[100px] xl:min-h-0">
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
                      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-50 text-slate-100">
                         <Calendar className="mb-4 opacity-10 w-[60px] h-[60px]" />
                         <span className="italic font-black uppercase tracking-[0.4em] text-xs xl:text-xl">Timeline Vacant</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 xl:px-10 custom-scrollbar">
            <WelcomeTab 
              tasks={welcomeTasks} 
              onAdd={async (wt) => await storageService.saveWelcomeTask(wt)} 
              onStart={(id) => storageService.setWelcomeActive(id, true)} 
              onStop={() => storageService.setWelcomeActive('', false)} 
              onDelete={(id) => storageService.deleteWelcomeTask(id)} 
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center px-6">
            <div className="bg-white p-10 xl:p-16 rounded-[3rem] xl:rounded-[4rem] shadow-2xl border border-slate-50 w-full text-center">
              <div className="flex flex-col items-center gap-6 mb-12">
                 <div className="w-16 h-16 xl:w-20 xl:h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner">
                    <AlertCircle className="w-[32px] h-[32px] xl:w-[40px] xl:h-[40px]" />
                 </div>
                 <h3 className="text-base xl:text-2xl font-black text-rose-600 uppercase tracking-[0.5em]">Urgent Signal Broadcast</h3>
              </div>
              <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-10 py-8 focus:border-rose-300 focus:bg-white transition-all outline-none font-bold text-2xl xl:text-3xl text-center leading-relaxed" placeholder="Broadcast content goes here..." rows={2} value={emergencyInput} onChange={(e) => setEmergencyInput(e.target.value)} />
              <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-10 bg-rose-600 text-white font-black uppercase tracking-[0.4em] py-6 xl:py-8 rounded-[2.5rem] shadow-xl hover:bg-rose-700 transition-all disabled:opacity-30 active:scale-95">Push Signal Now</button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER - Unified bottom navigation */}
      <footer className="px-10 xl:px-20 py-4 xl:py-8 bg-white border-t border-slate-100 flex justify-center gap-12 xl:gap-32 shrink-0">
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex items-center gap-3 transition-all group ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
          <LayoutDashboard className="w-[22px] h-[22px] xl:w-[26px] xl:h-[26px]" />
          <span className="text-[8px] xl:text-[11px] font-black uppercase tracking-[0.4em]">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex items-center gap-3 transition-all group ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
          <UserPlus className="w-[22px] h-[22px] xl:w-[26px] xl:h-[26px]" />
          <span className="text-[8px] xl:text-[11px] font-black uppercase tracking-[0.4em]">Reception</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex items-center gap-3 transition-all group ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-300 hover:text-rose-400'}`}>
          <AlertCircle className="w-[22px] h-[22px] xl:w-[26px] xl:h-[26px]" />
          <span className="text-[8px] xl:text-[11px] font-black uppercase tracking-[0.4em]">Broadcast</span>
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
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-8 xl:p-20 animate-in slide-in-from-top duration-500">
          <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto w-full">
            <h2 className="text-2xl xl:text-5xl font-black text-slate-900 tracking-tightest italic uppercase">Database Archive</h2>
            <button onClick={() => setIsSearchOpen(false)} className="p-4 xl:p-6 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"><X className="w-[30px] h-[30px] xl:w-[36px] xl:h-[36px]" /></button>
          </div>
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <input type="text" placeholder="Scan records..." className="w-full bg-slate-50 border-[3px] border-slate-100 rounded-[2rem] px-10 py-8 xl:py-10 text-2xl xl:text-4xl font-black outline-none focus:border-indigo-600 transition-all mb-10 shadow-2xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <div className="flex-1 overflow-y-auto pr-6 flex flex-col gap-6 content-start pb-20 custom-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map(t => <div key={t.id} className="min-h-max"><TaskCard task={t} status={t.date === getTodayString() ? TaskStatus.ACTIVE : TaskStatus.UPCOMING} onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); setIsSearchOpen(false); }} onDelete={handleDeleteTask} /></div>)
              ) : searchQuery && (
                <div className="col-span-full py-20 text-center">
                   <p className="text-xl xl:text-3xl font-black text-slate-200 uppercase tracking-[0.5em] italic">No Matches Found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;