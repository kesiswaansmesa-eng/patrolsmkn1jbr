import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Filter, Layers, Users, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate } from '../../utils/dateUtils';

export const AnalyticsView: React.FC = () => {
  const { scopedRecords, departments, classes, reasons, settings } = useApp();

  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [trendGranularity, setTrendGranularity] = useState<'daily' | 'monthly'>('daily');

  // Filter valid transactions
  const activeRecords = useMemo(() => {
    return scopedRecords.filter(r => {
      if (r.is_cancelled) return false;
      if (filterDepartment && r.department_code !== filterDepartment) return false;
      if (filterClass && r.class_name !== filterClass) return false;
      return true;
    });
  }, [scopedRecords, filterDepartment, filterClass]);

  // 1. Trend Over Time (Daily or Monthly)
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; display: string; count: number; totalMinutes: number }> = {};
    activeRecords.forEach(r => {
      const key = trendGranularity === 'daily' ? r.event_date : r.event_date.substring(0, 7);
      if (!map[key]) {
        map[key] = {
          date: key,
          display: trendGranularity === 'daily' ? formatIndonesianDate(r.event_date) : key,
          count: 0,
          totalMinutes: 0,
        };
      }
      map[key].count++;
      map[key].totalMinutes += r.late_duration_minutes;
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [activeRecords, trendGranularity]);

  // 2. Department Breakdown
  const departmentData = useMemo(() => {
    const map: Record<string, number> = {};
    departments.forEach(d => { map[d.code] = 0; });
    activeRecords.forEach(r => {
      map[r.department_code] = (map[r.department_code] || 0) + 1;
    });
    return Object.entries(map).map(([code, count]) => {
      const dept = departments.find(d => d.code === code);
      return {
        code,
        name: dept ? dept.name : code,
        count,
      };
    }).sort((a, b) => b.count - a.count);
  }, [activeRecords, departments]);

  // 3. Class Breakdown
  const classData = useMemo(() => {
    const map: Record<string, number> = {};
    activeRecords.forEach(r => {
      map[r.class_name] = (map[r.class_name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 classes
  }, [activeRecords]);

  // 4. Reasons Frequency & Percentage
  const reasonData = useMemo(() => {
    const map: Record<string, number> = {};
    activeRecords.forEach(r => {
      map[r.reason_name] = (map[r.reason_name] || 0) + 1;
    });
    const total = activeRecords.length || 1;
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [activeRecords]);

  // 5. Followup Status Distribution
  const followupData = useMemo(() => {
    const map: Record<string, number> = {
      'belum_ditindaklanjuti': 0,
      'dijadwalkan': 0,
      'dalam_pembinaan': 0,
      'selesai': 0,
    };
    activeRecords.forEach(r => {
      if (map[r.followup_status] !== undefined) {
        map[r.followup_status]++;
      }
    });
    return [
      { name: 'Belum Ditindaklanjuti', count: map['belum_ditindaklanjuti'], color: '#EF4444' },
      { name: 'Dijadwalkan', count: map['dijadwalkan'], color: '#3B82F6' },
      { name: 'Dalam Pembinaan', count: map['dalam_pembinaan'], color: '#F59E0B' },
      { name: 'Selesai Pembinaan', count: map['selesai'], color: '#10B981' },
    ];
  }, [activeRecords]);

  // 6. Top Students with Highest Lateness (Warning list)
  const topStudents = useMemo(() => {
    const map: Record<string, { student_id: string; name: string; nis: string; class_name: string; count: number; totalMinutes: number }> = {};
    activeRecords.forEach(r => {
      if (!map[r.student_id]) {
        map[r.student_id] = {
          student_id: r.student_id,
          name: r.student_name,
          nis: r.nis,
          class_name: r.class_name,
          count: 0,
          totalMinutes: 0,
        };
      }
      map[r.student_id].count++;
      map[r.student_id].totalMinutes += r.late_duration_minutes;
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [activeRecords]);

  const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#F97316', '#06B6D4', '#64748B'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analisis & Grafik Keterlambatan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Agregasi visual komprehensif data kedisiplinan SMK Negeri 1 Jember
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterDepartment}
            onChange={(e) => {
              setFilterDepartment(e.target.value);
              setFilterClass('');
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="">Semua Jurusan</option>
            {departments.map(d => (
              <option key={d.code} value={d.code}>{d.code}</option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="">Semua Kelas</option>
            {classes
              .filter(c => !filterDepartment || c.department_code === filterDepartment)
              .map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Chart 1: Time Trend Area Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Tren Frekuensi & Akumulasi Waktu Terlambat
            </h3>
            <p className="text-xs text-slate-500">Dinamika keterlambatan siswa dari hari ke hari</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTrendGranularity('daily')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                trendGranularity === 'daily' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setTrendGranularity('monthly')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                trendGranularity === 'monthly' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        <div className="h-64 sm:h-72">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="display" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    name === 'count' ? `${value} Kasus` : `${value} Menit`,
                    name === 'count' ? 'Jumlah Kejadian' : 'Akumulasi Keterlambatan'
                  ]}
                />
                <Area type="monotone" dataKey="count" stroke="#2563EB" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Belum ada transaksi keterlambatan untuk ditampilkan.
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 2: Perbandingan Jurusan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Perbandingan per Kompetensi Keahlian</h3>
              <p className="text-xs text-slate-500">8 Program Keahlian SMKN 1 Jember</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              Total: {activeRecords.length}
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical" margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="code" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <Tooltip formatter={(value: any) => [`${value} Kejadian`, 'Jumlah Terlambat']} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Proporsi Alasan Terbanyak */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Distribusi Alasan Keterlambatan</h3>
              <p className="text-xs text-slate-500">Klarifikasi alasan yang dilaporkan siswa</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 flex items-center justify-center">
            {reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {reasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} Kasus`, String(name)]} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    formatter={(val) => <span className="text-[10px] text-slate-700">{val}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Tidak ada data alasan.</p>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Followup Status & Top Frequent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 4: Followup Status Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Status Tindak Lanjut Pembinaan</h3>
          <p className="text-xs text-slate-500 mb-4">Efektivitas penanganan kasus oleh Tim Kesiswaan</p>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followupData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`${value} Kasus`, 'Status']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {followupData.map((entry, index) => (
                    <Cell key={`cell-f-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Top Students with High Frequency (Warning for Counselors) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Siswa dengan Keterlambatan Berulang
              </h3>
              <p className="text-xs text-slate-500">Perlu penanganan khusus / bimbingan konseling</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
              Ambang SP: {settings.warning_threshold_sp1}+ Kali
            </span>
          </div>

          <div className="space-y-2.5">
            {topStudents.length > 0 ? (
              topStudents.map((std, idx) => (
                <div key={std.student_id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white flex items-center justify-between text-xs transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-slate-900">{std.name}</div>
                      <div className="text-[10px] text-slate-500">
                        NIS: {std.nis} • {std.class_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-red-600 font-mono text-sm block">
                      {std.count}x
                    </span>
                    <span className="text-[10px] text-slate-400">Total {std.totalMinutes} menit</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Tidak ada siswa terlambat.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
