
import React, { useState, useEffect } from 'react';
import { formatTime, formatFriendlyDate, formatBanglaDate } from '../utils/time.ts';

const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-emerald-700 text-sm font-black tracking-tight leading-none">
        {formatBanglaDate(now)}
      </span>
      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
        {formatFriendlyDate(now)}
      </span>
      <span className="text-2xl font-black text-indigo-700 mt-1">
        {formatTime(now)}
      </span>
    </div>
  );
};

export default LiveClock;
