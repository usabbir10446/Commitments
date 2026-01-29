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
      <div className="flex items-center gap-1.5 lg:gap-6 overflow-hidden">
        {/* Central Clock - Minimized for mobile */}
        <div className="flex items-baseline gap-0.5 lg:gap-3 shrink-0">
          <span className="text-xl lg:text-7xl font-black text-slate-900 tracking-tightest tabular-nums leading-none">
            {timeParts.slice(0, 2).join(':')}
          </span>
          <span className="text-[9px] lg:text-3xl text-indigo-500 font-black opacity-90">
            :{timeParts[2]}
          </span>
        </div>

        {/* Combined Dates - Highly Compact for small screens */}
        <div className="flex flex-col border-l border-slate-200 pl-2 lg:pl-6 shrink-0 justify-center">
          <p className="text-[8px] lg:text-[22px] font-black text-slate-900 uppercase tracking-tight whitespace-nowrap leading-none mb-0.5">
            {formatFriendlyDate(now).split(',')[0]}
          </p>
          <p className="text-[8px] lg:text-[22px] font-black text-indigo-600 uppercase italic tracking-tight whitespace-nowrap leading-none">
            {formatBanglaDate(now).split(',')[0]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 lg:gap-14">
      <div className="text-right">
        <span className="text-indigo-600 text-xs lg:text-5xl font-black uppercase tracking-tight italic block mb-2">
          {formatBanglaDate(now)}
        </span>
        <div className="h-1 w-8 lg:h-2 lg:w-32 bg-indigo-100 ml-auto rounded-full" />
      </div>

      <div className="flex items-baseline gap-2 lg:gap-3 px-6 lg:px-14 border-x-2 lg:border-x-4 border-slate-50">
        <span className="text-4xl lg:text-[12rem] font-black text-slate-900 tracking-tightest tabular-nums leading-none">
          {timeParts.slice(0, 2).join(':')}
        </span>
        <span className="text-lg lg:text-8xl text-indigo-500 font-black opacity-90">
          :{timeParts[2]}
        </span>
      </div>

      <div className="text-left">
        <span className="text-slate-900 text-xs lg:text-5xl font-extrabold uppercase tracking-widest block mb-2">
          {formatFriendlyDate(now)}
        </span>
        <div className="h-1 w-8 lg:h-2 lg:w-32 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
};

export default LiveClock;