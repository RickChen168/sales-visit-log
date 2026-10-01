/**
 * 業務出訪記錄：接收 GitHub Pages 表單送出的資料，寫入這份試算表的第一個分頁。
 * 安裝方式見 README.md。
 */
const COLUMNS = [
  ['__ts',       '送出時間'],
  ['visitDate',  '出訪日期'],
  ['role',       '身份別'],
  ['rep',        '業務姓名'],
  ['mode',       '會議形式'],
  ['company',    '客戶公司'],
  ['contact',    '拜訪對象'],
  ['title',      '職稱/部門'],
  ['industry',   '產業別'],
  ['summary',    '會議重點'],
  ['needs',      '客戶需求/痛點'],
  ['stage',      '商機階段'],
  ['amount',     '預估金額'],
  ['nextAction', '下一步行動'],
  ['nextDate',   '下次跟進日期'],
  ['status',     '跟進狀態'],
];
const REQUIRED = ['visitDate', 'rep', 'company', 'summary', 'stage'];
const MAX_LEN = 5000;

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json_({ ok: true });                  // 機器人陷阱欄位
    for (const k of REQUIRED) if (!String(d[k] || '').trim()) return json_({ ok: false, error: 'missing ' + k });

    const ts = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    const row = COLUMNS.map(([k]) => {
      if (k === '__ts') return ts;
      let v = String(d[k] == null ? '' : d[k]).slice(0, MAX_LEN);
      if (k === 'amount') return v === '' ? '' : Number(v) || '';
      if (/^[=+\-@]/.test(v)) v = "'" + v;                      // 防止被當成公式
      return v;
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sh.getLastRow() === 0) sh.appendRow(COLUMNS.map(c => c[1]));
      sh.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'sales-visit-log' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
