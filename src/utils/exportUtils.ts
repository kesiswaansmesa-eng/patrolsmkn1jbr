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
