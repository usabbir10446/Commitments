
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tab, Task, TaskStatus, EmergencyMessage, WelcomeTask, UserRole, UserProfile } from './types';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { initializeDatabase } from './services/setupData';
import { getCurrentMinutesFromMidnight, parseTimeBlock, getTodayString, getTomorrowString, formatFriendlyDate, formatBanglaDate } from './utils/time';
import { db } from './services/firebase';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import LiveClock from './components/LiveClock';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import EmergencyOverlay from './components/EmergencyOverlay';
import WelcomeOverlay from './components/WelcomeOverlay';
import WelcomeTab from './components/WelcomeTab';
import AuthModal from './components/AuthModal';
import { Calendar, AlertCircle, Plus, Search, X, UserPlus, Activity, LayoutDashboard, Camera, Loader2, MapPin, UserCheck, FileText, Clock, ChevronRight, LogOut, Download, CheckCircle2 } from 'lucide-react';
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
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedCaptureDate, setSelectedCaptureDate] = useState(getTodayString());
  
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
    
    // Temporarily switch viewDate to the selected capture date so the hidden report populates
    const previousViewDate = viewDate;
    setViewDate(selectedCaptureDate);
    setIsDateModalOpen(false);

    try {
      // Ensure re-render and fonts are loaded
      await new Promise(r => setTimeout(r, 600));
      const canvas = await html2canvas(reportRef.current, {
        useCORS: true,
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('hidden-report-container');
          if (el) el.style.left = '0';
        }
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Canvas to Blob failed");
      const filename = `CMT_Report_${selectedCaptureDate}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Daily CMT Report',
            text: `Schedule for ${selectedCaptureDate}`,
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') downloadCanvas(canvas, filename);
        }
      } else {
        downloadCanvas(canvas, filename);
      }
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setIsCapturing(false);
      // Restore previous view date
      setViewDate(previousViewDate);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
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

  const handleEditTask = useCallback((task: Task) => {
    if (isAdmin) {
      setEditingTask(task);
      setIsModalOpen(true);
      if (isSearchOpen) setIsSearchOpen(false);
    }
  }, [isAdmin, isSearchOpen]);

  const handleStartWelcome = useCallback((id: string) => {
    if (isAdmin) storageService.setWelcomeActive(id, true);
  }, [isAdmin]);

  const handleStopWelcome = useCallback(() => {
    if (isAdmin) storageService.setWelcomeActive('', false);
  }, [isAdmin]);

  const handleDeleteWelcome = useCallback((id: string) => {
    if (isAdmin) storageService.deleteWelcomeTask(id);
  }, [isAdmin]);

  if (!authInitialized) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  if (!currentUser) return <AuthModal />;

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#FBFBFD]">
      <EmergencyOverlay message={activeEmergency} onClose={() => setActiveEmergency(null)} />
      <WelcomeOverlay task={activeWelcome} onStop={handleStopWelcome} />
      
      {/* HIDDEN REPORT VIEW FOR SCREENSHOT - OPTIMIZED FOR 1200px WIDTH */}
      <div id="hidden-report-container" className="fixed left-[-9999px] top-0 pointer-events-none z-[-100]">
        <div ref={reportRef} className="w-[1000px] p-16 bg-white flex flex-col min-h-[1400px]">
          {/* BEAUTIFUL HEADER */}
          <div className="text-center mb-10 pb-8 border-b-[6px] border-slate-900">
            <h1 className="text-6xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">
              CMT of Respected Comdt
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-black text-indigo-600 uppercase italic">
                {formatBanglaDate(new Date(viewDate))}
              </p>
              <p className="text-4xl font-black text-slate-900 uppercase">
                {formatFriendlyDate(new Date(viewDate))}
              </p>
            </div>
          </div>

          {/* TASK LIST SECTION */}
          <div className="flex-1 space-y-6">
            {homepageTasks.length > 0 ? (
              homepageTasks.map((task) => (
                <div key={task.id} className="flex gap-8 items-center p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem]">
                  <div className="w-32 shrink-0 text-3xl font-black text-indigo-600 italic tabular-nums text-center border-r-2 border-slate-200 pr-8">
                    {task.timeBlock.split(' ')[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-black text-slate-900 uppercase mb-2">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xl font-bold text-slate-500">
                      <MapPin size={24} />
                      <span className="uppercase">{task.venue}</span>
                    </div>
                  </div>
                  {task.status === TaskStatus.ACTIVE && (
                     <div className="px-5 py-2 bg-emerald-100 border-2 border-emerald-400 rounded-full">
                       <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Active</span>
                     </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-32 flex flex-col items-center justify-center opacity-20">
                <Calendar size={120} />
                <p className="text-5xl font-black uppercase italic mt-10">No Tasks Scheduled</p>
              </div>
            )}
          </div>

          {/* BEAUTIFUL FOOTER & SIGNATURE */}
          <div className="mt-16 pt-10 border-t-[3px] border-slate-100 flex justify-between items-end">
             <div className="text-left">
                <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">System Verified Report</p>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Daily Cmt Intelligence • Security Protocol V2.1</p>
             </div>
             <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 mb-2">Kind Regards,</p>
                <div className="flex flex-col items-end">
                  <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Capt Usabbir</p>
                  <p className="text-xl font-black text-indigo-600 uppercase italic">GSO-3 (Coord)</p>
                  <p className="text-2xl font-black text-slate-900 uppercase tracking-widest mt-1">BIPSOT</p>
                </div>
             </div>
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
               <button onClick={() => setIsDateModalOpen(true)} disabled={isCapturing} title="Screenshot & Share" className="w-8 h-8 lg:w-12 lg:h-12 bg-white border border-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90 disabled:opacity-50 shrink-0">
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

      {/* DATE SELECTION MODAL FOR SCREENSHOT */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-8 lg:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-slate-50 relative animate-in zoom-in-95">
              <button onClick={() => setIsDateModalOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100"><X size={24} /></button>
              
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                  <Camera size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Report Generation</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Choose specific date for export</p>
              </div>

              <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Target Schedule Date</label>
                   <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                      <input 
                        type="date" 
                        value={selectedCaptureDate}
                        onChange={(e) => setSelectedCaptureDate(e.target.value)}
                        className="w-full bg-slate-50 border-4 border-transparent focus:border-indigo-100 rounded-2xl pl-16 pr-6 py-5 outline-none font-black text-lg transition-all"
                      />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setSelectedCaptureDate(getTodayString())}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${selectedCaptureDate === getTodayString() ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setSelectedCaptureDate(getTomorrowString())}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${selectedCaptureDate === getTomorrowString() ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      Tomorrow
                    </button>
                 </div>

                 <button 
                   onClick={handleCapture}
                   disabled={isCapturing}
                   className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all mt-4"
                 >
                   {isCapturing ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> <span>Generate CMT Report</span></>}
                 </button>
              </div>
           </div>
        </div>
      )}

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
                  <TaskCard 
                    task={activeTask} 
                    status={TaskStatus.ACTIVE} 
                    onEdit={handleEditTask} 
                    onDelete={handleDeleteTask} 
                    isTVFeatured={true} 
                    isAdmin={isAdmin} 
                  />
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
                          <TaskCard 
                            task={task} 
                            status={task.status} 
                            onEdit={handleEditTask} 
                            onDelete={handleDeleteTask} 
                            isAdmin={isAdmin} 
                            fontSizeClass={dynamicFontSize} 
                          />
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
                        <button onClick={() => handleEditTask(task)} className="p-2 lg:p-6 bg-white border border-slate-100 rounded-lg lg:rounded-3xl text-indigo-600 shadow-sm active:scale-90 transition-all shrink-0 self-end lg:self-center"><ChevronRight size={18} className="lg:w-8 lg:h-8" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) : <div className="flex-1 flex flex-col items-center justify-center py-10 bg-white rounded-[2rem] border-2 border-dashed border-slate-100"><p className="text-sm lg:text-3xl font-black text-slate-200 uppercase italic">No Future Sessions</p></div>}
          </div>
        ) : activeTab === Tab.WELCOME ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-1 lg:px-12 custom-scrollbar">
            <WelcomeTab 
              tasks={welcomeTasks} 
              onAdd={async (wt) => isAdmin ? await storageService.saveWelcomeTask(wt) : false} 
              onStart={handleStartWelcome} 
              onStop={handleStopWelcome} 
              onDelete={handleDeleteWelcome} 
              isAdmin={isAdmin} 
            />
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
              {searchResults.length > 0 ? searchResults.map(t => (
                <div key={t.id} className="min-h-max">
                  <TaskCard 
                    task={t} 
                    status={t.date === getTodayString() ? TaskStatus.ACTIVE : TaskStatus.UPCOMING} 
                    onEdit={handleEditTask} 
                    onDelete={handleDeleteTask} 
                    isAdmin={isAdmin} 
                  />
                </div>
              )) : searchQuery && <p className="text-center text-slate-200 font-black uppercase italic">No Matches</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
