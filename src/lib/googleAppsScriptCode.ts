/**
 * PATROL SMESA - SMK NEGERI 1 JEMBER
 * KODE RESMI GOOGLE APPS SCRIPT (Code.gs)
 * Backend API & Database Google Sheets Terintegrasi Realtime
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * PATROL SMESA - BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * SMK NEGERI 1 JEMBER - SISTEM TRACING KETERLAMBATAN SISWA
 * ==============================================================================
 * Panduan Singkat:
 * 1. Buka Google Spreadsheet baru di Google Drive Anda (misal: "Database PATROL SMESA SMKN 1 Jember").
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Hapus kode default yang ada di editor, lalu salin dan tempel SEMUA kode di bawah ini.
 * 4. Klik ikon Simpan (Save / Ctrl+S).
 * 5. Klik tombol biru 'Terapkan' (Deploy) -> 'Penerapan baru' (New deployment).
 * 6. Klik ikon Gerigi (Select type) -> Pilih 'Aplikasi web' (Web app).
 * 7. Isi Konfigurasi:
 *    - Deskripsi : Backend PATROL SMESA
 *    - Jalankan sebagai (Execute as) : Saya (Me / email Anda)
 *    - Siapa saja yang memiliki akses (Who has access) : Siapa saja (Anyone)
 * 8. Klik 'Terapkan' (Deploy), setujui izin akses Google (Izinkan/Authorize).
 * 9. Salin 'URL Aplikasi Web' (berakhiran /exec) dan tempelkan ke menu Pengaturan di PATROL SMESA.
 * ==============================================================================
 */

// Konfigurasi Nama Sheet yang Sesuai dengan Menu PATROL SMESA
var SHEETS = {
  KETERLAMBATAN: 'Keterlambatan',          // Menu: Catat Keterlambatan & Presensi
  SISWA: 'Siswa',                          // Menu: Master Data Siswa
  KELAS: 'Kelas',                          // Menu: Master Data Rombel / Kelas
  JURUSAN: 'Jurusan',                      // Menu: Master Data Jurusan (KKK)
  ALASAN: 'Alasan_Keterlambatan',          // Menu: Master Data Alasan
  PENGGUNA: 'Pengguna_RBAC',               // Menu: Manajemen Pengguna & Hak Akses
  PEMBINAAN: 'Pembinaan_BK',               // Menu: Tracing & Pembinaan Siswa
  PENGATURAN: 'Pengaturan'                 // Menu: Pengaturan Sistem Sekolah
};

// Definisi Kolom Header Resmi untuk Setiap Sheet
var SHEET_HEADERS = {
  'Keterlambatan': [
    'id', 'student_id', 'student_name', 'nis', 'nisn', 'class_name', 
    'department_code', 'event_date', 'day_name', 'arrival_time', 
    'scheduled_time', 'late_duration_minutes', 'reason_id', 'reason_name', 
    'notes', 'recorded_by_name', 'verification_status', 'followup_status', 
    'is_cancelled', 'cancellation_reason', 'created_at'
  ],
  'Siswa': [
    'id', 'nis', 'nisn', 'full_name', 'gender', 'class_id', 'class_name', 
    'department_id', 'department_code', 'academic_year', 'phone_parent', 
    'address', 'status', 'total_lateness'
  ],
  'Kelas': [
    'id', 'code', 'name', 'grade_level', 'department_id', 'department_code', 
    'homeroom_teacher_name', 'academic_year', 'total_students'
  ],
  'Jurusan': [
    'id', 'code', 'name', 'head_name', 'head_nip', 'is_active', 'total_students'
  ],
  'Alasan_Keterlambatan': [
    'id', 'code', 'name', 'category', 'is_active', 'description'
  ],
  'Pengguna_RBAC': [
    'id', 'full_name', 'email', 'role', 'password', 'nip', 
    'assigned_department_id', 'assigned_class_id', 'status', 'created_at'
  ],
  'Pembinaan_BK': [
    'id', 'student_id', 'student_name', 'nis', 'class_name', 
    'department_code', 'coaching_date', 'officer_name', 'coaching_type', 
    'target_improvement', 'evaluation_result', 'status', 'created_at'
  ],
  'Pengaturan': [
    'key', 'value', 'description'
  ]
};

