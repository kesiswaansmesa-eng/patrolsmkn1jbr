import React from 'react';
import { Building2, Award, Users, School, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DepartmentsView: React.FC = () => {
  const { departments, classes, students } = useApp();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Kompetensi Keahlian (SMK Negeri 1 Jember)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          8 Jurusan kejuruan resmi di SMK Negeri 1 Jember beserta Ketua Kompetensi Keahlian (KKK)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept, index) => {
          const deptClasses = classes.filter(c => c.department_id === dept.id || c.department_code === dept.code);
          const deptStudents = students.filter(s => s.department_id === dept.id || s.department_code === dept.code);

          return (
            <div 
              key={dept.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-100">
                      {dept.code}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Program Keahlian #{index + 1}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        {dept.name}
                      </h3>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Aktif
                  </span>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-400 block text-[10px]">Ketua Kompetensi Keahlian (KKK):</span>
                  <span className="font-bold text-slate-900">{dept.head_name || 'Ketua Jurusan'}</span>
                  {dept.head_nip && (
                    <span className="block text-[10px] text-slate-500 font-mono">NIP: {dept.head_nip}</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-bold">
                <span className="flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-blue-600" />
                  {deptClasses.length} Rombel Kelas
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {deptStudents.length || dept.total_students} Siswa Terdaftar
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
