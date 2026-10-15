import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
import { getSupabase, getSupabaseConfig } from '../lib/supabaseClient';

interface AppContextType {
  // Auth & RBAC
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: UserRole) => void;
  users: UserProfile[];
  
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
  
  // Connection & Status
  isSupabaseConnected: boolean;
  supabaseUrl: string;
  refreshData: () => Promise<void>;
  resetToDemoData: () => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user state
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    const found = DEMO_USERS.find(u => u.id === savedUserId);
    return found || DEMO_USERS[0]; // Default to Admin
  });

  // Master Data
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

  const { isConfigured, url: supabaseUrl } = getSupabaseConfig();
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isConfigured);

  // Sync to localStorage
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
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]); // maintain last 200 logs
  }, [currentUser]);

  // Connect to live Supabase if configured and setup Realtime
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsSupabaseConnected(false);
      return;
    }

    let isMounted = true;
    const testConnectionAndFetch = async () => {
      try {
        const { data, error } = await supabase.from('lateness_records').select('*').limit(50);
        if (!error && isMounted) {
          setIsSupabaseConnected(true);
          if (data && data.length > 0) {
            setRecords(data as LatenessRecord[]);
          }
        }
      } catch {
        if (isMounted) setIsSupabaseConnected(false);
      }
    };

    testConnectionAndFetch();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('patrol_smesa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lateness_records' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRecords(prev => [payload.new as LatenessRecord, ...prev.filter(r => r.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setRecords(prev => prev.map(r => r.id === payload.new.id ? payload.new as LatenessRecord : r));
        } else if (payload.eventType === 'DELETE') {
          setRecords(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Role Switcher for seamless testing of all 5 personas
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
    logAudit('LOGIN', 'AUTENTIKASI', `Beralih ke peran ${role.toUpperCase()}: ${targetUser.full_name}`);
  }, [users, logAudit]);

  // RBAC Scoping Helpers
  const scopedRecords = useMemo(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah' || currentUser.role === 'tim_kesiswaan') {
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
    if (currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah' || currentUser.role === 'tim_kesiswaan') {
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
    if (currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah' || currentUser.role === 'tim_kesiswaan') {
      return classes;
    }
    if (currentUser.role === 'kkk') {
      return classes.filter(c => c.department_id === currentUser.assigned_department_id);
    }
    if (currentUser.role === 'wali_kelas') {
      return classes.filter(c => c.id === currentUser.assigned_class_id);
    }
    return classes;
  }, [classes, currentUser]);

  // Record Lateness Function
  const recordLateness = async (data: {
    studentId: string;
    arrivalTime: string;
    eventDate: string;
    reasonId: string;
    notes?: string;
    allowDuplicateOverride?: boolean;
  }) => {
    const student = students.find(s => s.id === data.studentId);
    if (!student) {
      return { success: false, message: 'Data siswa tidak ditemukan.' };
    }

    const reason = reasons.find(r => r.id === data.reasonId);
    if (!reason) {
      return { success: false, message: 'Alasan keterlambatan harus dipilih.' };
    }

    // Determine Day Name
    const dateObj = new Date(data.eventDate + 'T00:00:00');
    const dayIndex = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
    const daysMap: Record<number, string> = {
      0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu'
    };
    const dayName = daysMap[dayIndex] || 'Senin';

    // Get scheduled start time for day
    const schedule = schedules.find(s => s.day_of_week === dayIndex) || {
      start_time: settings.default_start_time,
      tolerance_minutes: 0,
    };

    const scheduledTimeStr = schedule.start_time.length === 5 ? schedule.start_time + ':00' : schedule.start_time;
    const arrivalTimeStr = data.arrivalTime.length === 5 ? data.arrivalTime + ':00' : data.arrivalTime;

    // Calculate Late Duration in Minutes
    const [schedHours, schedMins] = schedule.start_time.split(':').map(Number);
    const [arrHours, arrMins] = data.arrivalTime.split(':').map(Number);
    const schedTotalMinutes = schedHours * 60 + schedMins + (schedule.tolerance_minutes || 0);
    const arrTotalMinutes = arrHours * 60 + arrMins;

    const diffMinutes = arrTotalMinutes - schedTotalMinutes;

    // Strict Validation: Must be late!
    if (diffMinutes <= 0) {
      return { 
        success: false, 
        message: `Waktu kedatangan (${data.arrivalTime} WIB) tidak melewati jam masuk (${schedule.start_time} WIB). Siswa datang tepat waktu atau lebih awal, sehingga tidak dicatat sebagai keterlambatan.` 
      };
    }

    // Duplicate Check: Same student on same date
    const existingRecord = records.find(r => 
      r.student_id === student.id && 
      r.event_date === data.eventDate && 
      !r.is_cancelled
    );

    if (existingRecord && !data.allowDuplicateOverride) {
      return {
        success: false,
        isDuplicate: true,
        message: `Peringatan: Siswa ${student.full_name} sudah tercatat terlambat hari ini (${data.eventDate}) pada pukul ${existingRecord.arrival_time}. Mohon konfirmasi jika ini memang pencatatan kasus tambahan.`
      };
    }

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
      arrival_time: arrivalTimeStr,
      scheduled_time: scheduledTimeStr,
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

    // If Supabase is connected, insert to Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('lateness_records').insert([newRecord]);
      } catch (err) {
        console.warn('Gagal menyimpan langsung ke Supabase, menyimpan ke state lokal:', err);
      }
    }

    setRecords(prev => [newRecord, ...prev]);
    logAudit('CREATE', 'KETERLAMBATAN', `Mencatat keterlambatan ${student.full_name} (${student.class_name}) - Durasi ${diffMinutes} menit. Alasan: ${reason.name}`, newRecordId);

    return {
      success: true,
      message: `Keterlambatan ${student.full_name} (${diffMinutes} menit) berhasil dicatat dan diverifikasi.`,
      record: newRecord,
    };
  };

  const verifyRecord = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, verification_status: status } : r));
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('lateness_records').update({ verification_status: status }).eq('id', id);
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
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('lateness_records').update(updatedFields).eq('id', id);
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

    // Update corresponding lateness record followup status if linked
    if (data.lateness_record_id) {
      setRecords(prev => prev.map(r => r.id === data.lateness_record_id ? {
        ...r,
        followup_status: data.status,
        coaching_summary: `${data.coaching_type}: ${data.target_improvement}`
      } : r));
    }

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('coaching_records').insert([newCoaching]);
      if (data.lateness_record_id) {
        await supabase.from('lateness_records').update({ followup_status: data.status }).eq('id', data.lateness_record_id);
      }
    }

    logAudit('CREATE', 'PEMBINAAN', `Mencatat pembinaan siswa ${data.student_name} (${data.coaching_type})`, newCoaching.id);
  };

  const updateCoachingStatus = async (id: string, status: FollowUpStatus, evaluationResult?: string) => {
    setCoachings(prev => prev.map(c => c.id === id ? {
      ...c,
      status,
      evaluation_result: evaluationResult || c.evaluation_result,
    } : c));

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('coaching_records').update({ status, evaluation_result: evaluationResult }).eq('id', id);
    }

    logAudit('UPDATE', 'PEMBINAAN', `Memperbarui status pembinaan ${id} menjadi ${status}`, id);
  };

  // Master Data Methods
  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    // Unique NIS check
    if (students.some(s => s.nis === studentData.nis)) {
      alert(`NIS ${studentData.nis} sudah terdaftar dalam sistem.`);
      return false;
    }
    const newStudent: Student = {
      ...studentData,
      id: 'std-' + Date.now(),
    };
    setStudents(prev => [newStudent, ...prev]);
    logAudit('CREATE', 'SISWA', `Menambahkan siswa baru: ${newStudent.full_name} (${newStudent.nis})`, newStudent.id);
    return true;
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...studentData } : s));
    logAudit('UPDATE', 'SISWA', `Memperbarui data siswa ID: ${id}`, id);
    return true;
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
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
      setStudents(prev => [...newStudents, ...prev]);
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
    logAudit('CREATE', 'KELAS', `Menambahkan kelas baru: ${newClass.name} (${newClass.code})`, newClass.id);
    return true;
  };

  const updateClass = async (id: string, clsData: Partial<ClassRoom>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...clsData } : c));
    logAudit('UPDATE', 'KELAS', `Memperbarui kelas ID: ${id}`, id);
    return true;
  };

  const deleteClass = async (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
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
      setClasses(prev => [...prev, ...newClasses]);
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

  const refreshData = async () => {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('lateness_records').select('*').order('event_date', { ascending: false });
      if (data) setRecords(data as LatenessRecord[]);
    }
  };

  const resetToDemoData = () => {
    if (confirm('Kembalikan seluruh data ke Data Demo Awal SMK Negeri 1 Jember? Transaksi yang belum disimpan ke Supabase akan ter-reset.')) {
      setRecords(INITIAL_RECORDS);
      setStudents(INITIAL_STUDENTS);
      setClasses(INITIAL_CLASSES);
      setDepartments(INITIAL_DEPARTMENTS);
      setReasons(INITIAL_REASONS);
      setCoachings(INITIAL_COACHINGS);
      setSettingsState(INITIAL_SETTINGS);
      setAuditLogs([]);
      localStorage.clear();
      logAudit('UPDATE', 'SISTEM', 'Mereset data aplikasi ke data bawaan demo SMKN 1 Jember.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        users,
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
        isSupabaseConnected,
        supabaseUrl,
        refreshData,
        resetToDemoData,
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
