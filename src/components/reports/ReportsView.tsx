import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Printer, Filter, Calendar, 
  School, Building2, CheckCircle, ShieldCheck, RotateCcw,
  Layers, ChevronDown, HeartHandshake, Database
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FollowUpStatus, CoachingRecord, LatenessRecord } from '../../types';
import { formatIndonesianDate, getWIBTodayString, isDateToday, isDateThisWeek, isDateThisMonth, normalizeDateString } from '../../utils/dateUtils';
import { exportToCSV, exportOfficialReportToCSV } from '../../utils/exportUtils';

export type ReportType = 
  | 'harian' 
  | 'mingguan' 
  | 'bulanan' 
  | 'semester' 
  | 'tahunan' 
  | 'per_siswa' 
  | 'per_kelas' 
  | 'per_jurusan' 
  | 'alasan' 
  | 'pembinaan' 
  | 'leaderboard';

const MONTHS_INDONESIAN = [
  { value: 1, name: 'Januari' },
  { value: 2, name: 'Februari' },
  { value: 3, name: 'Maret' },
  { value: 4, name: 'April' },
  { value: 5, name: 'Mei' },
  { value: 6, name: 'Juni' },
  { value: 7, name: 'Juli' },
  { value: 8, name: 'Agustus' },
  { value: 9, name: 'September' },
  { value: 10, name: 'Oktober' },
  { value: 11, name: 'November' },
  { value: 12, name: 'Desember' },
];

export const formatCoachingType = (type?: string): string => {
  switch (type) {
    case 'konseling': return 'Konseling Individual';
    case 'refleksi_tertulis': return 'Refleksi Tertulis';
    case 'pendampingan_wali_kelas': return 'Pendampingan Wali Kelas';
    case 'komunikasi_orang_tua': return 'Pemanggilan Orang Tua/Wali';
    case 'pembinaan_karakter': return 'Pembinaan Karakter & Sekolah';
    case 'surat_peringatan': return 'Penerbitan Surat Peringatan (SP)';
    default: return type ? type.replace(/_/g, ' ') : '-';
  }
};

export const formatStatusText = (status?: string): string => {
  switch (status) {
    case 'selesai': return 'Selesai Pembinaan';
    case 'dalam_pembinaan': return 'Dalam Pembinaan';
    case 'dijadwalkan': return 'Dijadwalkan Lanjutan';
    case 'dirujuk': return 'Dirujuk Lanjutan (BK)';
    case 'belum_ditindaklanjuti': return 'Belum Ditindaklanjuti';
    default: return status ? status.replace(/_/g, ' ') : 'Belum Ditindaklanjuti';
  }
};

export const getStatusBadgeClass = (status?: string): string => {
  switch (status) {
    case 'selesai':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'dalam_pembinaan':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'dijadwalkan':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'dirujuk':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'belum_ditindaklanjuti':
    default:
      return 'bg-red-50 text-red-700 border-red-200';
  }
};

