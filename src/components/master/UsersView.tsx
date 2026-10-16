import React, { useState } from 'react';
import { 
  UserCog, ShieldCheck, Mail, Plus, CheckCircle2, AlertCircle, 
  Edit3, Trash2, KeyRound, Lock, Eye, EyeOff, Search, 
  Users, School, Building2, Clock, Award, HeartHandshake,
  Check, X, Sparkles, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserProfile, UserRole } from '../../types';

export const UsersView: React.FC = () => {
  const { 
    users, classes, departments, currentUser, 
    addUser, updateUser, deleteUser, isSupabaseConnected 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Visibility map for passwords in table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('petugas_piket');
  const [formPassword, setFormPassword] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('petugas_piket');
    setFormPassword('smesa123');
    setFormNip('');
    setFormDepartmentId(departments[0]?.id || '');
    setFormClassId(classes[0]?.id || '');
    setFormStatus('active');
    setShowFormPassword(false);
    setFeedback(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFormName(user.full_name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormPassword(user.password || 'smesa123');
    setFormNip(user.nip || '');
    setFormDepartmentId(user.assigned_department_id || '');
    setFormClassId(user.assigned_class_id || '');
    setFormStatus(user.status);
    setShowFormPassword(false);
    setFeedback(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFeedback(null);
    setIsDeleteModalOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789!@#$';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(result);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFeedback({ type: 'error', message: 'Nama lengkap, email, dan password wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await addUser({
      full_name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      password: formPassword.trim(),
      nip: formNip.trim() || undefined,
      assigned_department_id: (formRole === 'kkk' || formRole === 'wali_kelas') ? formDepartmentId : undefined,
      assigned_class_id: formRole === 'wali_kelas' ? formClassId : undefined,
      status: formStatus,
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        setIsAddModalOpen(false);
      }, 700);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFeedback({ type: 'error', message: 'Nama lengkap, email, dan password wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await updateUser(selectedUser.id, {
      full_name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      password: formPassword.trim(),
      nip: formNip.trim() || undefined,
      assigned_department_id: (formRole === 'kkk' || formRole === 'wali_kelas') ? formDepartmentId : undefined,
      assigned_class_id: formRole === 'wali_kelas' ? formClassId : undefined,
      status: formStatus,
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 700);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setFeedback(null);

    const result = await deleteUser(selectedUser.id);
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        setIsDeleteModalOpen(false);
      }, 600);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      (u.nip && u.nip.includes(search));

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-700" />
            Administrator
          </span>
        );
      case 'petugas_piket':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-700" />
            Petugas Piket
          </span>
        );
      case 'kepala_sekolah':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
            <Award className="w-3 h-3 text-blue-700" />
            Kepala Sekolah
          </span>
        );
      case 'tim_kesiswaan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
            <HeartHandshake className="w-3 h-3 text-emerald-700" />
            Tim Kesiswaan
          </span>
        );
      case 'kkk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-900 border border-teal-200">
            <Building2 className="w-3 h-3 text-teal-700" />
            Ketua Jurusan (KKK)
          </span>
        );
      case 'wali_kelas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-900 border border-cyan-200">
            <Users className="w-3 h-3 text-cyan-700" />
            Wali Kelas
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manajemen Pengguna & Master Data Akun (RBAC)
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pengaturan hak akses 6 peran resmi SMK Negeri 1 Jember, konfigurasi password login akun, serta menu edit dan hapus.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Info Card - Password Information */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0 mt-0.5">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
            <span>Kebijakan Password Login Depan</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold uppercase">Wajib Password</span>
          </h4>
          <p className="text-amber-800 leading-relaxed font-medium">
            Pada halaman login depan, pengguna <strong>tidak dapat langsung masuk otomatis</strong>. Setiap pengguna wajib memasukkan password yang diset oleh Administrator di halaman master data akun ini. Anda dapat mengedit password akun mana saja melalui tombol <strong>Edit</strong> di bawah.
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls (Search & Role Filter) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email login, NIP, atau peran..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Total Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              <span>Total Terdaftar:</span>
              <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{filteredUsers.length} Akun</span>
            </div>
          </div>

          {/* Filter Pills by Role */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex-shrink-0">Filter:</span>
            {[
              { id: 'all', label: 'Semua Peran' },
              { id: 'admin', label: 'Administrator' },
              { id: 'petugas_piket', label: 'Petugas Piket' },
              { id: 'kkk', label: 'KKK (Ketua Jurusan)' },
              { id: 'wali_kelas', label: 'Wali Kelas' },
              { id: 'kepala_sekolah', label: 'Kepala Sekolah' },
              { id: 'tim_kesiswaan', label: 'Tim Kesiswaan' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRoleFilter(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                  selectedRoleFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Nama Pejabat / Pengguna</th>
                <th className="px-5 py-3.5">Email / Akun Login</th>
                <th className="px-5 py-3.5">Peran (Role)</th>
                <th className="px-5 py-3.5">Password Login (Diset Admin)</th>
                <th className="px-5 py-3.5">Scope / Tugas Khusus</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi (Edit / Hapus)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada akun yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const assignedClass = classes.find(c => c.id === user.assigned_class_id);
                  const assignedDept = departments.find(d => d.id === user.assigned_department_id);
                  const isCurrentUser = currentUser.id === user.id;
                  const isPasswordVisible = visiblePasswords[user.id] || false;
                  const currentPassword = user.password || 'smesa123';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & NIP */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-extrabold flex items-center justify-center text-xs shadow-inner flex-shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{user.full_name}</span>
                              {isCurrentUser && (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.2 rounded-sm border border-blue-200">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {user.nip ? `NIP: ${user.nip}` : 'NIP: (Belum diset)'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Password in Table */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 font-mono text-xs">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">
                            {isPasswordVisible ? currentPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer ml-1"
                            title={isPasswordVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Scope */}
                      <td className="px-5 py-4 text-xs">
                        {user.role === 'admin' && (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            Akses Penuh Sistem & Master Data
                          </span>
                        )}
                        {user.role === 'petugas_piket' && (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            Piket Gerbang Utama & Cetak SIM
                          </span>
                        )}
                        {user.role === 'kepala_sekolah' && (
                          <span className="text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            Monitoring Eksekutif & Laporan Sekolah
                          </span>
                        )}
                        {user.role === 'tim_kesiswaan' && (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Kedisiplinan, Tracing SP & Konseling
                          </span>
                        )}
                        {user.role === 'kkk' && (
                          <span className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                            {assignedDept ? `Jurusan ${assignedDept.code} - ${assignedDept.name}` : 'Jurusan DKV'}
                          </span>
                        )}
                        {user.role === 'wali_kelas' && (
                          <span className="text-cyan-800 font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                            {assignedClass ? `Binaan: ${assignedClass.name}` : 'Binaan: Kelas X DKV 1'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit & Hapus */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-200"
                            title="Edit Akun & Ubah Password"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleOpenDeleteModal(user)}
                            disabled={isCurrentUser}
                            className={`p-2 rounded-xl transition-all cursor-pointer border ${
                              isCurrentUser 
                                ? 'text-slate-300 border-transparent cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200'
                            }`}
                            title={isCurrentUser ? 'Tidak dapat menghapus akun Anda sendiri' : 'Hapus Akun'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Pengguna Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Tambah Pengguna Baru</h3>
                  <p className="text-xs text-blue-100">Buat akun baru dan tentukan password login akun</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi, S.Pd."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 198503202009021004"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username Login *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@smkn1jember.sch.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peran (Role Akses) *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="petugas_piket">Petugas Piket Gerbang</option>
                    <option value="admin">Administrator (Hak Akses Penuh)</option>
                    <option value="kkk">Ketua Jurusan (KKK)</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="tim_kesiswaan">Tim Kesiswaan</option>
                  </select>
                </div>
              </div>

              {/* Password Setting Section (Mandatory requirement) */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Password Login Akun * (Wajib Diset)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] font-extrabold text-amber-800 hover:text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    Acak Password
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Masukkan password akun..."
                    className="w-full pl-3 pr-10 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  Password ini yang <strong>wajib dimasukkan oleh pengguna saat login</strong> di halaman depan.
                </p>
              </div>

              {/* Dynamic Assignment based on role */}
              {formRole === 'kkk' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan yang Diketuai *</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formRole === 'wali_kelas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan</label>
                    <select
                      value={formDepartmentId}
                      onChange={(e) => setFormDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Binaan</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-blue-600"
                    />
                    <span>Aktif (Dapat Login)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-rose-600"
                    />
                    <span>Nonaktif (Blokir Akses)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Pengguna & Set Password */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Edit Akun & Password Pengguna</h3>
                  <p className="text-xs text-blue-100">Perbarui profil dan atur password login untuk {selectedUser.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 198503202009021004"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username Login *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peran (Role Akses) *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="petugas_piket">Petugas Piket Gerbang</option>
                    <option value="admin">Administrator (Hak Akses Penuh)</option>
                    <option value="kkk">Ketua Jurusan (KKK)</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="tim_kesiswaan">Tim Kesiswaan</option>
                  </select>
                </div>
              </div>

              {/* Password Setting Section (Mandatory requirement) */}
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>Set / Ganti Password Login Akun *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-300 transition-colors cursor-pointer"
                  >
                    Acak Password
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Set password akun..."
                    className="w-full pl-3 pr-10 py-2 bg-white border border-amber-400 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  Simpan password ini untuk diberikan kepada pengguna bersangkutan. Pengguna <strong>wajib mengetik password ini</strong> di halaman login depan untuk dapat masuk.
                </p>
              </div>

              {/* Dynamic Assignment based on role */}
              {formRole === 'kkk' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan yang Diketuai *</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formRole === 'wali_kelas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jurusan</label>
                    <select
                      value={formDepartmentId}
                      onChange={(e) => setFormDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Binaan</label>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status_edit"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-blue-600"
                    />
                    <span>Aktif (Dapat Login)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status_edit"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-rose-600"
                    />
                    <span>Nonaktif (Blokir Akses)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Perbarui Akun & Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Pengguna */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base text-white">Konfirmasi Hapus Akun</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {feedback && (
                <div className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus akun pengguna berikut dari sistem sekolah?
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="font-black text-slate-900 text-sm">{selectedUser.full_name}</div>
                <div className="text-xs text-slate-500 font-mono">{selectedUser.email}</div>
                <div className="pt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                Tindakan ini permanen. Akun ini tidak akan dapat login lagi ke sistem.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Ya, Hapus Akun</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
