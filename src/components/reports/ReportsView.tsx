import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Printer, Filter, Calendar, 
  School, Building2, CheckCircle, ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate, getWIBTodayString, isDateToday, isDateThisWeek, isDateThisMonth } from '../../utils/dateUtils';
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

export const ReportsView: React.FC = () => {
  const { 
    scopedRecords, departments, classes, coachings, students, 
    currentUser, settings 
  } = useApp();

  const [reportType, setReportType] = useState<ReportType>('harian');
  const [filterDept, setFilterDept] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(getWIBTodayString());

  // Report Types Metadata
  const reportOptions: Array<{ id: ReportType; title: string; desc: string }> = [
    { id: 'harian', title: '1. Laporan Harian', desc: 'Rekapitulasi keterlambatan siswa per hari tertentu' },
    { id: 'mingguan', title: '2. Laporan Mingguan', desc: 'Rekapitulasi keterlambatan minggu berjalan' },
    { id: 'bulanan', title: '3. Laporan Bulanan', desc: 'Rekapitulasi keterlambatan bulan berjalan' },
    { id: 'semester', title: '4. Laporan Semester', desc: 'Evaluasi semester ganjil/genap berjalan' },
    { id: 'tahunan', title: '5. Laporan Tahun Ajaran', desc: 'Laporan komprehensif tahun pelajaran' },
    { id: 'per_siswa', title: '6. Laporan per Siswa', desc: 'Frekuensi dan durasi per individu siswa' },
    { id: 'per_kelas', title: '7. Laporan per Kelas', desc: 'Agregasi kasus keterlambatan antar rombel' },
    { id: 'per_jurusan', title: '8. Laporan per Jurusan', desc: 'Perbandingan 8 kompetensi keahlian' },
    { id: 'alasan', title: '9. Laporan Alasan Keterlambatan', desc: 'Distribusi alasan yang dilaporkan siswa' },
    { id: 'pembinaan', title: '10. Laporan Tindak Lanjut Pembinaan', desc: 'Rekam jejak konseling & pembinaan kesiswaan' },
    { id: 'leaderboard', title: '11. Laporan Peringkat Kedisiplinan', desc: 'Rasio kedisiplinan dan kategori zero keterlambatan' },
  ];

  // Filtered dataset for active report
  const filteredRecords = useMemo(() => {
    return scopedRecords.filter(r => {
      if (r.is_cancelled) return false;
      if (filterDept && r.department_code !== filterDept) return false;
      if (filterClass && r.class_name !== filterClass) return false;

      if (reportType === 'harian') {
        return r.event_date === selectedDate;
      }
      if (reportType === 'mingguan') {
        return isDateThisWeek(r.event_date);
      }
      if (reportType === 'bulanan') {
        return isDateThisMonth(r.event_date);
      }
      return true;
    });
  }, [scopedRecords, filterDept, filterClass, reportType, selectedDate]);

  // Handle Export CSV
  // Handle Export CSV Lengkap dengan Lembar Pengesahan Resmi (Kepsek & Waka Kesiswaan)
  const handleExportOfficialReport = () => {
    const rows = filteredRecords.map((r, i) => ({
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
      Status_Pembinaan: r.followup_status,
      Petugas_Pencatat: r.recorded_by_name,
    }));

    const periodLabel = reportType === 'harian' 
      ? formatIndonesianDate(selectedDate) 
      : `Tahun Ajaran ${settings.academic_year || '2024/2025'} (Semester ${settings.semester || 'Ganjil'})`;

    exportOfficialReportToCSV({
      filename: `Laporan_Resmi_${reportType}_SMESA_${getWIBTodayString()}`,
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
    const rows = filteredRecords.map((r, i) => ({
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
      Status_Pembinaan: r.followup_status,
      Petugas_Pencatat: r.recorded_by_name,
      Mengetahui_Kepala_Sekolah: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
      NIP_Kepala_Sekolah: settings.headmaster_nip || '196708211993031005',
      Waka_Kesiswaan: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
      NIP_Waka_Kesiswaan: settings.vice_headmaster_nip || '198604122010011012',
    }));

    exportToCSV(`Data_Keterlambatan_${reportType}_SMESA_${getWIBTodayString()}`, rows);
  };

  // Handle Print with School Letterhead
  const handlePrint = () => {
    window.print();
  };

  const currentReportTitle = reportOptions.find(r => r.id === reportType)?.title || 'Laporan Keterlambatan';

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
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          {reportType === 'harian' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Jurusan</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="">Semua Jurusan</option>
              {departments.map(d => (
                <option key={d.code} value={d.code}>{d.code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Kelas</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
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
          <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
            {currentReportTitle.toUpperCase()}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Aplikasi PATROL SMESA — Periode {reportType === 'harian' ? formatIndonesianDate(selectedDate) : `Tahun Ajaran ${settings.academic_year}`}
          </p>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-6 print:bg-white">
          <div>
            <span className="text-slate-500 block text-[10px]">Total Kasus:</span>
            <span className="font-extrabold text-slate-900">{filteredRecords.length} Transaksi</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Tanggal Cetak:</span>
            <span className="font-bold text-slate-800">{formatIndonesianDate(getWIBTodayString())}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Petugas Pencetak:</span>
            <span className="font-bold text-slate-800">{currentUser.full_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Status Data:</span>
            <span className="font-bold text-emerald-700">Terverifikasi Database</span>
          </div>
        </div>

        {/* Report Data Table */}
        <div className="overflow-x-auto mb-8">
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
                <th className="p-2 text-center">Status Pembinaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
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
                    <td className="p-2 text-center">
                      <span className="capitalize">{r.followup_status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-slate-400">
                    Tidak ada catatan keterlambatan untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