export const ReportsView: React.FC = () => {
  const { 
    scopedRecords, departments, classes, coachings, students, 
    currentUser, settings 
  } = useApp();

  const [reportType, setReportType] = useState<ReportType>('bulanan');
  const [filterDept, setFilterDept] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(getWIBTodayString());

  // Filter Bulan & Tahun Khusus Laporan Bulanan & Laporan Pembinaan
  const todayWIB = getWIBTodayString();
  const [currentWIBYear, currentWIBMonth] = todayWIB.split('-').map(Number);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentWIBMonth || 10);
  const [selectedYear, setSelectedYear] = useState<number>(currentWIBYear || 2026);

  // Available Years from data and default range
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(2024);
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);
    scopedRecords.forEach(r => {
      if (r.event_date) {
        const y = parseInt(r.event_date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2020 && y <= 2035) {
          yearsSet.add(y);
        }
      }
    });
    coachings.forEach(c => {
      const dateStr = c.coaching_date || c.created_at;
      if (dateStr) {
        const y = parseInt(dateStr.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2020 && y <= 2035) {
          yearsSet.add(y);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [scopedRecords, coachings]);

  // Classes dynamically scoped by selected department
  const availableClasses = useMemo(() => {
    if (!filterDept) return classes;
    return classes.filter(c => c.department_code === filterDept || c.department_id === filterDept);
  }, [classes, filterDept]);

  // Mapping status pembinaan terbaru langsung dari tabel Pembinaan_BK (Google Sheets)
  const studentCoachingMap = useMemo(() => {
    const map = new Map<string, CoachingRecord>();
    const sorted = [...coachings].sort((a, b) => {
      const dateA = a.coaching_date || a.created_at || '';
      const dateB = b.coaching_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    });

    sorted.forEach(c => {
      if (c.student_id && !map.has(c.student_id)) {
        map.set(c.student_id, c);
      }
      if (c.nis && !map.has(c.nis)) {
        map.set(c.nis, c);
      }
    });

    return map;
  }, [coachings]);

  // Fungsi pembantu untuk mengambil status pembinaan efektif dari tabel Pembinaan_BK
  const getEffectiveStatus = (r: LatenessRecord): FollowUpStatus => {
    const c = studentCoachingMap.get(r.student_id) || (r.nis ? studentCoachingMap.get(r.nis) : undefined);
    if (c && c.status) {
      return c.status;
    }
    return r.followup_status || 'belum_ditindaklanjuti';
  };

  // Report Types Metadata
  const reportOptions: Array<{ id: ReportType; title: string; desc: string }> = [
    { id: 'bulanan', title: '1. Laporan Bulanan', desc: 'Rekapitulasi keterlambatan per bulan, jurusan & kelas' },
    { id: 'harian', title: '2. Laporan Harian', desc: 'Rekapitulasi keterlambatan siswa per hari tertentu' },
    { id: 'mingguan', title: '3. Laporan Mingguan', desc: 'Rekapitulasi keterlambatan minggu berjalan' },
    { id: 'semester', title: '4. Laporan Semester', desc: 'Evaluasi semester ganjil/genap berjalan' },
    { id: 'tahunan', title: '5. Laporan Tahun Ajaran', desc: 'Laporan komprehensif tahun pelajaran' },
    { id: 'per_siswa', title: '6. Laporan per Siswa', desc: 'Frekuensi dan durasi per individu siswa' },
    { id: 'per_kelas', title: '7. Laporan per Kelas', desc: 'Agregasi kasus keterlambatan antar rombel' },
    { id: 'per_jurusan', title: '8. Laporan per Jurusan', desc: 'Perbandingan 8 kompetensi keahlian' },
    { id: 'alasan', title: '9. Laporan Alasan Keterlambatan', desc: 'Distribusi alasan yang dilaporkan siswa' },
    { id: 'pembinaan', title: '10. Laporan Tindak Lanjut Pembinaan (BK)', desc: 'Data riwayat & status pembinaan dari tabel Pembinaan_BK' },
    { id: 'leaderboard', title: '11. Laporan Peringkat Kedisiplinan', desc: 'Rasio kedisiplinan dan kategori zero keterlambatan' },
  ];

  // Selected month name
  const selectedMonthName = MONTHS_INDONESIAN.find(m => m.value === selectedMonth)?.name || 'Bulan Berjalan';

  // Dynamic report title
  const currentReportTitle = useMemo(() => {
    if (reportType === 'pembinaan') {
      let t = `Laporan Status Pembinaan Siswa (Tabel Pembinaan_BK) Bulan ${selectedMonthName} ${selectedYear}`;
      if (filterClass) t += ` - Kelas ${filterClass}`;
      else if (filterDept) t += ` - Jurusan ${filterDept}`;
      return t;
    }
    if (reportType === 'bulanan') {
      let t = `Laporan Keterlambatan Siswa Bulan ${selectedMonthName} ${selectedYear}`;
      if (filterClass) t += ` - Kelas ${filterClass}`;
      else if (filterDept) t += ` - Jurusan ${filterDept}`;
      return t;
    }
    const base = reportOptions.find(r => r.id === reportType)?.title || 'Laporan Keterlambatan';
    let extra = '';
    if (filterClass) extra += ` - Kelas ${filterClass}`;
    else if (filterDept) extra += ` - Jurusan ${filterDept}`;
    return `${base}${extra}`;
  }, [reportType, selectedMonthName, selectedYear, filterDept, filterClass, reportOptions]);

  // Report period label for signatures and headers
  const reportPeriodLabel = useMemo(() => {
    if (reportType === 'harian') {
      return formatIndonesianDate(selectedDate);
    }
    if (reportType === 'bulanan' || reportType === 'pembinaan') {
      return `Bulan ${selectedMonthName} ${selectedYear}`;
    }
    if (reportType === 'mingguan') {
      return 'Minggu Berjalan';
    }
    return `Tahun Ajaran ${settings.academic_year || '2024/2025'}`;
  }, [reportType, selectedDate, selectedMonthName, selectedYear, settings.academic_year]);

  // Filtered dataset for active report (Data Keterlambatan)
  const filteredRecords = useMemo(() => {
    return scopedRecords.filter(r => {
      if (r.is_cancelled) return false;
      if (filterDept && r.department_code !== filterDept) return false;
      if (filterClass && r.class_name !== filterClass && r.class_id !== filterClass) return false;

      const cleanDate = normalizeDateString(r.event_date);

      if (reportType === 'harian') {
        return cleanDate === selectedDate;
      }
      if (reportType === 'mingguan') {
        return isDateThisWeek(r.event_date);
      }
      if (reportType === 'bulanan') {
        const targetMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        return cleanDate.startsWith(targetMonthPrefix);
      }
      return true;
    });
  }, [scopedRecords, filterDept, filterClass, reportType, selectedDate, selectedMonth, selectedYear]);

  // Filtered dataset khusus untuk Laporan Pembinaan (Diambil dari tabel Pembinaan_BK)
  const filteredCoachings = useMemo(() => {
    return coachings.filter(c => {
      if (filterDept && c.department_code !== filterDept) return false;
      if (filterClass && c.class_name !== filterClass) return false;

      const cleanDate = normalizeDateString(c.coaching_date || c.created_at);

      if (reportType === 'harian') {
        return cleanDate === selectedDate;
      }
      if (reportType === 'mingguan') {
        return isDateThisWeek(c.coaching_date || c.created_at);
      }
      if (reportType === 'bulanan' || reportType === 'pembinaan') {
        if (selectedMonth && selectedYear) {
          const targetMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
          return cleanDate.startsWith(targetMonthPrefix);
        }
      }
      return true;
    });
  }, [coachings, filterDept, filterClass, reportType, selectedDate, selectedMonth, selectedYear]);

  // Handle Export CSV Lengkap dengan Lembar Pengesahan Resmi (Kepsek & Waka Kesiswaan)
  const handleExportOfficialReport = () => {
    if (reportType === 'pembinaan') {
      const rows = filteredCoachings.map((c, i) => ({
        No: i + 1,
        Tanggal_Pembinaan: c.coaching_date ? formatIndonesianDate(c.coaching_date) : '-',
        Nama_Siswa: c.student_name,
        NIS: c.nis || '-',
        Kelas: c.class_name,
        Jurusan: c.department_code,
        Bentuk_Pembinaan: formatCoachingType(c.coaching_type),
        Target_Perbaikan: c.target_improvement,
        Hasil_Evaluasi: c.evaluation_result || '-',
        Jadwal_Lanjutan: c.next_followup_date ? formatIndonesianDate(c.next_followup_date) : '-',
        Petugas_Pembina_BK: c.officer_name,
        Status_Pembinaan: formatStatusText(c.status),
      }));

      const periodLabel = `Bulan ${selectedMonthName} ${selectedYear}${filterDept ? ` • Jurusan ${filterDept}` : ''}${filterClass ? ` • Kelas ${filterClass}` : ''}`;
      const fileSuffix = `Pembinaan_BK_${selectedMonthName}_${selectedYear}${filterDept ? `_${filterDept}` : ''}${filterClass ? `_${filterClass.replace(/\s+/g, '-')}` : ''}`;

      exportOfficialReportToCSV({
        filename: `Laporan_Resmi_${fileSuffix}_SMESA_${getWIBTodayString()}`,
        reportTitle: currentReportTitle,
        periodText: periodLabel,
        schoolName: settings.school_name || 'SMK NEGERI 1 JEMBER',
        schoolAddress: settings.school_address || 'Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember',
        headmasterName: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
        headmasterNip: settings.headmaster_nip || '196708211993031005',
        viceHeadmasterName: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
        viceHeadmasterNip: settings.vice_headmaster_nip || '198604122010011012',
        officerName: currentUser.full_name,
        officerNip: currentUser.nip || '-',
        city: settings.city || 'Jember',
        printDateText: formatIndonesianDate(getWIBTodayString()),
        totalRecordsCount: filteredCoachings.length,
        rows,
      });
      return;
    }

    // Default untuk laporan keterlambatan (Bulanan, Harian, dll.) - Status Pembinaan diambil dari tabel Pembinaan_BK
    const rows = filteredRecords.map((r, i) => {
      const effectiveStatus = getEffectiveStatus(r);
      return {
        No: i + 1,
        Tanggal: r.event_date,
        Hari: r.day_name,
        Nama_Siswa: r.student_name,
        NIS: r.nis,
        Kelas: r.class_name,
        Jurusan: r.department_code,
        Jam_Tiba: r.arrival_time,
        Terlambat_Menit: r.late_duration_minutes,
        Alasan: r.reason_name,
        Keterangan: r.notes || '',
        Status_Pembinaan: formatStatusText(effectiveStatus),
        Petugas_Pencatat: r.recorded_by_name,
      };
    });

    const periodLabel = reportType === 'harian' 
      ? formatIndonesianDate(selectedDate) 
      : reportType === 'bulanan'
      ? `Bulan ${selectedMonthName} ${selectedYear}${filterDept ? ` • Jurusan ${filterDept}` : ''}${filterClass ? ` • Kelas ${filterClass}` : ''}`
      : `Tahun Ajaran ${settings.academic_year || '2024/2025'} (Semester ${settings.semester || 'Ganjil'})`;

    const fileSuffix = reportType === 'bulanan'
      ? `Bulanan_${selectedMonthName}_${selectedYear}${filterDept ? `_${filterDept}` : ''}${filterClass ? `_${filterClass.replace(/\s+/g, '-')}` : ''}`
      : `${reportType}_${getWIBTodayString()}`;

    exportOfficialReportToCSV({
      filename: `Laporan_Resmi_${fileSuffix}_SMESA_${getWIBTodayString()}`,
      reportTitle: currentReportTitle,
      periodText: periodLabel,
      schoolName: settings.school_name || 'SMK NEGERI 1 JEMBER',
      schoolAddress: settings.school_address || 'Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember',
      headmasterName: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
      headmasterNip: settings.headmaster_nip || '196708211993031005',
      viceHeadmasterName: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
      viceHeadmasterNip: settings.vice_headmaster_nip || '198604122010011012',
      officerName: currentUser.full_name,
      officerNip: currentUser.nip || '-',
      city: settings.city || 'Jember',
      printDateText: formatIndonesianDate(getWIBTodayString()),
      totalRecordsCount: filteredRecords.length,
      rows,
    });
  };

  // Handle Export CSV Tabel Mentah (Dengan Kolom Pejabat Penandatangan)
  const handleExportCSV = () => {
    if (reportType === 'pembinaan') {
      const rows = filteredCoachings.map((c, i) => ({
        No: i + 1,
        Tanggal_Pembinaan: c.coaching_date,
        Nama_Siswa: c.student_name,
        NIS: c.nis || '-',
        Kelas: c.class_name,
        Jurusan: c.department_code,
        Bentuk_Pembinaan: formatCoachingType(c.coaching_type),
        Target_Perbaikan: c.target_improvement,
        Hasil_Evaluasi: c.evaluation_result || '-',
        Jadwal_Lanjutan: c.next_followup_date || '-',
        Petugas_Pembina_BK: c.officer_name,
        Status_Pembinaan: formatStatusText(c.status),
        Tabel_Sumber: 'Pembinaan_BK',
        Mengetahui_Kepala_Sekolah: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
        NIP_Kepala_Sekolah: settings.headmaster_nip || '196708211993031005',
        Waka_Kesiswaan: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
        NIP_Waka_Kesiswaan: settings.vice_headmaster_nip || '198604122010011012',
      }));

      const fileSuffix = `Pembinaan_BK_${selectedMonthName}_${selectedYear}${filterDept ? `_${filterDept}` : ''}${filterClass ? `_${filterClass.replace(/\s+/g, '-')}` : ''}`;
      exportToCSV(`Data_${fileSuffix}_SMESA`, rows);
      return;
    }

    // Default untuk laporan keterlambatan
    const rows = filteredRecords.map((r, i) => {
      const effectiveStatus = getEffectiveStatus(r);
      return {
        No: i + 1,
        Tanggal: r.event_date,
        Hari: r.day_name,
        Nama_Siswa: r.student_name,
        NIS: r.nis,
        Kelas: r.class_name,
        Jurusan: r.department_code,
        Jam_Tiba: r.arrival_time,
        Terlambat_Menit: r.late_duration_minutes,
        Alasan: r.reason_name,
        Keterangan: r.notes || '',
        Status_Pembinaan: formatStatusText(effectiveStatus),
        Petugas_Pencatat: r.recorded_by_name,
        Mengetahui_Kepala_Sekolah: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
        NIP_Kepala_Sekolah: settings.headmaster_nip || '196708211993031005',
        Waka_Kesiswaan: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
        NIP_Waka_Kesiswaan: settings.vice_headmaster_nip || '198604122010011012',
      };
    });

    const fileSuffix = reportType === 'bulanan'
      ? `Bulanan_${selectedMonthName}_${selectedYear}${filterDept ? `_${filterDept}` : ''}${filterClass ? `_${filterClass.replace(/\s+/g, '-')}` : ''}`
      : `${reportType}_${getWIBTodayString()}`;

    exportToCSV(`Data_Keterlambatan_${fileSuffix}_SMESA`, rows);
  };

  // Handle Print with School Letterhead
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Laporan & Ekspor Dokumen Resmi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencetakan laporan berkala dengan pengesahan Kepala Sekolah & Waka Kesiswaan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportOfficialReport}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh laporan lengkap dengan Kop dan Lembar Pengesahan Kepala Sekolah & Waka Kesiswaan"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Excel + Pengesahan Pimpinan
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh data mentah baris tabel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Data Mentah CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF Resmi
          </button>
        </div>
      </div>

      {/* Select Report Type & Filters (Hidden during print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Jenis Laporan:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {reportOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  reportType === opt.id
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                }`}
              >
                <span className="block truncate">{opt.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter controls */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Pengaturan Filter Dokumen {reportType === 'bulanan' ? '(Laporan Bulanan)' : reportType === 'pembinaan' ? '(Laporan Pembinaan BK)' : ''}:</span>
            </div>
            {(filterDept || filterClass || (reportType === 'harian' && selectedDate !== getWIBTodayString()) || ((reportType === 'bulanan' || reportType === 'pembinaan') && (selectedMonth !== currentWIBMonth || selectedYear !== currentWIBYear))) && (
              <button
                type="button"
                onClick={() => {
                  setFilterDept('');
                  setFilterClass('');
                  setSelectedDate(getWIBTodayString());
                  setSelectedMonth(currentWIBMonth || 10);
                  setSelectedYear(currentWIBYear || 2026);
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Pilih Bulan (Aktif jika Laporan Bulanan atau Pembinaan BK) */}
            {(reportType === 'bulanan' || reportType === 'pembinaan') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pilih Bulan:</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:border-blue-600 cursor-pointer shadow-2xs"
                >
                  {MONTHS_INDONESIAN.map(m => (
                    <option key={m.value} value={m.value}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Pilih Tahun (Aktif jika Laporan Bulanan atau Pembinaan BK) */}
            {(reportType === 'bulanan' || reportType === 'pembinaan') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pilih Tahun:</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:border-blue-600 cursor-pointer shadow-2xs"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Jika Laporan Harian: Pilih Tanggal */}
            {reportType === 'harian' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tanggal Harian:</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:border-blue-600 cursor-pointer shadow-2xs"
                />
              </div>
            )}

            {/* 3. Pilih Jurusan (Kompetensi Keahlian) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Jurusan:</span>
              </label>
              <select
                value={filterDept}
                onChange={(e) => {
                  const newDept = e.target.value;
                  setFilterDept(newDept);
                  if (newDept && filterClass) {
                    const matchCls = classes.find(c => (c.name === filterClass || c.id === filterClass) && (c.department_code === newDept || c.department_id === newDept));
                    if (!matchCls) setFilterClass('');
                  }
                }}
                className={`w-full px-3 py-2 rounded-xl font-bold border transition-colors cursor-pointer shadow-2xs ${
                  filterDept ? 'bg-blue-50/80 border-blue-400 text-blue-900' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="">-- Semua Jurusan (8 Keahlian) --</option>
                {departments.map(d => (
                  <option key={d.code} value={d.code}>
                    {d.code} &bull; {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Pilih Rombel / Kelas */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Kelas:</span>
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl font-bold border transition-colors cursor-pointer shadow-2xs ${
                  filterClass ? 'bg-blue-50/80 border-blue-400 text-blue-900' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="">
                  {filterDept ? `-- Semua Kelas di ${filterDept} (${availableClasses.length} Rombel) --` : `-- Semua Kelas (${classes.length} Rombel) --`}
                </option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name} &bull; {c.department_code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Badge Ringkasan Filter Terpilih */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-500">Cakupan Dokumen:</span>
            {(reportType === 'bulanan' || reportType === 'pembinaan') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                <Calendar className="w-3 h-3 text-blue-600" />
                Bulan: {selectedMonthName} {selectedYear}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${
              filterDept ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <Building2 className="w-3 h-3 text-indigo-600" />
              Jurusan: {filterDept ? filterDept : 'Semua Jurusan'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${
              filterClass ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <School className="w-3 h-3 text-purple-600" />
              Kelas: {filterClass ? filterClass : 'Semua Kelas'}
            </span>
            <span className="ml-auto font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              {reportType === 'pembinaan' ? (
                <>
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{filteredCoachings.length} Kasus Pembinaan (Tabel Pembinaan_BK)</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{filteredRecords.length} Data Keterlambatan</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Official Printable Report Paper Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 text-slate-900 print:border-none print:shadow-none print:p-0">
        
        {/* Kop Surat Resmi SMK Negeri 1 Jember */}
        <div className="border-b-[3px] border-slate-900 pb-2 mb-6 text-center relative">
          <div className="flex items-center gap-4 sm:gap-6 mb-2">
            {/* Logo Provinsi Jawa Timur (Hanya di Sisi Kiri) */}
            <div className="w-20 sm:w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <img 
                src="https://iili.io/nhV3HBI.png" 
                alt="Logo Provinsi Jawa Timur" 
                className="w-full h-full object-contain"
              />
            </div>
            {/* Teks Kop Dinas Resmi */}
            <div className="text-center flex-1 pr-4 sm:pr-24">
              <h3 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-800 leading-tight">
                PEMERINTAH PROVINSI JAWA TIMUR
              </h3>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 leading-tight mt-0.5">
                DINAS PENDIDIKAN
              </h2>
              <h1 className="text-lg sm:text-2xl font-black uppercase text-blue-950 tracking-tight leading-snug mt-0.5">
                SEKOLAH MENENGAH KEJURUAN NEGERI 1 JEMBER
              </h1>
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                Bidang Keahlian : Bisnis dan Manajemen/Pariwisata/Seni dan Ekonomi Kreatif/Teknologi Manufaktur dan Rekayasa
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-700 mt-0.5 font-medium">
                JALAN JAMBU NO. 17 TELP. (0331) 483108 FAX. (0331) 429690
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium">
                Website : <span className="underline">www.smknegeri1jember.sch.id</span> &nbsp;&nbsp;&nbsp;&nbsp; email : <span className="underline">smknegeri1jember@yahoo.com</span>
              </p>
            </div>
          </div>
          {/* Garis ganda khas Kop Surat Dinas */}
          <div className="h-0.5 bg-slate-900 mt-2"></div>
          <div className="h-px bg-slate-700 mt-0.5"></div>
        </div>

        {/* Report Metadata */}
        <div className="text-center mb-6">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-snug">
            {currentReportTitle.toUpperCase()}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Aplikasi PATROL SMESA &bull; Periode: <strong className="text-slate-900">{reportPeriodLabel}</strong>
            {filterDept && <span> &bull; Jurusan: <strong className="text-blue-900">{filterDept}</strong></span>}
            {filterClass && <span> &bull; Kelas: <strong className="text-blue-900">{filterClass}</strong></span>}
          </p>
        </div>

        {/* Summary Info */}
        {reportType === 'pembinaan' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 text-xs mb-6 print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Periode Laporan:</span>
              <span className="font-bold text-slate-900 block truncate">{reportPeriodLabel}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Jurusan:</span>
              <span className="font-bold text-blue-900 block truncate">{filterDept || 'Semua Jurusan'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Kelas:</span>
              <span className="font-bold text-blue-900 block truncate">{filterClass || 'Semua Kelas'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Total Pembinaan BK:</span>
              <span className="font-extrabold text-indigo-700 font-mono block">{filteredCoachings.length} Kasus</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Status Selesai:</span>
              <span className="font-bold text-emerald-700 block">
                {filteredCoachings.filter(c => c.status === 'selesai').length} Siswa
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Sumber Data:</span>
              <span className="font-bold text-slate-800 block truncate flex items-center gap-1">
                <Database className="w-3 h-3 text-indigo-600 inline" />
                <span>Tabel Pembinaan_BK</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-6 print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Periode Laporan:</span>
              <span className="font-bold text-slate-900 block truncate">{reportPeriodLabel}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Jurusan:</span>
              <span className="font-bold text-blue-900 block truncate">{filterDept || 'Semua Jurusan'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Kelas:</span>
              <span className="font-bold text-blue-900 block truncate">{filterClass || 'Semua Kelas'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Total Keterlambatan:</span>
              <span className="font-extrabold text-red-600 font-mono block">{filteredRecords.length} Transaksi</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Tanggal Cetak:</span>
              <span className="font-bold text-slate-800 block">{formatIndonesianDate(getWIBTodayString())}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Petugas Pencetak:</span>
              <span className="font-bold text-slate-800 block truncate">{currentUser.full_name}</span>
            </div>
          </div>
        )}

        {/* Report Data Table */}
        <div className="overflow-x-auto mb-8">
          {reportType === 'pembinaan' ? (
            /* TABEL LAPORAN STATUS PEMBINAAN (BK) LANGSUNG DARI TABEL Pembinaan_BK */
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-indigo-900 text-white uppercase text-[10px] font-black border-b border-indigo-950 print:bg-slate-100 print:text-slate-900">
                <tr>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Tanggal Pembinaan</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Nama Siswa / NIS</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Kelas & Jurusan</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Bentuk Pembinaan</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Target Perbaikan & Komitmen</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Evaluasi / Tindakan</th>
                  <th className="p-2 border-r border-indigo-800 print:border-slate-300">Petugas Pembina (BK)</th>
                  <th className="p-2 text-center whitespace-nowrap">Status Pembinaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCoachings.length > 0 ? (
                  filteredCoachings.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 whitespace-nowrap font-medium">
                        {formatIndonesianDate(c.coaching_date)}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="font-bold text-slate-900 block">{c.student_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">NIS: {c.nis || '-'}</span>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-blue-900">
                        {c.class_name || '-'} {c.department_code ? `(${c.department_code})` : ''}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">
                        {formatCoachingType(c.coaching_type)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 max-w-xs">
                        {c.target_improvement || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 max-w-xs">
                        {c.evaluation_result || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-800 font-medium">
                        {c.officer_name || '-'}
                      </td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(c.status)}`}>
                          {formatStatusText(c.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-slate-500">
                      <p className="font-bold text-slate-700 text-sm">Tidak Ada Catatan Pembinaan BK</p>
                      <p className="text-slate-500 mt-1">
                        Belum ada riwayat pembinaan di tabel <strong className="text-slate-700">Pembinaan_BK</strong> untuk Periode {reportPeriodLabel}
                        {filterDept ? ` pada Jurusan ${filterDept}` : ''}
                        {filterClass ? ` Kelas ${filterClass}` : ''}.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* TABEL LAPORAN KETERLAMBATAN STANDAR DENGAN STATUS PEMBINAAN SINKRON DARI TABEL Pembinaan_BK */
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-black border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border-r border-slate-300">Tanggal / Hari</th>
                  <th className="p-2 border-r border-slate-300">Nama Siswa / NIS</th>
                  <th className="p-2 border-r border-slate-300">Kelas & Jurusan</th>
                  <th className="p-2 border-r border-slate-300 text-center">Tiba (WIB)</th>
                  <th className="p-2 border-r border-slate-300 text-center">Durasi</th>
                  <th className="p-2 border-r border-slate-300">Alasan</th>
                  <th className="p-2 text-center whitespace-nowrap">Status Pembinaan (BK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r, idx) => {
                    const effectiveStatus = getEffectiveStatus(r);
                    return (
                      <tr key={r.id}>
                        <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 whitespace-nowrap">
                          {formatIndonesianDate(r.event_date)} ({r.day_name})
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="font-bold block">{r.student_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">NIS: {r.nis}</span>
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold text-blue-800">
                          {r.class_name} ({r.department_code})
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                          {r.arrival_time.substring(0, 5)}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-red-600">
                          +{r.late_duration_minutes}m
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {r.reason_name}
                          {r.notes && <span className="block text-[10px] text-slate-500 italic">"{r.notes}"</span>}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(effectiveStatus)}`}>
                            {formatStatusText(effectiveStatus)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                      <p className="font-bold text-slate-700 text-sm">Tidak Ada Catatan Keterlambatan</p>
                      <p className="text-slate-500 mt-1">
                        Tidak ditemukan data keterlambatan untuk {reportType === 'bulanan' ? `Bulan ${selectedMonthName} ${selectedYear}` : reportPeriodLabel}
                        {filterDept ? ` pada Jurusan ${filterDept}` : ''}
                        {filterClass ? ` Kelas ${filterClass}` : ''}.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Signature Slots (Official SMK Formalities - Otomatis dari Pengaturan & Database) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-center pt-6 border-t border-slate-200 mt-8">
          <div>
            <p className="text-slate-500 mb-16">Mengetahui,<br />Kepala {settings.school_name || 'SMKN 1 Jember'}</p>
            <p className="font-extrabold text-slate-900 underline">{settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.'}</p>
            <p className="text-[10px] text-slate-500 font-mono">NIP. {settings.headmaster_nip || '196708211993031005'}</p>
          </div>

          <div className="hidden sm:block">
            <p className="text-slate-500 mb-16">Waka Bidang Kesiswaan,<br />{settings.school_name || 'SMKN 1 Jember'}</p>
            <p className="font-extrabold text-slate-900 underline">{settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.'}</p>
            <p className="text-[10px] text-slate-500 font-mono">NIP. {settings.vice_headmaster_nip || '198604122010011012'}</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">{settings.city || 'Jember'}, {formatIndonesianDate(getWIBTodayString())}<br />Petugas Pencatat,</p>
            <p className="font-extrabold text-slate-900 underline">{currentUser.full_name}</p>
            <p className="text-[10px] text-slate-500 font-mono">NIP. {currentUser.nip || '-'}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
