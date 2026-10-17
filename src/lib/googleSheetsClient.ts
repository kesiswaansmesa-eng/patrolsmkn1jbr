/**
 * PATROL SMESA - SMK NEGERI 1 JEMBER
 * KLIEN KOMUNIKASI GOOGLE APPS SCRIPT & GOOGLE SHEETS
 * Realtime Sync & Offline Fallback Engine
 */

export const STORAGE_KEY_GAS_URL = 'patrol_smesa_gas_url';
export const STORAGE_KEY_AUTO_SYNC_ENABLED = 'patrol_smesa_auto_sync_enabled';
export const STORAGE_KEY_AUTO_SYNC_INTERVAL = 'patrol_smesa_auto_sync_interval';

// URL Default atau contoh jika belum diisi (bisa dikustomisasi oleh Admin)
export const DEFAULT_GAS_URL = '';

/**
 * Normalisasi URL Apps Script Web App
 * Memastikan URL berakhir dengan /exec (bukan /edit atau /dev)
 */
export const normalizeGasUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();
  // Jika pengguna menyalin URL /dev atau /edit, konversikan ke /exec untuk produksi
  if (clean.includes('/dev')) {
    clean = clean.replace(/\/dev(\?.*)?$/, '/exec');
  }
  return clean;
};

/**
 * Mengambil URL Google Apps Script yang tersimpan
 */
export const getGasConfig = () => {
  let url = '';
  if (typeof window !== 'undefined') {
    url = localStorage.getItem(STORAGE_KEY_GAS_URL) || '';
  }
  if (!url && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_URL) {
    url = import.meta.env.VITE_GAS_URL;
  }
  if (!url) {
    url = DEFAULT_GAS_URL;
  }
  
  const normalized = normalizeGasUrl(url);
  const isConfigured = Boolean(
    normalized &&
    normalized.startsWith('https://script.google.com/macros/s/') &&
    normalized.includes('/exec')
  );

  return { url: normalized, isConfigured };
};

/**
 * Menyimpan URL Google Apps Script ke localStorage
 */
export const setGasUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    const clean = normalizeGasUrl(url);
    localStorage.setItem(STORAGE_KEY_GAS_URL, clean);
  }
};

/**
 * Menghapus URL Google Apps Script dari localStorage
 */
export const clearGasUrl = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_GAS_URL);
  }
};

/**
 * Mengetes koneksi ke Google Apps Script (Ping)
 */
export interface PingResult {
  success: boolean;
  latencyMs?: number;
  message: string;
  spreadsheetName?: string;
  spreadsheetId?: string;
}

export const pingGoogleSheets = async (customUrl?: string): Promise<PingResult> => {
  const targetUrl = normalizeGasUrl(customUrl || getGasConfig().url);
  if (!targetUrl) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dimasukkan. Silakan atur di Pengaturan Sistem.',
    };
  }

  const start = performance.now();
  try {
    const pingUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
    const res = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const elapsed = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        success: false,
        latencyMs: elapsed,
        message: `HTTP Error ${res.status}: Gagal menghubungi Google Apps Script`,
      };
    }

    const data = await res.json();
    if (data.status === 'success') {
      return {
        success: true,
        latencyMs: elapsed,
        message: data.message || 'Terhubung dengan Google Spreadsheet',
        spreadsheetName: data.spreadsheetName,
        spreadsheetId: data.spreadsheetId,
      };
    } else {
      return {
        success: false,
        latencyMs: elapsed,
        message: data.message || 'Format respon Apps Script tidak sesuai',
      };
    }
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs: elapsed,
      message: `Gagal tersambung: ${err?.message || 'Pastikan Web App diset ke "Who has access: Anyone" dan URL berakhiran /exec'}`,
    };
  }
};

/**
 * Mengambil seluruh data dari Google Spreadsheet
 */
export const fetchAllFromGoogleSheets = async (customUrl?: string) => {
  const targetUrl = normalizeGasUrl(customUrl || getGasConfig().url);
  if (!targetUrl) return null;

  try {
    const url = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getAll&_t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return json.data;
    }
    return null;
  } catch (err) {
    console.warn('Gagal memuat data dari Google Sheets:', err);
    return null;
  }
};

/**
 * Mengirim aksi mutasi ke Google Apps Script via POST
 * Catatan teknis: Menggunakan Content-Type: text/plain;charset=utf-8 untuk menghindari
 * browser CORS OPTIONS preflight yang ditolak oleh Google Apps Script.
 */
export const postToGoogleSheets = async (
  action: string,
  payloadData: Record<string, any> = {},
  customUrl?: string
): Promise<{ success: boolean; message: string; details?: any }> => {
  const targetUrl = normalizeGasUrl(customUrl || getGasConfig().url);
  if (!targetUrl) {
    return { success: false, message: 'URL Google Apps Script belum terkonfigurasi' };
  }

  try {
    const bodyString = JSON.stringify({
      action,
      ...payloadData,
      clientTimestamp: new Date().toISOString(),
    });

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString,
    });

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP Error ${res.status}: Gagal menyimpan perubahan ke Google Sheets`,
      };
    }

    const json = await res.json();
    return {
      success: json.status === 'success',
      message: json.message || (json.status === 'success' ? 'Berhasil' : 'Gagal'),
      details: json.details,
    };
  } catch (err: any) {
    console.warn(`Gagal mengirim aksi '${action}' ke Google Sheets:`, err);
    return {
      success: false,
      message: `Koneksi Google Sheets terputus: ${err?.message || 'Perubahan disimpan di memori lokal'}.`,
    };
  }
};

/**
 * Inisialisasi otomatis 8 Sheet Tabel dengan judul kolom resmi
 */
export const initGoogleSheetsStructure = async (seedData?: any, customUrl?: string) => {
  return postToGoogleSheets('initSheets', { seedData }, customUrl);
};

/**
 * Sinkronisasi Seluruh Data dari Aplikasi ke Google Spreadsheet
 */
export const syncAllDataToGoogleSheetsBackend = async (data: any, customUrl?: string) => {
  return postToGoogleSheets('syncAll', { data }, customUrl);
};
