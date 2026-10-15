import React, { useState } from 'react';
import { ShieldCheck, Search, Clock, User, Filter, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDateTime } from '../../utils/dateUtils';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = 
      log.user_name.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filterAction && log.action !== filterAction) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">TAMBAH</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">UBAH</span>;
      case 'CANCEL':
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">BATAL/HAPUS</span>;
      case 'VERIFY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">VERIFIKASI</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800">LOGIN</span>;
      case 'IMPORT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">IMPOR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Audit Log Aktivitas Sistem
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Jejak audit permanen pencatatan, perubahan data, pembatalan transaksi, dan pergantian peran
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas, nama pengguna, atau keterangan log..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
        >
          <option value="">Semua Jenis Aksi</option>
          <option value="CREATE">Tambah Data (CREATE)</option>
          <option value="UPDATE">Ubah Data (UPDATE)</option>
          <option value="CANCEL">Pembatalan (CANCEL)</option>
          <option value="VERIFY">Verifikasi (VERIFY)</option>
          <option value="LOGIN">Sesi Login (LOGIN)</option>
          <option value="IMPORT">Impor CSV (IMPORT)</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-44">Waktu (WIB)</th>
                <th className="px-4 py-3.5 w-32">Aksi</th>
                <th className="px-4 py-3.5 w-36">Modul</th>
                <th className="px-4 py-3.5">Detail Aktivitas</th>
                <th className="px-4 py-3.5">Pengguna</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatIndonesianDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {log.module}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{log.user_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{log.user_role.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
