import React, { useState } from 'react';
import { 
  School, Plus, Search, Edit3, Users, Download, Upload, 
  Trash2, FileSpreadsheet, CheckCircle, AlertTriangle, X 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClassRoom } from '../../types';
import { exportToCSV, downloadCSVTemplate } from '../../utils/exportUtils';

export const ClassesView: React.FC = () => {
  const { 
    classes, departments, students, addClass, updateClass, 
    deleteClass, importClassesCSV, currentUser 
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    grade_level: 'X' as 'X' | 'XI' | 'XII',
    department_id: departments[0]?.id || '',
    homeroom_teacher_name: '',
    academic_year: '2024/2025',
  });

  const filteredClasses = classes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) ||
                        c.code.toLowerCase().includes(q) ||
                        c.department_code.toLowerCase().includes(q) ||
                        (c.homeroom_teacher_name && c.homeroom_teacher_name.toLowerCase().includes(q));
    if (!matchSearch) return false;
    if (filterDept && c.department_code !== filterDept) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      code: '',
      name: '',
      grade_level: 'X',
      department_id: departments[0]?.id || '',
      homeroom_teacher_name: '',
      academic_year: '2024/2025',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: ClassRoom) => {
    setEditingClass(c);
    setFormData({
      code: c.code,
      name: c.name,
      grade_level: c.grade_level,
      department_id: c.department_id,
      homeroom_teacher_name: c.homeroom_teacher_name || '',
      academic_year: c.academic_year,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find(d => d.id === formData.department_id);
    if (!dept) return;

    if (editingClass) {
      await updateClass(editingClass.id, {
        ...formData,
        department_code: dept.code,
      });
    } else {
      await addClass({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        grade_level: formData.grade_level,
        department_id: dept.id,
        department_code: dept.code,
        homeroom_teacher_name: formData.homeroom_teacher_name.trim(),
        academic_year: formData.academic_year,
      });
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const studentCount = students.filter(s => s.class_id === id || s.class_name === name).length;
    if (studentCount > 0) {
      alert(`Tidak dapat menghapus kelas ${name} karena masih memiliki ${studentCount} siswa terdaftar.`);
      return;
    }
    if (confirm(`Yakin ingin menghapus kelas ${name}?`)) {
      await deleteClass(id);
    }
  };

  // Export Classes to CSV / Excel
  const handleExportClasses = () => {
    const exportData = filteredClasses.map((c, idx) => {
      const studentCount = students.filter(s => s.class_id === c.id || s.class_name === c.name).length;
      return {
        No: idx + 1,
        Kode_Kelas: c.code,
        Nama_Kelas: c.name,
        Tingkat: c.grade_level,
        Kode_Jurusan: c.department_code,
        Nama_Wali_Kelas: c.homeroom_teacher_name || 'Belum Ditugaskan',
        Tahun_Ajaran: c.academic_year,
        Jumlah_Siswa: studentCount,
      };
    });

    exportToCSV(`Data_Kelas_SMESA_${new Date().toISOString().substring(0, 10)}`, exportData);
  };

  // CSV Import File Handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('File CSV kosong atau format header tidak sesuai.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length >= 2) {
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
    e.target.value = ''; // reset file input
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    const classesToImport: Array<Omit<ClassRoom, 'id'>> = [];

    importPreview.forEach(item => {
      const code = item.kode_kelas || item.kode || item.code || '';
      const name = item.nama_kelas || item.nama || item.name || code;
      const rawGrade = (item.tingkat || item.grade || 'X').toUpperCase();
      const grade_level = (rawGrade === 'XI' ? 'XI' : rawGrade === 'XII' ? 'XII' : 'X') as 'X' | 'XI' | 'XII';
      const deptCode = (item.kode_jurusan || item.jurusan || 'DKV').toUpperCase();
      const homeroomTeacher = item.nama_wali_kelas || item.wali_kelas || item.wali || '';
      const academicYear = item.tahun_ajaran || '2024/2025';

      const foundDept = departments.find(d => d.code.toUpperCase() === deptCode) || departments[0];

      if (code && name) {
        classesToImport.push({
          code: code.toUpperCase(),
          name,
          grade_level,
          department_id: foundDept.id,
          department_code: foundDept.code,
          homeroom_teacher_name: homeroomTeacher,
          academic_year: academicYear,
        });
      }
    });

    const result = await importClassesCSV(classesToImport);
    alert(`Impor data kelas selesai! Berhasil menambahkan ${result.count} kelas rombel. Duplikat diabaikan: ${result.duplicates}`);
    setShowImportModal(false);
    setImportPreview([]);
  };

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-blue-600" />
            Data Kelas Rombongan Belajar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kelas aktif SMK Negeri 1 Jember ({filteredClasses.length} rombel)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template Button */}
          <button
            onClick={() => downloadCSVTemplate('kelas')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Unduh format file template CSV/Excel untuk impor kelas"
          >
            <Download className="w-3.5 h-3.5" />
            Template Excel/CSV
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportClasses}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh seluruh data kelas ke format Excel CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ekspor Excel
          </button>

          {/* Import Button */}
          {canEdit && (
            <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Impor Excel/CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          )}

          {/* Add Class Button */}
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Kelas
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kelas (contoh: X DKV 1, XI AK 1, nama wali kelas)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-600"
          />
        </div>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">Semua Jurusan</option>
          {departments.map(d => (
            <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
          ))}
        </select>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length > 0 ? (
          filteredClasses.map(cls => {
            const studentCount = students.filter(s => s.class_id === cls.id || s.class_name === cls.name).length;
            return (
              <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                      {cls.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      Tingkat {cls.grade_level}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-2">{cls.name}</h3>
                  <p className="text-xs font-semibold text-blue-700">{cls.department_code}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <p className="text-[11px] text-slate-400">Wali Kelas:</p>
                    <p className="font-bold text-slate-800">{cls.homeroom_teacher_name || 'Belum Ditugaskan'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {studentCount} Siswa
                  </span>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Kelas"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id, cls.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Tidak ada rombongan belajar yang sesuai pencarian.
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editingClass ? 'Edit Rombongan Belajar' : 'Tambah Kelas Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Contoh: X-DKV-1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: X DKV 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade_level: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jurusan</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Wali Kelas</label>
                <input
                  type="text"
                  value={formData.homeroom_teacher_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, homeroom_teacher_name: e.target.value }))}
                  placeholder="Nama Lengkap & Gelar Guru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  {editingClass ? 'Perbarui Kelas' : 'Simpan Kelas'}
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
                  Pratinjau Impor Data Kelas ({importPreview.length} Baris Data)
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kolom kode, nama rombel, jurusan, dan wali kelas sebelum disimpan
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2">Kode Kelas</th>
                    <th className="p-2">Nama Kelas</th>
                    <th className="p-2">Tingkat</th>
                    <th className="p-2">Jurusan</th>
                    <th className="p-2">Wali Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-slate-900">{row.kode_kelas || row.code}</td>
                      <td className="p-2 font-extrabold text-blue-700">{row.nama_kelas || row.name}</td>
                      <td className="p-2 font-bold">{row.tingkat || row.grade || 'X'}</td>
                      <td className="p-2">{row.kode_jurusan || row.jurusan || 'DKV'}</td>
                      <td className="p-2 text-slate-600">{row.nama_wali_kelas || row.wali_kelas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                Konfirmasi & Masukkan Data Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