/**
 * Endpoint HTTP GET
 * Digunakan untuk:
 * - Ping & tes koneksi: ?action=ping
 * - Ambil semua data: ?action=getAll (atau tanpa parameter)
 * - Ambil data spesifik: ?action=getSheet&sheet=Keterlambatan
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Pastikan Zona Waktu Google Spreadsheet otomatis sinkron ke Asia/Jakarta (WIB)
    try {
      if (ss.getSpreadsheetTimeZone() !== 'Asia/Jakarta') {
        ss.setSpreadsheetTimeZone('Asia/Jakarta');
      }
    } catch (tzErr) {}

    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'Koneksi ke Google Apps Script & Spreadsheet SMKN 1 Jember BERHASIL!',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        timezone: ss.getSpreadsheetTimeZone(),
        scriptTimezone: Session.getScriptTimeZone(),
        serverTimeWIB: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getSheet') {
      var sheetName = e.parameter.sheet;
      if (!sheetName || !SHEET_HEADERS[sheetName]) {
        return jsonResponse({ status: 'error', message: 'Nama sheet tidak valid' }, 400);
      }
      var rows = readSheetData(ss, sheetName);
      return jsonResponse({ status: 'success', sheet: sheetName, count: rows.length, data: rows });
    }

    // Default: Ambil seluruh data dari 8 tabel sekaligus
    var allData = {};
    for (var key in SHEETS) {
      var sName = SHEETS[key];
      allData[key.toLowerCase()] = readSheetData(ss, sName);
    }

    return jsonResponse({
      status: 'success',
      message: 'Semua data berhasil dimuat dari Google Sheets',
      timestamp: new Date().toISOString(),
      data: {
        records: allData.keterlambatan || [],
        students: allData.siswa || [],
        classes: allData.kelas || [],
        departments: allData.jurusan || [],
        reasons: allData.alasan || [],
        users: allData.pengguna || [],
        coachings: allData.pembinaan || [],
        settings: allData.pengaturan || []
      }
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Endpoint HTTP POST
 * Digunakan untuk:
 * - Inisialisasi struktur sheet otomatis: action='initSheets'
 * - Sinkronisasi massal: action='syncAll'
 * - Insert / Update / Delete transaksi & master data
 */
