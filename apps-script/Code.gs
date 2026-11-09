/**
 * 業務追蹤記錄：接收 GitHub Pages 表單，驗證 Google 帳號登入後寫入／查詢試算表。
 * 安裝與更新方式見 README.md。
 *
 * - 第一個分頁：出訪記錄（每筆一列）。
 * - 「帳號」分頁：可以登入的 Google 帳號名單（Email｜姓名｜身份別）。
 *   身份別是「睿思智慧」的帳號可以查詢全部記錄；「經銷商」只能查詢自己的記錄。
 */

// ★ 貼上 Google Cloud「OAuth 用戶端 ID」（結尾是 .apps.googleusercontent.com）
const CLIENT_ID = '';

const ACCOUNTS_SHEET = '帳號';
const ROLE_ALL = '睿思智慧';

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
  ['email',      '帳號'],
];
const REQUIRED = ['visitDate', 'company', 'summary', 'stage'];
const MAX_LEN = 5000;

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const auth = authenticate_(d.idToken);
    if (!auth.ok) return json_(auth);
    const user = auth.user;
    if (d.action === 'me')     return json_({ ok: true, user: user });
    if (d.action === 'submit') return json_(submit_(d.record || {}, user));
    if (d.action === 'list')   return json_(list_(user));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server_error', detail: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'sales-visit-log', auth: CLIENT_ID ? 'ready' : 'missing_client_id' });
}

/* ---------- 登入驗證 ---------- */

function authenticate_(idToken) {
  if (!CLIENT_ID) return { ok: false, error: 'missing_client_id' };
  if (!idToken) return { ok: false, error: 'auth_required' };

  const cache = CacheService.getScriptCache();
  const key = 'tok_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).slice(0, 40);
  let email = cache.get(key);

  if (!email) {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return { ok: false, error: 'auth_invalid' };
    const p = JSON.parse(res.getContentText());
    const issOk = p.iss === 'accounts.google.com' || p.iss === 'https://accounts.google.com';
    if (p.aud !== CLIENT_ID || !issOk || String(p.email_verified) !== 'true' || !p.email) {
      return { ok: false, error: 'auth_invalid' };
    }
    if (Number(p.exp) * 1000 < Date.now()) return { ok: false, error: 'auth_expired' };
    email = String(p.email).toLowerCase();
    cache.put(key, email, 600);
  }

  const acct = findAccount_(email);
  if (!acct) return { ok: false, error: 'not_allowed', email: email };
  return { ok: true, user: acct };
}

function findAccount_(email) {
  const sh = accountsSheet_();
  const rows = sh.getDataRange().getDisplayValues().slice(1);
  for (const r of rows) {
    if (String(r[0]).trim().toLowerCase() === email) {
      const role = String(r[2]).trim() === '經銷商' ? '經銷商' : ROLE_ALL;
      return { email: email, name: String(r[1]).trim() || email, role: role, canSeeAll: role === ROLE_ALL };
    }
  }
  return null;
}

/* ---------- 寫入 ---------- */

function submit_(d, user) {
  for (const k of REQUIRED) if (!String(d[k] || '').trim()) return { ok: false, error: 'missing', field: k };
  const ts = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  const forced = { __ts: ts, rep: user.name, role: user.role, email: user.email };
  const row = COLUMNS.map(([k]) => {
    if (k in forced) return forced[k];
    let v = String(d[k] == null ? '' : d[k]).slice(0, MAX_LEN);
    if (k === 'amount') return v === '' ? '' : (Number(v) || '');
    if (k === 'status' && !v) v = '待跟進';
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    return v;
  });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = recordsSheet_();
    sh.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/* ---------- 查詢 ---------- */

function list_(user) {
  const sh = recordsSheet_();
  const values = sh.getDataRange().getDisplayValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r.join('').trim()) continue;
    const rec = { row: i + 1 };
    COLUMNS.forEach(([k], j) => { rec[k] = r[j] == null ? '' : String(r[j]); });
    const mine = rec.email
      ? rec.email.toLowerCase() === user.email
      : rec.rep.trim() === user.name;            // 舊記錄沒有帳號欄，用姓名比對
    if (user.canSeeAll || mine) { rec.mine = mine; out.push(rec); }
  }
  out.reverse();
  return { ok: true, user: user, records: out };
}

/* ---------- 分頁 ---------- */

function recordsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(COLUMNS.map(c => c[1]));
  const last = COLUMNS.length;
  if (sh.getRange(1, last).getDisplayValue() !== COLUMNS[last - 1][1]) {
    sh.getRange(1, last).setValue(COLUMNS[last - 1][1]);
  }
  return sh;
}

function accountsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ACCOUNTS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ACCOUNTS_SHEET, ss.getNumSheets());
    sh.appendRow(['Email', '姓名', '身份別（睿思智慧／經銷商）']);
    const owner = Session.getEffectiveUser().getEmail();
    if (owner) sh.appendRow([owner, 'Rick', ROLE_ALL]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** 在 Apps Script 編輯器選這個函式按「執行」一次：建立「帳號」分頁並完成授權。 */
function setup() {
  recordsSheet_();
  accountsSheet_();
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', { muteHttpExceptions: true });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
