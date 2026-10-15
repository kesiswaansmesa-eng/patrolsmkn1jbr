import React, { useState } from 'react';
import { 
  Settings, Database, Key, CheckCircle, Copy, 
  ExternalLink, RotateCcw, Save, ShieldAlert, Code2, AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { setCustomSupabaseConfig, clearCustomSupabaseConfig } from '../../lib/supabaseClient';

export const SettingsView: React.FC = () => {
  const { 
    settings, updateSettings, isSupabaseConnected, 
    supabaseUrl, resetToDemoData, currentUser 
  } = useApp();

  // Supabase Config Form
  const [urlInput, setUrlInput] = useState(supabaseUrl || '');
  const [keyInput, setKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // App Settings Form
  const [appForm, setAppForm] = useState({
    school_name: settings.school_name,
    default_start_time: settings.default_start_time,
    academic_year: settings.academic_year,
    semester: settings.semester,
    warning_threshold_sp1: settings.warning_threshold_sp1,
    warning_threshold_sp2: settings.warning_threshold_sp2,
  });

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      alert('Harap isi Project URL dan Anon Key Supabase.');
      return;
    }
    setCustomSupabaseConfig(urlInput.trim(), keyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClearSupabase = () => {
    if (confirm('Lepaskan koneksi Supabase kustom dan kembali ke Mode Demo Lokal?')) {
      clearCustomSupabaseConfig();
      window.location.reload();
    }
  };

  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      school_name: appForm.school_name,
      default_start_time: appForm.default_start_time,
      academic_year: appForm.academic_year,
      semester: appForm.semester as any,
      warning_threshold_sp1: Number(appForm.warning_threshold_sp1),
      warning_threshold_sp2: Number(appForm.warning_threshold_sp2),
    });
    alert('Pengaturan sekolah berhasil diperbarui.');
  };

  const sqlSampleSnippet = `-- Jalankan SQL ini pada SQL Editor di Supabase Dashboard Anda:
-- Silakan salin skrip lengkap dari file: /src/db/supabase_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'wali_kelas',
  assigned_department_id UUID,
  assigned_class_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lateness_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  nis TEXT NOT NULL,
  class_name TEXT NOT NULL,
  department_code TEXT NOT NULL,
  event_date DATE NOT NULL,
  arrival_time TIME NOT NULL,
  late_duration_minutes INT NOT NULL,
  reason_name TEXT NOT NULL,
  followup_status TEXT DEFAULT 'belum_ditindaklanjuti',
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lateness_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Terverifikasi" ON public.lateness_records FOR ALL TO authenticated USING (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSampleSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Pengaturan Aplikasi & Konfigurasi Supabase
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola database backend Supabase, ambang batas pembinaan, dan jadwal sekolah
        </p>
      </div>

      {/* Supabase Connection Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
              isSupabaseConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Status Koneksi Supabase PostgreSQL
              </h3>
              <p className="text-xs text-slate-500">
                {isSupabaseConnected 
                  ? `Terhubung aktif ke: ${supabaseUrl}`
                  : 'Mode Demo Offline (Data disimpan aman di browser state & siap dihubungkan ke Supabase Live)'}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-black self-start sm:self-auto ${
            isSupabaseConnected 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {isSupabaseConnected ? 'SUPABASE LIVE ACTIVE' : 'MODE DEMO / OFFLINE'}
          </span>
        </div>

        {/* Input credentials */}
        <form onSubmit={handleSaveSupabase} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dapat ditemukan di Supabase Dashboard → <strong>Project Settings → API → Project API Keys</strong> (anon/public).
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan & Hubungkan ke Supabase
            </button>
            {isSupabaseConnected && (
              <button
                type="button"
                onClick={handleClearSupabase}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Putuskan Koneksi Kustom
              </button>
            )}
          </div>
        </form>

        {/* SQL Migration Script Box */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-blue-600" />
              Skema Tabel & RLS Migration (supabase_schema.sql)
            </span>
            <button
              onClick={handleCopySql}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedSql ? 'Tersalin!' : 'Salin Contoh SQL'}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
            {sqlSampleSnippet}
          </pre>
          <p className="text-[11px] text-slate-500 mt-1.5">
            File skrip DDL lengkap dengan 15 tabel dan RLS 5 peran tersedia pada <code>/src/db/supabase_schema.sql</code>.
          </p>
        </div>
      </div>

      {/* School Parameters Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">
          Konfigurasi Aturan & Ambang Batas Sekolah
        </h3>

        <form onSubmit={handleSaveAppSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Instansi Sekolah</label>
              <input
                type="text"
                value={appForm.school_name}
                onChange={(e) => setAppForm(prev => ({ ...prev, school_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Jam Masuk Default (WIB)</label>
              <input
                type="time"
                value={appForm.default_start_time}
                onChange={(e) => setAppForm(prev => ({ ...prev, default_start_time: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
              <input
                type="text"
                value={appForm.academic_year}
                onChange={(e) => setAppForm(prev => ({ ...prev, academic_year: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Semester</label>
              <select
                value={appForm.semester}
                onChange={(e) => setAppForm(prev => ({ ...prev, semester: e.target.value as any }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>

          {/* Warning Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
            <div>
              <label className="block font-bold text-amber-950 mb-1">
                Ambang Batas Peringatan SP1 (Konseling)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={appForm.warning_threshold_sp1}
                  onChange={(e) => setAppForm(prev => ({ ...prev, warning_threshold_sp1: Number(e.target.value) }))}
                  className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600">Kali Keterlambatan</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-amber-950 mb-1">
                Ambang Batas Peringatan SP2 (Panggilan Ortu)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={appForm.warning_threshold_sp2}
                  onChange={(e) => setAppForm(prev => ({ ...prev, warning_threshold_sp2: Number(e.target.value) }))}
                  className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600">Kali Keterlambatan</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={resetToDemoData}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Data Bawaan Demo SMKN 1 Jember
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
