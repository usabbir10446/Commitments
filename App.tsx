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
import { Calendar, AlertCircle, Plus, Printer, Send, Search, X, ChevronLeft, ChevronRight, UserPlus, Database, ShieldAlert, RefreshCw, ExternalLink, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TASKS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [welcomeTasks, setWelcomeTasks] = useState<WelcomeTask[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  const setupListeners = () => {
    setIsLoading(true);
    setError(null);

    const handleError = (err: any, source: string) => {
      console.error(`${source} listener error:`, err);
      if (err.code === 'permission-denied') {
        setError(`Firestore Permission Denied (${source}). Please update your Security Rules.`);
      } else {
        setError(`${source} Error: ${err.message}`);
      }
      setIsLoading(false);
    };

    // Tasks Listener
    const tasksQuery = query(collection(db, 'tasks'), orderBy('timeBlock', 'asc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(taskList);
      setIsLoading(false);
    }, (err) => handleError(err, 'Tasks'));

    // Emergencies Listener
    const emergencyQuery = query(collection(db, 'emergencies'), orderBy('createdAt', 'desc'));
    const unsubscribeEmergencies = onSnapshot(emergencyQuery, (snapshot) => {
      const msgList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyMessage));
      setEmergencies(msgList);
      
      const latest = msgList[0];
      if (latest && Date.now() - latest.createdAt < 15000) {
        setActiveEmergency(latest);
        setTimeout(() => setActiveEmergency(prev => prev?.id === latest.id ? null : prev), 10000);
      }
    }, (err) => handleError(err, 'Emergency'));

    // Welcome Templates Listener
    const welcomeQuery = query(collection(db, 'welcome_tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeWelcome = onSnapshot(welcomeQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WelcomeTask));
      setWelcomeTasks(list);
      const active = list.find(w => w.isActive);
      setActiveWelcome(active || null);
    }, (err) => handleError(err, 'Welcome'));

    return () => {
      unsubscribeTasks();
      unsubscribeEmergencies();
      unsubscribeWelcome();
    };
  };

  useEffect(() => {
    const unsub = setupListeners();
    const statusTimer = setInterval(() => setCurrentMinutes(getCurrentMinutesFromMidnight()), 10000);
    return () => {
      clearInterval(statusTimer);
      unsub();
    };
  }, []);

  const handleInitDB = async () => {
    setIsLoading(true);
    setError(null);
    const res = await initializeDatabase();
    if (!res.success) {
      if (res.message?.includes('permission')) {
        setError("Failed to initialize: Firestore Security Rules are blocking the write request.");
      } else {
        setError("Initialization Error: " + res.message);
      }
    }
    setIsLoading(false);
  };

  const triggerEmergency = async (text: string) => {
    if (!text.trim()) return;
    const res = await storageService.broadcastEmergency(text);
    if (!res) {
      alert("Failed to broadcast. Check your Firebase permissions.");
    }
    setEmergencyInput('');
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    const saved = await storageService.saveTask({ ...taskData, id: editingTask?.id });
    if (saved) {
      setIsModalOpen(false);
      setEditingTask(null);
    } else {
      alert("Error saving task. Check database permissions.");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!id) return;
    const ok = await storageService.deleteTask(id);
    if (ok) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleEditRequest = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
    setIsSearchOpen(false);
  };

  const handleAddWelcome = async (wt: Partial<WelcomeTask>) => {
    await storageService.saveWelcomeTask(wt);
  };

  const handleStartWelcome = (id: string) => storageService.setWelcomeActive(id, true);
  const handleStopWelcome = () => storageService.setWelcomeActive('', false);
  
  const handleDeleteWelcome = async (id: string) => {
    if (!id) return;
    await storageService.deleteWelcomeTask(id);
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
          (t.remarks && t.remarks.toLowerCase().includes(query))
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

  const copyRule = () => {
    navigator.clipboard.writeText("allow read, write: if true;");
    alert("Rule copied! Now paste it in the Firebase Console.");
  };

  return (
    <div className={`flex flex-col min-h-screen max-w-md mx-auto relative ${isCapturing ? 'bg-white' : 'bg-slate-50'}`} ref={captureRef}>
      <EmergencyOverlay message={activeEmergency} onClose={() => setActiveEmergency(null)} />
      <WelcomeOverlay task={activeWelcome} onStop={handleStopWelcome} />
      
      <header className={`px-6 pt-10 pb-4 sticky top-0 z-40 ${isCapturing ? 'relative' : 'bg-slate-50 shadow-sm border-b border-slate-100'}`}>
        <div className="flex justify-between items-start mb-6">
          <LiveClock />
          <div className={`flex space-x-2 ${isCapturing ? 'hidden' : ''}`}>
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
        {error && !isCapturing && (
          <div className="mb-6 p-6 bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] text-rose-900 shadow-2xl animate-in slide-in-from-top duration-500">
            <div className="flex items-center space-x-3 mb-4">
              <ShieldAlert className="text-rose-600" size={28} />
              <h3 className="font-black uppercase tracking-widest text-base">Firebase Permission Denied</h3>
            </div>
            <p className="text-xs font-bold leading-relaxed mb-6 opacity-80">Firestore is blocking the connection. You must enable public access in your Firebase Console to continue development.</p>
            
            <div className="bg-white rounded-[1.5rem] p-5 mb-6 border border-rose-100 shadow-inner">
              <p className="text-[10px] font-black uppercase text-rose-500 mb-3 tracking-widest">Setup Steps:</p>
              <ol className="text-[11px] font-bold space-y-3 list-decimal list-inside text-slate-700">
                <li className="flex items-start gap-2">
                  <span>Open <a href={`https://console.firebase.google.com/project/cmtbipsot/firestore/rules`} target="_blank" className="text-indigo-600 underline inline-flex items-center gap-1">Console <ExternalLink size={10} /></a></span>
                </li>
                <li>Go to the <b>Rules</b> tab</li>
                <li>Replace existing content with:
                  <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[9px] relative group overflow-x-auto whitespace-nowrap">
                    allow read, write: if true;
                    <button onClick={copyRule} className="absolute right-2 top-2 p-1 bg-slate-700 rounded-md hover:bg-slate-600"><Copy size={12} /></button>
                  </div>
                </li>
                <li>Click <b>Publish</b></li>
              </ol>
            </div>
            
            <button onClick={() => window.location.reload()} className="w-full bg-rose-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl text-[11px] shadow-lg shadow-rose-200 active:scale-95 flex items-center justify-center space-x-2 transition-all">
              <RefreshCw size={16} /> <span>Try Again Now</span>
            </button>
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && !isCapturing && (
          <div className="mb-6 p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl animate-in slide-in-from-top duration-500">
             <div className="flex items-center space-x-3 mb-2">
               <Database size={24} />
               <h3 className="font-black uppercase tracking-widest text-sm">Empty Database</h3>
             </div>
             <p className="text-xs font-medium opacity-90 mb-4 leading-relaxed">Collections created but no data found. Click below to add sample schedule.</p>
             <button onClick={handleInitDB} className="w-full bg-white text-indigo-600 font-black uppercase tracking-widest py-3 rounded-2xl text-[10px] active:scale-95 transition-all">Seed Sample Data</button>
          </div>
        )}

        {activeTab === Tab.TASKS ? (
          <div className="space-y-8">
            {isLoading ? (
              <div className="py-24 text-center text-slate-400 italic flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Connecting to Cloud...</span>
              </div>
            ) : homepageTasks.length === 0 && !error ? (
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
              <button onClick={() => triggerEmergency(emergencyInput)} disabled={!emergencyInput.trim()} className="w-full mt-4 bg-rose-600 text-white font-black uppercase tracking-widest py-5 rounded-3xl shadow-xl active:scale-95 disabled:bg-slate-300 flex items-center justify-center space-x-2"><Send size={20} /> <span>Broadcast</span></button>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 text-center">History</h3>
              <div className="space-y-3">
                {emergencies.map(msg => <div key={msg.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-start space-x-4"><div className="bg-rose-50 p-3 rounded-2xl text-rose-600 shrink-0"><AlertCircle size={20} /></div><div><p className="text-slate-800 font-bold leading-snug">{msg.text}</p><p className="text-slate-400 text-[10px] uppercase">{new Date(msg.createdAt).toLocaleString()}</p></div></div>)}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-8 py-4 flex justify-around items-center z-50 ${isCapturing ? 'hidden' : ''}`}>
        <button onClick={() => setActiveTab(Tab.TASKS)} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === Tab.TASKS ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><Calendar size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Tasks</span></button>
        <button onClick={() => setActiveTab(Tab.WELCOME)} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === Tab.WELCOME ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><UserPlus size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Welcome</span></button>
        <button onClick={() => setActiveTab(Tab.EMERGENCY)} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === Tab.EMERGENCY ? 'text-rose-600 scale-110' : 'text-slate-300'}`}><AlertCircle size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Emergency</span></button>
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
            <div className="flex items-center space-x-4 mb-6">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 bg-slate-100 rounded-xl active:scale-90 transition-all shrink-0"><X size={20} /></button>
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