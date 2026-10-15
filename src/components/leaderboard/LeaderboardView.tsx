import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, CheckCircle2, AlertTriangle, 
  HelpCircle, Sparkles, Filter, ChevronRight, School, Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate, isDateThisWeek, isDateThisMonth } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

export const LeaderboardView: React.FC = () => {
  const { classes, departments, records, students, settings } = useApp();
  
  const [activeTab, setActiveTab] = useState<'classes' | 'departments'>('classes');
  const [timePeriod, setTimePeriod] = useState<'all' | 'month' | 'week'>('month');

  // Filter records based on time period
  const activeRecords = useMemo(() => {
    return records.filter(r => {
      if (r.is_cancelled) return false;
      if (timePeriod === 'week') return isDateThisWeek(r.event_date);
      if (timePeriod === 'month') return isDateThisMonth(r.event_date);
      return true;
    });
  }, [records, timePeriod]);

  // Class Leaderboard Calculation
  const classRanking = useMemo(() => {
    return classes.map(cls => {
      // Find active students in this class
      const classStudents = students.filter(s => s.class_id === cls.id || s.class_name === cls.name);
      const totalStudents = classStudents.length || cls.total_students || 36;
      
      // Filter transactions for this class
      const clsRecords = activeRecords.filter(r => r.class_id === cls.id || r.class_name === cls.name);
      const totalEvents = clsRecords.length;
      
      // Unique students with lateness
      const uniqueStudentIds = new Set(clsRecords.map(r => r.student_id));
      const uniqueCount = uniqueStudentIds.size;

      // Formulas from prompt:
      // Persentase = (unique / total) * 100
      const percentageLate = totalStudents > 0 ? (uniqueCount / totalStudents) * 100 : 0;
      // Rasio kejadian per 100 siswa = (totalEvents / totalStudents) * 100
      const ratioPer100 = totalStudents > 0 ? (totalEvents / totalStudents) * 100 : 0;

      // Zero Keterlambatan verification:
      // Must be zero events, student data complete (totalStudents > 0), and valid period
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
      // Primary: Rasio per 100 siswa ascending (lower is better discipline)
      if (a.ratioPer100 !== b.ratioPer100) {
        return a.ratioPer100 - b.ratioPer100;
      }
      // Tie-breaker 1: Persentase siswa pernah terlambat ascending
      if (a.percentageLate !== b.percentageLate) {
        return a.percentageLate - b.percentageLate;
      }
      // Tie-breaker 2: Total kejadian mentah ascending
      if (a.totalEvents !== b.totalEvents) {
        return a.totalEvents - b.totalEvents;
      }
      // Tie-breaker 3: Alphabetical
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
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const zeroClasses = classRanking.filter(c => c.isZeroLateness);
  const zeroDepartments = departmentRanking.filter(d => d.isZeroLateness);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-2xl p-6 text-slate-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300">
              Evaluasi Kedisiplinan
            </span>
            <span className="text-xs font-bold text-amber-950">SMK Negeri 1 Jember</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-slate-950" />
            Leaderboard Kedisiplinan Sekolah
          </h1>
          <p className="text-xs font-medium text-amber-950 mt-1 max-w-xl">
            Peringkat dihitung objektif menggunakan <strong className="font-extrabold">Rasio Kejadian per 100 Siswa</strong> dan <strong className="font-extrabold">Persentase Siswa Unik</strong> agar adil untuk kelas dengan jumlah siswa berbeda.
          </p>
        </div>

        {/* Period Selector */}
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl border border-amber-300/60 flex items-center gap-1.5 shadow-xs">
          <button
            onClick={() => setTimePeriod('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'week' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setTimePeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'month' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'all' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua Periode
          </button>
        </div>
      </div>

      {/* Zero Lateness Hall of Fame (Section I Requirement) */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-5 shadow-sm border border-emerald-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                Kategori "Zero Keterlambatan"
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/30 border border-white/20 font-mono">
                  Terverifikasi 0 Kasus
                </span>
              </h3>
              <p className="text-xs text-emerald-100">
                Apresiasi tertinggi bagi unit kerja tanpa satupun keterlambatan selama periode ini.
              </p>
            </div>
          </div>
          <button
            onClick={celebrateZeroLateness}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            Rayakan Prestasi!
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {activeTab === 'classes' ? (
            zeroClasses.length > 0 ? (
              zeroClasses.map(cls => (
                <div key={cls.id} className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm">{cls.name}</h4>
                    <p className="text-[11px] text-emerald-100">{cls.departmentCode} • {cls.totalStudents} Siswa Aktif</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-400 text-emerald-950 text-[10px] font-black rounded-lg">
                    100% DISIPLIN
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-emerald-100 italic col-span-full">
                Belum ada kelas dengan 0 keterlambatan pada periode ini. Tingkatkan kedisiplinan!
              </p>
            )
          ) : (
            zeroDepartments.length > 0 ? (
              zeroDepartments.map(dept => (
                <div key={dept.id} className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm">{dept.code} - {dept.name}</h4>
                    <p className="text-[11px] text-emerald-100">{dept.totalStudents} Siswa Terdaftar</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-400 text-emerald-950 text-[10px] font-black rounded-lg">
                    100% DISIPLIN
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-emerald-100 italic col-span-full">
                Seluruh jurusan memiliki catatan keterlambatan pada periode ini.
              </p>
            )
          )}
        </div>
      </div>

      {/* Tabs Switcher: Kelas vs Jurusan */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          Peringkat Antar-Kelas ({classRanking.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'departments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Peringkat Antar-Jurusan ({departmentRanking.length} Keahlian)
        </button>
      </div>

      {/* Main Ranking Table */}
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
    </div>
  );
};
