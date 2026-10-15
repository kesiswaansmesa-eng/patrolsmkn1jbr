import React, { useState } from 'react';
import { 
  Settings, Database, Key, CheckCircle, Copy, 
  ExternalLink, RotateCcw, Save, ShieldAlert, Code2, AlertCircle, RefreshCw, Sparkles 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { setCustomSupabaseConfig, clearCustomSupabaseConfig, getSupabase } from '../../lib/supabaseClient';
import { FULL_SUPABASE_SQL } from '../../db/fullSql';

export const SettingsView: React.FC = () => {
  const { 
    settings, updateSettings, isSupabaseConnected, 
    supabaseUrl, resetToDemoData, currentUser 
  } = useApp();

  // Supabase Config Form
  const [urlInput, setUrlInput] = useState(supabaseUrl || 'https://qlalmzipltsdndecsjdc.supabase.co');
  const [keyInput, setKeyInput] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYWxtemlwbHRzZG5kZWNzamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzMxMzksImV4cCI6MjEwNzY0OTEzOX0.A6GT174Kh65SiTivefnDqHUj20CqJSWBWJTtmMyKbTs');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; type: 'success' | 'error' | 'idle' }>({
    loading: false,
    message: '',
    type: 'idle',
  });

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
    if (confirm('Lepaskan koneksi Supabase kustom dan kembali ke default?')) {
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

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Menguji koneksi ke Supabase...', type: 'idle' });
    const client = getSupabase();
    if (!client) {
      setTestStatus({ loading: false, message: 'Klien Supabase belum dikonfigurasi.', type: 'error' });
      return;
    }

    try {
      const { data, error } = await client.from('lateness_records').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setTestStatus({
            loading: false,
            message: `Koneksi berhasil ke proyek qlalmzipltsdndecsjdc! Namun tabel belum dibuat. Silakan salin "SQL Migration Lengkap" di bawah dan jalankan di SQL Editor Supabase Anda.`,
            type: 'error',
          });
        } else {
          setTestStatus({
            loading: false,
            message: `Pesan Supabase: ${error.message}`,
            type: 'error',
          });
        }
      } else {
        setTestStatus({
          loading: false,
          message: `Koneksi Berhasil! Tabel lateness_records siap digunakan di Supabase.`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        message: `Gagal terkoneksi: ${err.message || 'Periksa jaringan internet'}`,
        type: 'error',
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(FULL_SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
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

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan & Hubungkan ke Supabase
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus.loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
              {testStatus.loading ? 'Menguji...' : 'Tes Koneksi Tabel'}
            </button>
            {isSupabaseConnected && (
              <button
                type="button"
                onClick={handleClearSupabase}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Reset Default
              </button>
            )}
          </div>

          {/* Test Status Feedback */}
          {testStatus.message && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 mt-2 ${
              testStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {testStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                {testStatus.message}
              </div>
            </div>
          )}
        </form>

        {/* SQL Migration Script Box */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-blue-600" />
                Skrip SQL Migration Lengkap (15 Tabel + RLS 5 Peran)
              </span>
              <p className="text-[11px] text-slate-500">
                Jalankan skrip ini sekali saja di menu <strong>SQL Editor</strong> pada Supabase Dashboard Anda.
              </p>
            </div>
            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Seluruh SQL Migration (1-Klik)'}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
            {FULL_SUPABASE_SQL.substring(0, 1500)}...
          </pre>
          <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Tips Peluncuran Supabase:</strong> Klik tombol biru <em>"Salin Seluruh SQL Migration"</em> di atas, buka <a href="https://supabase.com/dashboard/project/qlalmzipltsdndecsjdc/sql" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Supabase SQL Editor Patrolsmkn1jbr</a>, tempel (*paste*), lalu klik tombol <strong>Run</strong>. Semua 15 tabel, indeks, dan RLS langsung aktif!
            </p>
          </div>
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
