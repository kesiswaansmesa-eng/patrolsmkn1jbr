import React, { useState, useMemo } from 'react';
import { 
  Clock, AlertTriangle, CheckCircle2, User, 
  Sparkles, Save, RotateCcw, AlertCircle, ArrowRight, ShieldCheck, Flame,
  Filter, School, Users, X, ChevronDown, Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getWIBCurrentTime, getWIBTodayString, formatIndonesianDate } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

export const RecordLatenessView: React.FC = () => {
  const { students, reasons, recordLateness, schedules, settings, records, currentUser, classes } = useApp();

  // Form States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [eventDate, setEventDate] = useState(getWIBTodayString());
  const [arrivalTime, setArrivalTime] = useState(getWIBCurrentTime());
  const [selectedReasonId, setSelectedReasonId] = useState(reasons[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Class Filter State for easy student discovery
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');

  // Duplicate Warning Modal state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: '' });

  // Success Feedback
  const [successInfo, setSuccessInfo] = useState<{
    show: boolean;
    studentName: string;
    duration: number;
    className: string;
  } | null>(null);

  // Error Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-update current arrival time and date
  const handleSetCurrentTime = () => {
    setArrivalTime(getWIBCurrentTime());
  };

  const handleSetTodayDate = () => {
    setEventDate(getWIBTodayString());
  };

  // Grade ordering map
  const gradeRank: Record<string, number> = { X: 1, XI: 2, XII: 3 };

  // Sort classes logically (Tingkat X, XI, XII, then alphabetical name)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const rankA = gradeRank[a.grade_level] || 99;
      const rankB = gradeRank[b.grade_level] || 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [classes]);

  // Filter classes by grade level if tab/filter is picked
  const displayedClasses = useMemo(() => {
    if (gradeFilter === 'ALL') return sortedClasses;
    return sortedClasses.filter(c => c.grade_level === gradeFilter);
  }, [sortedClasses, gradeFilter]);

  // Students in selected class (or all students if no class filter), sorted alphabetically
  const classStudents = useMemo(() => {
    const list = !selectedClassFilter
      ? [...students]
      : students.filter(s => s.class_name === selectedClassFilter || s.class_id === selectedClassFilter);
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [students, selectedClassFilter]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setErrorMessage(null);
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setNotes('');
    setErrorMessage(null);
    setSuccessInfo(null);
    setArrivalTime(getWIBCurrentTime());
    setEventDate(getWIBTodayString());
  };

  // Determine current scheduled time for date - Default 07:00 WIB
  const dateObj = new Date(eventDate + 'T00:00:00');
  const dayIndex = dateObj.getDay();
  const defaultStartTime = settings.default_start_time || '07:00';
  const matchedSchedule = schedules.find(s => s.day_of_week === dayIndex && s.is_active);
  const rawStartTime = matchedSchedule ? matchedSchedule.start_time : defaultStartTime;
  const finalStartTime = (rawStartTime === '06:45' || !rawStartTime) ? '07:00' : rawStartTime;
  const schedule = {
    start_time: finalStartTime,
    tolerance_minutes: matchedSchedule?.tolerance_minutes ?? 0,
    day_name: matchedSchedule?.day_name ?? 'Hari Sekolah',
  };

  // Calculate live preview difference
  const [schedH, schedM] = schedule.start_time.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  const schedMinutes = schedH * 60 + schedM;
  const arrMinutes = (arrH || 0) * 60 + (arrM || 0);
  const liveDiffMinutes = arrMinutes - schedMinutes;
  const isTechnicallyLate = liveDiffMinutes > 0;

  // Student recent lateness count
  const studentTotalLates = selectedStudent
    ? records.filter(r => r.student_id === selectedStudent.id && !r.is_cancelled).length
    : 0;

  const handleSubmit = async (allowDuplicateOverride = false) => {
    if (!selectedStudent) {
      setErrorMessage('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    if (!selectedReasonId) {
      setErrorMessage('Pilih salah satu alasan keterlambatan.');
      return;
    }
    if (!isTechnicallyLate) {
      setErrorMessage(`Waktu kedatangan (${arrivalTime} WIB) belum melewati jam masuk sekolah (${schedule.start_time} WIB). Siswa belum dikategorikan terlambat!`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await recordLateness({
      studentId: selectedStudent.id,
      arrivalTime,
      eventDate,
      reasonId: selectedReasonId,
      notes,
      allowDuplicateOverride,
      lateDurationMinutes: liveDiffMinutes > 0 ? liveDiffMinutes : undefined,
      scheduledTime: schedule.start_time,
    });

    setIsSubmitting(false);

    if (result.isDuplicate && !allowDuplicateOverride) {
      setDuplicateWarning({
        isOpen: true,
        message: result.message,
      });
      return;
    }

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    // Success!
    setDuplicateWarning({ isOpen: false, message: '' });
    setSuccessInfo({
      show: true,
      studentName: selectedStudent.full_name,
      duration: liveDiffMinutes,
      className: selectedStudent.class_name,
    });

    // Auto-reset form input untuk mencatat siswa berikutnya tanpa menghapus tanggal yang dipilih
    setSelectedStudent(null);
    setNotes('');
    setArrivalTime(getWIBCurrentTime());

    // Sound / Visual Celebration
    try {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // non-blocking
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-2 sm:px-4 lg:px-0 pb-10">
      {/* Top Banner Gerbang Pagi */}
      <div className="bg-gradient-to-r from-[#0B1528] via-[#162a52] to-[#1E3A8A] text-white p-4 sm:p-6 rounded-2xl shadow-md border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 sm:p-1.5 shadow-md flex-shrink-0 flex items-center justify-center border border-amber-400/40">
              <img 
                src="https://iili.io/nhMcBoB.md.png" 
                alt="Logo SMKN 1 Jember" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900">
                  Mode Gerbang Pagi
                </span>
                <span className="text-[11px] sm:text-xs text-blue-200">SMK Negeri 1 Jember</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Catat Siswa Terlambat
              </h1>
              <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5 sm:mt-1 max-w-xl leading-relaxed">
                Alur cepat satu sentuhan untuk petugas piket gerbang & kesiswaan. Waktu kedatangan dan durasi terlambat dihitung presisi otomatis.
              </p>
            </div>
          </div>

          {/* Quick Schedule Indicator */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-white/15 text-center flex-shrink-0 self-start sm:self-auto flex sm:flex-col items-center justify-between sm:justify-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] sm:text-[11px] text-blue-200 font-medium">Jam Masuk Berlaku:</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight">
              {schedule.start_time} <span className="text-[10px] sm:text-xs text-white">WIB</span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-blue-200 hidden sm:block mt-0.5">{schedule.day_name}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successInfo?.show && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-sm sm:text-base">
                  Transaksi Keterlambatan Berhasil Tersimpan!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Siswa <span className="font-bold">{successInfo.studentName}</span> ({successInfo.className}) tercatat terlambat <span className="font-extrabold text-red-600">{successInfo.duration} menit</span>.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleResetForm}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Catat Siswa Berikutnya
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-700 hover:text-emerald-900 text-sm font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3 text-red-900 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">Validasi Tidak Terpenuhi</p>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold p-1 cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible p-4 sm:p-7 space-y-5 sm:space-y-6">
        
        {/* Step 1: Filter Kelas & Pemilihan Siswa Terlambat */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">1</span>
              <span>Pilih Siswa Terlambat</span>
              <span className="text-red-500">*</span>
            </label>

            {/* Quick Status / Total students in context */}
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
              {selectedClassFilter ? (
                <span className="text-blue-700 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  Kelas <strong className="underline">{selectedClassFilter}</strong> ({classStudents.length} siswa)
                </span>
              ) : (
                <span>Total Basis Data: <strong>{students.length}</strong> Siswa</span>
              )}
            </span>
          </div>

          {/* Baris Filter Kelas & Pilihan Cepat Tingkat */}
          <div className="p-3 sm:p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pilih Rombongan Belajar (Kelas):</span>
              </div>

              {/* Tingkat Tabs (Semua, X, XI, XII) - Touch Scrollable on Mobile */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar w-full sm:w-auto text-xs shrink-0">
                {(['ALL', 'X', 'XI', 'XII'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setGradeFilter(lvl);
                      if (lvl !== 'ALL' && selectedClassFilter) {
                        const targetClass = classes.find(c => c.name === selectedClassFilter);
                        if (targetClass && targetClass.grade_level !== lvl) {
                          setSelectedClassFilter('');
                        }
                      }
                    }}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer text-center ${
                      gradeFilter === lvl
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Semua' : `Kelas ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Pemilihan Kelas & Tombol Reset */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4 text-blue-600 shrink-0" />
                </div>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => {
                    const newClass = e.target.value;
                    setSelectedClassFilter(newClass);
                    if (newClass) {
                      if (selectedStudent && selectedStudent.class_name !== newClass) {
                        setSelectedStudent(null);
                      }
                    }
                  }}
                  className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate ${
                    selectedClassFilter
                      ? 'bg-blue-50/90 border-blue-400 text-blue-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <option value="">-- Semua Kelas ({classes.length} Rombel) --</option>
                  {displayedClasses.map((cls) => {
                    const studentCount = students.filter(s => s.class_name === cls.name || s.class_id === cls.id).length;
                    return (
                      <option key={cls.id} value={cls.name}>
                        {cls.name} &bull; {cls.department_code} ({studentCount} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedClassFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassFilter('');
                    setGradeFilter('ALL');
                  }}
                  className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Tampilkan kembali seluruh siswa sekolah"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Hint bantuan filter aktif */}
            {selectedClassFilter && (
              <div className="flex flex-wrap items-center justify-between text-[11px] text-blue-900 bg-blue-100/70 border border-blue-200 px-3 py-1.5 rounded-lg gap-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Menampilkan <strong>{classStudents.length} siswa</strong> di <strong>{selectedClassFilter}</strong></span>
                </span>
                <span className="text-slate-500 text-[11px]">Pilih nama siswa di bawah</span>
              </div>
            )}
          </div>

          {/* Pemilihan Siswa Terlambat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Pilih Nama Siswa:</span>
              </label>
              {selectedStudent ? (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Siswa Terpilih
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  {selectedClassFilter ? `${classStudents.length} Siswa di ${selectedClassFilter}` : `${students.length} Siswa Terdaftar`}
                </span>
              )}
            </div>

            {/* Dropdown Pilihan Nama Siswa */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const studentId = e.target.value;
                  if (!studentId) {
                    setSelectedStudent(null);
                  } else {
                    const found = students.find(s => s.id === studentId);
                    if (found) {
                      handleSelectStudent(found);
                    }
                  }
                }}
                className={`w-full pl-10 pr-9 py-3 bg-white border-2 rounded-xl text-xs sm:text-sm font-bold text-slate-800 transition-all shadow-xs cursor-pointer truncate ${
                  selectedStudent 
                    ? 'border-blue-500 bg-blue-50/40 text-blue-900 ring-2 ring-blue-500/20' 
                    : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-hidden'
                }`}
              >
                <option value="">
                  {selectedClassFilter 
                    ? `-- Pilih Nama Siswa di ${selectedClassFilter} (${classStudents.length} Siswa) --` 
                    : `-- Pilih Nama Siswa Terlambat (${students.length} Siswa) --`}
                </option>
                {classStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} | NIS: {student.nis} {selectedClassFilter ? '' : `| ${student.class_name}`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Jika belum memilih siswa & kelas dipilih: Tampilkan Daftar Siswa untuk sentuhan cepat di ponsel */}
            {!selectedStudent && selectedClassFilter && classStudents.length > 0 && (
              <div className="mt-2.5 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-xs">
                <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Daftar Siswa Kelas {selectedClassFilter}</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Ketuk nama untuk memilih</span>
                </div>
                <div className="max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {classStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left p-2.5 sm:p-3 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 truncate">
                            {student.full_name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            student.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}>
                            {student.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          NIS: <span className="font-mono font-bold text-slate-700">{student.nis}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 shrink-0">
                        <span className="hidden sm:inline">Pilih</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Student Card Information - Responsive for Mobile & Desktop */}
        {selectedStudent && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border-2 border-blue-300 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
                {selectedStudent.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">{selectedStudent.full_name}</h4>
                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                    Siswa Aktif
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                  NIS: <strong className="text-slate-800">{selectedStudent.nis}</strong> • NISN: {selectedStudent.nisn}
                </p>
                <p className="text-[11px] sm:text-xs text-blue-900 font-semibold mt-0.5">
                  {selectedStudent.class_name} ({selectedStudent.department_code})
                </p>
              </div>
            </div>

            {/* Riwayat Terlambat & Tombol Ganti Siswa */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-200/60">
              <div className="flex items-center gap-2.5 bg-white/90 px-3 py-1.5 sm:py-2 rounded-xl border border-blue-200 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block uppercase leading-tight">Riwayat:</span>
                  <span className={`text-sm sm:text-base font-black ${
                    studentTotalLates >= settings.warning_threshold_sp2 ? 'text-red-600' :
                    studentTotalLates >= settings.warning_threshold_sp1 ? 'text-amber-600' : 'text-slate-800'
                  }`}>
                    {studentTotalLates} Kali
                  </span>
                </div>
                {studentTotalLates >= settings.warning_threshold_sp1 && (
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0" title="Keterlambatan berulang">
                    <Flame className="w-4 h-4 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Ganti Siswa Button for Touch / Mobile */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Pilih siswa lain"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Ganti Siswa</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Arrival Time - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Tanggal Kejadian (WIB)</span>
              </label>
              <button
                type="button"
                onClick={handleSetTodayDate}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Hari Ini (WIB)
              </button>
            </div>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-600"
            />
            <div className="flex flex-wrap items-center justify-between mt-1 px-0.5 text-[11px] text-slate-600">
              <span className="font-semibold">{formatIndonesianDate(eventDate)} ({schedule.day_name})</span>
              {eventDate === getWIBTodayString() && (
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Sesuai Tanggal Berjalan
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Waktu Kedatangan Aktual <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Jam Sekarang (WIB)
              </button>
            </div>
            <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-hidden focus:border-blue-600 font-mono"
              />
              <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 shrink-0 ${
                isTechnicallyLate
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isTechnicallyLate ? (
                  <>
                    <span className="font-mono text-sm font-black">+{liveDiffMinutes}</span>
                    <span>Menit Terlambat</span>
                  </>
                ) : (
                  <span>Tepat Waktu</span>
                )}
              </div>
            </div>

            {/* Quick time adjustment buttons for rapid gate entry on phones */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Set Cepat:</span>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
              >
                Sekarang
              </button>
              <button
                type="button"
                onClick={() => {
                  const [h, m] = schedule.start_time.split(':').map(Number);
                  const total = h * 60 + m + 5;
                  const newH = String(Math.floor(total / 60)).padStart(2, '0');
                  const newM = String(total % 60).padStart(2, '0');
                  setArrivalTime(`${newH}:${newM}`);
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
              >
                +5m
              </button>
              <button
                type="button"
                onClick={() => {
                  const [h, m] = schedule.start_time.split(':').map(Number);
                  const total = h * 60 + m + 15;
                  const newH = String(Math.floor(total / 60)).padStart(2, '0');
                  const newM = String(total % 60).padStart(2, '0');
                  setArrivalTime(`${newH}:${newM}`);
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => {
                  const [h, m] = schedule.start_time.split(':').map(Number);
                  const total = h * 60 + m + 30;
                  const newH = String(Math.floor(total / 60)).padStart(2, '0');
                  const newM = String(total % 60).padStart(2, '0');
                  setArrivalTime(`${newH}:${newM}`);
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
              >
                +30m
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Fast 1-Click Reason Selector */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            2. Alasan Keterlambatan (Pilih Cepat Satu Sentuhan) <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {reasons.filter(r => r.is_active).map(r => {
              const isSelected = selectedReasonId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReasonId(r.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left text-xs font-bold transition-all flex flex-col justify-between min-h-[56px] cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.01]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] uppercase opacity-75 font-mono mb-1">{r.code}</span>
                  <span className="leading-tight text-[11px] sm:text-xs">{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Additional Notes with Quick Options for Mobile */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Keterangan Tambahan / Klarifikasi Siswa (Opsional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Mengantar adik terlebih dahulu, ban motor bocor di Patrang, dsb."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-blue-600"
          />
          {/* Quick chips for mobile convenience */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">Opsi Cepat:</span>
            {['Ban Motor Bocor', 'Macet Total', 'Hujan Deras / Jas Hujan', 'Bangun Kesiangan', 'Mengantar Adik'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setNotes(prev => prev ? `${prev}, ${chip}` : chip)}
                className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Bar - Fully Responsive */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Petugas: <strong className="text-slate-800">{currentUser.full_name}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors w-1/3 sm:w-auto cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedStudent || !isTechnicallyLate}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Keterlambatan (WIB)'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Duplicate Confirmation Modal */}
      {duplicateWarning.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-300 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-center font-extrabold text-slate-900 text-base">
              Konfirmasi Pencatatan Ganda
            </h3>
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              {duplicateWarning.message}
            </p>
            <div className="mt-6 flex items-center gap-2.5">
              <button
                onClick={() => setDuplicateWarning({ isOpen: false, message: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Batalkan
              </button>
              <button
                onClick={() => handleSubmit(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Tetap Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
