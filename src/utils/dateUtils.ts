// PATROL SMESA - Date Utilities (Asia/Jakarta / WIB Timezone)

/**
 * Menstandarkan segala variasi input tanggal (string ISO, datetime Sheets, DD/MM/YYYY, Date)
 * menjadi format standar ISO tanggal kalender 'YYYY-MM-DD'.
 */
export const normalizeDateString = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return getWIBTodayString();
  
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return getWIBTodayString();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(dateInput);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  }

  const str = String(dateInput).trim();
  if (!str) return getWIBTodayString();

  // Pola YYYY-MM-DD (dengan atau tanpa jam/detik di belakangnya, cth: "2026-10-17 00:00:00" atau "2026-10-17T07:15:00")
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pola DD/MM/YYYY atau DD-MM-YYYY (format standar Google Sheets Indonesia)
  const matchId = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchId) {
    const d = matchId[1].padStart(2, '0');
    const m = matchId[2].padStart(2, '0');
    const y = matchId[3];
    return `${y}-${m}-${d}`;
  }

  return str.substring(0, 10);
};

export const getWIBTodayString = (): string => {
  // Mengembalikan YYYY-MM-DD dalam zona waktu Asia/Jakarta (WIB)
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
  // Mengembalikan HH:MM dalam zona waktu Asia/Jakarta (WIB)
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

export const formatIndonesianDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const cleanDate = normalizeDateString(dateString);
    const [year, month, day] = cleanDate.split('-').map(Number);
    if (!year || !month || !day) return String(dateString);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(dateString);
  }
};

export const formatIndonesianDateTime = (isoString: string | undefined | null): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' WIB';
  } catch {
    return String(isoString);
  }
};

export const isDateToday = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false;
  return normalizeDateString(dateString) === getWIBTodayString();
};

export const isDateThisWeek = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false;
  const cleanDateStr = normalizeDateString(dateString);
  const todayStr = getWIBTodayString();
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [cY, cM, cD] = cleanDateStr.split('-').map(Number);

  const today = new Date(tY, tM - 1, tD);
  const target = new Date(cY, cM - 1, cD);
  
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

export const isDateThisMonth = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false;
  const cleanDateStr = normalizeDateString(dateString);
  const todayStr = getWIBTodayString();
  return cleanDateStr.substring(0, 7) === todayStr.substring(0, 7);
};

