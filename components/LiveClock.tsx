import React, { useState, useEffect } from 'react';
import { formatTime, formatFriendlyDate, formatBanglaDate } from '../utils/time';

interface LiveClockProps {
  isCompact?: boolean;
}

const LiveClock: React.FC<LiveClockProps> = ({ isCompact }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeParts = formatTime(now).split(':');

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 lg:gap-8">
        {/* Bangla Date - Conditional display for mobile */}
        <div className="hidden sm:block text-right">
          <p className="text-[8px] lg:text-[13px] font-black text-indigo-600 uppercase tracking-tight italic whitespace-nowrap">
            {formatBanglaDate(now)}
          </p>
        </div>

        {/* Central Clock */}
        <div className="flex items-baseline gap-1 lg:gap-2 px-2 lg:px-6 sm:border-x-2 border-slate-100/50">
          <span className="text-2xl lg:text-6xl font-black text-slate-900 tracking-tightest tabular-nums leading-none">
            {timeParts.slice(0, 2).join(':')}
          </span>
          <span className="text-[10px] lg:text-2xl text-indigo-500 font-black opacity-90">
            :{timeParts[2]}
          </span>
        </div>

        {/* English Date */}
        <div className="text-left">
          <p className="text-[7px] lg:text-[13px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap leading-tight">
            {formatFriendlyDate(now)}
          </p>
          <p className="sm:hidden text-[7px] font-black text-indigo-600 uppercase italic">
            {formatBanglaDate(now)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 lg:gap-14">
      <div className="text-right">
        <span className="text-indigo-600 text-xs lg:text-3xl font-black uppercase tracking-tight italic block mb-1">
          {formatBanglaDate(now)}
        </span>
        <div className="h-1 w-8 lg:h-1.5 lg:w-20 bg-indigo-100 ml-auto rounded-full" />
      </div>

      <div className="flex items-baseline gap-2 lg:gap-3 px-6 lg:px-14 border-x-2 lg:border-x-4 border-slate-50">
        <span className="text-4xl lg:text-[10rem] font-black text-slate-900 tracking-tightest tabular-nums leading-none">
          {timeParts.slice(0, 2).join(':')}
        </span>
        <span className="text-lg lg:text-7xl text-indigo-500 font-black opacity-90">
          :{timeParts[2]}
        </span>
      </div>

      <div className="text-left">
        <span className="text-slate-900 text-xs lg:text-3xl font-extrabold uppercase tracking-widest block mb-1">
          {formatFriendlyDate(now)}
        </span>
        <div className="h-1 w-8 lg:h-1.5 lg:w-20 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
};

export default LiveClock;