function doPost(e) {
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Pastikan Zona Waktu Google Spreadsheet otomatis sinkron ke Asia/Jakarta (WIB)
    try {
      if (ss.getSpreadsheetTimeZone() !== 'Asia/Jakarta') {
        ss.setSpreadsheetTimeZone('Asia/Jakarta');
      }
    } catch (tzErr) {}

    // 1. Inisialisasi Otomatis Semua Sheet & Format Tabel
    if (action === 'initSheets') {
      var initResults = initializeAllSheets(ss, payload.seedData);
      return jsonResponse({
        status: 'success',
        message: '8 Tabel Sheet berhasil diinisialisasi dengan struktur kolom dan format resmi!',
        details: initResults
      });
    }

    // 2. Sinkronisasi Seluruh Data dari Aplikasi PATROL SMESA
    if (action === 'syncAll') {
      var data = payload.data || {};
      var counts = {};

      if (data.records) counts.records = overwriteSheet(ss, SHEETS.KETERLAMBATAN, SHEET_HEADERS['Keterlambatan'], data.records);
      if (data.students) counts.students = overwriteSheet(ss, SHEETS.SISWA, SHEET_HEADERS['Siswa'], data.students);
      if (data.classes) counts.classes = overwriteSheet(ss, SHEETS.KELAS, SHEET_HEADERS['Kelas'], data.classes);
      if (data.departments) counts.departments = overwriteSheet(ss, SHEETS.JURUSAN, SHEET_HEADERS['Jurusan'], data.departments);
      if (data.reasons) counts.reasons = overwriteSheet(ss, SHEETS.ALASAN, SHEET_HEADERS['Alasan_Keterlambatan'], data.reasons);
      if (data.users) counts.users = overwriteSheet(ss, SHEETS.PENGGUNA, SHEET_HEADERS['Pengguna_RBAC'], data.users);
      if (data.coachings) counts.coachings = overwriteSheet(ss, SHEETS.PEMBINAAN, SHEET_HEADERS['Pembinaan_BK'], data.coachings);
      if (data.settings) counts.settings = overwriteSheet(ss, SHEETS.PENGATURAN, SHEET_HEADERS['Pengaturan'], data.settings);

      return jsonResponse({
        status: 'success',
        message: 'Seluruh data berhasil disinkronkan ke Google Spreadsheet!',
        details: counts,
        syncedAt: new Date().toISOString()
      });
    }

    // 3. Catat Keterlambatan Baru (Append ke Keterlambatan)
    if (action === 'insertRecord') {
      var record = payload.record || {};
      // Pastikan kolom late_duration_minutes selalu terhitung dan tercatat sebagai angka positif
      var lateMins = parseInt(record.late_duration_minutes, 10);
      if (isNaN(lateMins) || lateMins <= 0) {
        lateMins = calculateLateMinutesGAS(record.arrival_time, record.scheduled_time);
      }
      record.late_duration_minutes = (lateMins > 0) ? lateMins : 1;

      var sheet = getOrCreateSheet(ss, SHEETS.KETERLAMBATAN, SHEET_HEADERS['Keterlambatan']);
      appendRowFromObject(sheet, SHEET_HEADERS['Keterlambatan'], record);
      return jsonResponse({ 
        status: 'success', 
        message: 'Catatan keterlambatan berhasil ditambahkan ke Google Sheets',
        late_duration_minutes: record.late_duration_minutes
      });
    }

    // Aksi Perbaikan Otomatis: Hitung Ulang & Rekam Semua late_duration_minutes di Google Spreadsheet
    if (action === 'recalculateLateDurations') {
      var fixedCount = recalculateAllLateDurations(ss);
      return jsonResponse({
        status: 'success',
        message: 'Pemeriksaan selesai. Berhasil menghitung & merekam ' + fixedCount + ' data durasi keterlambatan di Google Spreadsheet!',
        details: { fixedCount: fixedCount }
      });
    }

    // Aksi Reset Data Keterlambatan (Khusus Administrator - Pembukaan Buku / Semester Baru)
    if (action === 'resetRecords') {
      var sheet = getOrCreateSheet(ss, SHEETS.KETERLAMBATAN, SHEET_HEADERS['Keterlambatan']);
      var lastRow = sheet.getLastRow();
      var clearedCount = 0;
      if (lastRow > 1) {
        clearedCount = lastRow - 1;
        sheet.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({
        status: 'success',
        message: 'Seluruh data keterlambatan (' + clearedCount + ' baris) di Google Spreadsheet berhasil dikosongkan!',
        details: { clearedCount: clearedCount },
        resetAt: new Date().toISOString()
      });
    }

    // 4. Update Status Verifikasi / Pembatalan Keterlambatan
    if (action === 'updateRecord') {
      var updated = payload.record;
      var sheet = getOrCreateSheet(ss, SHEETS.KETERLAMBATAN, SHEET_HEADERS['Keterlambatan']);
      var ok = updateRowById(sheet, SHEET_HEADERS['Keterlambatan'], updated.id, updated);
      return jsonResponse({ status: ok ? 'success' : 'not_found', message: ok ? 'Data berhasil diupdate' : 'ID tidak ditemukan' });
    }

    // 5. Tambah / Update / Hapus Pengguna (RBAC & Password)
    if (action === 'insertUser') {
      var user = payload.user;
      var sheet = getOrCreateSheet(ss, SHEETS.PENGGUNA, SHEET_HEADERS['Pengguna_RBAC']);
      appendRowFromObject(sheet, SHEET_HEADERS['Pengguna_RBAC'], user);
      return jsonResponse({ status: 'success', message: 'Pengguna baru berhasil disimpan ke Google Sheets' });
    }

    if (action === 'updateUser') {
      var user = payload.user;
      var sheet = getOrCreateSheet(ss, SHEETS.PENGGUNA, SHEET_HEADERS['Pengguna_RBAC']);
      var ok = updateRowById(sheet, SHEET_HEADERS['Pengguna_RBAC'], user.id, user);
      return jsonResponse({ status: ok ? 'success' : 'not_found', message: ok ? 'Pengguna & password berhasil diperbarui' : 'User ID tidak ditemukan' });
    }

    if (action === 'deleteUser') {
      var userId = payload.id;
      var sheet = getOrCreateSheet(ss, SHEETS.PENGGUNA, SHEET_HEADERS['Pengguna_RBAC']);
      var ok = deleteRowById(sheet, SHEET_HEADERS['Pengguna_RBAC'], userId);
      return jsonResponse({ status: ok ? 'success' : 'not_found', message: ok ? 'Pengguna berhasil dihapus' : 'User ID tidak ditemukan' });
    }

    // 6. Master Siswa
    if (action === 'insertStudent') {
      var student = payload.student;
      var sheet = getOrCreateSheet(ss, SHEETS.SISWA, SHEET_HEADERS['Siswa']);
      appendRowFromObject(sheet, SHEET_HEADERS['Siswa'], student);
      return jsonResponse({ status: 'success', message: 'Siswa berhasil ditambahkan' });
    }

    if (action === 'updateStudent') {
      var student = payload.student;
      var sheet = getOrCreateSheet(ss, SHEETS.SISWA, SHEET_HEADERS['Siswa']);
      var ok = updateRowById(sheet, SHEET_HEADERS['Siswa'], student.id, student);
      return jsonResponse({ status: ok ? 'success' : 'not_found', message: ok ? 'Siswa berhasil diupdate' : 'Siswa tidak ditemukan' });
    }

    if (action === 'deleteStudent') {
      var sheet = getOrCreateSheet(ss, SHEETS.SISWA, SHEET_HEADERS['Siswa']);
      var ok = deleteRowById(sheet, SHEET_HEADERS['Siswa'], payload.id);
      return jsonResponse({ status: ok ? 'success' : 'not_found' });
    }

    // 7. Master Kelas
    if (action === 'insertClass') {
      var cls = payload.classRoom;
      var sheet = getOrCreateSheet(ss, SHEETS.KELAS, SHEET_HEADERS['Kelas']);
      appendRowFromObject(sheet, SHEET_HEADERS['Kelas'], cls);
      return jsonResponse({ status: 'success', message: 'Kelas berhasil disimpan' });
    }

    if (action === 'updateClass') {
      var cls = payload.classRoom;
      var sheet = getOrCreateSheet(ss, SHEETS.KELAS, SHEET_HEADERS['Kelas']);
      var ok = updateRowById(sheet, SHEET_HEADERS['Kelas'], cls.id, cls);
      return jsonResponse({ status: ok ? 'success' : 'not_found' });
    }

    if (action === 'deleteClass') {
      var sheet = getOrCreateSheet(ss, SHEETS.KELAS, SHEET_HEADERS['Kelas']);
      var ok = deleteRowById(sheet, SHEET_HEADERS['Kelas'], payload.id);
      return jsonResponse({ status: ok ? 'success' : 'not_found' });
    }

    return jsonResponse({ status: 'error', message: 'Aksi tidak dikenali: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

// -----------------------------------------------------------------------------
// FUNGSI PENDUKUNG (HELPER FUNCTIONS)
// -----------------------------------------------------------------------------

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    formatHeaderRow(sheet, headers);
  }
  return sheet;
}

function formatHeaderRow(sheet, headers) {
  sheet.clear();
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1e3a8a'); // Navy SMKN 1 Jember
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  // Format kolom late_duration_minutes khusus sebagai NUMBER
  var lateIdx = headers.indexOf('late_duration_minutes');
  if (lateIdx !== -1 && sheet.getMaxRows() > 1) {
    sheet.getRange(2, lateIdx + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('0');
  }
}

function readSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var rowObj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var cellVal = values[i][j];
      if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
        hasContent = true;
      }
      // Konversi format tanggal jika objek Date atau string
      if (cellVal instanceof Date) {
        if (key === 'event_date') {
          // Format YYYY-MM-DD khusus tanggal keterlambatan (WIB)
          rowObj[key] = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'yyyy-MM-dd');
        } else if (key === 'arrival_time' || key === 'scheduled_time') {
          // Format HH:mm khusus waktu kedatangan / jam masuk
          rowObj[key] = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'HH:mm');
        } else {
          rowObj[key] = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
        }
      } else if (typeof cellVal === 'string' && key === 'event_date') {
        var mIso = cellVal.match(/^(\d{4}-\d{2}-\d{2})/);
        if (mIso) {
          rowObj[key] = mIso[1];
        } else {
          rowObj[key] = cellVal;
        }
      } else if (typeof cellVal === 'string' && (key === 'arrival_time' || key === 'scheduled_time')) {
        var mTime = cellVal.match(/(\d{2}:\d{2})/);
        if (mTime) {
          rowObj[key] = mTime[1];
        } else {
          rowObj[key] = cellVal;
        }
      } else if (key === 'late_duration_minutes') {
        // Pastikan late_duration_minutes terbaca sebagai integer numerik
        var numLate = parseInt(cellVal, 10);
        if (isNaN(numLate) || numLate <= 0) {
          var arrV = rowObj['arrival_time'] || (headers.indexOf('arrival_time') !== -1 ? values[i][headers.indexOf('arrival_time')] : '07:15');
          var schV = rowObj['scheduled_time'] || (headers.indexOf('scheduled_time') !== -1 ? values[i][headers.indexOf('scheduled_time')] : '07:00');
          numLate = calculateLateMinutesGAS(arrV, schV);
        }
        rowObj[key] = (numLate > 0) ? numLate : 1;
      } else {
        rowObj[key] = cellVal;
      }
    }
    if (hasContent) {
      rows.push(rowObj);
    }
  }
  return rows;
}

