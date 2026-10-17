import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserProfile, Department, ClassRoom, Student, LatenessReason, 
  LatenessRecord, CoachingRecord, SchoolSchedule, AppSettings, 
  AuditLog, UserRole, FollowUpStatus 
} from '../types';
import { 
  INITIAL_DEPARTMENTS, INITIAL_CLASSES, INITIAL_REASONS, 
  INITIAL_STUDENTS, DEMO_USERS, INITIAL_SCHEDULES, 
  INITIAL_SETTINGS, INITIAL_RECORDS, INITIAL_COACHINGS 
} from '../data/initialData';
import { 
  getGasConfig, setGasUrl, clearGasUrl, pingGoogleSheets, 
  fetchAllFromGoogleSheets, postToGoogleSheets, initGoogleSheetsStructure, 
  syncAllDataToGoogleSheetsBackend, STORAGE_KEY_AUTO_SYNC_ENABLED, 
  STORAGE_KEY_AUTO_SYNC_INTERVAL, normalizeGasUrl
} from '../lib/googleSheetsClient';

interface AppContextType {
  // Auth & RBAC
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: UserRole) => void;
  users: UserProfile[];
  isAuthenticated: boolean;
  loginWithRole: (role: UserRole, password?: string) => Promise<{ success: boolean; message: string; user?: UserProfile }>;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; message: string; user?: UserProfile }>;
  logout: () => void;
  
  // User Management (RBAC) CRUD & Password Management
  addUser: (user: Omit<UserProfile, 'id' | 'created_at'> & { password?: string }) => Promise<{ success: boolean; message: string; user?: UserProfile }>;
  updateUser: (id: string, user: Partial<UserProfile> & { password?: string }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  
  // Data Lists
  departments: Department[];
  classes: ClassRoom[];
  students: Student[];
  reasons: LatenessReason[];
  records: LatenessRecord[];
  coachings: CoachingRecord[];
  schedules: SchoolSchedule[];
  settings: AppSettings;
  auditLogs: AuditLog[];
  
  // Filtered lists based on RBAC
  scopedRecords: LatenessRecord[];
  scopedStudents: Student[];
  scopedClasses: ClassRoom[];
  
  // Operations
  recordLateness: (data: {
    studentId: string;
    arrivalTime: string;
    eventDate: string;
    reasonId: string;
    notes?: string;
    allowDuplicateOverride?: boolean;
  }) => Promise<{ success: boolean; message: string; record?: LatenessRecord; isDuplicate?: boolean }>;
  
  verifyRecord: (id: string, status: 'terverifikasi' | 'ditolak') => Promise<void>;
  cancelRecord: (id: string, cancellationReason: string) => Promise<void>;
  
  addCoaching: (data: Omit<CoachingRecord, 'id' | 'created_at'>) => Promise<void>;
  updateCoachingStatus: (id: string, status: FollowUpStatus, evaluationResult?: string) => Promise<void>;
  
  // Master Data CRUD
  addStudent: (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  importStudentsCSV: (parsedStudents: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>) => Promise<{ count: number; duplicates: number }>;
  
  addClass: (cls: Omit<ClassRoom, 'id'>) => Promise<boolean>;
  updateClass: (id: string, cls: Partial<ClassRoom>) => Promise<boolean>;
  deleteClass: (id: string) => Promise<boolean>;
  importClassesCSV: (parsedClasses: Array<Omit<ClassRoom, 'id'>>) => Promise<{ count: number; duplicates: number }>;
  
  addReason: (reason: Omit<LatenessReason, 'id'>) => Promise<boolean>;
  updateReason: (id: string, reason: Partial<LatenessReason>) => Promise<boolean>;
  
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  
  // Google Sheets Backend & Realtime Sync Engine
  isGoogleSheetsConnected: boolean;
  gasUrl: string;
  isAutoSyncEnabled: boolean;
  autoSyncIntervalSec: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  syncStatusMessage: string | null;
  refreshData: () => Promise<void>;
  syncAllDataToGoogleSheets: () => Promise<{ success: boolean; message: string; details?: Record<string, number> }>;
  initGoogleSheets: () => Promise<{ success: boolean; message: string; details?: any }>;
  saveGasUrl: (url: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
  clearGasUrlConfig: () => void;
  toggleAutoSync: (enabled: boolean) => void;
  setAutoSyncInterval: (sec: number) => void;
  resetToDemoData: () => void;

  // Compatibility aliases
  isSupabaseConnected: boolean;
  supabaseUrl: string;
  syncAllDataToSupabase: () => Promise<{ success: boolean; message: string; details?: Record<string, number> }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'patrol_smesa_users',
  STUDENTS: 'patrol_smesa_students',
  CLASSES: 'patrol_smesa_classes',
  DEPARTMENTS: 'patrol_smesa_departments',
  REASONS: 'patrol_smesa_reasons',
  RECORDS: 'patrol_smesa_records',
  COACHINGS: 'patrol_smesa_coachings',
  SETTINGS: 'patrol_smesa_settings',
  SCHEDULES: 'patrol_smesa_schedules',
  AUDIT_LOGS: 'patrol_smesa_audit_logs',
  CURRENT_USER_ID: 'patrol_smesa_current_user_id',
};

// BroadcastChannel for instant cross-tab realtime sync
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('patrol_smesa_realtime_channel');
  }
} catch {
  broadcastChannel = null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user state
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) return DEMO_USERS;
    try {
      const parsed = JSON.parse(saved) as UserProfile[];
      const updated: UserProfile[] = parsed.map(u => {
        const demoMatch = DEMO_USERS.find(d => d.id === u.id || d.email.toLowerCase() === u.email.toLowerCase() || d.role === u.role);
        return {
          ...u,
          password: u.password || (demoMatch ? demoMatch.password : 'smesa123'),
        };
      });
      // Ensure all 6 roles exist in the users list
      for (const demoU of DEMO_USERS) {
        if (!updated.some(u => u.role === demoU.role)) {
          updated.push(demoU);
        }
      }
      return updated;
    } catch {
      return DEMO_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const found = users.find(u => u.id === savedId);
    return found || users[0] || DEMO_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authFlag = localStorage.getItem('patrol_smesa_is_authenticated');
    return authFlag === 'true';
  });

  // Google Sheets Backend Connection & Realtime State
  const [gasUrl, setGasUrlState] = useState<string>(() => getGasConfig().url);
  const [isGoogleSheetsConnected, setIsGoogleSheetsConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED);
    return saved !== null ? saved === 'true' : true;
  });

  const [autoSyncIntervalSec, setAutoSyncIntervalSec] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTO_SYNC_INTERVAL);
    return saved ? parseInt(saved, 10) : 20; // 20 detik interval default
  });

  // Master Data States (Loaded from LocalStorage initially, updated from Google Sheets)
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [classes, setClasses] = useState<ClassRoom[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [reasons, setReasons] = useState<LatenessReason[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REASONS);
    return saved ? JSON.parse(saved) : INITIAL_REASONS;
  });

  const [records, setRecords] = useState<LatenessRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return saved ? JSON.parse(saved) : INITIAL_RECORDS;
  });

  const [coachings, setCoachings] = useState<CoachingRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COACHINGS);
    return saved ? JSON.parse(saved) : INITIAL_COACHINGS;
  });

  const [schedules] = useState<SchoolSchedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });

  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }, [classes]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  }, [departments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REASONS, JSON.stringify(reasons));
  }, [reasons]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  }, [records]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COACHINGS, JSON.stringify(coachings));
  }, [coachings]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
  }, [currentUser]);

  // Audit Logger
  const logAudit = useCallback((action: AuditLog['action'], module: string, details: string, target_id?: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      user_role: currentUser.role,
      action,
      module,
      target_id,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]);
  }, [currentUser]);

  // Function to pull all data from Google Sheets
  const refreshData = useCallback(async () => {
    const { url, isConfigured } = getGasConfig();
    if (!isConfigured || !url) return;

    setIsSyncing(true);
    setSyncStatusMessage('Menyinkronkan data dari Google Sheets...');

    try {
      const allData = await fetchAllFromGoogleSheets(url);
      if (allData) {
        setIsGoogleSheetsConnected(true);
        setLastSyncedAt(new Date());

        // Update records if available
        if (Array.isArray(allData.records) && allData.records.length > 0) {
          setRecords(prev => {
            const map = new Map<string, LatenessRecord>();
            // Add server records first
            allData.records.forEach((r: any) => {
              if (r && r.id) map.set(String(r.id), r as LatenessRecord);
            });
            // Keep any recent local records not yet synced
            prev.forEach(r => {
              if (!map.has(r.id)) map.set(r.id, r);
            });
            return Array.from(map.values());
          });
        }

        // Update students
        if (Array.isArray(allData.students) && allData.students.length > 0) {
          setStudents(allData.students as Student[]);
        }

        // Update classes
        if (Array.isArray(allData.classes) && allData.classes.length > 0) {
          setClasses(allData.classes as ClassRoom[]);
        }

        // Update departments
        if (Array.isArray(allData.departments) && allData.departments.length > 0) {
          setDepartments(allData.departments as Department[]);
        }

        // Update reasons
        if (Array.isArray(allData.reasons) && allData.reasons.length > 0) {
          setReasons(allData.reasons as LatenessReason[]);
        }

        // Update users (RBAC & Passwords)
        if (Array.isArray(allData.users) && allData.users.length > 0) {
          setUsers(allData.users as UserProfile[]);
        }

        // Update coachings
        if (Array.isArray(allData.coachings) && allData.coachings.length > 0) {
          setCoachings(allData.coachings as CoachingRecord[]);
        }

        setSyncStatusMessage('Data tersinkronisasi sempurna.');
      } else {
        setIsGoogleSheetsConnected(false);
        setSyncStatusMessage('Gagal mengambil respon dari Google Sheets.');
      }
    } catch (err: any) {
      console.warn('Google Sheets sync error:', err);
      setIsGoogleSheetsConnected(false);
      setSyncStatusMessage(err?.message || 'Koneksi Google Sheets terputus');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 3000);
    }
  }, []);

  // Initial connection check on mount
  useEffect(() => {
    let isMounted = true;
    const testInitialConnection = async () => {
      const config = getGasConfig();
      if (!config.isConfigured || !config.url) {
        setIsGoogleSheetsConnected(false);
        return;
      }

      const ping = await pingGoogleSheets(config.url);
      if (isMounted) {
        if (ping.success) {
          setIsGoogleSheetsConnected(true);
          // Pull latest data
          refreshData();
        } else {
          setIsGoogleSheetsConnected(false);
        }
      }
    };

    testInitialConnection();
    return () => { isMounted = false; };
  }, [refreshData]);

  // Realtime Auto-Sync Interval Timer
  useEffect(() => {
    if (!isAutoSyncEnabled || !isGoogleSheetsConnected) return;

    const intervalMs = Math.max(5, autoSyncIntervalSec) * 1000;
    const intervalId = setInterval(() => {
      // Only sync if page is currently visible to save bandwidth
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshData();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isAutoSyncEnabled, isGoogleSheetsConnected, autoSyncIntervalSec, refreshData]);

  // Cross-tab BroadcastChannel listener
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RECORD_INSERTED' && event.data?.record) {
        setRecords(prev => [event.data.record, ...prev.filter(r => r.id !== event.data.record.id)]);
      } else if (event.data?.type === 'RECORD_UPDATED' && event.data?.record) {
        setRecords(prev => prev.map(r => r.id === event.data.record.id ? event.data.record : r));
      } else if (event.data?.type === 'REFRESH_ALL') {
        refreshData();
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);
    return () => {
      broadcastChannel?.removeEventListener('message', handleMessage);
    };
  }, [refreshData]);

  // Save new Google Apps Script Web App URL
  const saveGasUrl = async (newUrl: string): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
    const clean = normalizeGasUrl(newUrl);
    setGasUrl(clean);
    setGasUrlState(clean);

    if (!clean) {
      setIsGoogleSheetsConnected(false);
      return { success: false, message: 'URL telah dikosongkan. Sistem beralih ke Mode Lokal / Offline.' };
    }

    setIsSyncing(true);
    setSyncStatusMessage('Menguji koneksi ke Google Apps Script...');
    const ping = await pingGoogleSheets(clean);
    setIsSyncing(false);

    if (ping.success) {
      setIsGoogleSheetsConnected(true);
      setSyncStatusMessage('Terhubung dengan Google Spreadsheet!');
      // Initial fetch
      await refreshData();
      return {
        success: true,
        latencyMs: ping.latencyMs,
        message: `Berhasil terhubung ke spreadsheet "${ping.spreadsheetName || 'PATROL SMESA'}" (${ping.latencyMs}ms)`,
      };
    } else {
      setIsGoogleSheetsConnected(false);
      setSyncStatusMessage(ping.message);
      return {
        success: false,
        latencyMs: ping.latencyMs,
        message: ping.message,
      };
    }
  };

  const clearGasUrlConfig = () => {
    clearGasUrl();
    setGasUrlState('');
    setIsGoogleSheetsConnected(false);
  };

  const toggleAutoSync = (enabled: boolean) => {
    setIsAutoSyncEnabled(enabled);
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, String(enabled));
  };

  const setAutoSyncInterval = (sec: number) => {
    setAutoSyncIntervalSec(sec);
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC_INTERVAL, String(sec));
  };

  // 1-Click Init & Structure Format
  const initGoogleSheets = async () => {
    const { url, isConfigured } = getGasConfig();
    if (!isConfigured || !url) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    setIsSyncing(true);
    setSyncStatusMessage('Menginisialisasi 8 lembar sheet di Google Spreadsheet...');

    const res = await initGoogleSheetsStructure({
      records,
      students,
      classes,
      departments,
      reasons,
      users,
      coachings,
    }, url);

    setIsSyncing(false);
    if (res.success) {
      setIsGoogleSheetsConnected(true);
      setLastSyncedAt(new Date());
      setSyncStatusMessage('Inisialisasi tabel Google Sheets berhasil!');
    }
    return res;
  };

  // 1-Click Full Sync
  const syncAllDataToGoogleSheets = async (): Promise<{ success: boolean; message: string; details?: Record<string, number> }> => {
    const { url, isConfigured } = getGasConfig();
    if (!isConfigured || !url) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    setIsSyncing(true);
    setSyncStatusMessage('Mengunggah seluruh data ke Google Spreadsheet...');

    const payload = {
      records,
      students,
      classes,
      departments,
      reasons,
      users,
      coachings,
      settings: [
        { key: 'school_name', value: settings.school_name, description: 'Nama Sekolah Resmi' },
        { key: 'default_start_time', value: settings.default_start_time, description: 'Batas Waktu Masuk Gerbang' },
        { key: 'academic_year', value: settings.academic_year, description: 'Tahun Ajaran Aktif' },
        { key: 'semester', value: settings.semester, description: 'Semester Aktif' },
        { key: 'warning_threshold_sp1', value: String(settings.warning_threshold_sp1), description: 'Batas Panggilan SP 1' },
        { key: 'warning_threshold_sp2', value: String(settings.warning_threshold_sp2), description: 'Batas Panggilan SP 2' },
      ],
    };

    const res = await syncAllDataToGoogleSheetsBackend(payload, url);
    setIsSyncing(false);

    if (res.success) {
      setIsGoogleSheetsConnected(true);
      setLastSyncedAt(new Date());
      setSyncStatusMessage('Seluruh data berhasil disinkronkan ke Google Spreadsheet.');
    }
    return res;
  };

  // Role Switcher & Database Login
  const switchRole = useCallback((role: UserRole) => {
    const targetUser = users.find(u => u.role === role) || {
      id: 'user-' + role,
      email: `${role}@smkn1jember.sch.id`,
      full_name: `Pengguna ${role.toUpperCase()}`,
      role,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    localStorage.setItem('patrol_smesa_is_authenticated', 'true');
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, targetUser.id);
    logAudit('LOGIN', 'AUTENTIKASI', `Beralih ke peran ${role.toUpperCase()}: ${targetUser.full_name}`);
  }, [users, logAudit]);

  const loginWithEmail = async (email: string, password?: string): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanPassword) {
      return { 
        success: false, 
        message: 'Password wajib dimasukkan! Silakan ketik password akun Anda.' 
      };
    }

    // Check user in state (synced with Google Sheets Pengguna_RBAC)
    const foundUser = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (foundUser) {
      if (foundUser.status === 'inactive') {
        return {
          success: false,
          message: 'Akun ini sedang berstatus NONAKTIF. Silakan hubungi Administrator.'
        };
      }

      const expectedPassword = foundUser.password || 'smesa123';
      if (cleanPassword !== expectedPassword) {
        logAudit('LOGIN', 'AUTENTIKASI', `Gagal login: Password salah untuk akun ${foundUser.email}`);
        return { 
          success: false, 
          message: 'Password yang Anda masukkan salah! Pastikan password sesuai dengan yang diset oleh Admin di Master Data Akun.' 
        };
      }

      setCurrentUser(foundUser);
      setIsAuthenticated(true);
      localStorage.setItem('patrol_smesa_is_authenticated', 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, foundUser.id);
      logAudit('LOGIN', 'AUTENTIKASI', `Login berhasil sebagai ${foundUser.full_name} (${foundUser.role.toUpperCase()})`);
      return { success: true, message: `Login berhasil! Selamat datang, ${foundUser.full_name}`, user: foundUser };
    }

    return { 
      success: false, 
      message: `Akun dengan email "${email}" tidak ditemukan dalam database sistem.` 
    };
  };

  const loginWithRole = async (role: UserRole, password?: string): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const targetUser = users.find(u => u.role === role);
    if (!targetUser) {
      return { success: false, message: `Akun untuk peran ${role.toUpperCase()} tidak ditemukan.` };
    }
    return loginWithEmail(targetUser.email, password);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('patrol_smesa_is_authenticated', 'false');
    logAudit('LOGIN', 'AUTENTIKASI', `Pengguna ${currentUser.full_name} telah keluar (logout).`);
  };

  // RBAC Scoping Helpers
  const scopedRecords = useMemo(() => {
    if (
      currentUser.role === 'admin' || 
      currentUser.role === 'kepala_sekolah' || 
      currentUser.role === 'tim_kesiswaan' ||
      currentUser.role === 'petugas_piket'
    ) {
      return records;
    }
    if (currentUser.role === 'kkk') {
      const dept = departments.find(d => d.id === currentUser.assigned_department_id);
      const code = dept ? dept.code : 'DKV';
      return records.filter(r => r.department_code === code);
    }
    if (currentUser.role === 'wali_kelas') {
      const cls = classes.find(c => c.id === currentUser.assigned_class_id);
      const clsName = cls ? cls.name : 'X DKV 1';
      return records.filter(r => r.class_name === clsName || r.class_id === currentUser.assigned_class_id);
    }
    return records;
  }, [records, currentUser, departments, classes]);

  const scopedStudents = useMemo(() => {
    if (
      currentUser.role === 'admin' || 
      currentUser.role === 'kepala_sekolah' || 
      currentUser.role === 'tim_kesiswaan' ||
      currentUser.role === 'petugas_piket'
    ) {
      return students;
    }
    if (currentUser.role === 'kkk') {
      const dept = departments.find(d => d.id === currentUser.assigned_department_id);
      const deptId = dept ? dept.id : 'dept-dkv';
      return students.filter(s => s.department_id === deptId || s.department_code === (dept?.code || 'DKV'));
    }
    if (currentUser.role === 'wali_kelas') {
      return students.filter(s => s.class_id === currentUser.assigned_class_id || s.class_name === 'X DKV 1');
    }
    return students;
  }, [students, currentUser, departments]);

  const scopedClasses = useMemo(() => {
    if (
      currentUser.role === 'admin' || 
      currentUser.role === 'kepala_sekolah' || 
      currentUser.role === 'tim_kesiswaan' ||
      currentUser.role === 'petugas_piket'
    ) {
      return classes;
    }
    if (currentUser.role === 'kkk') {
      return classes.filter(c => c.department_id === currentUser.assigned_department_id);
    }
    if (currentUser.role === 'wali_kelas') {
      return classes.filter(c => c.id === currentUser.assigned_class_id || c.name === 'X DKV 1');
    }
    return classes;
  }, [classes, currentUser]);

  // Operations
  const recordLateness = async (data: {
    studentId: string;
    arrivalTime: string;
    eventDate: string;
    reasonId: string;
    notes?: string;
    allowDuplicateOverride?: boolean;
  }): Promise<{ success: boolean; message: string; record?: LatenessRecord; isDuplicate?: boolean }> => {
    const student = students.find(s => s.id === data.studentId);
    if (!student) {
      return { success: false, message: 'Data siswa tidak ditemukan.' };
    }

    const reason = reasons.find(r => r.id === data.reasonId) || reasons[0];

    // Check duplicate detection
    const isDuplicate = records.some(r => 
      !r.is_cancelled &&
      r.student_id === data.studentId && 
      r.event_date === data.eventDate
    );

    if (isDuplicate && !data.allowDuplicateOverride) {
      return {
        success: false,
        isDuplicate: true,
        message: `Siswa ${student.full_name} sudah tercatat terlambat hari ini (${data.eventDate}).`,
      };
    }

    const scheduledTime = settings.default_start_time || '07:00:00';
    const [arrH, arrM] = data.arrivalTime.split(':').map(Number);
    const [schH, schM] = scheduledTime.split(':').map(Number);
    const diffMinutes = Math.max(1, (arrH * 60 + arrM) - (schH * 60 + schM));

    const dateObj = new Date(data.eventDate);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[dateObj.getDay()] || 'Senin';

    const newRecordId = 'rec-' + Date.now();
    const newRecord: LatenessRecord = {
      id: newRecordId,
      student_id: student.id,
      student_name: student.full_name,
      nis: student.nis,
      nisn: student.nisn,
      class_id: student.class_id,
      class_name: student.class_name,
      department_id: student.department_id,
      department_code: student.department_code,
      event_date: data.eventDate,
      day_name: dayName,
      arrival_time: data.arrivalTime.length === 5 ? `${data.arrivalTime}:00` : data.arrivalTime,
      scheduled_time: scheduledTime,
      late_duration_minutes: diffMinutes,
      reason_id: reason.id,
      reason_name: reason.name,
      notes: data.notes || '',
      recorded_by_id: currentUser.id,
      recorded_by_name: currentUser.full_name,
      recorded_at: new Date().toISOString(),
      verification_status: 'terverifikasi',
      followup_status: 'belum_ditindaklanjuti',
      created_at: new Date().toISOString(),
    };

    // Update state & LocalStorage immediately (optimistic UI)
    setRecords(prev => [newRecord, ...prev]);

    // Broadcast realtime event across tabs
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'RECORD_INSERTED', record: newRecord });
      } catch {
        // ignore
      }
    }

    // Asynchronously push to Google Sheets if connected
    let sheetStatusNote = '';
    if (isGoogleSheetsConnected) {
      postToGoogleSheets('insertRecord', { record: newRecord }).then(res => {
        if (!res.success) {
          console.warn('Gagal append ke Google Sheets:', res.message);
        } else {
          setLastSyncedAt(new Date());
        }
      });
      sheetStatusNote = ' (Tersimpan ke Google Sheets & Realtime)';
    }

    logAudit('CREATE', 'KETERLAMBATAN', `Mencatat keterlambatan ${student.full_name} (${student.class_name}) - Durasi ${diffMinutes} menit. Alasan: ${reason.name}`, newRecordId);

    return {
      success: true,
      message: `Keterlambatan ${student.full_name} (${diffMinutes} menit) berhasil dicatat.${sheetStatusNote}`,
      record: newRecord,
    };
  };

  const verifyRecord = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    let updatedTarget: LatenessRecord | null = null;
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        updatedTarget = { ...r, verification_status: status };
        return updatedTarget;
      }
      return r;
    }));

    if (updatedTarget && isGoogleSheetsConnected) {
      postToGoogleSheets('updateRecord', { record: updatedTarget });
    }

    if (broadcastChannel && updatedTarget) {
      broadcastChannel.postMessage({ type: 'RECORD_UPDATED', record: updatedTarget });
    }

    logAudit('VERIFY', 'KETERLAMBATAN', `Mengubah status verifikasi transaksi ${id} menjadi ${status}`, id);
  };

  const cancelRecord = async (id: string, cancellationReason: string) => {
    const updatedFields = {
      is_cancelled: true,
      cancellation_reason: cancellationReason,
      cancelled_by_name: currentUser.full_name,
      cancelled_at: new Date().toISOString(),
    };

    let updatedTarget: LatenessRecord | null = null;
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        updatedTarget = { ...r, ...updatedFields };
        return updatedTarget;
      }
      return r;
    }));

    if (updatedTarget && isGoogleSheetsConnected) {
      postToGoogleSheets('updateRecord', { record: updatedTarget });
    }

    if (broadcastChannel && updatedTarget) {
      broadcastChannel.postMessage({ type: 'RECORD_UPDATED', record: updatedTarget });
    }

    logAudit('CANCEL', 'KETERLAMBATAN', `Membatalkan transaksi ${id}. Alasan: ${cancellationReason}`, id);
  };

  const addCoaching = async (data: Omit<CoachingRecord, 'id' | 'created_at'>) => {
    const newCoaching: CoachingRecord = {
      ...data,
      id: 'cch-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setCoachings(prev => [newCoaching, ...prev]);

    if (data.lateness_record_id) {
      setRecords(prev => prev.map(r => r.id === data.lateness_record_id ? {
        ...r,
        followup_status: data.status,
        coaching_summary: `${data.coaching_type}: ${data.target_improvement}`
      } : r));
    }

    if (isGoogleSheetsConnected) {
      postToGoogleSheets('syncAll', {
        data: {
          coachings: [newCoaching, ...coachings],
        }
      });
    }

    logAudit('CREATE', 'PEMBINAAN', `Mencatat pembinaan siswa ${data.student_name} (${data.coaching_type})`, newCoaching.id);
  };

  const updateCoachingStatus = async (id: string, status: FollowUpStatus, evaluationResult?: string) => {
    setCoachings(prev => prev.map(c => c.id === id ? {
      ...c,
      status,
      evaluation_result: evaluationResult || c.evaluation_result,
    } : c));

    logAudit('UPDATE', 'PEMBINAAN', `Memperbarui status pembinaan ${id} menjadi ${status}`, id);
  };

  // Master Data Methods
  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    if (students.some(s => s.nis === studentData.nis)) {
      alert(`NIS ${studentData.nis} sudah terdaftar dalam sistem.`);
      return false;
    }
    const newStudent: Student = {
      ...studentData,
      id: 'std-' + Date.now(),
    };
    setStudents(prev => [newStudent, ...prev]);

    if (isGoogleSheetsConnected) {
      postToGoogleSheets('insertStudent', { student: newStudent });
    }

    logAudit('CREATE', 'SISWA', `Menambahkan siswa baru: ${newStudent.full_name} (${newStudent.nis})`, newStudent.id);
    return true;
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    let updatedObj: Student | null = null;
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        updatedObj = { ...s, ...studentData };
        return updatedObj;
      }
      return s;
    }));

    if (updatedObj && isGoogleSheetsConnected) {
      postToGoogleSheets('updateStudent', { student: updatedObj });
    }

    logAudit('UPDATE', 'SISWA', `Memperbarui data siswa ID: ${id}`, id);
    return true;
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (isGoogleSheetsConnected) {
      postToGoogleSheets('deleteStudent', { id });
    }
    logAudit('DELETE', 'SISWA', `Menghapus siswa ID: ${id}`, id);
    return true;
  };

  const importStudentsCSV = async (parsedStudents: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>) => {
    let count = 0;
    let duplicates = 0;
    const newStudents: Student[] = [];
    const existingNisSet = new Set(students.map(s => s.nis));

    for (const item of parsedStudents) {
      if (existingNisSet.has(item.nis)) {
        duplicates++;
      } else {
        existingNisSet.add(item.nis);
        newStudents.push({
          ...item,
          id: 'std-' + Date.now() + '-' + count,
        });
        count++;
      }
    }

    if (newStudents.length > 0) {
      const merged = [...newStudents, ...students];
      setStudents(merged);
      if (isGoogleSheetsConnected) {
        postToGoogleSheets('syncAll', { data: { students: merged } });
      }
      logAudit('IMPORT', 'SISWA', `Impor CSV berhasil: ${count} siswa ditambahkan, ${duplicates} duplikat diabaikan.`);
    }

    return { count, duplicates };
  };

  const addClass = async (clsData: Omit<ClassRoom, 'id'>) => {
    if (classes.some(c => c.code.toLowerCase() === clsData.code.toLowerCase())) {
      alert(`Kode kelas ${clsData.code} sudah ada.`);
      return false;
    }
    const newClass: ClassRoom = {
      ...clsData,
      id: 'cls-' + Date.now(),
    };
    setClasses(prev => [...prev, newClass]);

    if (isGoogleSheetsConnected) {
      postToGoogleSheets('insertClass', { classRoom: newClass });
    }

    logAudit('CREATE', 'KELAS', `Menambahkan kelas baru: ${newClass.name} (${newClass.code})`, newClass.id);
    return true;
  };

  const updateClass = async (id: string, clsData: Partial<ClassRoom>) => {
    let updated: ClassRoom | null = null;
    setClasses(prev => prev.map(c => {
      if (c.id === id) {
        updated = { ...c, ...clsData };
        return updated;
      }
      return c;
    }));

    if (updated && isGoogleSheetsConnected) {
      postToGoogleSheets('updateClass', { classRoom: updated });
    }

    logAudit('UPDATE', 'KELAS', `Memperbarui kelas ID: ${id}`, id);
    return true;
  };

  const deleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    if (isGoogleSheetsConnected) {
      postToGoogleSheets('deleteClass', { id });
    }
    logAudit('DELETE', 'KELAS', `Menghapus kelas ID: ${id}`, id);
    return true;
  };

  const importClassesCSV = async (parsedClasses: Array<Omit<ClassRoom, 'id'>>) => {
    let count = 0;
    let duplicates = 0;
    const newClasses: ClassRoom[] = [];
    const existingCodeSet = new Set(classes.map(c => c.code.toLowerCase()));

    for (const item of parsedClasses) {
      if (existingCodeSet.has(item.code.toLowerCase())) {
        duplicates++;
      } else {
        existingCodeSet.add(item.code.toLowerCase());
        newClasses.push({
          ...item,
          id: 'cls-' + Date.now() + '-' + count,
        });
        count++;
      }
    }

    if (newClasses.length > 0) {
      const merged = [...classes, ...newClasses];
      setClasses(merged);
      if (isGoogleSheetsConnected) {
        postToGoogleSheets('syncAll', { data: { classes: merged } });
      }
      logAudit('IMPORT', 'KELAS', `Impor CSV Kelas: ${count} rombel ditambahkan, ${duplicates} duplikat diabaikan.`);
    }

    return { count, duplicates };
  };

  const addReason = async (reasonData: Omit<LatenessReason, 'id'>) => {
    const newReason: LatenessReason = {
      ...reasonData,
      id: 'rsn-' + Date.now(),
    };
    setReasons(prev => [...prev, newReason]);
    logAudit('CREATE', 'ALASAN', `Menambahkan alasan baru: ${newReason.name}`, newReason.id);
    return true;
  };

  const updateReason = async (id: string, reasonData: Partial<LatenessReason>) => {
    setReasons(prev => prev.map(r => r.id === id ? { ...r, ...reasonData } : r));
    logAudit('UPDATE', 'ALASAN', `Memperbarui alasan ID: ${id}`, id);
    return true;
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
    logAudit('UPDATE', 'PENGATURAN', 'Memperbarui konfigurasi aplikasi.');
  };

  // User Management (RBAC) CRUD & Password Management
  const addUser = async (userData: Omit<UserProfile, 'id' | 'created_at'> & { password?: string }): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: `Email "${cleanEmail}" sudah digunakan oleh akun lain.` };
    }

    const newUser: UserProfile = {
      ...userData,
      id: 'user-' + Date.now(),
      email: cleanEmail,
      password: userData.password?.trim() || 'smesa123',
      status: userData.status || 'active',
      created_at: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);

    if (isGoogleSheetsConnected) {
      postToGoogleSheets('insertUser', { user: newUser });
    }

    logAudit('CREATE', 'PENGGUNA', `Menambahkan akun pengguna baru: ${newUser.full_name} (${newUser.role.toUpperCase()})`, newUser.id);
    return { success: true, message: `Akun ${newUser.full_name} berhasil ditambahkan ke sistem.`, user: newUser };
  };

  const updateUser = async (id: string, userData: Partial<UserProfile> & { password?: string }): Promise<{ success: boolean; message: string }> => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    if (userData.email && userData.email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      const emailTaken = users.some(u => u.id !== id && u.email.toLowerCase() === userData.email!.trim().toLowerCase());
      if (emailTaken) {
        return { success: false, message: `Email "${userData.email}" sudah digunakan oleh pengguna lain.` };
      }
    }

    let updatedTarget: UserProfile | null = null;
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        updatedTarget = {
          ...u,
          ...userData,
          email: userData.email ? userData.email.trim().toLowerCase() : u.email,
          password: userData.password !== undefined && userData.password.trim() !== '' ? userData.password.trim() : u.password,
          updated_at: new Date().toISOString(),
        };
        return updatedTarget;
      }
      return u;
    }));

    if (currentUser.id === id && updatedTarget) {
      setCurrentUser(updatedTarget);
    }

    if (updatedTarget && isGoogleSheetsConnected) {
      postToGoogleSheets('updateUser', { user: updatedTarget });
    }

    const passwordChangedNotice = (userData.password && userData.password.trim() !== '') ? ' (Password diperbarui)' : '';
    logAudit('UPDATE', 'PENGGUNA', `Memperbarui akun pengguna: ${targetUser.full_name}${passwordChangedNotice}`, id);
    return { success: true, message: `Data akun ${targetUser.full_name} berhasil diperbarui.${passwordChangedNotice}` };
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    if (currentUser.id === id) {
      return { success: false, message: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.' };
    }

    setUsers(prev => prev.filter(u => u.id !== id));

    if (isGoogleSheetsConnected) {
      postToGoogleSheets('deleteUser', { id });
    }

    logAudit('DELETE', 'PENGGUNA', `Menghapus akun pengguna: ${targetUser.full_name} (${targetUser.email})`, id);
    return { success: true, message: `Akun ${targetUser.full_name} berhasil dihapus dari sistem.` };
  };

  const resetToDemoData = () => {
    if (confirm('Kembalikan seluruh data ke Data Demo Awal SMK Negeri 1 Jember? Transaksi lokal akan ter-reset.')) {
      setRecords(INITIAL_RECORDS);
      setStudents(INITIAL_STUDENTS);
      setClasses(INITIAL_CLASSES);
      setDepartments(INITIAL_DEPARTMENTS);
      setReasons(INITIAL_REASONS);
      setUsers(DEMO_USERS);
      setCoachings(INITIAL_COACHINGS);
      setSettingsState(INITIAL_SETTINGS);
      localStorage.clear();
      alert('Data sistem telah dikembalikan ke data awal SMKN 1 Jember.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        users,
        isAuthenticated,
        loginWithRole,
        loginWithEmail,
        logout,
        addUser,
        updateUser,
        deleteUser,
        departments,
        classes,
        students,
        reasons,
        records,
        coachings,
        schedules,
        settings,
        auditLogs,
        scopedRecords,
        scopedStudents,
        scopedClasses,
        recordLateness,
        verifyRecord,
        cancelRecord,
        addCoaching,
        updateCoachingStatus,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudentsCSV,
        addClass,
        updateClass,
        deleteClass,
        importClassesCSV,
        addReason,
        updateReason,
        updateSettings,

        // Google Sheets Backend & Realtime Sync Engine
        isGoogleSheetsConnected,
        gasUrl,
        isAutoSyncEnabled,
        autoSyncIntervalSec,
        lastSyncedAt,
        isSyncing,
        syncStatusMessage,
        refreshData,
        syncAllDataToGoogleSheets,
        initGoogleSheets,
        saveGasUrl,
        clearGasUrlConfig,
        toggleAutoSync,
        setAutoSyncInterval,
        resetToDemoData,

        // Compatibility aliases for components expecting Supabase properties
        isSupabaseConnected: isGoogleSheetsConnected,
        supabaseUrl: gasUrl,
        syncAllDataToSupabase: syncAllDataToGoogleSheets,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
