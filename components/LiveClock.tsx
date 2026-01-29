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
      <div className="flex items-center gap-4 xl:gap-8">
        {/* Bangla Date - Always Visible */}
        <div className="text-right">
          <p className="text-[8px] xl:text-[13px] font-black text-indigo-600 uppercase tracking-tight italic whitespace-nowrap">
            {formatBanglaDate(now)}
          </p>
        </div>

        {/* Central Clock */}
        <div className="flex items-baseline gap-1 xl:gap-2 px-3 xl:px-6 border-x-2 border-slate-100/50">
          <span className="text-3xl xl:text-6xl font-black text-slate-900 tracking-tightest tabular-nums leading-none">
            {timeParts.slice(0, 2).join(':')}
          </span>
          <span className="text-base xl:text-2xl text-indigo-500 font-black opacity-90">
            :{timeParts[2]}
          </span>
        </div>

        {/* English Date - Always Visible */}
        <div className="text-left">
          <p className="text-[8px] xl:text-[13px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">
            {formatFriendlyDate(now)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8 xl:gap-14">
      <div className="text-right">
        <span className="text-indigo-600 text-lg xl:text-3xl font-black uppercase tracking-tight italic block mb-1">
          {formatBanglaDate(now)}
        </span>
        <div className="h-1.5 w-12 xl:w-20 bg-indigo-100 ml-auto rounded-full" />
      </div>

      <div className="flex items-baseline gap-3 px-10 xl:px-14 border-x-4 border-slate-50">
        <span className="text-6xl xl:text-[10rem] font-black text-slate-900 tracking-tightest tabular-nums leading-none">
          {timeParts.slice(0, 2).join(':')}
        </span>
        <span className="text-3xl xl:text-7xl text-indigo-500 font-black opacity-90 drop-shadow-sm">
          :{timeParts[2]}
        </span>
      </div>

      <div className="text-left">
        <span className="text-slate-900 text-lg xl:text-3xl font-extrabold uppercase tracking-widest block mb-1">
          {formatFriendlyDate(now)}
        </span>
        <div className="h-1.5 w-12 xl:w-20 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
};

export default LiveClock;