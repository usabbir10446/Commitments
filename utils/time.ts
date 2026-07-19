import { Task, TaskStatus } from '../types';

export const parseTimeBlock = (timeBlock: string): { start: number; end: number } => {
  const clean = timeBlock.replace(/hrs/gi, '').replace(/\s/g, '');
  const parts = clean.split('-');
  if (parts.length !== 2) return { start: 0, end: 0 };
  const parsePart = (part: string) => {
    const hours = parseInt(part.substring(0, 2), 10);
    const mins = parseInt(part.substring(2, 4), 10);
    return hours * 60 + mins;
  };
  let start = parsePart(parts[0]);
  let end = parsePart(parts[1]);
  if (end < start) end += 1440;
  return { start, end };
};

export const getCurrentMinutesFromMidnight = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatFriendlyDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export const formatBanglaDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, ..., 11 = Dec
  const year = date.getFullYear();
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const banglaMonths = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
  const banglaNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBanglaNum = (num: number): string => num.toString().split('').map(d => banglaNumbers[parseInt(d)]).join('');
  
  let bMonthIndex = 0;
  let bDay = 1;
  const bYear = (month < 3 || (month === 3 && day < 14)) ? year - 594 : year - 593;

  if (month === 0) { // January
    if (day < 15) { bMonthIndex = 8; bDay = day + 16; } else { bMonthIndex = 9; bDay = day - 14; }
  } else if (month === 1) { // February
    if (day < 14) { bMonthIndex = 9; bDay = day + 17; } else { bMonthIndex = 10; bDay = day - 13; }
  } else if (month === 2) { // March
    const chaitraStartDay = isLeapYear ? 15 : 16;
    if (day < chaitraStartDay) { bMonthIndex = 10; bDay = day + (isLeapYear ? 16 : 15); } else { bMonthIndex = 11; bDay = day - chaitraStartDay + 1; }
  } else if (month === 3) { // April
    if (day < 14) { bMonthIndex = 11; bDay = day + (isLeapYear ? 17 : 16); } else { bMonthIndex = 0; bDay = day - 13; }
  } else if (month === 4) { // May
    if (day < 15) { bMonthIndex = 0; bDay = day + 17; } else { bMonthIndex = 1; bDay = day - 14; }
  } else if (month === 5) { // June
    if (day < 15) { bMonthIndex = 1; bDay = day + 17; } else { bMonthIndex = 2; bDay = day - 14; }
  } else if (month === 6) { // July
    if (day < 16) { bMonthIndex = 2; bDay = day + 16; } else { bMonthIndex = 3; bDay = day - 15; }
  } else if (month === 7) { // August
    if (day < 16) { bMonthIndex = 3; bDay = day + 16; } else { bMonthIndex = 4; bDay = day - 15; }
  } else if (month === 8) { // September
    if (day < 16) { bMonthIndex = 4; bDay = day + 16; } else { bMonthIndex = 5; bDay = day - 15; }
  } else if (month === 9) { // October
    if (day < 17) { bMonthIndex = 5; bDay = day + 15; } else { bMonthIndex = 6; bDay = day - 16; }
  } else if (month === 10) { // November
    if (day < 16) { bMonthIndex = 6; bDay = day + 15; } else { bMonthIndex = 7; bDay = day - 15; }
  } else if (month === 11) { // December
    if (day < 16) { bMonthIndex = 7; bDay = day + 15; } else { bMonthIndex = 8; bDay = day - 15; }
  }

  return `${toBanglaNum(bDay)} ${banglaMonths[bMonthIndex]}, ${toBanglaNum(bYear)} বঙ্গাব্দ`;
};

export const formatTime = (date: Date): string => date.toTimeString().split(' ')[0];