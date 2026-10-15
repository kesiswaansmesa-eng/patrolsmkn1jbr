import React, { useState } from 'react';
import { UserCog, ShieldCheck, Mail, Plus, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole } from '../../types';

export const UsersView: React.FC = () => {
  const { users, classes, departments, currentUser } = useApp();
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">Administrator</span>;
      case 'kepala_sekolah':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">Kepala Sekolah</span>;
      case 'tim_kesiswaan':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">Tim Kesiswaan</span>;
      case 'kkk':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">Ketua Jurusan (KKK)</span>;
      case 'wali_kelas':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800">Wali Kelas</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <UserCog className="w-6 h-6 text-blue-600" />
          Manajemen Pengguna & Hak Akses (RBAC)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pengaturan 5 peran akun sekolah: Admin, Kepala Sekolah, Tim Kesiswaan, KKK, dan Wali Kelas
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna berdasarkan nama, email, atau peran..."
            className="w-full sm:w-80 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
          />
          <div className="text-xs text-slate-500">
            Total Terdaftar: <strong className="text-slate-800">{users.length} Akun</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Nama Lengkap & NIP</th>
                <th className="px-4 py-3.5">Email / Login</th>
                <th className="px-4 py-3.5">Peran (Role)</th>
                <th className="px-4 py-3.5">Tugas Khusus / Scope</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => {
                const assignedClass = classes.find(c => c.id === user.assigned_class_id);
                const assignedDept = departments.find(d => d.id === user.assigned_department_id);

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">{user.full_name}</div>
                      {user.nip && (
                        <div className="text-[10px] text-slate-500 font-mono">NIP: {user.nip}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {user.email}
                    </td>
                    <td className="px-4 py-3.5">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {user.role === 'admin' && <span className="text-purple-700 font-semibold">Seluruh Sistem</span>}
                      {user.role === 'kepala_sekolah' && <span className="text-blue-700 font-semibold">Seluruh Sekolah (Read-Only)</span>}
                      {user.role === 'tim_kesiswaan' && <span className="text-emerald-700 font-semibold">Ketertiban Gerbang & Kesiswaan</span>}
                      {user.role === 'kkk' && <span className="text-amber-700 font-semibold">{assignedDept ? `${assignedDept.code} - ${assignedDept.name}` : 'Jurusan DKV'}</span>}
                      {user.role === 'wali_kelas' && <span className="text-cyan-700 font-semibold">{assignedClass ? assignedClass.name : 'Kelas X DKV 1'}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
