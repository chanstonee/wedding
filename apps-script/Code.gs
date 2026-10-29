/* Private, owner-executed Google Apps Script backend. No secrets go to Pages.
 * Only doGet and guestbookRpc are public; helpers end in '_' to block RPC access.
 * Bcrypt.gs is bcryptjs 3.0.3 with a GAS timer guard, BSD-3-Clause (LICENSE.bcryptjs).
 */
var GB_ = Object.freeze({
  protocol: 1, sheet: 'Guestbook', cost: 12, sessionMs: 3600000,
  pageSize: 30, maxRows: 5000, minWriteAgeMs: 2500,
  headers: ['id', 'created_at', 'name_json', 'message_json', 'password_hash', 'request_id', 'visitor_key', 'request_digest']
});

// Run this PRIVATE helper once from the owner's bound spreadsheet editor.
function setupGuestbook_() {
  var props = PropertiesService.getScriptProperties();
  var book = props.getProperty('SPREADSHEET_ID')
    ? SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'))
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('먼저 저장할 Google Sheets에서 Apps Script를 여세요.');
  var sheet = book.getSheetByName(GB_.sheet) || book.insertSheet(GB_.sheet);
  if (sheet.getLastRow() === 0) sheet.appendRow(GB_.headers);
  else if (JSON.stringify(sheet.getRange(1, 1, 1, GB_.headers.length).getValues()[0]) !== JSON.stringify(GB_.headers))
    throw new Error('기존 시트의 열이 다릅니다. 기존 데이터를 덮어쓰지 않았습니다.');
  sheet.setFrozenRows(1);
  props.setProperty('SPREADSHEET_ID', book.getId());
  if (!props.getProperty('PRIVATE_PEPPER'))
    props.setProperty('PRIVATE_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  if (!props.getProperty('ALLOWED_ORIGINS'))
    props.setProperty('ALLOWED_ORIGINS', 'https://chanstonee.github.io');
  return '설정 완료. 시트 공유는 비공개로 유지하고 웹앱만 모든 사용자에게 배포하세요.';
}

function doGet(e) {
  try {
    var config = config_(), origin = String(e.parameter.origin || ''), nonce = String(e.parameter.nonce || '');
    if (!origin && !nonce)
      return HtmlService.createHtmlOutput('<!doctype html><html lang="ko"><meta charset="utf-8"><title>방명록 서버</title><p>방명록 웹앱이 열렸습니다.</p><p>주소 끝이 /exec인 웹앱 URL을 전달해 주세요. 청첩장 연결 후 실제 저장과 공개 접속을 최종 검증합니다.</p></html>');
    if (config.origins.indexOf(origin) < 0 || !/^[a-f0-9]{32}$/.test(nonce))
      return HtmlService.createHtmlOutput('올바른 청첩장 페이지에서 접속해 주세요.');
    var template = HtmlService.createTemplateFromFile('Bridge');
    template.bootstrapJson = JSON.stringify({ origin: origin, nonce: nonce, protocol: GB_.protocol })
      .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return template.evaluate().setTitle('방명록 연결').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (_) {
    return HtmlService.createHtmlOutput('방명록 연결을 준비하고 있습니다.');
  }
}

function guestbookRpc(request) {
  try {
    if (!request || typeof request !== 'object' || Array.isArray(request) || JSON.stringify(request).length > 3000 || request.protocol !== GB_.protocol)
      fail_('INVALID', '요청 내용을 확인해 주세요.');
    var config = config_();
    if (!uuid_(request.visitorId)) fail_('INVALID', '페이지를 새로 열어 주세요.');
    var actor = mac_('visitor:' + request.visitorId, config.secret);
    if (request.action === 'bootstrap') {
      locked_(function () {
        rates_([{ key: 'bootstrap-minute', limit: 600, ms: 60000 }, { key: 'bootstrap-day', limit: 1000, ms: 86400000 }]);
        cleanupRates_();
      });
      var page = list_(null, config);
      page.token = signSession_(actor, config);
      return { ok: true, data: page };
    }
    var session = session_(request.token, actor, config);
    if (request.action === 'list') {
      locked_(function () { rates_([{ key: 'list-minute', limit: 600, ms: 60000 }, { key: 'list-day', limit: 1500, ms: 86400000 }]); });
      return { ok: true, data: list_(request.cursor, config) };
    }
    if (request.action === 'create') return { ok: true, data: create_(request, actor, session, config) };
    if (request.action === 'delete') return { ok: true, data: delete_(request, actor, config) };
    fail_('INVALID', '지원하지 않는 요청입니다.');
  } catch (error) {
    if (error && error.guestbookCode)
      return { ok: false, code: error.guestbookCode, message: error.message, retryAfter: error.retryAfter || 0 };
    // Never return/log request bodies, passwords, hashes, Sheet IDs or exceptions.
    return { ok: false, code: 'UNAVAILABLE', message: '방명록에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', retryAfter: 0 };
  }
}

function config_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID'), secret = props.getProperty('PRIVATE_PEPPER');
  if (!id || !secret || secret.length < 64) fail_('UNAVAILABLE', '방명록을 준비하고 있어요.');
  return { id: id, secret: secret, origins: (props.getProperty('ALLOWED_ORIGINS') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean) };
}
function sheet_(config) {
  var sheet = SpreadsheetApp.openById(config.id).getSheetByName(GB_.sheet);
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, GB_.headers.length).getValues()[0]) !== JSON.stringify(GB_.headers))
    fail_('UNAVAILABLE', '방명록을 준비하고 있어요.');
  return sheet;
}
function rows_(sheet) {
  var count = sheet.getLastRow() - 1;
  if (count > GB_.maxRows) fail_('UNAVAILABLE', '방명록을 잠시 확인하고 있어요.');
  return count > 0 ? sheet.getRange(2, 1, count, GB_.headers.length).getValues() : [];
}
function publicEntry_(row) {
  // Explicit allowlist. Password hashes and request/visitor columns stay private.
  var name = JSON.parse(String(row[2])), message = JSON.parse(String(row[3]));
  var createdAt = row[1] instanceof Date ? row[1].toISOString() : String(row[1]);
  if (!uuid_(String(row[0])) || typeof name !== 'string' || typeof message !== 'string' || !Number.isFinite(Date.parse(createdAt)))
    fail_('UNAVAILABLE', '방명록을 잠시 확인하고 있어요.');
  return { id: String(row[0]), createdAt: createdAt, name: name, message: message };
}
function list_(cursor, config) {
  if (cursor != null && (typeof cursor !== 'string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\|[a-f0-9-]{36}$/.test(cursor)))
    fail_('INVALID', '다음 메시지를 불러오지 못했어요.');
  var cache = CacheService.getScriptCache();
  var revision = PropertiesService.getScriptProperties().getProperty('PUBLIC_REVISION') || '0';
  var cacheKey = 'guestbook:first:' + revision;
  if (!cursor) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  var entries = rows_(sheet_(config)).map(publicEntry_).sort(function (a, b) {
    var left = a.createdAt + '|' + a.id, right = b.createdAt + '|' + b.id;
    return left < right ? 1 : left > right ? -1 : 0;
  });
  if (cursor) entries = entries.filter(function (entry) { return entry.createdAt + '|' + entry.id < cursor; });
  var page = entries.slice(0, GB_.pageSize), last = page[page.length - 1];
  var result = { entries: page, nextCursor: entries.length > GB_.pageSize ? last.createdAt + '|' + last.id : null };
  if (!cursor) cache.put(cacheKey, JSON.stringify(result), 30);
  return result;
}
function create_(request, actor, session, config) {
  var name = text_(request.name, 20, false), message = text_(request.message, 100, true), password = password_(request.password);
  if (!uuid_(request.requestId) || request.website !== '') fail_('INVALID', '입력 내용을 확인해 주세요.');
  if (Date.now() - session.iat < GB_.minWriteAgeMs) fail_('TOO_FAST', '잠시 후 등록해 주세요.', 3);
  var digest = mac_('request:' + JSON.stringify([name, message, password]), config.secret);
  var duplicate = locked_(function () {
    rates_([{ key: 'create-attempt-day', limit: 800, ms: 86400000 }, { key: 'create-attempt:' + actor, limit: 20, ms: 600000 }]);
    var existing = duplicate_(rows_(sheet_(config)), request.requestId, actor, digest);
    if (existing) return existing;
    rates_([
      { key: 'create-hour', limit: 120, ms: 3600000 }, { key: 'create-day', limit: 500, ms: 86400000 },
      { key: 'create-actor:' + actor, limit: 3, ms: 600000 }, { key: 'create-actor-day:' + actor, limit: 20, ms: 86400000 }
    ]);
    return null;
  });
  if (duplicate) return { entry: duplicate };
  var hash = hashPassword_(password, config);
  return locked_(function () {
    var sheet = sheet_(config), rows = rows_(sheet), existing = duplicate_(rows, request.requestId, actor, digest);
    if (existing) return { entry: existing };
    if (rows.length >= GB_.maxRows) fail_('CAPACITY', '방명록을 잠시 확인하고 있어요.');
    var row = [Utilities.getUuid(), new Date().toISOString(), JSON.stringify(name), JSON.stringify(message), hash, request.requestId, actor, digest];
    // JSON strings always start with a quote, so user text cannot become a Sheet formula.
    var nextRow = sheet.getLastRow() + 1;
    if (nextRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), Math.min(100, GB_.maxRows + 1 - sheet.getMaxRows()));
    sheet.getRange(nextRow, 1, 1, GB_.headers.length).setNumberFormat('@').setValues([row]);
    invalidateList_();
    return { entry: publicEntry_(row) };
  });
}
function duplicate_(rows, requestId, actor, digest) {
  var row = rows.filter(function (r) { return r[5] === requestId && r[6] === actor; })[0];
  if (!row) return null;
  if (!equal_(String(row[7]), digest)) fail_('INVALID', '입력이 바뀌었어요. 다시 등록해 주세요.');
  return publicEntry_(row);
}
function delete_(request, actor, config) {
  var password = password_(request.password);
  if (!uuid_(request.id) || request.confirm !== true) fail_('INVALID', '삭제할 메시지를 확인해 주세요.');
  var row = locked_(function () {
    rates_([{ key: 'delete-hour', limit: 120, ms: 3600000 }, { key: 'delete-day', limit: 500, ms: 86400000 }, { key: 'delete-actor:' + actor, limit: 8, ms: 600000 }]);
    var found = rows_(sheet_(config)).filter(function (r) { return r[0] === request.id; })[0];
    if (found) rates_([{ key: 'delete-record:' + request.id, limit: 5, ms: 1800000 }]);
    return found || null;
  });
  if (!row) return { id: request.id, deleted: true };
  var prehash = mac_('password:' + password, config.secret);
  if (!bcrypt.compareSync(prehash, String(row[4]))) fail_('PASSWORD', '비밀번호가 일치하지 않습니다.');
  locked_(function () {
    var sheet = sheet_(config), rows = rows_(sheet);
    for (var index = 0; index < rows.length; index++) {
      if (rows[index][0] === request.id) { sheet.deleteRow(index + 2); break; }
    }
    invalidateList_();
  });
  return { id: request.id, deleted: true };
}
function text_(value, max, multiline) {
  if (typeof value !== 'string' || value.length > max * 4) fail_('INVALID', '입력 길이를 확인해 주세요.');
  var text = value.replace(/\r\n?/g, '\n').trim();
  if (!text || Array.from(text).length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || (!multiline && /[\n\t]/.test(text)))
    fail_('INVALID', '이름은 20자, 메시지는 100자 이내로 입력해 주세요.');
  return text;
}
function password_(value) {
  if (typeof value !== 'string' || Array.from(value).length < 4 || Array.from(value).length > 64 || value.trim().length < 4 || /[\u0000-\u001f\u007f]/.test(value))
    fail_('INVALID', '비밀번호는 4자 이상 64자 이하로 입력해 주세요.');
  return value;
}
function hashPassword_(password, config) {
  bcrypt.setRandomFallback(function (length) {
    var bytes = Utilities.computeHmacSha256Signature('salt:' + Utilities.getUuid() + Utilities.getUuid(), config.secret);
    return bytes.slice(0, length).map(function (byte) { return byte & 255; });
  });
  // HMAC prehash avoids bcrypt's 72-byte truncation and adds a server-only pepper.
  return bcrypt.hashSync(mac_('password:' + password, config.secret), GB_.cost);
}
function signSession_(actor, config) {
  var now = Date.now(), payload = Utilities.base64EncodeWebSafe(JSON.stringify({ actor: actor, iat: now, exp: now + GB_.sessionMs })).replace(/=+$/, '');
  return payload + '.' + mac_('session:' + payload, config.secret);
}
function session_(token, actor, config) {
  if (typeof token !== 'string' || token.length > 600) fail_('SESSION', '페이지를 다시 연결해 주세요.');
  var parts = token.split('.');
  if (parts.length !== 2 || !equal_(parts[1], mac_('session:' + parts[0], config.secret))) fail_('SESSION', '페이지를 다시 연결해 주세요.');
  var data;
  try { data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); }
  catch (_) { fail_('SESSION', '페이지를 다시 연결해 주세요.'); }
  if (data.actor !== actor || !Number.isFinite(data.iat) || data.iat > Date.now() || data.exp !== data.iat + GB_.sessionMs || data.exp <= Date.now())
    fail_('SESSION', '페이지를 다시 연결해 주세요.');
  return data;
}
function mac_(value, secret) {
  return Utilities.computeHmacSha256Signature(value, secret).map(function (byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}
function equal_(a, b) {
  if (a.length !== b.length) return false;
  var difference = 0;
  for (var i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function uuid_(value) { return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value); }
function locked_(work) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) fail_('BUSY', '잠시 후 다시 시도해 주세요.', 3);
  try { return work(); } finally { lock.releaseLock(); }
}
function rates_(limits) {
  var props = PropertiesService.getScriptProperties(), now = Date.now(), updates = {};
  limits.forEach(function (rule) {
    var key = 'rate:' + rule.key, raw = props.getProperty(key), previous = raw ? JSON.parse(raw) : null;
    var state = previous && previous.until > now ? previous : { count: 0, until: now + rule.ms };
    if (state.count >= rule.limit) fail_('RATE', '요청이 많아요. 잠시 후 다시 시도해 주세요.', Math.ceil((state.until - now) / 1000));
    updates[key] = JSON.stringify({ count: state.count + 1, until: state.until });
  });
  props.setProperties(updates, false);
}
function cleanupRates_() {
  var props = PropertiesService.getScriptProperties(), now = Date.now(), previous = Number(props.getProperty('RATE_CLEANED_AT') || 0);
  if (now - previous < 3600000) return;
  var all = props.getProperties();
  Object.keys(all).filter(function (key) { return key.indexOf('rate:') === 0; }).forEach(function (key) {
    try { if (JSON.parse(all[key]).until <= now) props.deleteProperty(key); } catch (_) { props.deleteProperty(key); }
  });
  props.setProperty('RATE_CLEANED_AT', String(now));
}
function invalidateList_() {
  var props = PropertiesService.getScriptProperties(), previous = props.getProperty('PUBLIC_REVISION') || '0';
  props.setProperty('PUBLIC_REVISION', Utilities.getUuid());
  CacheService.getScriptCache().remove('guestbook:first:' + previous);
}
function fail_(code, message, retryAfter) {
  var error = new Error(message); error.guestbookCode = code; error.retryAfter = retryAfter || 0; throw error;
}

// Optional owner-only smoke test. Writes ONE temporary row to the REAL Sheet,
// checks its public read/password rejection/deletion, then cleans up that row.
function testGuestbookConnection_() {
  var start = Date.now(), config = config_(), visitor = Utilities.getUuid();
  var password = Utilities.getUuid(), id = null, report = {};
  function call(action, fields) {
    var result = guestbookRpc(Object.assign({ protocol: 1, action: action, visitorId: visitor, token: token }, fields || {}));
    return result;
  }
  function requireOk(result, step) {
    if (!result.ok) throw new Error(step + ': ' + result.code);
    return result.data;
  }
  var token = null;
  try {
    token = requireOk(call('bootstrap'), '연결').token;
    Utilities.sleep(GB_.minWriteAgeMs + 50);
    var data = requireOk(call('create', { name: '연결확인', message: '연결 확인 후 자동 삭제되는 테스트 메시지입니다.', password: password, website: '', requestId: Utilities.getUuid() }), '등록');
    id = data.entry.id; report.created = true;
    var page = requireOk(call('list'), '조회');
    if (!page.entries.some(function (entry) { return entry.id === id; })) throw new Error('조회: 새 메시지가 없습니다.');
    if (JSON.stringify(page).indexOf('password_hash') >= 0 || JSON.stringify(page).indexOf('$2') >= 0) throw new Error('공개 응답 필드 확인이 필요합니다.');
    report.read = true;
    var denied = call('delete', { id: id, password: password + '!', confirm: true });
    if (denied.ok || denied.code !== 'PASSWORD') throw new Error('비밀번호 검증 실패');
    report.wrongPasswordBlocked = true;
    requireOk(call('delete', { id: id, password: password, confirm: true }), '삭제');
    report.deleted = true;
    if (requireOk(call('list'), '삭제 후 조회').entries.some(function (entry) { return entry.id === id; })) throw new Error('삭제 후 조회 확인 실패');
    report.completed = true;
  } finally {
    if (id) locked_(function () {
      var sheet = sheet_(config), rows = rows_(sheet);
      for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) { sheet.deleteRow(i + 2); invalidateList_(); break; }
    });
    report.elapsedMs = Date.now() - start;
    // Only booleans and duration; no password, hash, secret, or message content.
    console.log(JSON.stringify(report));
  }
  return report;
}
