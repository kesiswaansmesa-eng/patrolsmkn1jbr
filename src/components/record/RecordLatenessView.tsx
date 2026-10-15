import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Search, AlertTriangle, CheckCircle2, User, 
  Sparkles, Save, RotateCcw, AlertCircle, ArrowRight, ShieldCheck, Flame
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getWIBCurrentTime, getWIBTodayString, formatIndonesianDate } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

export const RecordLatenessView: React.FC = () => {
  const { students, reasons, recordLateness, schedules, settings, records, currentUser } = useApp();

  // Form States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [eventDate, setEventDate] = useState(getWIBTodayString());
  const [arrivalTime, setArrivalTime] = useState(getWIBCurrentTime());
  const [selectedReasonId, setSelectedReasonId] = useState(reasons[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Student search filtering
  const filteredStudents = searchQuery.trim()
    ? students.filter(s => 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery.trim()) ||
        s.nisn.includes(searchQuery.trim()) ||
        s.class_name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

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
        
        {/* Step 1: Student Search Autocomplete */}
        <div className="relative">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            1. Cari Siswa Terlambat (Ketik Nama, NIS, atau Kelas) <span className="text-red-500">*</span>
          </label>
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
              placeholder="Contoh: Ahmad Faiz / 24001 / X DKV 1..."
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

          {/* Autocomplete Dropdown */}
          {searchDropdownOpen && searchQuery.trim() && !selectedStudent && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>NIS: <strong className="text-slate-700">{student.nis}</strong></span>
                        <span>Kelas: <strong className="text-blue-600 font-bold">{student.class_name}</strong></span>
                        <span>Jurusan: <strong>{student.department_code}</strong></span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Tidak ditemukan siswa dengan kata kunci "{searchQuery}". Pastikan NIS atau nama sudah benar.
                </div>
              )}
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
