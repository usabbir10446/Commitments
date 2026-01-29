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
import { Calendar, AlertCircle, Plus, Search, X, UserPlus, Activity, LayoutDashboard, Camera, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TASKS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [welcomeTasks, setWelcomeTasks] = useState<WelcomeTask[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  
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

  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      // Small delay to ensure any open UI state is settled
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#FBFBFD',
        logging: false,
        onclone: (clonedDoc) => {
          const elementsToHide = clonedDoc.querySelectorAll('.no-capture');
          elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Canvas to Blob failed");

      const file = new File([blob], `Daily_Cmt_${getTodayString()}.png`, { type: 'image/png' });

      // Direct check for sharing - some mobile browsers are very strict about user activation
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Daily Cmt Dashboard',
            text: `Schedule for ${getTodayString()}`,
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            downloadCanvas(canvas);
          }
        }
      } else {
        downloadCanvas(canvas);
      }
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `Daily_Cmt_${getTodayString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

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
    if (count === 0) return 'text-lg lg:text-3xl';
    const maxTitleLen = Math.max(...otherTasks.map(t => t.title.length));
    if (count <= 3) {
      if (maxTitleLen > 60) return 'text-base lg:text-2xl';
      return 'text-lg lg:text-4xl';
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
      
      {/* HEADER - Responsive */}
      <header className="px-4 lg:px-12 py-2 lg:py-4 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1.2fr_2fr_1.2fr] items-center border-b border-slate-100 bg-white/95 backdrop-blur-2xl z-40 shrink-0">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="w-8 h-8 lg:w-14 lg:h-14 bg-slate-900 rounded-lg lg:rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="text-sky-400 w-4 h-4 lg:w-7 lg:h-7" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xs lg:text-2xl font-black tracking-tightest uppercase italic text-slate-900 leading-none">Daily <span className="text-sky-400">Cmt</span></h1>
            <p className="text-[5px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-1">DASHBOARD 2.0</p>
          </div>
        </div>

        <div className="flex justify-center transform scale-[0.65] lg:scale-110">
          <LiveClock isCompact />
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:gap-5 no-capture">
           <button onClick={handleCapture} disabled={isCapturing} title="Screenshot & Share" className="w-8 h-8 lg:w-14 lg:h-14 bg-white border border-slate-100 rounded-lg lg:rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90 disabled:opacity-50">
             {isCapturing ? <Loader2 size={16} className="animate-spin lg:w-6 lg:h-6" /> : <Camera size={16} className="lg:w-7 lg:h-7" />}
           </button>
           <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-2 lg:px-8 py-2 lg:py-4 bg-indigo-600 text-white font-black text-[7px] lg:text-xs uppercase tracking-[0.2em] rounded-lg lg:rounded-2xl hover:bg-slate-900 transition-all shadow-xl active:scale-95 flex items-center gap-1 lg:gap-3">
             <Plus className="w-3 h-3 lg:w-5 lg:h-5" strokeWidth={3} />
             <span>NEW</span>
           </button>
           <button onClick={() => setIsSearchOpen(true)} className="w-8 h-8 lg:w-14 lg:h-14 bg-white border border-slate-100 rounded-lg lg:rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90">
             <Search size={16} className="lg:w-6 lg:h-6" />
           </button>
        </div>
      </header>

      <main className="flex-1 p-3 lg:p-12 overflow-hidden min-h-0">
        {activeTab === Tab.TASKS ? (
          <div className="h-full w-full flex flex-col lg:flex-row gap-4 lg:gap-12 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
            <div className="w-full lg:w-[42%] flex flex-col min-h-0 shrink-0 lg:shrink">
              <div className="flex items-center gap-2 mb-2 lg:mb-6 px-2">
                <div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-emerald-500 animate-blink-intense shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
                <h2 className="text-[6px] lg:text-sm font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-slate-900">Priority Monitor</h2>
              </div>
              
              <div className="flex-1 lg:min-h-0">
                {activeTask ? (
                  <TaskCard 
                    task={activeTask} 
                    status={TaskStatus.ACTIVE} 
                    onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} 
                    onDelete={handleDeleteTask}
                    isTVFeatured={true}
                  />
                ) : (
                  <div className="h-40 lg:h-full bg-white rounded-[1.5rem] lg:rounded-[4rem] border border-slate-100 flex flex-col items-center justify-center p-6 lg:p-14 text-center shadow-sm">
                    <Calendar className="text-slate-100 mb-2 lg:mb-10 w-8 h-8 lg:w-32 lg:h-32" />
                    <h3 className="text-xs lg:text-5xl font-black text-slate-200 uppercase italic">System Idle</h3>
                    <p className="text-[6px] lg:text-sm text-slate-400 font-bold uppercase tracking-[0.3em] lg:tracking-[0.6em] mt-3">Ready for broadcast</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mt-2 lg:mt-0">
               <div className="flex items-center justify-between mb-2 lg:mb-6 px-2 shrink-0">
                 <h2 className="text-[6px] lg:text-sm font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-slate-400">Daily Timeline</h2>
                 <div className="bg-white border border-slate-100 px-2 lg:px-6 py-0.5 lg:py-2 rounded-lg lg:rounded-2xl shadow-xs">
                    <span className="text-[5px] lg:text-xs font-black uppercase tracking-widest text-indigo-600">{homepageTasks.length} Sessions</span>
                 </div>
               </div>

               <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar lg:pr-6">
                  <div className="flex flex-col gap-2 lg:gap-6 h-auto min-h-0 pb-10">
                    {otherTasks.length > 0 ? (
                      otherTasks.map(task => (
                        <div key={task.id} className="min-h-max lg:min-h-0">
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
                      <div className="py-10 lg:py-32 flex flex-col items-center justify-center bg-white rounded-[1.5rem] lg:rounded-[4rem] border border-slate-50 text-slate-100">
                         <Calendar className="mb-4 opacity-10 w-10 h-10 lg:w-24 lg:h-24" />
                         <span className="italic font-black uppercase tracking-[0.3em] text-[10px] lg:text-3xl">No Records</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-1 lg:px-12 custom-scrollbar">
            <WelcomeTab 
              tasks={welcomeTasks} 
              onAdd={async (wt) => await storageService.saveWelcomeTask(wt)} 
              onStart={(id) => storageService.setWelcomeActive(id, true)} 
              onStop={() => storageService.setWelcomeActive('', false)} 
              onDelete={(id) => storageService.deleteWelcomeTask(id)} 
            />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full h-full flex items-center justify-center px-4">
            <div className="bg-white p-6 lg:p-20 rounded-[2rem] lg:rounded-[5rem] shadow-2xl border border-slate-50 w-full text-center">
              <div className="flex flex-col items-center gap-4 lg:gap-8 mb-6 lg:mb-16">
                 <div className="w-12 h-12 lg:w-28 lg:h-28 bg-rose-50 text-rose-600 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 lg:w-16 lg:h-16" />
                 </div>
                 <h3 className="text-sm lg:text-4xl font-black text-rose-600 uppercase tracking-[0.3em] lg:tracking-[0.6em]">Urgent Broadcast</h3>
              </div>
              <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-[3rem] px-6 lg:px-14 py-4 lg:py-10 focus:border-rose-300 focus:bg-white transition-all outline-none font-bold text-lg lg:text-5xl text-center leading-relaxed" placeholder="Content..." rows={2} value={emergencyInput} onChange={(e) => setEmergencyInput(e.target.value)} />
              <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-6 lg:mt-14 bg-rose-600 text-white font-black uppercase tracking-[0.3em] lg:tracking-[0.5em] py-4 lg:py-12 rounded-xl lg:rounded-[3.5rem] shadow-xl hover:bg-rose-700 transition-all disabled:opacity-30 active:scale-95 text-xs lg:text-2xl">Push Signal</button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER - Updated Tab Names */}
      <footer className="px-4 lg:px-24 py-2 lg:py-10 bg-white border-t border-slate-100 flex justify-around lg:justify-center gap-4 lg:gap-40 shrink-0 no-capture">
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex flex-col lg:flex-row items-center gap-0.5 lg:gap-4 transition-all ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <LayoutDashboard className="w-4 h-4 lg:w-8 lg:h-8" />
          <span className="text-[5px] lg:text-sm font-black uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex flex-col lg:flex-row items-center gap-0.5 lg:gap-4 transition-all ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
          <UserPlus className="w-4 h-4 lg:w-8 lg:h-8" />
          <span className="text-[5px] lg:text-sm font-black uppercase tracking-widest">Welcome</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex flex-col lg:flex-row items-center gap-0.5 lg:gap-4 transition-all ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-300'}`}>
          <AlertCircle className="w-4 h-4 lg:w-8 lg:h-8" />
          <span className="text-[5px] lg:text-sm font-black uppercase tracking-widest">Emg Msg</span>
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
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-6 lg:p-24 animate-in slide-in-from-top duration-500">
          <div className="flex justify-between items-center mb-6 lg:mb-14 w-full max-w-7xl mx-auto">
            <h2 className="text-xl lg:text-6xl font-black text-slate-900 italic uppercase">Archive</h2>
            <button onClick={() => setIsSearchOpen(false)} className="p-3 lg:p-8 bg-slate-100 rounded-xl lg:rounded-3xl active:scale-90 transition-all"><X className="w-5 h-5 lg:w-12 lg:h-12" /></button>
          </div>
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <input type="text" placeholder="Search..." className="w-full bg-slate-50 border-2 lg:border-[4px] border-slate-100 rounded-xl lg:rounded-[3rem] px-6 lg:px-14 py-4 lg:py-14 text-lg lg:text-6xl font-black outline-none focus:border-indigo-600 transition-all mb-6 shadow-2xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 lg:gap-8 pb-20 custom-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map(t => <div key={t.id} className="min-h-max"><TaskCard task={t} status={t.date === getTodayString() ? TaskStatus.ACTIVE : TaskStatus.UPCOMING} onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); setIsSearchOpen(false); }} onDelete={handleDeleteTask} /></div>)
              ) : searchQuery && (
                <div className="col-span-full py-10 text-center">
                   <p className="text-lg lg:text-5xl font-black text-slate-200 uppercase tracking-widest">No Matches</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;