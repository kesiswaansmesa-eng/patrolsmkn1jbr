import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Search, Filter, Download, Upload, 
  Trash2, Edit3, CheckCircle, AlertTriangle, FileSpreadsheet, X 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { exportToCSV, downloadCSVTemplate } from '../../utils/exportUtils';

export const StudentsView: React.FC = () => {
  const { 
    scopedStudents, classes, departments, addStudent, 
    updateStudent, deleteStudent, importStudentsCSV, currentUser 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Student Form State
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    full_name: '',
    gender: 'L' as 'L' | 'P',
    class_id: '',
    phone_parent: '',
    address: '',
    status: 'active' as Student['status'],
  });

  const filteredStudents = useMemo(() => {
    return scopedStudents.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = s.full_name.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q);
      if (!matchSearch) return false;
      if (filterClass && s.class_name !== filterClass) return false;
      if (filterDept && s.department_code !== filterDept) return false;
      return true;
    });
  }, [scopedStudents, search, filterClass, filterDept]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nis: '',
      nisn: '',
      full_name: '',
      gender: 'L',
      class_id: classes[0]?.id || '',
      phone_parent: '',
      address: '',
      status: 'active',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      nis: s.nis,
      nisn: s.nisn,
      full_name: s.full_name,
      gender: s.gender,
      class_id: s.class_id,
      phone_parent: s.phone_parent || '',
      address: s.address || '',
      status: s.status,
    });
    setShowAddModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cls = classes.find(c => c.id === formData.class_id);
    if (!cls) {
      alert('Pilih kelas siswa.');
      return;
    }

    if (editingStudent) {
      await updateStudent(editingStudent.id, {
        ...formData,
        class_name: cls.name,
        department_id: cls.department_id,
        department_code: cls.department_code,
      });
    } else {
      await addStudent({
        nis: formData.nis,
        nisn: formData.nisn,
        full_name: formData.full_name,
        gender: formData.gender,
        class_id: cls.id,
        class_name: cls.name,
        department_id: cls.department_id,
        department_code: cls.department_code,
        academic_year: '2024/2025',
        phone_parent: formData.phone_parent,
        address: formData.address,
        status: formData.status,
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus data siswa ${name}? Tindakan ini akan dicatat pada audit log.`)) {
      await deleteStudent(id);
    }
  };

  // CSV File Handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('File CSV kosong atau format tidak sesuai.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length >= 3) {
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          parsed.push(rowObj);
        }
      }

      setImportPreview(parsed);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    const studentsToImport: any[] = [];

    importPreview.forEach(item => {
      const nis = item.nis || item.nisn || '';
      const full_name = item.nama_lengkap || item.nama || item.name || '';
      const className = item.nama_kelas || item.kelas || 'X DKV 1';
      const deptCode = item.kode_jurusan || item.jurusan || 'DKV';

      const foundClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase()) || classes[0];

      if (nis && full_name) {
        studentsToImport.push({
          nis,
          nisn: item.nisn || nis,
          full_name,
          gender: (item.jenis_kelamin?.toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P',
          class_id: foundClass.id,
          class_name: foundClass.name,
          department_id: foundClass.department_id,
          department_code: deptCode,
          academic_year: item.tahun_ajaran || '2024/2025',
          status: 'active',
          phone_parent: item.telepon_orang_tua || '',
          address: item.alamat || '',
        });
      }
    });

    const result = await importStudentsCSV(studentsToImport);
    alert(`Impor selesai! Berhasil menambahkan ${result.count} siswa. Duplikat diabaikan: ${result.duplicates}`);
    setShowImportModal(false);
    setImportPreview([]);
  };

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Data Master Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database siswa terdaftar SMK Negeri 1 Jember ({filteredStudents.length} siswa)
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadCSVTemplate('siswa')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Template CSV
            </button>

            <label className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Impor CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa, NIS, atau NISN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
          >
            <option value="">Semua Jurusan</option>
            {departments.map(d => (
              <option key={d.code} value={d.code}>{d.code}</option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">NIS / NISN</th>
                <th className="px-4 py-3.5">Nama Lengkap</th>
                <th className="px-4 py-3.5 text-center">L/P</th>
                <th className="px-4 py-3.5">Kelas</th>
                <th className="px-4 py-3.5">Jurusan</th>
                <th className="px-4 py-3.5">No. Telepon Ortu</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                {canEdit && <th className="px-4 py-3.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-800">
                      {student.nis}
                      <span className="block text-[10px] text-slate-400 font-normal">NISN: {student.nisn}</span>
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">
                      {student.full_name}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                      {student.gender}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-700">
                      {student.class_name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {student.department_code}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                      {student.phone_parent || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        student.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id, student.full_name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-400">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIS <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData(prev => ({ ...prev, nis: e.target.value }))}
                    placeholder="Contoh: 24001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NISN <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.nisn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value }))}
                    placeholder="Contoh: 0071234501"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Masukkan nama lengkap siswa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas <span className="text-red-500">*</span></label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, class_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.department_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telepon Ortu / Wali</label>
                  <input
                    type="text"
                    value={formData.phone_parent}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_parent: e.target.value }))}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Siswa</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingStudent ? 'Perbarui Data' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Pratinjau Impor CSV ({importPreview.length} Baris Data)
                </h3>
                <p className="text-xs text-slate-500">
                  Verifikasi kolom sebelum dimasukkan ke database siswa
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2">NIS</th>
                    <th className="p-2">Nama</th>
                    <th className="p-2">Kelas</th>
                    <th className="p-2">Jurusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono">{row.nis || row.nisn}</td>
                      <td className="p-2 font-bold">{row.nama_lengkap || row.nama}</td>
                      <td className="p-2">{row.nama_kelas || row.kelas}</td>
                      <td className="p-2">{row.kode_jurusan || row.jurusan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
              >
                Konfirmasi & Masukkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