function overwriteSheet(ss, sheetName, headers, dataArray) {
  var sheet = getOrCreateSheet(ss, sheetName, headers);
  sheet.clear();
  sheet.appendRow(headers);
  formatHeaderRow(sheet, headers);

  if (!dataArray || dataArray.length === 0) return 0;

  var rowsToInsert = [];
  for (var i = 0; i < dataArray.length; i++) {
    var item = dataArray[i];
    var row = [];
    for (var h = 0; h < headers.length; h++) {
      var field = headers[h];
      var val = item[field];
      if (field === 'late_duration_minutes') {
        var pLate = parseInt(val, 10);
        if (isNaN(pLate) || pLate <= 0) {
          pLate = calculateLateMinutesGAS(item.arrival_time, item.scheduled_time);
        }
        row.push(pLate > 0 ? pLate : 1);
      } else if (val === undefined || val === null) {
        row.push('');
      } else if (typeof val === 'object') {
        row.push(JSON.stringify(val));
      } else {
        row.push(val);
      }
    }
    rowsToInsert.push(row);
  }

  if (rowsToInsert.length > 0) {
    sheet.getRange(2, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
    var lateIdx = headers.indexOf('late_duration_minutes');
    if (lateIdx !== -1) {
      sheet.getRange(2, lateIdx + 1, rowsToInsert.length, 1).setNumberFormat('0');
    }
  }
  return rowsToInsert.length;
}

function appendRowFromObject(sheet, headers, obj) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var val = obj[headers[i]];
    if (val === undefined || val === null) {
      row.push('');
    } else if (typeof val === 'object') {
      row.push(JSON.stringify(val));
    } else {
      row.push(val);
    }
  }
  sheet.appendRow(row);
}

