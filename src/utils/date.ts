import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Activity } from '../types';

export const formatDate = (date: string | Date, fmt: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: zhCN });
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
};

export const formatDateRange = (start: string | Date, end: string | Date): string => {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
};

export const getDaysDiff = (date1: string | Date, date2: string | Date): number => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return Math.abs(differenceInDays(d1, d2));
};

export const getCalendarDays = (year: number, month: number): Date[] => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end });
};

export const isDateInActivity = (date: Date, activity: Activity): boolean => {
  const activityStart = parseISO(activity.startTime);
  const activityEnd = parseISO(activity.endTime);
  return date >= activityStart && date <= activityEnd;
};

export const getActivitiesForDate = (date: Date, activities: Activity[]): Activity[] => {
  return activities.filter((activity) => isDateInActivity(date, activity));
};

export const getComparisonPeriod = (activity: Activity): { start: Date; end: Date } => {
  const activityStart = parseISO(activity.startTime);
  const duration = getDaysDiff(activity.startTime, activity.endTime) + 1;
  const preStart = addDays(activityStart, -duration - 7);
  const preEnd = addDays(activityStart, -8);
  return { start: preStart, end: preEnd };
};

export const getMonthLabel = (year: number, month: number): string => {
  return format(new Date(year, month), 'yyyy年MM月', { locale: zhCN });
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isCurrentMonth = (date: Date, currentYear: number, currentMonth: number): boolean => {
  return isSameMonth(date, new Date(currentYear, currentMonth));
};
