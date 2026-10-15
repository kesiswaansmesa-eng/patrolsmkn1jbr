import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, ShieldAlert, Plus, Search, Calendar, 
  UserCheck, AlertTriangle, CheckCircle2, Lock, Eye, 
  FileText, Clock, ChevronRight, Save, User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CoachingRecord, FollowUpStatus, Student } from '../../types';
import { formatIndonesianDate, getWIBTodayString } from '../../utils/dateUtils';

export const CoachingView: React.FC = () => {
  const { 
    scopedRecords, scopedStudents, coachings, addCoaching, 
    updateCoachingStatus, currentUser, settings 
  } = useApp();

  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for new coaching
  const [coachingForm, setCoachingForm] = useState<{
    student_id: string;
    coaching_type: CoachingRecord['coaching_type'];
    target_improvement: string;
    evaluation_result: string;
    next_followup_date: string;
    status: FollowUpStatus;
    is_confidential: boolean;
  }>({
    student_id: '',
    coaching_type: 'konseling',
    target_improvement: '',
    evaluation_result: '',
    next_followup_date: '',
    status: 'dalam_pembinaan',
    is_confidential: false,
  });

  // Calculate repeat students (exceeding SP threshold)
  const studentsWithLateness = useMemo(() => {
    return scopedStudents.map(student => {
      const studentRecords = scopedRecords.filter(r => r.student_id === student.id && !r.is_cancelled);
      const totalCount = studentRecords.length;
      const totalMinutes = studentRecords.reduce((sum, r) => sum + r.late_duration_minutes, 0);
      const latestRecord = studentRecords[0];

      const studentCoachings = coachings.filter(c => c.student_id === student.id);

      return {
        ...student,
        totalCount,
        totalMinutes,
        latestRecord,
        coachings: studentCoachings,
        isWarningSp1: totalCount >= settings.warning_threshold_sp1,
        isWarningSp2: totalCount >= settings.warning_threshold_sp2,
      };
    }).filter(s => {
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        return s.full_name.toLowerCase().includes(q) || s.nis.includes(q) || s.class_name.toLowerCase().includes(q);
      }
      return s.totalCount > 0;
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [scopedStudents, scopedRecords, coachings, searchStudent, settings]);

  const activeStudentDetail = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentsWithLateness.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, studentsWithLateness]);

  const handleOpenAddModal = (studentId: string) => {
    setCoachingForm({
      student_id: studentId,
      coaching_type: 'konseling',
      target_improvement: '',
      evaluation_result: '',
      next_followup_date: '',
      status: 'dalam_pembinaan',
      is_confidential: false,
    });
    setShowAddModal(true);
  };

  const handleSubmitCoaching = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = scopedStudents.find(s => s.id === coachingForm.student_id);
    if (!student) return;

    await addCoaching({
      student_id: student.id,
      student_name: student.full_name,
      nis: student.nis,
      class_name: student.class_name,
      department_code: student.department_code,
      coaching_date: getWIBTodayString(),
      officer_id: currentUser.id,
      officer_name: currentUser.full_name,
      coaching_type: coachingForm.coaching_type,
      target_improvement: coachingForm.target_improvement,
      evaluation_result: coachingForm.evaluation_result || undefined,
      next_followup_date: coachingForm.next_followup_date || undefined,
      status: coachingForm.status,
      is_confidential: coachingForm.is_confidential,
    });

    setShowAddModal(false);
  };

  const canManageCoaching = currentUser.role === 'admin' || currentUser.role === 'tim_kesiswaan';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-blue-600" />
            Tracing & Tindak Lanjut Pembinaan Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan historis dan bimbingan kedisiplinan berbasis data objektif SMK Negeri 1 Jember
          </p>
        </div>

        {/* Warning Threshold Legend */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Ambang SP1: {settings.warning_threshold_sp1}x Terlambat
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            Ambang SP2: {settings.warning_threshold_sp2}x Terlambat
          </span>
        </div>
      </div>

      {/* Main Grid: Student List vs Student Tracing Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Student List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari siswa terlambat..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {studentsWithLateness.length > 0 ? (
              studentsWithLateness.map(std => {
                const isSelected = selectedStudentId === std.id;
                return (
                  <div
                    key={std.id}
                    onClick={() => setSelectedStudentId(std.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{std.full_name}</span>
                        {std.isWarningSp2 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">
                            SP2
                          </span>
                        ) : std.isWarningSp1 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white">
                            SP1
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        NIS: {std.nis} • <strong className="text-blue-700">{std.class_name}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-red-600 font-mono block">
                        {std.totalCount}x Terlambat
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {std.coachings.length}x Dibina
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Tidak ada siswa yang sesuai pencarian.
              </div>
            )}
          </div>
        </div>

        {/* Right: Tracing Dossier & History (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          {activeStudentDetail ? (
            <>
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {activeStudentDetail.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-slate-900">{activeStudentDetail.full_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                        {activeStudentDetail.class_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      NIS: <strong className="text-slate-700">{activeStudentDetail.nis}</strong> • Jurusan: {activeStudentDetail.department_code}
                    </p>
                  </div>
                </div>

                {canManageCoaching && (
                  <button
                    onClick={() => handleOpenAddModal(activeStudentDetail.id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Catatan Pembinaan
                  </button>
                )}
              </div>

              {/* Lateness History Timeline */}
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Riwayat Kejadian Keterlambatan ({activeStudentDetail.totalCount} Kasus)
                </h4>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {scopedRecords
                    .filter(r => r.student_id === activeStudentDetail.id && !r.is_cancelled)
                    .map((rec, i) => (
                      <div key={rec.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">
                            {formatIndonesianDate(rec.event_date)} ({rec.day_name})
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Alasan: <strong className="text-slate-700">{rec.reason_name}</strong>
                            {rec.notes && ` — "${rec.notes}"`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-red-600">+{rec.late_duration_minutes} Menit</span>
                          <span className="text-[10px] text-slate-400 block">Tiba {rec.arrival_time}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Coaching Records List */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  Rekam Jejak Pembinaan & Konseling ({activeStudentDetail.coachings.length})
                </h4>

                <div className="space-y-3">
                  {activeStudentDetail.coachings.length > 0 ? (
                    activeStudentDetail.coachings.map(c => {
                      if (c.is_confidential && currentUser.role !== 'admin' && currentUser.role !== 'tim_kesiswaan') {
                        return (
                          <div key={c.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-600" />
                            <span>Catatan konseling bersifat rahasia (hanya dapat dilihat Tim Kesiswaan/Admin).</span>
                          </div>
                        );
                      }

                      return (
                        <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-800 uppercase tracking-wide">
                              {c.coaching_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' :
                              c.status === 'dalam_pembinaan' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {c.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="text-slate-700">
                            <strong>Target Perbaikan:</strong> {c.target_improvement}
                          </div>

                          {c.evaluation_result && (
                            <div className="text-slate-600 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                              <strong>Evaluasi:</strong> {c.evaluation_result}
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                            <span>Petugas: {c.officer_name}</span>
                            <span>Tanggal: {formatIndonesianDate(c.coaching_date)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Belum ada catatan pembinaan tersimpan untuk siswa ini.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">Pilih Siswa untuk Melihat Dossier Pembinaan</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Klik salah satu siswa di panel sebelah kiri untuk memantau rekam jejak keterlambatan dan menambah pembinaan karakter.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Add Coaching Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Formulir Pembinaan Kedisiplinan Siswa
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCoaching} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bentuk Pembinaan <span className="text-red-500">*</span>
                </label>
                <select
                  value={coachingForm.coaching_type}
                  onChange={(e) => setCoachingForm(prev => ({ ...prev, coaching_type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                >
                  <option value="konseling">Konseling Individual</option>
                  <option value="refleksi_tertulis">Refleksi Tertulis / Pernyataan Disiplin</option>
                  <option value="pendampingan_wali_kelas">Pendampingan Wali Kelas</option>
                  <option value="komunikasi_orang_tua">Komunikasi / Pemanggilan Orang Tua/Wali</option>
                  <option value="pembinaan_karakter">Pembinaan Karakter & Lingkungan Sekolah</option>
                  <option value="surat_peringatan">Penerbitan Surat Peringatan (SP)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Perbaikan & Komitmen Siswa <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={coachingForm.target_improvement}
                  onChange={(e) => setCoachingForm(prev => ({ ...prev, target_improvement: e.target.value }))}
                  placeholder="Contoh: Siswa berkomitmen tidur maksimal pukul 22.00 WIB, berangkat bersama rekan, dan tidak terlambat lagi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hasil Evaluasi / Tindakan (Opsional)
                </label>
                <input
                  type="text"
                  value={coachingForm.evaluation_result}
                  onChange={(e) => setCoachingForm(prev => ({ ...prev, evaluation_result: e.target.value }))}
                  placeholder="Contoh: Siswa kooperatif dan orang tua telah dihubungi."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Penanganan</label>
                  <select
                    value={coachingForm.status}
                    onChange={(e) => setCoachingForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  >
                    <option value="dalam_pembinaan">Dalam Pembinaan</option>
                    <option value="dijadwalkan">Dijadwalkan Lanjutan</option>
                    <option value="selesai">Selesai Ditindaklanjuti</option>
                    <option value="dirujuk">Dirujuk Lanjutan (BK)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jadwal Evaluasi Berikutnya</label>
                  <input
                    type="date"
                    value={coachingForm.next_followup_date}
                    onChange={(e) => setCoachingForm(prev => ({ ...prev, next_followup_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={coachingForm.is_confidential}
                  onChange={(e) => setCoachingForm(prev => ({ ...prev, is_confidential: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="confidential" className="text-xs font-semibold text-slate-700">
                  Tandai sebagai Catatan Rahasia (Sensitif / Hanya Kesiswaan)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Simpan Pembinaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