function updateRowById(sheet, headers, id, updatedObj) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  var idIndex = headers.indexOf('id');
  if (idIndex === -1) idIndex = 0;

  var idValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      var rowNumber = i + 2;
      var newRow = [];
      for (var h = 0; h < headers.length; h++) {
        var field = headers[h];
        if (updatedObj[field] !== undefined) {
          var v = updatedObj[field];
          newRow.push(typeof v === 'object' ? JSON.stringify(v) : v);
        } else {
          newRow.push(sheet.getRange(rowNumber, h + 1).getValue());
        }
      }
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([newRow]);
      return true;
    }
  }
  return false;
}

function deleteRowById(sheet, headers, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  var idIndex = headers.indexOf('id');
  if (idIndex === -1) idIndex = 0;

  var idValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

function initializeAllSheets(ss, seedData) {
  try {
    ss.setSpreadsheetTimeZone('Asia/Jakarta');
  } catch (tzErr) {}

  var summary = {};
  for (var sKey in SHEETS) {
    var name = SHEETS[sKey];
    var headers = SHEET_HEADERS[name];
    var sheet = getOrCreateSheet(ss, name, headers);
    summary[name] = { created: true, headersCount: headers.length };
  }

  // Jika ada seedData awal yang dikirimkan, masukkan langsung
  if (seedData) {
    if (seedData.records) overwriteSheet(ss, SHEETS.KETERLAMBATAN, SHEET_HEADERS['Keterlambatan'], seedData.records);
    if (seedData.students) overwriteSheet(ss, SHEETS.SISWA, SHEET_HEADERS['Siswa'], seedData.students);
    if (seedData.classes) overwriteSheet(ss, SHEETS.KELAS, SHEET_HEADERS['Kelas'], seedData.classes);
    if (seedData.departments) overwriteSheet(ss, SHEETS.JURUSAN, SHEET_HEADERS['Jurusan'], seedData.departments);
    if (seedData.reasons) overwriteSheet(ss, SHEETS.ALASAN, SHEET_HEADERS['Alasan_Keterlambatan'], seedData.reasons);
    if (seedData.users) overwriteSheet(ss, SHEETS.PENGGUNA, SHEET_HEADERS['Pengguna_RBAC'], seedData.users);
    if (seedData.coachings) overwriteSheet(ss, SHEETS.PEMBINAAN, SHEET_HEADERS['Pembinaan_BK'], seedData.coachings);
    if (seedData.settings) overwriteSheet(ss, SHEETS.PENGATURAN, SHEET_HEADERS['Pengaturan'], seedData.settings);
  }
  return summary;
}

function calculateLateMinutesGAS(arrivalTime, scheduledTime) {
  try {
    var parseToMinutes = function(t, defaultMins) {
      if (!t) return defaultMins;
      if (t instanceof Date) {
        return t.getHours() * 60 + t.getMinutes();
      }
      var s = String(t).trim();
      var m = s.match(/(\d{1,2}):(\d{1,2})/);
      if (m) {
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      }
      return defaultMins;
    };
    var arrMins = parseToMinutes(arrivalTime, 435); // default 07:15
    var schMins = parseToMinutes(scheduledTime, 420); // default 07:00
    var diff = arrMins - schMins;
    return diff > 0 ? Math.round(diff) : 1;
  } catch (e) {
    return 1;
  }
}

function recalculateAllLateDurations(ss) {
  var sheet = ss.getSheetByName(SHEETS.KETERLAMBATAN);
  if (!sheet) return 0;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return 0;

  var range = sheet.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var headers = values[0];
  var lateIndex = headers.indexOf('late_duration_minutes');
  var arrIndex = headers.indexOf('arrival_time');
  var schIndex = headers.indexOf('scheduled_time');

  if (lateIndex === -1) return 0;
  var fixedCount = 0;

  for (var i = 1; i < values.length; i++) {
    var curLate = parseInt(values[i][lateIndex], 10);
    if (isNaN(curLate) || curLate <= 0) {
      var arrVal = (arrIndex !== -1) ? values[i][arrIndex] : '07:15';
      var schVal = (schIndex !== -1) ? values[i][schIndex] : '07:00';
      var calculated = calculateLateMinutesGAS(arrVal, schVal);
      values[i][lateIndex] = calculated;
      fixedCount++;
    } else {
      values[i][lateIndex] = curLate;
    }
  }

  if (values.length > 1) {
    range.setValues(values);
    sheet.getRange(2, lateIndex + 1, lastRow - 1, 1).setNumberFormat('0');
  }
  return fixedCount;
}
`;

export interface TableMenuDefinition {
  menuName: string;
  sheetName: string;
  description: string;
  columns: Array<{ name: string; type: string; desc: string }>;
}

export const TABLES_MENU_STRUCTURE: TableMenuDefinition[] = [
  {
    menuName: 'Presensi Gerbang & Data Keterlambatan',
    sheetName: 'Keterlambatan',
    description: 'Menyimpan setiap rekaman keterlambatan siswa saat tiba di gerbang sekolah.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik catatan (cth: rec-1712345678)' },
      { name: 'student_id', type: 'TEXT', desc: 'ID referensi siswa' },
      { name: 'student_name', type: 'TEXT', desc: 'Nama lengkap siswa terlambat' },
      { name: 'nis', type: 'TEXT', desc: 'Nomor Induk Siswa' },
      { name: 'nisn', type: 'TEXT', desc: 'Nomor Induk Siswa Nasional' },
      { name: 'class_name', type: 'TEXT', desc: 'Kelas siswa (cth: X DKV 1)' },
      { name: 'department_code', type: 'TEXT', desc: 'Kode konsentrasi keahlian (cth: DKV)' },
      { name: 'event_date', type: 'DATE', desc: 'Tanggal kejadian (YYYY-MM-DD)' },
      { name: 'day_name', type: 'TEXT', desc: 'Nama hari (Senin, Selasa, dll)' },
      { name: 'arrival_time', type: 'TIME', desc: 'Waktu kedatangan gerbang (HH:MM:SS)' },
      { name: 'scheduled_time', type: 'TIME', desc: 'Batas jam masuk sekolah (07:00:00)' },
      { name: 'late_duration_minutes', type: 'NUMBER', desc: 'Selisih menit keterlambatan' },
      { name: 'reason_id', type: 'TEXT', desc: 'ID master alasan keterlambatan' },
      { name: 'reason_name', type: 'TEXT', desc: 'Deskripsi alasan kedatangan' },
      { name: 'notes', type: 'TEXT', desc: 'Catatan tambahan petugas' },
      { name: 'recorded_by_name', type: 'TEXT', desc: 'Nama petugas piket yang mencatat' },
      { name: 'verification_status', type: 'TEXT', desc: 'terverifikasi / menunggu / ditolak' },
      { name: 'followup_status', type: 'TEXT', desc: 'Status tindak lanjut pembinaan' },
      { name: 'is_cancelled', type: 'BOOLEAN', desc: 'Apakah catatan dibatalkan' },
      { name: 'cancellation_reason', type: 'TEXT', desc: 'Alasan pembatalan jika ada' },
      { name: 'created_at', type: 'TIMESTAMP', desc: 'Waktu input ISO 8601' }
    ]
  },
  {
    menuName: 'Master Data Siswa',
    sheetName: 'Siswa',
    description: 'Data induk seluruh peserta didik aktif di SMK Negeri 1 Jember.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik siswa' },
      { name: 'nis', type: 'TEXT', desc: 'Nomor Induk Siswa' },
      { name: 'nisn', type: 'TEXT', desc: 'Nomor Induk Siswa Nasional (10 digit)' },
      { name: 'full_name', type: 'TEXT', desc: 'Nama lengkap peserta didik' },
      { name: 'gender', type: 'TEXT', desc: 'Jenis kelamin (L / P)' },
      { name: 'class_id', type: 'TEXT', desc: 'ID rombel kelas' },
      { name: 'class_name', type: 'TEXT', desc: 'Nama kelas' },
      { name: 'department_id', type: 'TEXT', desc: 'ID jurusan keahlian' },
      { name: 'department_code', type: 'TEXT', desc: 'Kode jurusan (DKV, AK, MP, dll)' },
      { name: 'academic_year', type: 'TEXT', desc: 'Tahun pelajaran aktif (2024/2025)' },
      { name: 'phone_parent', type: 'TEXT', desc: 'Nomor WhatsApp / telepon orang tua' },
      { name: 'address', type: 'TEXT', desc: 'Alamat tempat tinggal siswa' },
      { name: 'status', type: 'TEXT', desc: 'Status siswa: active / transferred / graduated' },
      { name: 'total_lateness', type: 'NUMBER', desc: 'Akumulasi frekuensi terlambat' }
    ]
  },
  {
    menuName: 'Master Data Rombel / Kelas',
    sheetName: 'Kelas',
    description: 'Rombongan belajar tingkat X, XI, dan XII beserta wali kelas pengampu.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik kelas' },
      { name: 'code', type: 'TEXT', desc: 'Kode kelas (cth: X-DKV-1)' },
      { name: 'name', type: 'TEXT', desc: 'Nama kelas resmi (cth: X DKV 1)' },
      { name: 'grade_level', type: 'TEXT', desc: 'Tingkat: X, XI, XII' },
      { name: 'department_id', type: 'TEXT', desc: 'ID jurusan' },
      { name: 'department_code', type: 'TEXT', desc: 'Kode jurusan' },
      { name: 'homeroom_teacher_name', type: 'TEXT', desc: 'Nama guru wali kelas' },
      { name: 'academic_year', type: 'TEXT', desc: 'Tahun ajaran' },
      { name: 'total_students', type: 'NUMBER', desc: 'Jumlah siswa dalam rombel' }
    ]
  },
  {
    menuName: 'Master Data Jurusan (KKK)',
    sheetName: 'Jurusan',
    description: '8 Konsentrasi Keahlian di SMKN 1 Jember beserta Ketua Kompetensi Keahlian.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik jurusan' },
      { name: 'code', type: 'TEXT', desc: 'Kode singkatan (DKV, AK, MP, BD, PSPT, ULW, TL, KKBT)' },
      { name: 'name', type: 'TEXT', desc: 'Nama resmi program keahlian' },
      { name: 'head_name', type: 'TEXT', desc: 'Nama Ketua Konsentrasi Keahlian (KKK)' },
      { name: 'head_nip', type: 'TEXT', desc: 'NIP KKK' },
      { name: 'is_active', type: 'BOOLEAN', desc: 'Status keaktifan jurusan' },
      { name: 'total_students', type: 'NUMBER', desc: 'Total siswa di jurusan' }
    ]
  },
  {
    menuName: 'Master Alasan Keterlambatan',
    sheetName: 'Alasan_Keterlambatan',
    description: 'Klasifikasi alasan keterlambatan untuk analisis akar penyebab sistemik.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik alasan' },
      { name: 'code', type: 'TEXT', desc: 'Kode alasan (cth: R01, R02)' },
      { name: 'name', type: 'TEXT', desc: 'Judul alasan (cth: Ban Bocor/Mogok, Bangun Kesiangan)' },
      { name: 'category', type: 'TEXT', desc: 'transportasi / pribadi / cuaca / kesehatan / keluarga' },
      { name: 'is_active', type: 'BOOLEAN', desc: 'Status aktif' },
      { name: 'description', type: 'TEXT', desc: 'Penjelasan kategori' }
    ]
  },
  {
    menuName: 'Manajemen Pengguna & Hak Akses (RBAC)',
    sheetName: 'Pengguna_RBAC',
    description: 'Daftar akun pengguna resmi 6 peran beserta password login yang diatur admin.',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID profil pengguna' },
      { name: 'full_name', type: 'TEXT', desc: 'Nama lengkap pejabat / petugas' },
      { name: 'email', type: 'TEXT', desc: 'Email akun login' },
      { name: 'role', type: 'TEXT', desc: 'Peran: admin, petugas_piket, kkk, wali_kelas, kepala_sekolah, tim_kesiswaan' },
      { name: 'password', type: 'TEXT', desc: 'Password akun login (diatur oleh Administrator)' },
      { name: 'nip', type: 'TEXT', desc: 'NIP / NUPTK' },
      { name: 'assigned_department_id', type: 'TEXT', desc: 'Scope jurusan (khusus KKK)' },
      { name: 'assigned_class_id', type: 'TEXT', desc: 'Scope kelas (khusus Wali Kelas)' },
      { name: 'status', type: 'TEXT', desc: 'active / inactive' },
      { name: 'created_at', type: 'TIMESTAMP', desc: 'Waktu pembuatan akun' }
    ]
  },
  {
    menuName: 'Tracing Siswa & Riwayat Pembinaan / SP',
    sheetName: 'Pembinaan_BK',
    description: 'Dokumentasi tindak lanjut konseling BK, wali kelas, dan penerbitan Surat Peringatan (SP).',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'ID unik pembinaan' },
      { name: 'student_id', type: 'TEXT', desc: 'ID siswa yang dibina' },
      { name: 'student_name', type: 'TEXT', desc: 'Nama siswa' },
      { name: 'nis', type: 'TEXT', desc: 'NIS siswa' },
      { name: 'class_name', type: 'TEXT', desc: 'Kelas siswa' },
      { name: 'department_code', type: 'TEXT', desc: 'Jurusan' },
      { name: 'coaching_date', type: 'DATE', desc: 'Tanggal pembinaan' },
      { name: 'officer_name', type: 'TEXT', desc: 'Nama konselor / guru pembina' },
      { name: 'coaching_type', type: 'TEXT', desc: 'konseling / surat_peringatan / refleksi_tertulis / dll' },
      { name: 'target_improvement', type: 'TEXT', desc: 'Komitmen & target perbaikan siswa' },
      { name: 'evaluation_result', type: 'TEXT', desc: 'Hasil evaluasi' },
      { name: 'status', type: 'TEXT', desc: 'Status: dijadwalkan / dalam_pembinaan / selesai' },
      { name: 'created_at', type: 'TIMESTAMP', desc: 'Waktu pencatatan' }
    ]
  },
  {
    menuName: 'Pengaturan Sistem & Pimpinan Sekolah',
    sheetName: 'Pengaturan',
    description: 'Menyimpan konfigurasi identitas Kepala Sekolah & Waka Kesiswaan untuk pengesahan dokumen/ekspor, jam masuk gerbang, dan batas SP.',
    columns: [
      { name: 'key', type: 'TEXT (PK)', desc: 'Kunci parameter (school_name, headmaster_name, headmaster_nip, vice_headmaster_name, vice_headmaster_nip, city, dll)' },
      { name: 'value', type: 'TEXT', desc: 'Nilai data parameter' },
      { name: 'description', type: 'TEXT', desc: 'Deskripsi fungsi parameter' }
    ]
  }
];
