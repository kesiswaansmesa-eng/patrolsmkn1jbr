import React, { useState, useMemo } from 'react';
import { 
  Users, Clock, Calendar, CheckCircle, AlertCircle, 
  TrendingUp, Filter, Sparkles, AlertTriangle, ArrowRight, 
  Award, Shield, FileSpreadsheet, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isDateToday, isDateThisWeek, isDateThisMonth, formatIndonesianDate } from '../../utils/dateUtils';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

interface DashboardViewProps {
  onNavigateToRecord: () => void;
  onNavigateToRecordsList: () => void;
  onNavigateToLeaderboard: () => void;
  onNavigateToCoaching: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToRecord,
  onNavigateToRecordsList,
  onNavigateToLeaderboard,
  onNavigateToCoaching,
}) => {
  const { 
    scopedRecords, scopedStudents, departments, classes, reasons, 
    currentUser, settings 
  } = useApp();

  // Filters State
  const [filterDept, setFilterDept] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filter records
  const filteredRecords = useMemo(() => {
    return scopedRecords.filter(r => {
      if (r.is_cancelled) return false;
      if (filterDept && r.department_code !== filterDept) return false;
      if (filterClass && r.class_id !== filterClass && r.class_name !== filterClass) return false;
      if (filterReason && r.reason_id !== filterReason) return false;
      if (filterStatus && r.followup_status !== filterStatus) return false;

      if (filterTimeframe === 'today' && !isDateToday(r.event_date)) return false;
      if (filterTimeframe === 'week' && !isDateThisWeek(r.event_date)) return false;
      if (filterTimeframe === 'month' && !isDateThisMonth(r.event_date)) return false;

      return true;
    });
  }, [scopedRecords, filterDept, filterClass, filterReason, filterStatus, filterTimeframe]);

  // Metric 1: Total Siswa Aktif (scoped)
  const totalActiveStudents = scopedStudents.filter(s => s.status === 'active').length;

  // Metric 2: Total Keterlambatan Hari Ini
  const totalToday = scopedRecords.filter(r => !r.is_cancelled && isDateToday(r.event_date)).length;

  // Metric 3: Total Keterlambatan Minggu Ini
  const totalThisWeek = scopedRecords.filter(r => !r.is_cancelled && isDateThisWeek(r.event_date)).length;

  // Metric 4: Total Keterlambatan Bulan Ini
  const totalThisMonth = scopedRecords.filter(r => !r.is_cancelled && isDateThisMonth(r.event_date)).length;

  // Metric 5: Siswa Unik yang Pernah Terlambat
  const uniqueStudentsCount = useMemo(() => {
    const studentIds = new Set(filteredRecords.map(r => r.student_id));
    return studentIds.size;
  }, [filteredRecords]);

  // Metric 6, 7, 8: Status Kasus Pembinaan
  const unhandledCases = filteredRecords.filter(r => r.followup_status === 'belum_ditindaklanjuti').length;
  const inCoachingCases = filteredRecords.filter(r => r.followup_status === 'dalam_pembinaan' || r.followup_status === 'dijadwalkan').length;
  const completedCases = filteredRecords.filter(r => r.followup_status === 'selesai').length;

  // Department Aggregation for Mini Chart
  const departmentData = useMemo(() => {
    const map: Record<string, number> = {};
    departments.forEach(d => { map[d.code] = 0; });
    filteredRecords.forEach(r => {
      if (map[r.department_code] !== undefined) {
        map[r.department_code]++;
      } else {
        map[r.department_code] = (map[r.department_code] || 0) + 1;
      }
    });
    return Object.keys(map).map(code => ({
      code,
      name: departments.find(d => d.code === code)?.name || code,
      count: map[code],
    }));
  }, [filteredRecords, departments]);

  // Reason Frequency Breakdown
  const reasonData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => {
      map[r.reason_name] = (map[r.reason_name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredRecords]);

  const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#F97316'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B1528] via-[#172554] to-[#1E3A8A] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-blue-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase tracking-wider">
                  Sistem Terpadu
                </span>
                <span className="text-xs text-blue-200">Tahun Ajaran {settings.academic_year} • Semester {settings.semester}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                PATROL SMESA — SMK NEGERI 1 JEMBER
              </h1>
              <p className="text-xs text-blue-100 mt-1">
                Selamat bertugas, <strong className="text-amber-300">{currentUser.full_name}</strong>. Pantau ketertiban dan tindak lanjut pembinaan siswa secara realtime.
              </p>
            </div>
          </div>

          {(currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan') && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onNavigateToRecord}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Catat Terlambat Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-3">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Data Dashboard</span>
          {(filterDept || filterClass || filterReason || filterStatus || filterTimeframe !== 'all') && (
            <button
              onClick={() => {
                setFilterDept('');
                setFilterClass('');
                setFilterReason('');
                setFilterStatus('');
                setFilterTimeframe('all');
              }}
              className="text-[11px] text-blue-600 hover:underline font-semibold ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {/* Timeframe */}
          <div>
            <select
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          {/* Department Filter */}
          {currentUser.role !== 'kkk' && currentUser.role !== 'wali_kelas' && (
            <div>
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterClass('');
                }}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="">Semua Jurusan (8 Keahlian)</option>
                {departments.map(d => (
                  <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Class Filter */}
          {currentUser.role !== 'wali_kelas' && (
            <div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                <option value="">Semua Kelas</option>
                {classes
                  .filter(c => !filterDept || c.department_code === filterDept)
                  .map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Reason Filter */}
          <div>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
            >
              <option value="">Semua Alasan</option>
              {reasons.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Followup Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700"
            >
              <option value="">Semua Status Pembinaan</option>
              <option value="belum_ditindaklanjuti">Belum Ditindaklanjuti</option>
              <option value="dijadwalkan">Dijadwalkan</option>
              <option value="dalam_pembinaan">Dalam Pembinaan</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8 Metric Cards (Section G Requirement) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Siswa Aktif */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Siswa Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalActiveStudents}</div>
          <p className="text-[10px] text-slate-500 mt-1">Sesuai ruang lingkup pengguna</p>
        </div>

        {/* Card 2: Hari Ini */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Terlambat Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{totalToday} <span className="text-xs font-semibold text-slate-500">Kejadian</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Pagi ini (Asia/Jakarta)</p>
        </div>

        {/* Card 3: Minggu Ini */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Minggu Ini</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalThisWeek} <span className="text-xs font-semibold text-slate-500">Kejadian</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Senin s.d. Jumat</p>
        </div>

        {/* Card 4: Bulan Ini */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalThisMonth} <span className="text-xs font-semibold text-slate-500">Kejadian</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Bulan berjalan</p>
        </div>

        {/* Card 5: Siswa Unik Terlambat */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Siswa Unik Terlambat</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">{uniqueStudentsCount} <span className="text-xs font-semibold text-slate-500">Orang</span></div>
          <p className="text-[10px] text-slate-500 mt-1">1 siswa dihitung 1 kali</p>
        </div>

        {/* Card 6: Belum Ditindaklanjuti */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Belum Ditindaklanjuti</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">{unhandledCases} <span className="text-xs font-semibold text-slate-500">Kasus</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Memerlukan penanganan</p>
        </div>

        {/* Card 7: Sedang Dalam Pembinaan */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dalam Pembinaan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{inCoachingCases} <span className="text-xs font-semibold text-slate-500">Kasus</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Konseling & pendampingan</p>
        </div>

        {/* Card 8: Selesai Ditindaklanjuti */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Selesai Tindak Lanjut</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{completedCases} <span className="text-xs font-semibold text-slate-500">Kasus</span></div>
          <p className="text-[10px] text-slate-500 mt-1">Tuntas dan dievaluasi</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Perbandingan per Jurusan (SMKN 1 JEMBER) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Keterlambatan per Kompetensi Keahlian</h3>
              <p className="text-xs text-slate-500">8 Jurusan SMK Negeri 1 Jember</p>
            </div>
            <button
              onClick={onNavigateToLeaderboard}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Leaderboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="code" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} Kejadian`, 'Total Terlambat']}
                  labelFormatter={(code) => {
                    const dept = departments.find(d => d.code === code);
                    return dept ? `${dept.code} - ${dept.name}` : String(code);
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === 0 ? '#10B981' : entry.count > 5 ? '#EF4444' : '#3B82F6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Zero Keterlambatan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Wajar</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Perhatian Khusus</span>
          </div>
        </div>

        {/* Chart 2: Top Alasan Keterlambatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Analisis Alasan Terbanyak</h3>
              <p className="text-xs text-slate-500">Dasar perumusan program pembinaan kesiswaan</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Top 5 Alasan
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {reasonData.map((item, idx) => {
              const total = filteredRecords.length || 1;
              const percentage = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="font-mono text-slate-600 font-semibold">
                      {item.count} kasus ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length] 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Transaksi Keterlambatan Terkini</h3>
            <p className="text-xs text-slate-500">Pembaruan realtime dari gerbang sekolah</p>
          </div>
          <button
            onClick={onNavigateToRecordsList}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Lihat Semua ({filteredRecords.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Waktu Kejadian</th>
                <th className="px-4 py-3">Nama Siswa / NIS</th>
                <th className="px-4 py-3">Kelas & Jurusan</th>
                <th className="px-4 py-3">Kedatangan / Durasi</th>
                <th className="px-4 py-3">Alasan</th>
                <th className="px-4 py-3">Status Pembinaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.slice(0, 5).map(record => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <span className="font-bold text-slate-900">{formatIndonesianDate(record.event_date)}</span>
                    <span className="block text-[10px] text-slate-400">{record.day_name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{record.student_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NIS: {record.nis}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-blue-700">{record.class_name}</span>
                    <span className="block text-[10px] text-slate-500">{record.department_code}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-900">{record.arrival_time.substring(0, 5)} WIB</span>
                    <span className="block text-[10px] font-bold text-red-600">+{record.late_duration_minutes} Menit</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{record.reason_name}</span>
                    {record.notes && (
                      <span className="block text-[10px] text-slate-400 italic truncate max-w-xs">{record.notes}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      record.followup_status === 'selesai' ? 'bg-emerald-100 text-emerald-800' :
                      record.followup_status === 'dalam_pembinaan' ? 'bg-amber-100 text-amber-800' :
                      record.followup_status === 'dijadwalkan' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.followup_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
