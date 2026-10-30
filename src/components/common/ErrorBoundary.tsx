import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2, Home, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PATROL SMESA Uncaught Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalCache = () => {
    if (confirm('Bersihkan cache data lokal pada browser ini? Data yang telah tersinkron di Google Spreadsheet akan tetap aman.')) {
      try {
        const keysToRemove = [
          'patrol_smesa_students',
          'patrol_smesa_records',
          'patrol_smesa_classes',
          'patrol_smesa_departments',
          'patrol_smesa_reasons',
          'patrol_smesa_coachings',
          'patrol_smesa_audit_logs',
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6">
            
            {/* Header Icon */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 block">
                  PATROL SMESA &bull; Pemulihan Sistem
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {this.props.fallbackTitle || 'Aplikasi Mengalami Kendala Tampilan'}
                </h1>
              </div>
            </div>

            {/* Explanation Message */}
            <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                Sistem mendeteksi adanya error pada render browser (kemungkinan akibat pembacaan cache lokal yang tidak valid atau beban render data besar).
              </p>
              <p className="text-slate-400">
                Layar putih berhasil dicegah oleh <strong>Sistem Pelindung PATROL SMESA</strong>. Silakan pilih salah satu tombol pemulihan di bawah ini:
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <button
                onClick={this.handleResetLocalCache}
                className="w-full py-3 px-4 bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Bersihkan Cache & Pulihkan
              </button>
            </div>

            {/* Collapsible Error Technical Details */}
            <div className="border-t border-slate-700/80 pt-4">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Detail Teknis Error (Untuk Pengembang/Admin)</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  <p className="font-bold text-white mb-1">
                    {this.state.error?.toString()}
                  </p>
                  <p className="text-slate-500">
                    {this.state.errorInfo?.componentStack || 'Tidak ada component stack.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Brand */}
            <div className="text-center text-[11px] text-slate-500">
              SMK Negeri 1 Jember &bull; Disiplin Presensi & Keterlambatan Siswa
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
