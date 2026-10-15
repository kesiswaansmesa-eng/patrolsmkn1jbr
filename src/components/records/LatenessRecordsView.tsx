import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, CheckCircle, XCircle, 
  AlertTriangle, Eye, ShieldCheck, Trash2, Calendar, 
  ArrowUpDown, FileSpreadsheet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LatenessRecord } from '../../types';
import { formatIndonesianDate, formatIndonesianDateTime } from '../../utils/dateUtils';
import { exportToCSV } from '../../utils/exportUtils';

export const LatenessRecordsView: React.FC = () => {
  const { 
    scopedRecords, departments, classes, reasons, currentUser, 
    verifyRecord, cancelRecord 
  } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVerification, setFilterVerification] = useState('');
  const [sortField, setSortField] = useState<'event_date' | 'late_duration_minutes' | 'student_name'>('event_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<LatenessRecord | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; record: LatenessRecord | null; reason: string }>({
    isOpen: false,
    record: null,
    reason: '',
  });

  // Filtered & Sorted Records
  const processedRecords = useMemo(() => {
    let result = scopedRecords.filter(r => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        r.student_name.toLowerCase().includes(search) ||
        r.nis.includes(search) ||
        r.class_name.toLowerCase().includes(search) ||
        (r.notes && r.notes.toLowerCase().includes(search));

      if (!matchSearch) return false;
      if (filterDept && r.department_code !== filterDept) return false;
      if (filterClass && r.class_name !== filterClass) return false;
      if (filterReason && r.reason_id !== filterReason) return false;
      if (filterStatus && r.followup_status !== filterStatus) return false;
      if (filterVerification && r.verification_status !== filterVerification) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'event_date') {
        comparison = a.event_date.localeCompare(b.event_date) || a.arrival_time.localeCompare(b.arrival_time);
      } else if (sortField === 'late_duration_minutes') {
        comparison = a.late_duration_minutes - b.late_duration_minutes;
      } else {
        comparison = a.student_name.localeCompare(b.student_name);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [scopedRecords, searchTerm, filterDept, filterClass, filterReason, filterStatus, filterVerification, sortField, sortOrder]);

  const totalPages = Math.ceil(processedRecords.length / pageSize) || 1;
  const paginatedRecords = processedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    const exportData = processedRecords.map(r => ({
      ID_Transaksi: r.id,
      Nama_Siswa: r.student_name,
      NIS: r.nis,
      NISN: r.nisn,
      Kelas: r.class_name,
      Jurusan: r.department_code,
      Tanggal: r.event_date,
      Hari: r.day_name,
      Jam_Masuk: r.scheduled_time,
      Jam_Kedatangan: r.arrival_time,
      Keterlambatan_Menit: r.late_duration_minutes,
      Alasan: r.reason_name,
      Keterangan: r.notes || '',
      Petugas: r.recorded_by_name,
      Waktu_Pencatatan: r.recorded_at,
      Verifikasi: r.verification_status,
      Status_Pembinaan: r.followup_status,
      Status_Batal: r.is_cancelled ? 'Ya' : 'Tidak',
      Alasan_Batal: r.cancellation_reason || '',
    }));

    exportToCSV(`Keterlambatan_SMESA_${new Date().toISOString().substring(0, 10)}`, exportData);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.record || !cancelModal.reason.trim()) {
      alert('Wajib mengisi alasan pembatalan transaksi.');
      return;
    }
    await cancelRecord(cancelModal.record.id, cancelModal.reason);
    setCancelModal({ isOpen: false, record: null, reason: '' });
  };

  const canCancel = currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan';
  const canVerify = currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Transaksi Keterlambatan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap seluruh rekam jejak keterlambatan siswa SMK Negeri 1 Jember
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV Excel
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama siswa, NIS, kelas, atau keterangan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Department */}
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
            >
              <option value="">Semua Jurusan</option>
              {departments.map(d => (
                <option key={d.code} value={d.code}>{d.code}</option>
              ))}
            </select>

            {/* Class */}
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Reason */}
            <select
              value={filterReason}
              onChange={(e) => { setFilterReason(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
            >
              <option value="">Semua Alasan</option>
              {reasons.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
            >
              <option value="">Semua Pembinaan</option>
              <option value="belum_ditindaklanjuti">Belum Ditindaklanjuti</option>
              <option value="dijadwalkan">Dijadwalkan</option>
              <option value="dalam_pembinaan">Dalam Pembinaan</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">
                  <button 
                    onClick={() => {
                      if (sortField === 'event_date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortField('event_date'); setSortOrder('desc'); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Tanggal & Waktu
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button 
                    onClick={() => {
                      if (sortField === 'student_name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortField('student_name'); setSortOrder('asc'); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Identitas Siswa
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Kelas / Jurusan</th>
                <th className="px-4 py-3.5">
                  <button 
                    onClick={() => {
                      if (sortField === 'late_duration_minutes') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortField('late_duration_minutes'); setSortOrder('desc'); }
                    }}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Durasi Terlambat
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Alasan Keterlambatan</th>
                <th className="px-4 py-3.5">Status Pembinaan</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map(record => {
                  const isCancelled = record.is_cancelled;
                  return (
                    <tr 
                      key={record.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'bg-red-50/40 opacity-70' : ''}`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{formatIndonesianDate(record.event_date)}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Tiba {record.arrival_time.substring(0, 5)} WIB ({record.day_name})
                        </span>
                        {isCancelled && (
                          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-black">
                            DIBATALKAN
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-sm">{record.student_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NIS: {record.nis}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-extrabold text-blue-700 block">{record.class_name}</span>
                        <span className="text-[10px] text-slate-500">{record.department_code}</span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-red-600 text-sm block">
                          +{record.late_duration_minutes} Menit
                        </span>
                        <span className="text-[10px] text-slate-400">Jadwal: {record.scheduled_time.substring(0, 5)} WIB</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">{record.reason_name}</span>
                        {record.notes && (
                          <span className="text-[10px] text-slate-500 italic block truncate max-w-xs">
                            "{record.notes}"
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold block w-fit ${
                          record.followup_status === 'selesai' ? 'bg-emerald-100 text-emerald-800' :
                          record.followup_status === 'dalam_pembinaan' ? 'bg-amber-100 text-amber-800' :
                          record.followup_status === 'dijadwalkan' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.followup_status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">
                          Oleh: {record.recorded_by_name.split(' ')[0]}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canVerify && record.verification_status === 'menunggu' && (
                            <button
                              onClick={() => verifyRecord(record.id, 'terverifikasi')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Verifikasi Transaksi"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {canCancel && !record.is_cancelled && (
                            <button
                              onClick={() => setCancelModal({ isOpen: true, record, reason: '' })}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Batalkan Transaksi (Audit)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">
                    Tidak ada transaksi keterlambatan yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan <strong className="text-slate-900">{processedRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> sampai{' '}
            <strong className="text-slate-900">{Math.min(currentPage * pageSize, processedRecords.length)}</strong> dari{' '}
            <strong className="text-slate-900">{processedRecords.length}</strong> transaksi
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  ID: {selectedRecord.id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Detail Transaksi Keterlambatan</h3>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Nama Siswa:</span>
                <span className="font-extrabold text-slate-900">{selectedRecord.student_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">NIS / NISN:</span>
                <span className="font-mono font-bold text-slate-800">{selectedRecord.nis} / {selectedRecord.nisn}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kelas & Jurusan:</span>
                <span className="font-bold text-blue-700">{selectedRecord.class_name} ({selectedRecord.department_code})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hari & Tanggal:</span>
                <span className="font-bold text-slate-800">{selectedRecord.day_name}, {formatIndonesianDate(selectedRecord.event_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Waktu Kedatangan:</span>
                <span className="font-bold text-red-600 font-mono text-sm">{selectedRecord.arrival_time} WIB</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Durasi Terlambat:</span>
                <span className="font-black text-red-600 font-mono text-sm">{selectedRecord.late_duration_minutes} Menit</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">Alasan Dilaporkan:</span>
                <span className="font-bold text-slate-900">{selectedRecord.reason_name}</span>
              </div>
              {selectedRecord.notes && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Keterangan Tambahan:</span>
                  <span className="text-slate-700 italic">"{selectedRecord.notes}"</span>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px]">Petugas Pencatat:</span>
                <span className="font-semibold text-slate-800">{selectedRecord.recorded_by_name}</span>
                <span className="text-[10px] text-slate-400 block">Tercatat: {formatIndonesianDateTime(selectedRecord.recorded_at)}</span>
              </div>

              {selectedRecord.is_cancelled && (
                <div className="col-span-2 p-3 bg-red-100/70 border border-red-200 rounded-lg text-red-900">
                  <span className="font-bold block text-xs">Informasi Pembatalan:</span>
                  <p className="text-[11px] mt-0.5">Alasan: {selectedRecord.cancellation_reason}</p>
                  <p className="text-[10px] text-red-700 mt-0.5">Dibatalkan oleh: {selectedRecord.cancelled_by_name} pada {formatIndonesianDateTime(selectedRecord.cancelled_at || '')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Record Modal (Soft Delete with Audit) */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-center font-black text-slate-900 text-base">
              Batalkan Transaksi Keterlambatan
            </h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Transaksi tidak dihapus permanen melainkan ditandai "Dibatalkan" dengan jejak audit demi akuntabilitas sekolah.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelModal.reason}
                onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Contoh: Salah pilih nama siswa saat piket pagi, siswa sebenarnya hadir izin dispensasi lomba..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-red-600"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCancelModal({ isOpen: false, record: null, reason: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Konfirmasi Pembatalan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
