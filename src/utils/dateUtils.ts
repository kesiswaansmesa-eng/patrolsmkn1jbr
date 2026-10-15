export const getWIBTodayString = (): string => {
  // Returns YYYY-MM-DD in Asia/Jakarta timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

export const getWIBCurrentTime = (): string => {
  // Returns HH:MM in Asia/Jakarta timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(now);
  const hour = parts.find(p => p.type === 'hour')?.value || '07';
  const minute = parts.find(p => p.type === 'minute')?.value || '15';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

export const formatIndonesianDate = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatIndonesianDateTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' WIB';
  } catch {
    return isoString;
  }
};

export const isDateToday = (dateString: string): boolean => {
  return dateString === getWIBTodayString();
};

export const isDateThisWeek = (dateString: string): boolean => {
  const todayStr = getWIBTodayString();
  const today = new Date(todayStr + 'T00:00:00');
  const target = new Date(dateString + 'T00:00:00');
  
  // Day of week in JS (0=Sun, 1=Mon...): adjust so Monday is first day
  const day = today.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return target >= monday && target <= sunday;
};

export const isDateThisMonth = (dateString: string): boolean => {
  const todayStr = getWIBTodayString();
  return dateString.substring(0, 7) === todayStr.substring(0, 7);
};
