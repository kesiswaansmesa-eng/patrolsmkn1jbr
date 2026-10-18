import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, CheckCircle, Copy, 
  ExternalLink, RotateCcw, Save, ShieldAlert, Code2, AlertCircle, AlertTriangle, RefreshCw, 
  Sparkles, UploadCloud, Info, CheckCircle2, ChevronRight, HelpCircle, Layers,
  FileSpreadsheet, Zap, Clock, Table, Check, ArrowRight, GraduationCap, UserCheck, Award,
  Calendar, Globe, Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GOOGLE_APPS_SCRIPT_CODE, TABLES_MENU_STRUCTURE } from '../../lib/googleAppsScriptCode';
import { pingGoogleSheets, OFFICIAL_SMESA_GAS_URL } from '../../lib/googleSheetsClient';
import { formatIndonesianDate, getWIBTodayString, getWIBCurrentTime } from '../../utils/dateUtils';

export const SettingsView: React.FC = () => {
  const { 
    currentUser, settings, updateSettings, isGoogleSheetsConnected, 
    gasUrl, saveGasUrl, clearGasUrlConfig, resetToDemoData, 
    syncAllDataToGoogleSheets, repairGoogleSheetsLateDurations, resetAllLatenessRecords, initGoogleSheets, refreshData,
    isSyncing, lastSyncedAt, isAutoSyncEnabled, toggleAutoSync,
    autoSyncIntervalSec, setAutoSyncInterval,
    records, students, classes, departments, reasons, users, coachings,
    officialGasUrl, resetToOfficialUrl
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'koneksi' | 'tabel' | 'script' | 'panduan' | 'sekolah'>('koneksi');

  // Input URL
  const [urlInput, setUrlInput] = useState(gasUrl || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message: string;
    sheetName?: string;
    timezone?: string;
    scriptTimezone?: string;
    serverTimeWIB?: string;
    isTimezoneSynced?: boolean;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);

  // App Settings Form (Termasuk Kepala Sekolah & Waka Kesiswaan)
  const [appForm, setAppForm] = useState({
    school_name: settings.school_name || 'SMK NEGERI 1 JEMBER',
    school_address: settings.school_address || 'Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember',
    headmaster_name: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
    headmaster_nip: settings.headmaster_nip || '196708211993031005',
    vice_headmaster_name: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
    vice_headmaster_nip: settings.vice_headmaster_nip || '198604122010011012',
    city: settings.city || 'Jember',
    default_start_time: settings.default_start_time || '07:00',
    academic_year: settings.academic_year || '2024/2025',
    semester: settings.semester || 'Ganjil',
    warning_threshold_sp1: settings.warning_threshold_sp1 || 3,
    warning_threshold_sp2: settings.warning_threshold_sp2 || 5,
  });

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sinkronisasi otomatis form jika data settings dari Google Sheets berubah
  useEffect(() => {
    setAppForm({
      school_name: settings.school_name || 'SMK NEGERI 1 JEMBER',
      school_address: settings.school_address || 'Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember',
      headmaster_name: settings.headmaster_name || 'Drs. H. M. Syaifullah, M.Pd.',
      headmaster_nip: settings.headmaster_nip || '196708211993031005',
      vice_headmaster_name: settings.vice_headmaster_name || 'Wahyu Tri Utomo, S.Pd.',
      vice_headmaster_nip: settings.vice_headmaster_nip || '198604122010011012',
      city: settings.city || 'Jember',
      default_start_time: settings.default_start_time || '07:00',
      academic_year: settings.academic_year || '2024/2025',
      semester: settings.semester || 'Ganjil',
      warning_threshold_sp1: settings.warning_threshold_sp1 || 3,
      warning_threshold_sp2: settings.warning_threshold_sp2 || 5,
    });
  }, [settings]);

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      alert('Harap masukkan URL Web App Google Apps Script.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await pingGoogleSheets(urlInput.trim());
    setIsTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      message: res.message,
      sheetName: res.spreadsheetName,
      timezone: res.timezone,
      scriptTimezone: res.scriptTimezone,
      serverTimeWIB: res.serverTimeWIB,
      isTimezoneSynced: res.isTimezoneSynced,
    });
  };

  const handleSaveGasUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      alert('Harap isi URL Aplikasi Web Google Apps Script (berakhiran /exec).');
      return;
    }
    const res = await saveGasUrl(urlInput.trim());
    if (res.success) {
      alert(`Koneksi Berhasil! ${res.message}`);
    } else {
      alert(`Koneksi Gagal: ${res.message}\n\nPastikan Anda telah memilih 'Who has access: Anyone' saat Deploy.`);
    }
  };

  const handleClearConfig = () => {
    if (confirm('Lepaskan koneksi Google Sheets dan beralih ke Mode Lokal / Demo?')) {
      clearGasUrlConfig();
      setUrlInput('');
      setTestResult(null);
      alert('Koneksi Google Sheets dinonaktifkan.');
    }
  };

  const handleResetToOfficial = async () => {
    setUrlInput(OFFICIAL_SMESA_GAS_URL);
    setIsTesting(true);
    setTestResult(null);
    const res = await resetToOfficialUrl();
    const ping = await pingGoogleSheets(OFFICIAL_SMESA_GAS_URL);
    setIsTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      latencyMs: ping.latencyMs || res.latencyMs,
      message: res.message,
      sheetName: ping.spreadsheetName,
      timezone: ping.timezone,
      scriptTimezone: ping.scriptTimezone,
      serverTimeWIB: ping.serverTimeWIB,
      isTimezoneSynced: ping.isTimezoneSynced,
    });
    alert(`URL Resmi SMKN 1 Jember telah diaktifkan kembali!\n${res.message}`);
  };

  const handleInitSheets = async () => {
    if (!isGoogleSheetsConnected && !urlInput.trim()) {
      alert('Harap hubungkan URL Google Apps Script terlebih dahulu.');
      return;
    }
    if (confirm('Inisialisasi 8 lembar sheet di Google Spreadsheet Anda? Format kolom dan data awal akan dipasang otomatis.')) {
      setSyncStatus({ running: true, message: 'Menginisialisasi tabel...' });
      const res = await initGoogleSheets();
      setSyncStatus({
        running: false,
        success: res.success,
        message: res.message,
        details: res.details,
      });
      if (res.success) {
        alert('8 Lembar Sheet berhasil dibuat dan diformat di Google Spreadsheet!');
      } else {
        alert(`Gagal: ${res.message}`);
      }
    }
  };

  const handleSyncAll = async () => {
    if (!isGoogleSheetsConnected) {
      alert('Google Sheets belum terhubung. Harap simpan URL Apps Script yang valid.');
      return;
    }
    setSyncStatus({ running: true, message: 'Mengunggah seluruh data...' });
    const res = await syncAllDataToGoogleSheets();
    setSyncStatus({
      running: false,
      success: res.success,
      message: res.message,
      details: res.details,
    });
    if (res.success) {
      alert('Seluruh data berhasil disinkronkan ke Google Spreadsheet!');
    }
  };

  const [isRepairingLate, setIsRepairingLate] = useState(false);
  const handleRepairLateDurations = async () => {
    if (!isGoogleSheetsConnected) {
      alert('Google Sheets belum terhubung. Harap simpan URL Apps Script yang valid terlebih dahulu.');
      return;
    }
    setIsRepairingLate(true);
    try {
      const res = await repairGoogleSheetsLateDurations();
      if (res.success) {
        alert(`Perbaikan Database Berhasil!\n\n${res.message}\nSeluruh durasi menit keterlambatan (kolom late_duration_minutes) telah terhitung otomatis dan terekam dengan baik pada tabel database Google Sheets.`);
      } else {
        alert(`Gagal memeriksa database: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error perbaikan: ${err?.message || err}`);
    } finally {
      setIsRepairingLate(false);
    }
  };

  // Reset Keterlambatan Modal State & Handler
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleExecuteReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('Harap ketik kata "RESET" dengan tepat untuk mengonfirmasi penghapusan data.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetAllLatenessRecords();
      if (res.success) {
        alert(`Berhasil!\n\n${res.message}\nSeluruh data keterlambatan telah berhasil di-reset untuk membuka lembar baru.`);
        setShowResetModal(false);
        setResetConfirmText('');
      } else {
        alert(`Gagal mereset: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error saat mereset data: ${err?.message || err}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessMessage(null);
    try {
      await updateSettings({
        school_name: appForm.school_name.trim(),
        school_address: appForm.school_address.trim(),
        headmaster_name: appForm.headmaster_name.trim(),
        headmaster_nip: appForm.headmaster_nip.trim(),
        vice_headmaster_name: appForm.vice_headmaster_name.trim(),
        vice_headmaster_nip: appForm.vice_headmaster_nip.trim(),
        city: appForm.city.trim(),
        default_start_time: appForm.default_start_time,
        academic_year: appForm.academic_year.trim(),
        semester: appForm.semester as any,
        warning_threshold_sp1: Number(appForm.warning_threshold_sp1),
        warning_threshold_sp2: Number(appForm.warning_threshold_sp2),
      });
      setSaveSuccessMessage('Data Kepala Sekolah, Waka Kesiswaan & Konfigurasi Sekolah berhasil disimpan ke Database!');
      setTimeout(() => setSaveSuccessMessage(null), 5000);
      alert('Data Kepala Sekolah & Waka Kesiswaan berhasil disimpan!\n\nPerubahan ini langsung masuk ke database/tabel Google Sheets dan otomatis diterapkan ke seluruh Lembar Laporan & Ekspor.');
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + (err?.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper count for tables
  const getTableRowCount = (sheetName: string) => {
    switch (sheetName) {
      case 'Keterlambatan': return records.length;
      case 'Siswa': return students.length;
      case 'Kelas': return classes.length;
      case 'Jurusan': return departments.length;
      case 'Alasan_Keterlambatan': return reasons.length;
      case 'Pengguna_RBAC': return users.length;
      case 'Pembinaan_BK': return coachings.length;
      case 'Pengaturan': return 12;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Pengaturan Database Backend Google Sheets & Apps Script
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi database awan gratis berbasis Google Spreadsheet, struktur tabel per menu, dan sinkronisasi realtime untuk SMK Negeri 1 Jember.
          </p>
        </div>

        {/* Action Controls & Live Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isGoogleSheetsConnected 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isGoogleSheetsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{isGoogleSheetsConnected ? 'Google Sheets Live' : 'Mode Offline / Demo'}</span>
          </div>

          <button
            onClick={() => refreshData()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="Tarik data terbaru dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden xs:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
          </button>

          {/* Tombol Reset Keterlambatan Khusus Administrator di Header Pengaturan */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setResetConfirmText('');
                setShowResetModal(true);
              }}
              disabled={isSyncing || isResetting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
              title="Reset seluruh catatan keterlambatan di sistem dan Google Spreadsheet"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Keterlambatan ({records.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('koneksi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'koneksi'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Koneksi & Realtime Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('tabel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'tabel'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Struktur Tabel Sesuai Menu (8 Sheet)</span>
        </button>

        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'script'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Kode Apps Script (Code.gs)</span>
        </button>

        <button
          onClick={() => setActiveTab('panduan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'panduan'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Panduan Langkah Lengkap</span>
        </button>

        <button
          onClick={() => setActiveTab('sekolah')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'sekolah'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Pimpinan Sekolah & Jam</span>
        </button>
      </div>

      {/* TAB 1: KONEKSI & REALTIME SYNC */}
      {activeTab === 'koneksi' && (
        <div className="space-y-6">
          
          {/* Main Connection Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  URL Aplikasi Web Google Apps Script (Webhook API)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masukkan URL Web App dari Google Spreadsheet SMKN 1 Jember Anda yang berakhiran <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">/exec</code>.
                </p>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isGoogleSheetsConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isGoogleSheetsConnected ? 'Status: TERHUBUNG' : 'Status: BELUM TERHUBUNG'}
              </span>
            </div>

            <form onSubmit={handleSaveGasUrl} className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Web App URL Google Apps Script:
                  </label>
                  {urlInput.trim() === OFFICIAL_SMESA_GAS_URL ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      URL Resmi Tersemat (Otomatis Aktif di Semua Perangkat)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetToOfficial}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 transition-colors cursor-pointer"
                      title="Kembalikan ke URL resmi Google Apps Script SMKN 1 Jember"
                    >
                      <RotateCcw className="w-3 h-3 text-blue-600" />
                      Gunakan URL Resmi SMESA
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Uji Respon</span>
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Koneksi</span>
                    </button>
                  </div>
                </div>

                {/* Auto Connect Info Banner */}
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-slate-700 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-900">
                      Tersambung Otomatis di Seluruh Perangkat (Komputer Kios, Gerbang, Laptop Guru & Smartphone):
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      URL Web App resmi SMKN 1 Jember (<code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[10px] text-emerald-800 font-bold">AKfycbyAz2uD...DXOU/exec</code>) telah ditanamkan ke dalam inti aplikasi. Saat petugas membuka aplikasi di browser mana pun tanpa konfigurasi awal, aplikasi langsung terhubung ke Google Spreadsheet dan siap mencatat presensi secara realtime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Response Box */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.success 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      {testResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border">
                        Latensi: {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                  {testResult.sheetName && (
                    <p className="text-[11px] text-emerald-700">
                      Nama Dokumen Spreadsheet: <strong>{testResult.sheetName}</strong>
                    </p>
                  )}
                  {testResult.success && testResult.timezone && (
                    <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Zona Waktu Spreadsheet:</span>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          testResult.isTimezoneSynced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {testResult.timezone} {testResult.isTimezoneSynced ? '(Sesuai WIB)' : '(Perlu Disesuaikan ke Asia/Jakarta)'}
                        </span>
                      </div>
                      {testResult.serverTimeWIB && (
                        <div className="text-slate-600">
                          Waktu Server: <strong className="text-emerald-900 font-mono">{testResult.serverTimeWIB} WIB</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons: Init and Sync All */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInitSheets}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Inisialisasi 8 Sheet & Header Otomatis</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={!isGoogleSheetsConnected || isSyncing}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload & Sinkronkan Seluruh Data Sekarang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRepairLateDurations}
                    disabled={!isGoogleSheetsConnected || isSyncing || isRepairingLate}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Periksa seluruh baris tabel Keterlambatan di Google Sheets dan hitung otomatis kolom late_duration_minutes yang masih kosong"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isRepairingLate ? 'animate-spin' : ''}`} />
                    <span>{isRepairingLate ? 'Memeriksa & Menghitung...' : 'Hitung Ulang & Rekam Menit Keterlambatan (Database)'}</span>
                  </button>
                </div>

                {isGoogleSheetsConnected && (
                  <button
                    type="button"
                    onClick={handleClearConfig}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
                  >
                    Putuskan Sambungan
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Info Card: Rekam Kolom late_duration_minutes ke Database */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/90 rounded-2xl p-5 border border-indigo-200 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    Sistem Penghitungan Otomatis & Perekaman Database (<code className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md font-mono">late_duration_minutes</code>)
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    Auto-Computed & Verified
                  </span>
                </div>
                <p className="text-xs text-indigo-900/80 leading-relaxed">
                  Durasi keterlambatan dihitung otomatis dari rumus: <strong>Waktu Kedatangan Siswa (WIB) - Batas Jam Masuk Sekolah</strong>. Pada Google Spreadsheet, nilai ini direkam pada kolom ke-12 tabel <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-indigo-900">Keterlambatan</code> bertipe data <strong>NUMBER (bilangan bulat)</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px]">
                  <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">1. Saat Input Gerbang</span>
                    <span className="font-semibold text-slate-800">Dihitung otomatis realtime & langsung dikirim ke Sheets sebagai angka bulat</span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">2. Penyesuaian Hari</span>
                    <span className="font-semibold text-slate-800">Menyesuaikan jam masuk khusus hari (cth: Jumat vs Senin-Kamis)</span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">3. Database Fallback</span>
                    <span className="font-semibold text-slate-800">Apps Script & UI menjamin tidak ada nilai kosong / NaN di spreadsheet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Realtime Engine Controls */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Konfigurasi Realtime Synchronization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengaturan sinkronisasi otomatis latar belakang agar setiap data keterlambatan yang dicatat langsung tampil realtime di semua komputer petugas & guru.
                </p>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAutoSyncEnabled} 
                  onChange={(e) => toggleAutoSync(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-slate-700">
                  {isAutoSyncEnabled ? 'Realtime Aktif' : 'Nonaktif'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Interval Polling Otomatis:</span>
                <select
                  value={autoSyncIntervalSec}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                  disabled={!isAutoSyncEnabled}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={10}>Setiap 10 Detik (Sangat Cepat)</option>
                  <option value={20}>Setiap 20 Detik (Direkomendasikan)</option>
                  <option value={30}>Setiap 30 Detik</option>
                  <option value={60}>Setiap 1 Menit</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Sinkronisasi Terakhir:</span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB' : 'Belum pernah'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Kanal Antar-Tab (BroadcastChannel):</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aktif (Instant Cross-Tab)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats of Synced Records */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-700" />
              Ringkasan Data yang Terhubung dengan Google Sheets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">Data Keterlambatan</span>
                <p className="text-lg font-bold text-slate-900">{records.length} Baris</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">Master Siswa</span>
                <p className="text-lg font-bold text-slate-900">{students.length} Siswa</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">Master Kelas (Rombel)</span>
                <p className="text-lg font-bold text-slate-900">{classes.length} Kelas</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">Akun Pengguna (RBAC)</span>
                <p className="text-lg font-bold text-slate-900">{users.length} Akun</p>
              </div>
            </div>
          </div>

          {/* CARD ZONA KHUSUS ADMINISTRATOR: RESET DATA KETERLAMBATAN */}
          <div className="bg-gradient-to-br from-red-50/90 via-rose-50/60 to-red-100/40 rounded-2xl p-6 border-2 border-red-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200/80 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                    Khusus Akun Administrator
                  </span>
                  <span className="text-xs font-bold text-red-950">Pemeliharaan & Pergantian Semester</span>
                </div>
                <h3 className="text-base font-bold text-red-950 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Tombol Reset Data Keterlambatan Siswa
                </h3>
                <p className="text-xs text-red-900/80 mt-1 max-w-2xl leading-relaxed">
                  Fitur ini digunakan saat pergantian semester / tahun ajaran baru atau pembersihan data uji coba gerbang. Menghapus seluruh riwayat keterlambatan di aplikasi dan mengosongkan lembar <code className="bg-white/80 px-1 py-0.5 rounded text-red-900 font-mono text-xs">Keterlambatan</code> di Google Spreadsheet. <strong>Master Siswa, Kelas, Jurusan, dan Akun Pengguna tetap aman.</strong>
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                <div className="text-xs font-bold text-slate-700 bg-white/90 px-3.5 py-2 rounded-xl border border-red-200 shadow-xs">
                  Total Catatan Terdaftar: <strong className="text-red-700 font-mono text-base">{records.length}</strong> Baris
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Peringatan: Data yang di-reset tidak dapat dikembalikan lagi kecuali Anda memiliki riwayat versi di Google Sheets.</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetConfirmText('');
                  setShowResetModal(true);
                }}
                disabled={isSyncing || isResetting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Seluruh Data Keterlambatan ({records.length})</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: STRUKTUR TABEL SESUAI MENU (8 SHEET) */}
      {activeTab === 'tabel' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-700" />
              Struktur Tabel Google Spreadsheet Sesuai Seluruh Menu PATROL SMESA
            </h2>
            <p className="text-xs text-emerald-800 mt-1">
              Google Spreadsheet akan memuat 8 lembar (sheet) kerja resmi. Setiap sheet mewakili menu utama di aplikasi PATROL SMESA SMK Negeri 1 Jember.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {TABLES_MENU_STRUCTURE.map((tbl, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Menu: <span className="text-emerald-700">{tbl.menuName}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Nama Sheet di Excel/Spreadsheet: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">{tbl.sheetName}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                      {tbl.columns.length} Kolom
                    </span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                      Saat ini: {getTableRowCount(tbl.sheetName)} data
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-xs text-slate-600 mb-3">{tbl.description}</p>
                  
                  {/* Columns table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                      <thead className="bg-slate-100 text-slate-700 font-semibold">
                        <tr>
                          <th className="py-2 px-3 border-b border-slate-200 w-12 text-center">No</th>
                          <th className="py-2 px-3 border-b border-slate-200">Nama Kolom (Header)</th>
                          <th className="py-2 px-3 border-b border-slate-200 w-28">Tipe Data</th>
                          <th className="py-2 px-3 border-b border-slate-200">Deskripsi Kolom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {tbl.columns.map((col, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-center text-slate-400">{cIdx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900">{col.name}</td>
                            <td className="py-1.5 px-3 text-emerald-700 font-medium">{col.type}</td>
                            <td className="py-1.5 px-3 font-sans text-slate-600">{col.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KODE APPS SCRIPT (Code.gs) */}
      {activeTab === 'script' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-600" />
                  Kode Lengkap Google Apps Script (Code.gs)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Salin seluruh skrip di bawah ini ke editor Google Apps Script spreadsheet Anda. Sudah dilengkapi CORS bypass, pembuatan sheet otomatis, dan CRUD engine.
                </p>
              </div>

              <button
                onClick={handleCopyScript}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                {copiedScript ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Tersalin ke Clipboard!' : 'Salin Kode Apps Script'}</span>
              </button>
            </div>

            {/* Code container */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">Code.gs • Google Apps Script Engine</span>
                <span className="text-[11px] text-emerald-400 font-mono">JavaScript / Apps Script V8</span>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre select-all">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PANDUAN LANGKAH DEMI LANGKAH */}
      {activeTab === 'panduan' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                Tahapan Lengkap Menghubungkan Google Sheets & Apps Script ke PATROL SMESA
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ikuti 7 langkah praktis berikut untuk mengaktifkan database gratis berbasis Google Spreadsheet SMK Negeri 1 Jember dalam waktu kurang dari 3 menit:
              </p>
            </div>

            <div className="space-y-5">
              
              {/* Step 1 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">Buat File Google Spreadsheet Baru</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> di browser Anda dengan akun Google sekolah (misal: <code className="bg-white px-1 rounded border">kesiswaansmesa@gmail.com</code>). Beri nama dokumen: <strong>"Database PATROL SMESA SMKN 1 Jember"</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">Buka Menu Editor Apps Script</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Di spreadsheet tersebut, klik menu bar atas: <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>. Tab baru editor kode Google Apps Script akan terbuka.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">Tempel Kode Apps Script (Code.gs)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hapus kode bawaan <code className="bg-white px-1 rounded border">function myFunction() &#123;&#125;</code> di editor. Buka tab <strong>"Kode Apps Script (Code.gs)"</strong> di aplikasi ini, klik <strong>"Salin Kode"</strong>, lalu tempel (Paste / Ctrl+V) ke editor Apps Script. Tekan ikon <strong>Simpan</strong> (ikon Disket atau Ctrl+S).
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">Terapkan (Deploy) Sebagai Aplikasi Web (Web App)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Klik tombol biru di pojok kanan atas: <strong>Terapkan (Deploy)</strong> &rarr; pilih <strong>Penerapan baru (New deployment)</strong>.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Klik ikon Gerigi di samping "Pilih jenis", lalu pilih <strong>Aplikasi web (Web app)</strong>.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 p-4 rounded-xl bg-amber-50/70 border border-amber-300">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  5
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Pengaturan Hak Akses (Sangat Penting!)</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.2 rounded font-bold">Wajib Tepat</span>
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Isi kolom form deployment persis seperti di bawah ini:
                  </p>
                  <ul className="text-xs text-slate-800 list-disc list-inside space-y-1 bg-white p-3 rounded-lg border border-amber-200 font-medium">
                    <li><strong>Deskripsi</strong>: <code className="text-slate-600">Backend PATROL SMESA</code></li>
                    <li><strong>Jalankan sebagai (Execute as)</strong>: <span className="text-emerald-700 font-bold">Saya (Me / email Anda)</span></li>
                    <li><strong>Siapa saja yang memiliki akses (Who has access)</strong>: <span className="text-emerald-700 font-bold">Siapa saja (Anyone)</span></li>
                  </ul>
                  <p className="text-[11px] text-amber-800">
                    *Pilihan "Anyone" wajib dipilih agar aplikasi PATROL SMESA di browser dapat mengirim dan membaca data tanpa terhambat login OAuth tiap guru.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  6
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900">Izinkan Akses Google (Authorize) & Salin URL Web App</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Klik <strong>Terapkan (Deploy)</strong>. Jika muncul dialog otorisasi izin akun Google, klik <em>Review Permissions</em> &rarr; pilih akun Google Anda &rarr; klik <em>Advanced (Lanjutan)</em> &rarr; klik <em>Go to Untitled project (Buka proyek)</em> &rarr; klik <em>Allow (Izinkan)</em>.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setelah berhasil, salin <strong>URL Aplikasi Web (Web App URL)</strong> yang berakhiran <code className="bg-white px-1.5 py-0.5 rounded border text-emerald-800 font-bold">/exec</code>.
                  </p>
                </div>
              </div>

              {/* Step 7 */}
              <div className="flex gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  7
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-emerald-950">Tempelkan URL di Menu Koneksi & Klik Inisialisasi</h3>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Kembali ke menu <strong>"Koneksi & Realtime Sync"</strong> di halaman ini. Tempelkan URL tersebut ke kolom input, klik <strong>"Simpan Koneksi"</strong>, lalu klik <strong>"Inisialisasi 8 Sheet & Header Otomatis"</strong>. Buka spreadsheet Anda, dan 8 sheet resmi siap digunakan secara realtime!
                  </p>
                </div>
              </div>

              {/* Step 8: Penyesuaian Waktu & Zona Waktu Apps Script */}
              <div className="flex gap-4 p-4 rounded-xl bg-blue-50 border border-blue-300">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  8
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Tahapan Mengatur Waktu Apps Script Agar Sesuai Waktu Aplikasi (WIB - GMT+07:00)</span>
                  </h3>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Secara default, Google Spreadsheet atau Google Apps Script baru dapat berada di zona waktu Amerika/UTC sehingga tanggal atau jam bisa bergeser 7–14 jam jika tidak disesuaikan. Ikuti 3 langkah mudah berikut:
                  </p>
                  
                  <div className="space-y-2 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs text-slate-800 space-y-1">
                      <p className="font-bold text-blue-900 flex items-center gap-1">
                        <span>A. Atur Zona Waktu di Google Spreadsheet:</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        1. Di dokumen Google Spreadsheet Anda, klik menu <strong>File</strong> &rarr; pilih <strong>Setelan spreadsheet</strong> (Settings).<br />
                        2. Pada tab <strong>Umum</strong>, cari opsi <strong>Zona waktu (Time zone)</strong>.<br />
                        3. Ubah ke <strong>(GMT+07:00) Jakarta</strong>.<br />
                        4. Klik tombol hijau <strong>Simpan setelan</strong> (Save settings).
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs text-slate-800 space-y-1">
                      <p className="font-bold text-blue-900 flex items-center gap-1">
                        <span>B. Atur Zona Waktu di Google Apps Script (appsscript.json):</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        1. Di tab editor Apps Script, klik ikon <strong>Gerigi (Setelan Proyek / Project Settings)</strong> di menu sebelah kiri.<br />
                        2. Centang kotak <strong>"Tampilkan file manifes 'appsscript.json' di editor"</strong>.<br />
                        3. Kembali ke tab <strong>Editor (&lt; &gt;)</strong> di sebelah kiri, klik file <strong>appsscript.json</strong>.<br />
                        4. Pastikan baris timeZone bernilai: <code className="bg-slate-100 text-blue-800 font-mono font-bold px-1 rounded">"timeZone": "Asia/Jakarta"</code>.<br />
                        5. Simpan file (<kbd className="bg-slate-100 px-1 rounded font-mono text-[10px]">Ctrl+S</kbd>).
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs text-slate-800 space-y-1">
                      <p className="font-bold text-blue-900 flex items-center gap-1">
                        <span>C. Terapkan (Deploy) Versi Baru:</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        Klik tombol biru <strong>Terapkan (Deploy)</strong> &rarr; <strong>Kelola penerapan (Manage deployments)</strong> &rarr; klik ikon <strong>Pensil (Edit)</strong> &rarr; pada dropdown <strong>Versi</strong> pilih <strong>Versi baru (New version)</strong> &rarr; klik <strong>Terapkan (Deploy)</strong>.<br />
                        <em>*Selesai! Kini waktu kedatangan dan tanggal otomatis tersimpan presisi sesuai waktu WIB aplikasi PATROL SMESA.</em>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PENGATURAN SEKOLAH, PIMPINAN & JAM */}
      {activeTab === 'sekolah' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveAppSettings} className="space-y-6">
            
            {/* CARD 1: PIMPINAN SEKOLAH & PEJABAT PENANDATANGAN DOKUMEN */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    Pimpinan Sekolah & Pejabat Penandatangan Dokumen Resmi
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data Kepala Sekolah & Waka Kesiswaan ini tersimpan di database/tabel Google Sheets dan secara otomatis dicetak pada lembar pengesahan Laporan & Berkas Ekspor.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Otomatis Masuk Laporan & Ekspor</span>
                </span>
              </div>

              {/* Grid Kepala Sekolah & Waka Kesiswaan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bagian 1: Kepala Sekolah */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs">
                      <Award className="w-3.5 h-3.5" />
                    </span>
                    <span>1. Kepala Sekolah (Mengetahui)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Kepala Sekolah (beserta Gelar):
                    </label>
                    <input
                      type="text"
                      required
                      value={appForm.headmaster_name}
                      onChange={(e) => setAppForm({ ...appForm, headmaster_name: e.target.value })}
                      placeholder="Contoh: Drs. H. M. Syaifullah, M.Pd."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Tampil di sisi kiri lembar tanda tangan dokumen laporan.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIP Kepala Sekolah:
                    </label>
                    <input
                      type="text"
                      required
                      value={appForm.headmaster_nip}
                      onChange={(e) => setAppForm({ ...appForm, headmaster_nip: e.target.value })}
                      placeholder="Contoh: 196708211993031005"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Nomor Induk Pegawai 18 digit resmi tanpa spasi/tanda hubung.
                    </span>
                  </div>
                </div>

                {/* Bagian 2: Waka Bidang Kesiswaan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
                      <UserCheck className="w-3.5 h-3.5" />
                    </span>
                    <span>2. Wakil Kepala Sekolah Bidang Kesiswaan</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Waka Kesiswaan (beserta Gelar):
                    </label>
                    <input
                      type="text"
                      required
                      value={appForm.vice_headmaster_name}
                      onChange={(e) => setAppForm({ ...appForm, vice_headmaster_name: e.target.value })}
                      placeholder="Contoh: Wahyu Tri Utomo, S.Pd."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Tampil di posisi tengah pengesahan laporan kedisiplinan & kesiswaan.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIP Waka Bidang Kesiswaan:
                    </label>
                    <input
                      type="text"
                      required
                      value={appForm.vice_headmaster_nip}
                      onChange={(e) => setAppForm({ ...appForm, vice_headmaster_nip: e.target.value })}
                      placeholder="Contoh: 198604122010011012"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Nomor Induk Pegawai penanggung jawab pembinaan kesiswaan.
                    </span>
                  </div>
                </div>

              </div>

              {/* Kota Pengesahan & Alamat Sekolah Kop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kota / Wilayah Tanda Tangan Dokumen:
                  </label>
                  <input
                    type="text"
                    required
                    value={appForm.city}
                    onChange={(e) => setAppForm({ ...appForm, city: e.target.value })}
                    placeholder="Contoh: Jember"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    Format cetak tanggal: <strong className="text-slate-700">{appForm.city || 'Jember'}, [Tanggal Cetak]</strong>
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Lengkap & Kontak Sekolah (Kop Surat Resmi):
                  </label>
                  <input
                    type="text"
                    value={appForm.school_address}
                    onChange={(e) => setAppForm({ ...appForm, school_address: e.target.value })}
                    placeholder="Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    Dicantumkan pada kepala lembar cetak laporan & berkas ekspor.
                  </span>
                </div>
              </div>

              {/* LIVE PREVIEW LEMBAR PENGESAHAN */}
              <div className="mt-4 p-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Pratinjau Langsung Lembar Pengesahan Laporan & Ekspor (Realtime Preview):
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Sesuai Format Resmi SMKN 1 Jember
                  </span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
                    <div className="p-2 border border-slate-100 rounded-lg">
                      <p className="text-[11px] text-slate-500 mb-8">
                        Mengetahui,<br />
                        Kepala {appForm.school_name || 'SMKN 1 Jember'}
                      </p>
                      <p className="font-extrabold text-slate-900 underline">
                        {appForm.headmaster_name || '(Nama Kepala Sekolah)'}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono">
                        NIP. {appForm.headmaster_nip || '-'}
                      </p>
                    </div>

                    <div className="p-2 border border-slate-100 rounded-lg">
                      <p className="text-[11px] text-slate-500 mb-8">
                        Waka Bidang Kesiswaan,<br />
                        {appForm.school_name || 'SMKN 1 Jember'}
                      </p>
                      <p className="font-extrabold text-slate-900 underline">
                        {appForm.vice_headmaster_name || '(Nama Waka Kesiswaan)'}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono">
                        NIP. {appForm.vice_headmaster_nip || '-'}
                      </p>
                    </div>

                    <div className="p-2 border border-slate-100 rounded-lg">
                      <p className="text-[11px] text-slate-500 mb-8">
                        {appForm.city || 'Jember'}, [Tanggal Cetak]<br />
                        Petugas Pencatat Laporan
                      </p>
                      <p className="font-extrabold text-slate-900 underline">
                        [Nama Petugas / Guru Piket]
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono">
                        NIP. [NIP Petugas]
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* CARD 2: PARAMETER OPERASIONAL JAM GERBANG & THRESHOLD SP */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-emerald-600" />
                Parameter Operasional Jam Gerbang, Periode & Ambang SP
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lembaga / Sekolah
                  </label>
                  <input
                    type="text"
                    value={appForm.school_name}
                    onChange={(e) => setAppForm({ ...appForm, school_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Jam Masuk Gerbang Pagi (WIB)
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={appForm.default_start_time}
                    onChange={(e) => setAppForm({ ...appForm, default_start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Kedatangan siswa setelah jam ini otomatis dihitung terlambat.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Ajaran Aktif
                  </label>
                  <input
                    type="text"
                    value={appForm.academic_year}
                    onChange={(e) => setAppForm({ ...appForm, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={appForm.semester}
                    onChange={(e) => setAppForm({ ...appForm, semester: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ambang Batas Panggilan / SP 1 (Frekuensi Terlambat)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={appForm.warning_threshold_sp1}
                    onChange={(e) => setAppForm({ ...appForm, warning_threshold_sp1: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Siswa mencapai batas ini masuk daftar binaan BK / Wali Kelas.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ambang Batas Surat Panggilan Orang Tua / SP 2
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={appForm.warning_threshold_sp2}
                    onChange={(e) => setAppForm({ ...appForm, warning_threshold_sp2: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Penerbitan surat pemanggilan orang tua ke sekolah.</span>
                </div>
              </div>
            </div>

            {/* CARD 3: ZONA WAKTU, TANGGAL & PENANGGALAN SISTEM OTOMATIS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Zona Waktu, Tanggal & Jam Sistem Otomatis (Asia/Jakarta - WIB)
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Otomatis Tersimpan ke Database</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Zona Waktu Resmi Aplikasi:</span>
                  <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                    Asia/Jakarta (WIB)
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">GMT+07:00 Waktu Indonesia Barat</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Tanggal Kalender Hari Ini:</span>
                  <span className="text-sm font-black text-blue-900 mt-0.5 block">
                    {formatIndonesianDate(getWIBTodayString())}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">ISO: {getWIBTodayString()}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Jam Operasional Live:</span>
                  <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                    {getWIBCurrentTime()} WIB
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Sinkron dengan Jam Masuk Gerbang</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Penanggalan Otomatis:</strong> Setiap transaksi keterlambatan siswa di gerbang pagi langsung mencatat tanggal hari ini secara otomatis tanpa perlu diubah manual. Jika petugas piket perlu merekam tanggal kemarin atau tanggal susulan, pilihan tanggal dapat diubah di menu <em>Catat Keterlambatan</em> dan sistem akan otomatis menyimpan tanggal tersebut ke dalam database Google Sheets secara presisi.
                </p>
              </div>
            </div>

            {/* Zona Administrator: Reset Keterlambatan Pembukaan Semester Baru */}
            {currentUser.role === 'admin' && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                      Khusus Administrator
                    </span>
                    <span className="text-xs font-bold text-red-950">Pergantian Semester / Tahun Ajaran</span>
                  </div>
                  <h4 className="font-extrabold text-red-950 text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    Reset Seluruh Catatan Keterlambatan Siswa
                  </h4>
                  <p className="text-xs text-red-800/90 mt-1 max-w-xl">
                    Kosongkan seluruh data transaksi keterlambatan ({records.length} baris) untuk membuka periode semester baru. Master Siswa, Kelas, Jurusan, dan Akun Pengguna tetap tersimpan aman.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmText('');
                    setShowResetModal(true);
                  }}
                  disabled={isSyncing || isResetting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Keterlambatan ({records.length})</span>
                </button>
              </div>
            )}

            {/* ACTION BAR */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetToDemoData}
                className="w-full sm:w-auto px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Nilai Bawaan SMESA</span>
              </button>

              {saveSuccessMessage && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingSettings ? 'Menyimpan & Menyinkronkan...' : 'Simpan Data Pimpinan & Pengaturan'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Double Confirmation Modal for Resetting All Lateness Records */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-lg">
                Konfirmasi Reset Keterlambatan
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan mengosongkan <strong>{records.length} catatan keterlambatan</strong>. Seluruh data transaksi keterlambatan siswa akan dihapus bersih dari sistem aplikasi dan Google Spreadsheet untuk membuka periode baru.
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Data Aman yang Tidak Dihapus:
              </span>
              <p className="text-[11px] text-amber-800">
                Master Data Siswa ({students.length}), Data Kelas ({classes.length}), Jurusan ({departments.length}), dan Akun Pengguna ({users.length}) <strong>TIDAK AKAN TERHAPUS</strong>.
              </p>
            </div>

            <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-xs text-red-900 space-y-1.5">
              <div className="font-bold text-center">Ketik kata <span className="underline font-mono text-red-700 font-black">RESET</span> untuk melanjutkan:</div>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Ketik RESET di sini"
                autoFocus
                className="w-full px-3 py-2 bg-white border-2 border-red-300 rounded-lg text-sm font-black font-mono uppercase text-red-900 text-center focus:outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batalkan
              </button>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Mereset Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Reset Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
