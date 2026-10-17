import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clock, Search, AlertTriangle, CheckCircle2, User, 
  Sparkles, Save, RotateCcw, AlertCircle, ArrowRight, ShieldCheck, Flame,
  Filter, School, Users, X, ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getWIBCurrentTime, getWIBTodayString, formatIndonesianDate } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

export const RecordLatenessView: React.FC = () => {
  const { students, reasons, recordLateness, schedules, settings, records, currentUser, classes } = useApp();

  // Form States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
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

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-update current arrival time button
  const handleSetCurrentTime = () => {
    setArrivalTime(getWIBCurrentTime());
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

  // Students in selected class (or all students if no class filter)
  const classStudents = useMemo(() => {
    if (!selectedClassFilter) return students;
    return students.filter(s => s.class_name === selectedClassFilter || s.class_id === selectedClassFilter);
  }, [students, selectedClassFilter]);

  // Student search filtering with class filter support
  const filteredStudents = useMemo(() => {
    // If student is already selected and search query matches the formatted name, don't show dropdown
    if (selectedStudent && searchQuery === `${selectedStudent.full_name} (${selectedStudent.nis}) - ${selectedStudent.class_name}`) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      return classStudents.filter(s => 
        s.full_name.toLowerCase().includes(query) ||
        s.nis.includes(query) ||
        s.nisn.includes(query) ||
        s.class_name.toLowerCase().includes(query)
      ).slice(0, 25);
    }

    // If query is empty but a specific class is selected and dropdown is open, show students in this class
    if (selectedClassFilter && searchDropdownOpen) {
      return classStudents.slice(0, 50);
    }

    return [];
  }, [classStudents, searchQuery, selectedStudent, selectedClassFilter, searchDropdownOpen]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.full_name} (${student.nis}) - ${student.class_name}`);
    setSearchDropdownOpen(false);
    setErrorMessage(null);
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setSearchQuery('');
    setNotes('');
    setErrorMessage(null);
    setSuccessInfo(null);
    setArrivalTime(getWIBCurrentTime());
    setEventDate(getWIBTodayString());
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Determine current scheduled time for date
  const dateObj = new Date(eventDate + 'T00:00:00');
  const dayIndex = dateObj.getDay();
  const schedule = schedules.find(s => s.day_of_week === dayIndex) || {
    start_time: settings.default_start_time,
    tolerance_minutes: 0,
    day_name: 'Hari Sekolah',
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
      setErrorMessage('Silakan cari dan pilih siswa terlebih dahulu.');
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Gerbang Pagi */}
      <div className="bg-gradient-to-r from-[#0B1528] via-[#162a52] to-[#1E3A8A] text-white p-5 sm:p-6 rounded-2xl shadow-md border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md flex-shrink-0 flex items-center justify-center border border-amber-400/40">
              <img 
                src="https://iili.io/nhMcBoB.md.png" 
                alt="Logo SMKN 1 Jember" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900">
                  Mode Gerbang Pagi
                </span>
                <span className="text-xs text-blue-200">SMK Negeri 1 Jember</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Catat Siswa Terlambat
              </h1>
              <p className="text-xs text-blue-200 mt-1 max-w-xl">
                Alur cepat satu sentuhan untuk petugas piket gerbang & kesiswaan. Waktu kedatangan dan durasi terlambat dihitung presisi otomatis.
              </p>
            </div>
          </div>

          {/* Quick Schedule Indicator */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center flex-shrink-0">
            <span className="text-[11px] text-blue-200 block font-medium">Jam Masuk Berlaku:</span>
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {schedule.start_time} <span className="text-xs text-white">WIB</span>
            </span>
            <span className="text-[10px] text-blue-200 block mt-0.5">{schedule.day_name}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successInfo?.show && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  Transaksi Keterlambatan Berhasil Tersimpan!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Siswa <span className="font-bold">{successInfo.studentName}</span> ({successInfo.className}) tercatat terlambat <span className="font-extrabold text-red-600">{successInfo.duration} menit</span>.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleResetForm}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Catat Siswa Berikutnya
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              className="text-emerald-700 hover:text-emerald-900 text-sm font-bold p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3 text-red-900 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">Validasi Tidak Terpenuhi</p>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* Main Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible p-5 sm:p-7 space-y-6">
        
        {/* Step 1: Filter Kelas & Pencarian Siswa */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
              <span>Cari & Pilih Siswa Terlambat</span>
              <span className="text-red-500">*</span>
            </label>

            {/* Quick Status / Total students in context */}
            <span className="text-xs text-slate-500 font-medium">
              {selectedClassFilter ? (
                <span className="text-blue-700 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Kelas <strong className="underline">{selectedClassFilter}</strong> ({classStudents.length} siswa)
                </span>
              ) : (
                <span>Total Basis Data: <strong>{students.length}</strong> Siswa</span>
              )}
            </span>
          </div>

          {/* Baris Filter Kelas & Pilihan Cepat Tingkat */}
          <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filter Berdasarkan Rombongan Belajar (Kelas):</span>
              </div>

              {/* Tingkat Tabs (Semua, X, XI, XII) */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
                {(['ALL', 'X', 'XI', 'XII'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setGradeFilter(lvl);
                      // Jika kelas yang sedang aktif tidak sesuai tingkat yang baru dipilih, reset pilihan kelas
                      if (lvl !== 'ALL' && selectedClassFilter) {
                        const targetClass = classes.find(c => c.name === selectedClassFilter);
                        if (targetClass && targetClass.grade_level !== lvl) {
                          setSelectedClassFilter('');
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      gradeFilter === lvl
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Semua Tingkat' : `Kelas ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Pemilihan Kelas & Tombol Reset */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4 text-blue-600" />
                </div>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => {
                    const newClass = e.target.value;
                    setSelectedClassFilter(newClass);
                    // Buka dropdown siswa jika kelas baru dipilih
                    if (newClass) {
                      setSearchDropdownOpen(true);
                      if (selectedStudent && selectedStudent.class_name !== newClass) {
                        setSelectedStudent(null);
                        setSearchQuery('');
                      }
                    }
                  }}
                  className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                    selectedClassFilter
                      ? 'bg-blue-50/90 border-blue-400 text-blue-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <option value="">-- Pilih / Tampilkan Semua Kelas ({classes.length} Rombel) --</option>
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
                  className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  title="Tampilkan kembali seluruh siswa sekolah"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  Reset Filter Kelas
                </button>
              )}
            </div>

            {/* Hint bantuan filter aktif */}
            {selectedClassFilter && (
              <div className="flex items-center justify-between text-[11px] text-blue-900 bg-blue-100/70 border border-blue-200 px-3 py-1.5 rounded-lg">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                  Filter aktif: Menampilkan <strong>{classStudents.length} siswa</strong> terdaftar di <strong>{selectedClassFilter}</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchDropdownOpen(true);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  className="font-bold underline text-blue-800 hover:text-blue-950 ml-2"
                >
                  Buka Daftar Nama
                </button>
              </div>
            )}
          </div>

          {/* Kotak Input Pencarian Siswa */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchDropdownOpen(true);
                if (selectedStudent && !e.target.value) {
                  setSelectedStudent(null);
                }
              }}
              onFocus={() => setSearchDropdownOpen(true)}
              placeholder={
                selectedClassFilter
                  ? `Ketik nama atau NIS untuk filter siswa di kelas ${selectedClassFilter}...`
                  : "Ketik Nama, NIS, atau Kelas (contoh: Ahmad Faiz / 24001 / X DKV 1)..."
              }
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleResetForm}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Bersihkan
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List Siswa */}
          {searchDropdownOpen && !selectedStudent && (searchQuery.trim() || selectedClassFilter) && (
            <div className="relative z-30">
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                {/* Header status dropdown */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold sticky top-0 z-10">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {selectedClassFilter ? (
                      <span>Daftar Siswa Kelas <strong className="text-blue-700">{selectedClassFilter}</strong> ({filteredStudents.length} ditemukan)</span>
                    ) : (
                      <span>Hasil Pencarian Siswa ({filteredStudents.length} ditemukan)</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    Tutup ✕
                  </button>
                </div>

                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700">
                            {student.full_name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            student.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}>
                            {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>NIS: <strong className="text-slate-800 font-mono">{student.nis}</strong></span>
                          <span>Kelas: <strong className="text-blue-600 font-bold">{student.class_name}</strong></span>
                          <span>Jurusan: <strong className="text-slate-700">{student.department_code}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Pilih</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-5 text-center text-xs text-slate-500">
                    <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                    Tidak ada siswa ditemukan
                    {selectedClassFilter ? ` di kelas "${selectedClassFilter}"` : ''}
                    {searchQuery ? ` dengan kata kunci "${searchQuery}"` : ''}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Student Card Information */}
        {selectedStudent && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                {selectedStudent.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-base">{selectedStudent.full_name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Siswa Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  NIS: <strong className="text-slate-800">{selectedStudent.nis}</strong> • NISN: {selectedStudent.nisn}
                </p>
                <p className="text-xs text-blue-900 font-semibold mt-0.5">
                  {selectedStudent.class_name} ({selectedStudent.department_code}) • TP {selectedStudent.academic_year}
                </p>
              </div>
            </div>

            {/* Past History Badge */}
            <div className="flex items-center gap-3 bg-white/80 p-3 rounded-xl border border-blue-100 flex-shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Riwayat Terlambat:</span>
                <span className={`text-base font-black ${
                  studentTotalLates >= settings.warning_threshold_sp2 ? 'text-red-600' :
                  studentTotalLates >= settings.warning_threshold_sp1 ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {studentTotalLates} Kali
                </span>
              </div>
              {studentTotalLates >= settings.warning_threshold_sp1 && (
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center" title="Siswa dengan keterlambatan berulang">
                  <Flame className="w-4 h-4 animate-bounce" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Date & Arrival Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tanggal Kejadian (Asia/Jakarta)
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Waktu Kedatangan Aktual <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                Gunakan Jam Sekarang (WIB)
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-hidden focus:border-blue-600 font-mono"
              />
              <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                isTechnicallyLate
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isTechnicallyLate ? (
                  <>
                    <span>+{liveDiffMinutes} Menit</span>
                  </>
                ) : (
                  <span>Tepat Waktu</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Fast 1-Click Reason Selector */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            2. Alasan Keterlambatan (Pilih Cepat Satu Sentuhan) <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {reasons.filter(r => r.is_active).map(r => {
              const isSelected = selectedReasonId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReasonId(r.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="text-[10px] uppercase opacity-75 font-mono mb-1">{r.code}</span>
                  <span className="leading-tight">{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Additional Notes */}
        <div className="pt-2 border-t border-slate-100">
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
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Petugas: <strong className="text-slate-800">{currentUser.full_name}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-3 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors w-1/3 sm:w-auto"
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Keterlambatan (WIB)'}
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
