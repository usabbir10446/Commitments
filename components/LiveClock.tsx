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
      <div className="flex items-center gap-3 md:gap-6 lg:gap-8">
        {/* Bangla Date - Left Side (Always Visible) */}
        <div className="text-right">
          <p className="text-[7px] md:text-[11px] lg:text-[12px] font-black text-indigo-600 uppercase tracking-tight italic whitespace-nowrap">
            {formatBanglaDate(now)}
          </p>
        </div>

        {/* Central Clock */}
        <div className="flex items-baseline gap-1 lg:gap-1.5 px-2 lg:px-4 border-x border-slate-100/50">
          <span className="text-2xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tightest tabular-nums leading-none">
            {timeParts.slice(0, 2).join(':')}
          </span>
          <span className="text-sm md:text-xl lg:text-2xl text-indigo-500 font-black opacity-90">
            :{timeParts[2]}
          </span>
        </div>

        {/* English Date - Right Side (Always Visible) */}
        <div className="text-left">
          <p className="text-[7px] md:text-[11px] lg:text-[12px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">
            {formatFriendlyDate(now)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 md:gap-10 lg:gap-14">
      {/* Bangla Date - Left Side */}
      <div className="text-right">
        <span className="text-indigo-600 text-sm lg:text-2xl font-black uppercase tracking-tight italic block mb-1">
          {formatBanglaDate(now)}
        </span>
        <div className="h-1 w-8 lg:w-12 bg-indigo-100 ml-auto rounded-full" />
      </div>

      {/* Central Clock */}
      <div className="flex items-baseline gap-2 lg:gap-3 px-6 lg:px-10 border-x-2 border-slate-50">
        <span className="text-4xl md:text-8xl lg:text-9xl font-black text-slate-900 tracking-tightest tabular-nums leading-none">
          {timeParts.slice(0, 2).join(':')}
        </span>
        <span className="text-xl md:text-5xl lg:text-6xl text-indigo-500 font-black opacity-90 drop-shadow-sm">
          :{timeParts[2]}
        </span>
      </div>

      {/* English Date - Right Side */}
      <div className="text-left">
        <span className="text-slate-900 text-sm lg:text-2xl font-extrabold uppercase tracking-widest block mb-1">
          {formatFriendlyDate(now)}
        </span>
        <div className="h-1 w-8 lg:w-12 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
};

export default LiveClock;