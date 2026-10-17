export const exportToCSV = (filename: string, rows: Array<Record<string, unknown>>) => {
  if (!rows || !rows.length) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Microsoft Excel compatibility
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface OfficialReportExportOptions {
  filename: string;
  reportTitle: string;
  periodText: string;
  schoolName: string;
  schoolAddress?: string;
  headmasterName: string;
  headmasterNip: string;
  viceHeadmasterName: string;
  viceHeadmasterNip: string;
  officerName: string;
  officerNip?: string;
  city: string;
  printDateText: string;
  totalRecordsCount: number;
  rows: Array<Record<string, unknown>>;
}

/**
 * Ekspor Laporan Resmi Lengkap dengan Kop, Ringkasan, dan Lembar Pengesahan
 * Kepala Sekolah & Wakil Kepala Sekolah Bidang Kesiswaan (Kompatibel Excel / Sheets)
 */
export const exportOfficialReportToCSV = (options: OfficialReportExportOptions) => {
  const {
    filename,
    reportTitle,
    periodText,
    schoolName,
    schoolAddress = 'Jalan Jambu No. 17 Telp. (0331) 483108 Fax. (0331) 429690, Jember',
    headmasterName,
    headmasterNip,
    viceHeadmasterName,
    viceHeadmasterNip,
    officerName,
    officerNip = '-',
    city,
    printDateText,
    totalRecordsCount,
    rows
  } = options;

  if (!rows || !rows.length) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const separator = ',';
  const sanitize = (val: unknown) => {
    let cell = val === null || val === undefined ? '' : String(val);
    cell = cell.replace(/"/g, '""');
    if (cell.search(/("|,|\n)/g) >= 0) {
      cell = `"${cell}"`;
    }
    return cell;
  };

  const keys = Object.keys(rows[0]);

  // Bangun konten CSV bertingkat (Header Resmi -> Data -> Pengesahan Pimpinan)
  const lines: string[] = [];

  // 1. Kop Resmi Dinas & Sekolah
  lines.push(['"PEMERINTAH PROVINSI JAWA TIMUR"'].join(separator));
  lines.push(['"DINAS PENDIDIKAN - CABANG DINAS PENDIDIKAN WILAYAH JEMBER"'].join(separator));
  lines.push([`"${schoolName.toUpperCase()}"`].join(separator));
  lines.push([`"${schoolAddress}"`].join(separator));
  lines.push(['""'].join(separator));

  // 2. Judul Laporan & Periode
  lines.push([`"LAPORAN RESMI: ${reportTitle.toUpperCase()}"`].join(separator));
  lines.push([`"PERIODE / TAHUN AJARAN: ${periodText}"`].join(separator));
  lines.push([`"TOTAL DATA: ${totalRecordsCount} Transaksi"`].join(separator));
  lines.push([`"TANGGAL CETAK DOKUMEN: ${printDateText}"`].join(separator));
  lines.push(['""'].join(separator));

  // 3. Header Tabel Data
  lines.push(keys.map(k => sanitize(k)).join(separator));

  // 4. Baris Data
  rows.forEach(row => {
    lines.push(keys.map(k => sanitize(row[k])).join(separator));
  });

  // 5. Spasi Pemisah
  lines.push(['""'].join(separator));
  lines.push(['""'].join(separator));

  // 6. Lembar Pengesahan Resmi (Signatures Block)
  // Mengetahui Kepala Sekolah, Waka Kesiswaan, dan Petugas Pencatat
  lines.push(['"--- LEMBAR PENGESAHAN DOKUMEN LAPORAN RESMI ---"'].join(separator));
  lines.push(['""'].join(separator));

  lines.push([
    sanitize('Mengetahui,'),
    '',
    '',
    sanitize('Waka Bidang Kesiswaan,'),
    '',
    '',
    sanitize(`${city}, ${printDateText}`)
  ].join(separator));

  lines.push([
    sanitize(`Kepala ${schoolName}`),
    '',
    '',
    sanitize(schoolName),
    '',
    '',
    sanitize('Petugas Pencatat Laporan')
  ].join(separator));

  // Ruang Tanda Tangan (3 baris kosong)
  lines.push(['""', '', '', '""', '', '', '""'].join(separator));
  lines.push(['""', '', '', '""', '', '', '""'].join(separator));
  lines.push(['""', '', '', '""', '', '', '""'].join(separator));

  // Nama Pejabat Lengkap dengan Gelar
  lines.push([
    sanitize(headmasterName),
    '',
    '',
    sanitize(viceHeadmasterName),
    '',
    '',
    sanitize(officerName)
  ].join(separator));

  // NIP Pejabat
  lines.push([
    sanitize(`NIP. ${headmasterNip}`),
    '',
    '',
    sanitize(`NIP. ${viceHeadmasterNip}`),
    '',
    '',
    sanitize(`NIP. ${officerNip}`)
  ].join(separator));

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadCSVTemplate = (type: 'siswa' | 'kelas' | 'jurusan' | 'pengguna') => {
  let templateData: Array<Record<string, string>> = [];
  let filename = `template_${type}`;

  if (type === 'siswa') {
    templateData = [
      {
        nis: '24050',
        nisn: '0071234550',
        nama_lengkap: 'Siswa Contoh [DATA DEMO]',
        jenis_kelamin: 'L',
        nama_kelas: 'X DKV 1',
        kode_jurusan: 'DKV',
        telepon_orang_tua: '081234567890',
        alamat: 'Jl. Hayam Wuruk No. 12, Jember',
        tahun_ajaran: '2024/2025'
      }
    ];
  } else if (type === 'kelas') {
    templateData = [
      {
        kode_kelas: 'X-DKV-1',
        nama_kelas: 'X DKV 1',
        tingkat: 'X',
        kode_jurusan: 'DKV',
        nama_wali_kelas: 'Siti Rahmawati, S.Pd.',
        tahun_ajaran: '2024/2025'
      }
    ];
  } else if (type === 'jurusan') {
    templateData = [
      {
        kode_jurusan: 'DKV',
        nama_jurusan: 'Desain Komunikasi Visual',
        nama_kkk: 'Andi Prasetyo, S.Sn.',
        nip_kkk: '198503202009021004'
      }
    ];
  } else {
    templateData = [
      {
        email: 'guru.contoh@smkn1jember.sch.id',
        nama_lengkap: 'Guru Contoh, S.Pd.',
        nip: '198901012015011001',
        peran: 'wali_kelas', // admin, kepala_sekolah, tim_kesiswaan, kkk, wali_kelas
        kelas_atau_jurusan: 'X DKV 1'
      }
    ];
  }

  exportToCSV(filename, templateData);
};
