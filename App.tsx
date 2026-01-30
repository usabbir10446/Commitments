
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tab, Task, TaskStatus, EmergencyMessage, WelcomeTask, UserRole, UserProfile } from './types';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { initializeDatabase } from './services/setupData';
import { getCurrentMinutesFromMidnight, parseTimeBlock, getTodayString, getTomorrowString, formatFriendlyDate, formatBanglaDate } from './utils/time';
import { db } from './services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import LiveClock from './components/LiveClock';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import EmergencyOverlay from './components/EmergencyOverlay';
import WelcomeOverlay from './components/WelcomeOverlay';
import WelcomeTab from './components/WelcomeTab';
import AuthModal from './components/AuthModal';
import { Calendar, AlertCircle, Plus, Search, X, UserPlus, Activity, LayoutDashboard, Camera, Loader2, MapPin, UserCheck, FileText, Clock, ChevronRight, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  
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

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    const unsubAuth = authService.subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
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
  }, [currentUser]);

  const handleCapture = async () => {
    if (!reportRef.current) return;
    setIsCapturing(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(reportRef.current, {
        useCORS: true,
        scale: 3, 
        backgroundColor: '#ffffff',
        logging: false,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Canvas to Blob failed");
      const tomorrow = getTomorrowString();
      const file = new File([blob], `Daily_Cmt_Report_${tomorrow}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Daily Cmt Report',
            text: `Schedule for ${tomorrow}`,
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') downloadCanvas(canvas);
        }
      } else downloadCanvas(canvas);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `Daily_Cmt_Report_${getTomorrowString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!isAdmin) return;
    const saved = await storageService.saveTask({ ...taskData, id: editingTask?.id });
    if (saved) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!isAdmin) return;
    if (await storageService.deleteTask(id)) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const triggerEmergency = async (text: string) => {
    if (!isAdmin || !text.trim()) return;
    const result = await storageService.broadcastEmergency(text);
    if (result) setEmergencyInput('');
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
      const ongoing = mappedTasks.filter(t => currentMinutes >= t.times.start && currentMinutes < t.times.end);
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

  const groupedUpcomingTasks = useMemo(() => {
    const today = getTodayString();
    const futureTasks = tasks.filter(t => t.date > today);
    
    const groups: { [key: string]: Task[] } = {};
    futureTasks.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    return Object.entries(groups)
      .map(([date, dateTasks]) => ({
        date,
        tasks: dateTasks.map(t => ({
          ...t,
          times: parseTimeBlock(t.timeBlock)
        })).sort((a, b) => a.times.start - b.times.start)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks]);

  const activeTask = homepageTasks.find(t => t.status === TaskStatus.ACTIVE);
  const otherTasks = homepageTasks.filter(t => t.status !== TaskStatus.ACTIVE);

  const dynamicFontSize = useMemo(() => {
    const count = otherTasks.length;
    if (count > 6) return 'text-[10px] lg:text-xl';
    if (count > 4) return 'text-xs lg:text-2xl';
    return 'text-sm lg:text-3xl';
  }, [otherTasks]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  if (!authInitialized) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  if (!currentUser) return <AuthModal />;

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#FBFBFD]">
      <EmergencyOverlay message={activeEmergency} onClose={() => setActiveEmergency(null)} />
      <WelcomeOverlay task={activeWelcome} onStop={() => isAdmin && storageService.setWelcomeActive('', false)} />
      
      {/* HIDDEN REPORT VIEW FOR SCREENSHOT */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={reportRef} className="w-[1200px] p-20 bg-white min-h-[1600px] flex flex-col">
          <div className="flex justify-between items-center mb-16 border-b-4 border-slate-900 pb-10">
            <div>
              <h1 className="text-7xl font-black text-slate-900 uppercase italic tracking-tighter">DAILY <span className="text-sky-500">CMT</span> REPORT</h1>
              <p className="text-2xl font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Operational Schedule</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-indigo-600 uppercase italic">{formatBanglaDate(new Date())}</p>
              <p className="text-4xl font-black text-slate-900 uppercase">{formatFriendlyDate(new Date())}</p>
            </div>
          </div>
          <div className="flex-1 space-y-10">
            {tasks.filter(t => t.date === getTodayString()).length > 0 ? (
              tasks.filter(t => t.date === getTodayString()).map(task => (
                <div key={task.id} className="border-4 border-slate-100 p-10 rounded-[3rem] flex gap-10 items-center">
                  <div className="w-48 text-5xl font-black text-indigo-600 italic shrink-0 border-r-4 border-slate-50">{task.timeBlock.split(' ')[0]}</div>
                  <div className="flex-1">
                    <h3 className="text-5xl font-black text-slate-900 uppercase mb-4">{task.title}</h3>
                    <div className="flex items-center gap-4 text-3xl font-bold text-slate-500">
                      <MapPin size={32} />
                      <span className="uppercase">{task.venue}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : <p className="text-center text-4xl font-black text-slate-200 uppercase italic py-20">No Tasks Scheduled</p>}
          </div>
          <div className="mt-20 pt-10 border-t-2 border-slate-100 text-center">
            <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">Generated by Daily Cmt Intelligence System</p>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="px-3 lg:px-12 py-3 lg:py-4 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-2xl z-40 shrink-0">
        <div className="flex items-center gap-1.5 lg:gap-4 shrink-0 min-w-0">
          <div className="w-8 h-8 lg:w-12 lg:h-12 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="text-sky-400 w-4 h-4 lg:w-6 lg:h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xs lg:text-xl font-black tracking-tightest uppercase italic text-slate-900 leading-none">Daily <span className="text-sky-400">Cmt</span></h1>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-1 overflow-visible">
          <div className="max-w-full">
            <LiveClock isCompact />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:gap-4 shrink-0 no-capture min-w-0">
           {isAdmin && (
             <>
               <button onClick={handleCapture} disabled={isCapturing} title="Screenshot & Share" className="w-8 h-8 lg:w-12 lg:h-12 bg-white border border-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90 disabled:opacity-50 shrink-0">
                 {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} className="lg:w-6 lg:h-6" />}
               </button>
               <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-2 lg:px-6 py-2 lg:py-3.5 bg-indigo-600 text-white font-black text-[8px] lg:text-[10px] uppercase tracking-wider rounded-lg lg:rounded-xl hover:bg-slate-900 transition-all shadow-xl active:scale-95 flex items-center gap-1 shrink-0">
                 <Plus className="w-3 h-3 lg:w-4 lg:h-4" strokeWidth={3} />
                 <span>NEW</span>
               </button>
             </>
           )}
           <button onClick={() => setIsSearchOpen(true)} className="w-8 h-8 lg:w-12 lg:h-12 bg-white border border-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90 shrink-0">
             <Search size={16} className="lg:w-6 lg:h-6" />
           </button>
           <button onClick={() => authService.logout()} className="w-8 h-8 lg:w-12 lg:h-12 bg-rose-50 border border-rose-100 rounded-lg lg:rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-600 shadow-sm transition-all active:scale-90 shrink-0" title="Logout">
             <LogOut size={16} />
           </button>
        </div>
      </header>

      <main className="flex-1 p-2 lg:p-12 overflow-hidden min-h-0">
        {activeTab === Tab.TASKS ? (
          <div className="h-full w-full flex flex-col lg:flex-row gap-4 lg:gap-12 min-h-0 overflow-hidden">
            <div className="w-full lg:w-[42%] flex flex-col min-h-0 shrink-0 lg:shrink">
              <div className="flex items-center gap-2 mb-2 lg:mb-6 px-1 shrink-0">
                <div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-emerald-500 animate-blink-intense" />
                <h2 className="text-[8px] lg:text-sm font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-slate-900">Priority Monitor</h2>
              </div>
              <div className="flex-1 min-h-0">
                {activeTask ? (
                  <TaskCard task={activeTask} status={TaskStatus.ACTIVE} onEdit={(t) => isAdmin && { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDeleteTask} isTVFeatured={true} isAdmin={isAdmin} />
                ) : (
                  <div className="h-full bg-white rounded-[1.5rem] lg:rounded-[4rem] border border-slate-100 flex flex-col items-center justify-center p-6 lg:p-14 text-center shadow-sm">
                    <Calendar className="text-slate-100 mb-4 lg:mb-10 w-12 h-12 lg:w-32 lg:h-32" />
                    <h3 className="text-xs lg:text-5xl font-black text-slate-200 uppercase italic">Staff time</h3>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 mt-2 lg:mt-0">
               <div className="flex items-center justify-between mb-2 lg:mb-6 px-1 shrink-0">
                 <h2 className="text-[8px] lg:text-sm font-black uppercase tracking-[0.4em] lg:tracking-[0.6em] text-slate-400">Daily Timeline</h2>
               </div>
               <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-2 lg:gap-3 h-full overflow-y-auto custom-scrollbar pr-1">
                    {otherTasks.length > 0 ? (
                      otherTasks.map(task => (
                        <div key={task.id} className="min-h-[70px] lg:min-h-0">
                          <TaskCard task={task} status={task.status} onEdit={(t) => isAdmin && { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDeleteTask} isAdmin={isAdmin} fontSizeClass={dynamicFontSize} />
                        </div>
                      ))
                    ) : <div className="h-full flex flex-col items-center justify-center bg-white rounded-[1.5rem] lg:rounded-[4rem] border border-slate-50 text-slate-100"><p className="italic font-black uppercase tracking-[0.3em] text-xs lg:text-3xl">No Records</p></div>}
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === Tab.UPCOMING ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 lg:space-y-6 overflow-y-auto custom-scrollbar pr-1 lg:pr-4">
            {groupedUpcomingTasks.length > 0 ? groupedUpcomingTasks.map(group => (
              <div key={group.date} className="bg-white rounded-[1.5rem] lg:rounded-[4rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col lg:flex-row mb-4 lg:mb-10">
                <div className="w-full lg:w-72 bg-slate-50 p-4 lg:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100 shrink-0">
                  <p className="text-[8px] lg:text-sm font-black text-indigo-500 uppercase tracking-widest mb-1">{formatBanglaDate(new Date(group.date))}</p>
                  <h3 className="text-lg lg:text-4xl font-black text-slate-900 leading-tight uppercase tracking-tighter italic">{formatFriendlyDate(new Date(group.date))}</h3>
                </div>
                <div className="flex-1 p-4 lg:p-12 space-y-3 lg:space-y-8">
                  {group.tasks.map(task => (
                    <div key={task.id} className="p-3 lg:p-10 bg-slate-50/50 rounded-xl lg:rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-10 group">
                      <div className="flex flex-col lg:items-center lg:justify-center lg:border-r lg:border-slate-100 lg:pr-10 shrink-0"><span className="text-xs lg:text-2xl font-black text-indigo-600 tracking-tighter italic tabular-nums">{task.timeBlock}</span></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm lg:text-3xl font-black text-slate-900 uppercase tracking-tight mb-1 lg:mb-4 truncate">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 lg:gap-8">
                          <div className="flex items-center gap-1 lg:gap-3 text-slate-500"><MapPin size={12} className="lg:w-6 lg:h-6" /><span className="text-[10px] lg:text-xl font-bold uppercase tracking-wide truncate">{task.venue}</span></div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2 lg:p-6 bg-white border border-slate-100 rounded-lg lg:rounded-3xl text-indigo-600 shadow-sm active:scale-90 transition-all shrink-0 self-end lg:self-center"><ChevronRight size={18} className="lg:w-8 lg:h-8" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) : <div className="flex-1 flex flex-col items-center justify-center py-10 bg-white rounded-[2rem] border-2 border-dashed border-slate-100"><p className="text-sm lg:text-3xl font-black text-slate-200 uppercase italic">No Future Sessions</p></div>}
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-1 lg:px-12 custom-scrollbar">
            <WelcomeTab tasks={welcomeTasks} onAdd={async (wt) => isAdmin ? await storageService.saveWelcomeTask(wt) : false} onStart={(id) => isAdmin && storageService.setWelcomeActive(id, true)} onStop={() => isAdmin && storageService.setWelcomeActive('', false)} onDelete={(id) => isAdmin && storageService.deleteWelcomeTask(id)} isAdmin={isAdmin} />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full h-full flex items-center justify-center p-4">
            <div className="bg-white p-6 lg:p-20 rounded-[2rem] lg:rounded-[5rem] shadow-2xl border border-slate-50 w-full text-center">
              <div className="flex flex-col items-center gap-4 lg:gap-8 mb-6 lg:mb-16">
                 <div className="w-12 h-12 lg:w-28 lg:h-28 bg-rose-50 text-rose-600 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center"><AlertCircle className="w-6 h-6 lg:w-16 lg:h-16" /></div>
                 <h3 className="text-sm lg:text-4xl font-black text-rose-600 uppercase tracking-[0.3em] lg:tracking-[0.6em]">Urgent Broadcast</h3>
              </div>
              {isAdmin ? (
                <>
                  <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-[3rem] px-4 lg:px-14 py-4 lg:py-10 focus:border-rose-300 focus:bg-white transition-all outline-none font-bold text-lg lg:text-5xl text-center leading-relaxed" placeholder="Content..." rows={2} value={emergencyInput} onChange={(e) => setEmergencyInput(e.target.value)} />
                  <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-6 lg:mt-14 bg-rose-600 text-white font-black uppercase tracking-widest py-4 lg:py-12 rounded-xl lg:rounded-[3.5rem] shadow-xl hover:bg-rose-700 transition-all disabled:opacity-30 active:scale-95 text-xs lg:text-2xl italic">Push Signal</button>
                </>
              ) : (
                <p className="text-xl font-bold text-slate-400">Viewers can monitor but not trigger broadcasts.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="px-1 lg:px-24 bg-white border-t border-slate-200 flex justify-around lg:justify-center gap-0 lg:gap-24 shrink-0 no-capture z-[999] shadow-[0_-4px_30px_rgba(0,0,0,0.08)] safe-area-bottom h-20 lg:h-24">
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex flex-col items-center justify-center gap-1.5 transition-all flex-1 ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <LayoutDashboard className={`w-6 h-6 lg:w-7 lg:h-7 ${activeTab === Tab.TASKS ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] lg:text-xs font-black uppercase tracking-tight">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab(Tab.UPCOMING)} className={`flex flex-col items-center justify-center gap-1.5 transition-all flex-1 ${activeTab === Tab.UPCOMING ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <Calendar className={`w-6 h-6 lg:w-7 lg:h-7 ${activeTab === Tab.UPCOMING ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] lg:text-xs font-black uppercase tracking-tight">Upcoming</span>
        </button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex flex-col items-center justify-center gap-1.5 transition-all flex-1 ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
          <UserPlus className={`w-6 h-6 lg:w-7 lg:h-7 ${activeTab === Tab.WELCOME ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] lg:text-xs font-black uppercase tracking-tight">Welcome</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex flex-col items-center justify-center gap-1.5 transition-all flex-1 ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-400'}`}>
          <AlertCircle className={`w-6 h-6 lg:w-7 lg:h-7 ${activeTab === Tab.EMERGENCY ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] lg:text-xs font-black uppercase tracking-tight">Emg Msg</span>
        </button>
      </footer>

      {isModalOpen && isAdmin && <TaskModal task={editingTask} onClose={() => { setIsModalOpen(false); setEditingTask(null); }} onSave={handleSaveTask} onDelete={handleDeleteTask} />}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-4 lg:p-24 animate-in slide-in-from-top duration-500">
          <div className="flex justify-between items-center mb-6 w-full max-w-7xl mx-auto">
            <h2 className="text-xl lg:text-6xl font-black text-slate-900 italic uppercase">Archive</h2>
            <button onClick={() => setIsSearchOpen(false)} className="p-2 lg:p-8 bg-slate-100 rounded-xl lg:rounded-3xl active:scale-90"><X className="w-8 h-8 lg:w-12 lg:h-12" /></button>
          </div>
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
            <input type="text" placeholder="Search..." className="w-full bg-slate-50 border-2 lg:border-[4px] border-slate-100 rounded-xl lg:rounded-[3rem] px-4 lg:px-14 py-4 lg:py-14 text-lg lg:text-6xl font-black outline-none focus:border-indigo-600 transition-all mb-6 shadow-2xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 lg:gap-8 pb-10 custom-scrollbar">
              {searchResults.length > 0 ? searchResults.map(t => <div key={t.id} className="min-h-max"><TaskCard task={t} status={t.date === getTodayString() ? TaskStatus.ACTIVE : TaskStatus.UPCOMING} onEdit={(task) => isAdmin && { setEditingTask(task); setIsModalOpen(true); setIsSearchOpen(false); }} onDelete={handleDeleteTask} isAdmin={isAdmin} /></div>) : searchQuery && <p className="text-center text-slate-200 font-black uppercase italic">No Matches</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
