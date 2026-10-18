import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, CheckCircle2, AlertTriangle, AlertCircle,
  HelpCircle, Sparkles, Filter, ChevronRight, School, Building2,
  UserCheck, Users, Search, Database, ShieldCheck, Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate, isDateThisWeek, isDateThisMonth } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

export const LeaderboardView: React.FC = () => {
  const { classes, departments, records, students, settings, isGoogleSheetsConnected } = useApp();
  
  const [activeTab, setActiveTab] = useState<'zero_students' | 'classes' | 'departments'>('zero_students');
  const [timePeriod, setTimePeriod] = useState<'all' | 'month' | 'week'>('month');

  // Filters for Siswa Teladan (Zero Late)
  const [searchStudent, setSearchStudent] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [classFilter, setClassFilter] = useState<string>('');

  // Filter records based on time period
  const activeRecords = useMemo(() => {
    return records.filter(r => {
      if (r.is_cancelled) return false;
      if (timePeriod === 'week') return isDateThisWeek(r.event_date);
      if (timePeriod === 'month') return isDateThisMonth(r.event_date);
      return true;
    });
  }, [records, timePeriod]);

  // Set of student IDs and NIS that have lateness records in the database
  const lateStudentIdentifiers = useMemo(() => {
    const idSet = new Set<string>();
    const nisSet = new Set<string>();
    activeRecords.forEach(r => {
      if (!r.is_cancelled) {
        if (r.student_id) idSet.add(String(r.student_id).trim());
        if (r.nis) nisSet.add(String(r.nis).trim());
      }
    });
    return { idSet, nisSet };
  }, [activeRecords]);

  // Zero Late Students pulled directly from Database (`students` filtered against `activeRecords`)
  const allZeroLateStudents = useMemo(() => {
    return students.filter(s => {
      const matchId = lateStudentIdentifiers.idSet.has(String(s.id).trim());
      const matchNis = s.nis ? lateStudentIdentifiers.nisSet.has(String(s.nis).trim()) : false;
      return !matchId && !matchNis;
    });
  }, [students, lateStudentIdentifiers]);

  // Filtered Zero Late Students for UI display
  const filteredZeroStudents = useMemo(() => {
    let list = allZeroLateStudents;

    // Filter by grade
    if (gradeFilter !== 'ALL') {
      list = list.filter(s => {
        const cls = classes.find(c => c.name === s.class_name || c.id === s.class_id);
        return cls?.grade_level === gradeFilter || s.class_name.startsWith(gradeFilter + ' ');
      });
    }

    // Filter by class
    if (classFilter) {
      list = list.filter(s => s.class_name === classFilter || s.class_id === classFilter);
    }

    // Filter by search query
    const q = searchStudent.trim().toLowerCase();
    if (q) {
      list = list.filter(s => 
        s.full_name.toLowerCase().includes(q) ||
        s.nis.includes(q) ||
        s.nisn.includes(q) ||
        s.class_name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allZeroLateStudents, gradeFilter, classFilter, searchStudent, classes]);

  // Class Leaderboard Calculation
  const classRanking = useMemo(() => {
    return classes.map(cls => {
      const classStudents = students.filter(s => s.class_id === cls.id || s.class_name === cls.name);
      const totalStudents = classStudents.length || cls.total_students || 36;
      
      const clsRecords = activeRecords.filter(r => r.class_id === cls.id || r.class_name === cls.name);
      const totalEvents = clsRecords.length;
      
      const uniqueStudentIds = new Set(clsRecords.map(r => r.student_id));
      const uniqueCount = uniqueStudentIds.size;

      const percentageLate = totalStudents > 0 ? (uniqueCount / totalStudents) * 100 : 0;
      const ratioPer100 = totalStudents > 0 ? (totalEvents / totalStudents) * 100 : 0;
      const isZeroLateness = totalEvents === 0 && totalStudents > 0;

      return {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        grade: cls.grade_level,
        departmentCode: cls.department_code,
        homeroomTeacher: cls.homeroom_teacher_name || 'Belum Ditugaskan',
        totalStudents,
        totalEvents,
        uniqueCount,
        percentageLate: parseFloat(percentageLate.toFixed(1)),
        ratioPer100: parseFloat(ratioPer100.toFixed(2)),
        isZeroLateness,
      };
    }).sort((a, b) => {
      if (a.ratioPer100 !== b.ratioPer100) return a.ratioPer100 - b.ratioPer100;
      if (a.percentageLate !== b.percentageLate) return a.percentageLate - b.percentageLate;
      if (a.totalEvents !== b.totalEvents) return a.totalEvents - b.totalEvents;
      return a.name.localeCompare(b.name);
    });
  }, [classes, students, activeRecords]);

  // Department Leaderboard Calculation
  const departmentRanking = useMemo(() => {
    return departments.map(dept => {
      const deptStudents = students.filter(s => s.department_id === dept.id || s.department_code === dept.code);
      const totalStudents = deptStudents.length || dept.total_students || 140;

      const deptRecords = activeRecords.filter(r => r.department_code === dept.code);
      const totalEvents = deptRecords.length;

      const uniqueStudentIds = new Set(deptRecords.map(r => r.student_id));
      const uniqueCount = uniqueStudentIds.size;

      const percentageLate = totalStudents > 0 ? (uniqueCount / totalStudents) * 100 : 0;
      const ratioPer100 = totalStudents > 0 ? (totalEvents / totalStudents) * 100 : 0;
      const isZeroLateness = totalEvents === 0 && totalStudents > 0;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        headName: dept.head_name || 'Ketua Kompetensi Keahlian',
        totalStudents,
        totalEvents,
        uniqueCount,
        percentageLate: parseFloat(percentageLate.toFixed(1)),
        ratioPer100: parseFloat(ratioPer100.toFixed(2)),
        isZeroLateness,
      };
    }).sort((a, b) => {
      if (a.ratioPer100 !== b.ratioPer100) return a.ratioPer100 - b.ratioPer100;
      if (a.percentageLate !== b.percentageLate) return a.percentageLate - b.percentageLate;
      if (a.totalEvents !== b.totalEvents) return a.totalEvents - b.totalEvents;
      return a.code.localeCompare(b.code);
    });
  }, [departments, students, activeRecords]);

  const celebrateZeroLateness = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // non-blocking
    }
  };

  const zeroClasses = classRanking.filter(c => c.isZeroLateness);
  const zeroDepartments = departmentRanking.filter(d => d.isZeroLateness);

  const percentZeroStudents = students.length > 0 
    ? ((allZeroLateStudents.length / students.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-0">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-2xl p-5 sm:p-6 text-slate-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300">
              Evaluasi Kedisiplinan
            </span>
            <span className="text-xs font-bold text-amber-950">SMK Negeri 1 Jember</span>
            <span className="text-[10px] font-semibold bg-white/60 px-2 py-0.5 rounded-full text-slate-900 border border-amber-400/50 flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-800" />
              Live Database ({students.length} Siswa)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-slate-950 shrink-0" />
            Leaderboard Disiplin (Zero Late)
          </h1>
          <p className="text-xs font-medium text-amber-950 mt-1 max-w-xl leading-relaxed">
            Data kedisiplinan dan kategori <strong>Zero Late (0 Kasus)</strong> diambil langsung secara otomatis dari basis data database. Siswa, rombel, dan jurusan dengan catatan bersih berhak atas apresiasi disiplin tertinggi.
          </p>
        </div>

        {/* Period Selector */}
        <div className="bg-white/95 backdrop-blur-md p-1.5 sm:p-2 rounded-xl border border-amber-300/80 flex items-center gap-1 shadow-xs self-start md:self-center shrink-0">
          <button
            onClick={() => setTimePeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timePeriod === 'week' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setTimePeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timePeriod === 'month' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timePeriod === 'all' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua Periode
          </button>
        </div>
      </div>

      {/* Zero Lateness Hall of Fame - Data Live dari Database */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 shadow-sm border border-emerald-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                  Hall of Fame "Zero Keterlambatan"
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/30 border border-white/20 font-mono font-bold">
                  Database Verified (0 Kasus)
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Daftar kehormatan siswa teladan dan unit kerja yang 100% disiplin tanpa satupun keterlambatan pada periode ini.
              </p>
            </div>
          </div>
          <button
            onClick={celebrateZeroLateness}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            Rayakan Prestasi!
          </button>
        </div>

        {/* 3 Metric Cards Live from Database */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div 
            onClick={() => setActiveTab('zero_students')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl p-3.5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-emerald-100 text-xs mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-300" />
                Siswa Zero Late (Teladan)
              </span>
              <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded font-black">
                {percentZeroStudents}%
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {allZeroLateStudents.length} <span className="text-xs font-normal text-emerald-100">/ {students.length} Siswa</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1">
              Siswa bersih dari catatan keterlambatan di database
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('classes')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl p-3.5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-emerald-100 text-xs mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <School className="w-4 h-4 text-amber-300" />
                Kelas Zero Keterlambatan
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                {classes.length} Rombel
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {zeroClasses.length} <span className="text-xs font-normal text-emerald-100">/ {classes.length} Kelas</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1">
              {zeroClasses.length > 0 ? `${zeroClasses.map(c => c.name).slice(0, 3).join(', ')}${zeroClasses.length > 3 ? '...' : ''}` : 'Belum ada kelas 0 kasus'}
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('departments')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/20 rounded-xl p-3.5 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-emerald-100 text-xs mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-300" />
                Jurusan Zero Keterlambatan
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                {departments.length} Keahlian
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {zeroDepartments.length} <span className="text-xs font-normal text-emerald-100">/ {departments.length} Jurusan</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1">
              {zeroDepartments.length > 0 ? zeroDepartments.map(d => d.code).join(', ') : 'Belum ada jurusan 0 kasus'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Siswa Zero Late vs Kelas vs Jurusan */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('zero_students')}
          className={`pb-3 font-extrabold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'zero_students'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Siswa Teladan Zero Late ({allZeroLateStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-3 font-extrabold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Peringkat Antar-Kelas ({classRanking.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 font-extrabold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'departments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Peringkat Antar-Jurusan ({departmentRanking.length})</span>
        </button>
      </div>

      {/* TAB 1: SISWA TELADAN (ZERO LATE) - DIAMBIL DARI DATABASE */}
      {activeTab === 'zero_students' && (
        <div className="space-y-4">
          {/* Database Source Verification Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border border-emerald-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 block">
                  Data Siswa Zero Late Diambil Langsung dari Database Aktif
                </span>
                <span className="text-[11px] text-emerald-800">
                  Total Basis Data: <strong>{students.length} Siswa Master</strong> &bull; Total Riwayat Transaksi: <strong>{activeRecords.length} Catatan</strong> ({timePeriod === 'all' ? 'Seluruh Waktu' : timePeriod === 'month' ? 'Bulan Ini' : 'Minggu Ini'}).
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Database Live
              </span>
            </div>
          </div>

          {/* Controls: Search, Grade, Class Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari siswa Zero Late (Ketik Nama, NIS, Kelas)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tingkat Grade Tabs - Responsive touch scroll */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar self-start sm:self-auto text-xs shrink-0 w-full sm:w-auto">
                {(['ALL', 'X', 'XI', 'XII'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setGradeFilter(lvl)}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                      gradeFilter === lvl
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Semua' : `Kelas ${lvl}`}
                  </button>
                ))}
              </div>

              {/* Class Dropdown */}
              <div className="w-full sm:w-48 shrink-0">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter info banner */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 gap-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Menampilkan <strong>{filteredZeroStudents.length} dari {allZeroLateStudents.length} siswa</strong> teladan tanpa keterlambatan di database.</span>
              </span>
              {(searchStudent || classFilter || gradeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchStudent('');
                    setClassFilter('');
                    setGradeFilter('ALL');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Dual Layout: Mobile Cards (< md) & Desktop Table (>= md) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredZeroStudents.length > 0 ? (
              <>
                {/* 1. Mobile Card List (Visible on phones & small screens) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredZeroStudents.map((st, idx) => (
                    <div key={st.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs border border-emerald-200">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {st.full_name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              st.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                            }`}>
                              {st.gender === 'L' ? 'L' : 'P'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                            <span>NIS: <strong className="text-slate-700 font-mono">{st.nis}</strong></span>
                            <span>&bull;</span>
                            <span className="text-blue-700 font-bold">{st.class_name}</span>
                            <span>&bull;</span>
                            <span className="text-slate-500">{st.department_code}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          0 Late
                        </span>
                        <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">100% Disiplin</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop & Tablet Table (Visible on md screens and up) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">Nama Siswa Teladan</th>
                        <th className="px-4 py-3">NIS / NISN</th>
                        <th className="px-4 py-3">Kelas & Jurusan</th>
                        <th className="px-4 py-3 text-center">Tingkat Disiplin</th>
                        <th className="px-4 py-3 text-center">Catatan Keterlambatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredZeroStudents.map((st, idx) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-500 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                                {st.full_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900">{st.full_name}</div>
                                <span className="text-[10px] text-slate-500">{st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            <div>{st.nis}</div>
                            <span className="text-[10px] text-slate-400">{st.nisn}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-blue-700">{st.class_name}</div>
                            <div className="text-[10px] text-slate-500">{st.department_code}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              100% DISIPLIN
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-700 font-mono">
                            0 Keterlambatan
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Tidak ada siswa ditemukan</p>
                <p>Coba ubah kata kunci pencarian atau reset filter kelas Anda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2 & 3: PERINGKAT ANTAR-KELAS & ANTAR-JURUSAN */}
      {(activeTab === 'classes' || activeTab === 'departments') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="text-slate-600">
              Urutan: <strong>Tertib Tertinggi (Rank #1)</strong> hingga <strong>Keterlambatan Tertinggi</strong>.
            </div>
            <div className="text-slate-500 text-[11px] flex items-center gap-3">
              <span>Rumus Rasio: <code>(Kejadian / Siswa) × 100</code></span>
              <span>Persentase: <code>(Unik / Siswa) × 100%</code></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center w-14">Rank</th>
                  <th className="px-4 py-3">{activeTab === 'classes' ? 'Nama Kelas' : 'Kompetensi Keahlian'}</th>
                  <th className="px-4 py-3 text-center">Jumlah Siswa</th>
                  <th className="px-4 py-3 text-center">Total Kejadian</th>
                  <th className="px-4 py-3 text-center">Siswa Unik</th>
                  <th className="px-4 py-3 text-center bg-blue-50/60 text-blue-900">
                    Rasio per 100 Siswa (Utama)
                  </th>
                  <th className="px-4 py-3 text-center">Persentase Siswa Pernah Terlambat</th>
                  <th className="px-4 py-3 text-center">Status Kedisiplinan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTab === 'classes' ? (
                  classRanking.map((row, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${
                        row.isZeroLateness ? 'bg-emerald-50/40' : ''
                      }`}>
                        <td className="px-4 py-3.5 text-center font-black text-sm">
                          {rank === 1 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 shadow-xs">🥇</span>}
                          {rank === 2 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 shadow-xs">🥈</span>}
                          {rank === 3 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white shadow-xs">🥉</span>}
                          {rank > 3 && <span className="text-slate-500">#{rank}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900 text-sm">{row.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {row.departmentCode} • Wali: {row.homeroomTeacher}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {row.totalStudents}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`font-black ${row.totalEvents > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {row.totalEvents} kali
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {row.uniqueCount} siswa
                        </td>
                        <td className="px-4 py-3.5 text-center bg-blue-50/50 font-black text-sm text-blue-900 font-mono">
                          {row.ratioPer100}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {row.percentageLate}%
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {row.isZeroLateness ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Zero Keterlambatan
                            </span>
                          ) : row.ratioPer100 < 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Sangat Tertib
                            </span>
                          ) : row.ratioPer100 < 25 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Cukup Tertib
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              Perlu Pembinaan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  departmentRanking.map((row, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${
                        row.isZeroLateness ? 'bg-emerald-50/40' : ''
                      }`}>
                        <td className="px-4 py-3.5 text-center font-black text-sm">
                          {rank === 1 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 shadow-xs">🥇</span>}
                          {rank === 2 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 shadow-xs">🥈</span>}
                          {rank === 3 && <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white shadow-xs">🥉</span>}
                          {rank > 3 && <span className="text-slate-500">#{rank}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {row.code} - {row.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            KKK: {row.headName}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {row.totalStudents}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`font-black ${row.totalEvents > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {row.totalEvents} kali
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {row.uniqueCount} siswa
                        </td>
                        <td className="px-4 py-3.5 text-center bg-blue-50/50 font-black text-sm text-blue-900 font-mono">
                          {row.ratioPer100}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {row.percentageLate}%
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {row.isZeroLateness ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Zero Keterlambatan
                            </span>
                          ) : row.ratioPer100 < 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Sangat Tertib
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Perlu Perhatian
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
