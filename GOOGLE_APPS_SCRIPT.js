// =========================================================
// Google Apps Script — 美甲美睫預約系統（含確認/拒絕流程）
// =========================================================
// 流程：
//   客人送出 → 客人收「已收到申請」→ 店家收「確認/拒絕」通知
//   → 店家點確認 → 客人收「正式確認 + 行事曆連結」
//
// 部署方式：
//   1. Google Sheet > 擴充功能 > Apps Script
//   2. 貼上全部程式碼後儲存
//   3. 部署 > 新增部署作業 > 網頁應用程式
//      執行身分：我（你的帳號）
//      誰可以存取：所有人（包含匿名使用者）
//   4. 複製部署網址，填入 layouts/index.html 的 APPS_SCRIPT_URL
// =========================================================

// ★ 設定區 — 只需改這裡 ★
const OWNER_EMAIL  = "rocco.liang@gmail.com"; // 店家信箱
const SHOP_NAME    = "a little 私藏手作";      // 店名（出現在信件中）
const SLOT_MINUTES = 60;                        // 每時段長度（分鐘）
const SHEET_NAME   = "預約紀錄";
// ============================================================

// 欄位索引（0-based）
const COL = {
  DATE: 0, TIME: 1, NAME: 2, PHONE: 3, EMAIL: 4,
  CATEGORY: 5, SERVICE: 6, NOTES: 7,
  ID: 8, STATUS: 9, CREATED: 10
};
const TOTAL_COLS = 11;

// ============================================================
// 主要路由
// ============================================================
function doGet(e) {
  const action = e.parameter.action;

  if (action === "getBooked") return handleGetBooked();
  if (action === "book")      return handleBook(e.parameter);
  if (action === "confirm")   return handleConfirmOrReject(e.parameter.id, "已確認");
  if (action === "reject")    return handleConfirmOrReject(e.parameter.id, "已拒絕");

  return respondJson({ error: "未知的 action" });
}

// ============================================================
// 取得已佔用時段（待確認 + 已確認；已拒絕的則釋放）
// ============================================================
function handleGetBooked() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return respondJson({ booked: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
  const booked = [];

  data.forEach(row => {
    const status = row[COL.STATUS];
    if (status === "已拒絕") return; // 已拒絕的時段釋放
    const rawDate = row[COL.DATE];
    const time    = row[COL.TIME];
    if (!rawDate || !time) return;
    const dateStr = rawDate instanceof Date
      ? Utilities.formatDate(rawDate, "Asia/Taipei", "yyyy-MM-dd")
      : String(rawDate).substring(0, 10);
    booked.push(`${dateStr}_${time}`);
  });

  return respondJson({ booked });
}

// ============================================================
// 新增預約：寫入 Sheet + 寄信給客人（收到通知）+ 寄信給店家（確認按鈕）
// ============================================================
function handleBook(params) {
  const { date, time, name, phone, email, category, service, notes } = params;
  if (!date || !time || !name || !email) {
    return respondJson({ success: false, error: "缺少必要欄位" });
  }

  const sheet   = getSheet();
  const lastRow = sheet.getLastRow();

  // 防止重複預約（待確認 / 已確認的時段不能再接受）
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
    for (const row of data) {
      if (row[COL.STATUS] === "已拒絕") continue;
      const existDate = row[COL.DATE] instanceof Date
        ? Utilities.formatDate(row[COL.DATE], "Asia/Taipei", "yyyy-MM-dd")
        : String(row[COL.DATE]).substring(0, 10);
      if (existDate === date && row[COL.TIME] === time) {
        return respondJson({ success: false, error: "此時段已有人預約，請選擇其他時段。" });
      }
    }
  }

  // 產生唯一 ID
  const bookingId = Utilities.getUuid();

  // 寫入試算表
  sheet.appendRow([
    date, time, name, phone || "", email,
    category || "", service || "", notes || "",
    bookingId, "待確認",
    Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss")
  ]);

  const dateDisplay = formatDateDisplay(date);
  const scriptUrl   = ScriptApp.getService().getUrl();

  // 1. 寄給客人：「已收到申請」
  sendToCustomer_Received(email, name, dateDisplay, time, category, service, notes);

  // 2. 寄給店家：「確認/拒絕」通知
  sendToOwner_Confirm(name, phone, email, dateDisplay, time, category, service, notes, bookingId, scriptUrl);

  return respondJson({ success: true });
}

// ============================================================
// 店家點確認或拒絕 → 更新狀態 → 寄信給客人
// ============================================================
function handleConfirmOrReject(bookingId, newStatus) {
  if (!bookingId) return respondHtml("❌ 無效的預約連結");

  const sheet   = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return respondHtml("❌ 找不到此預約");

  const data = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
  let targetRow = -1;
  let booking   = null;

  for (let i = 0; i < data.length; i++) {
    if (data[i][COL.ID] === bookingId) {
      targetRow = i + 2; // 1-indexed，+1 for header
      booking   = data[i];
      break;
    }
  }

  if (!targetRow || !booking) return respondHtml("❌ 找不到此預約（可能已被處理）");

  const currentStatus = booking[COL.STATUS];
  if (currentStatus !== "待確認") {
    return respondHtml(`⚠️ 此預約已是「${currentStatus}」，無需再次操作。`);
  }

  // 更新狀態
  sheet.getRange(targetRow, COL.STATUS + 1).setValue(newStatus);

  const rawDate     = booking[COL.DATE];
  const dateStr     = rawDate instanceof Date
    ? Utilities.formatDate(rawDate, "Asia/Taipei", "yyyy-MM-dd")
    : String(rawDate).substring(0, 10);
  const dateDisplay = formatDateDisplay(dateStr);
  const name        = booking[COL.NAME];
  const email       = booking[COL.EMAIL];
  const time        = booking[COL.TIME];
  const category    = booking[COL.CATEGORY];
  const service     = booking[COL.SERVICE];
  const notes       = booking[COL.NOTES];

  if (newStatus === "已確認") {
    const gcalLink = generateGcalLink(dateStr, time, name, category, service);
    sendToCustomer_Confirmed(email, name, dateDisplay, time, category, service, gcalLink);
    return respondHtml(`✅ 已確認「${name}」的預約（${dateDisplay} ${time}）。<br>確認信已自動寄送給客人。`);
  } else {
    sendToCustomer_Rejected(email, name, dateDisplay, time, category, service);
    return respondHtml(`❌ 已拒絕「${name}」的預約（${dateDisplay} ${time}）。<br>通知信已自動寄送給客人。`);
  }
}

// ============================================================
// 寄信函式
// ============================================================

// 客人：已收到申請
function sendToCustomer_Received(email, name, dateDisplay, time, category, service, notes) {
  const subject = `【${SHOP_NAME}】已收到您的預約申請`;
  const body = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#4e8ef7;padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:1.1rem;">📩 已收到您的預約申請</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px 28px;border-radius:0 0 12px 12px;">
        <p style="color:#333;">親愛的 <strong>${name}</strong>，您好！</p>
        <p style="color:#555;line-height:1.7;">我們已收到您的預約申請，店家確認時段後會盡快寄送正式確認通知，請留意信箱。</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;width:90px;">日期</td><td style="padding:10px 14px;font-weight:600;color:#333;">${dateDisplay}</td></tr>
          <tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">時間</td><td style="padding:10px 14px;font-weight:600;color:#333;">${time}</td></tr>
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;">服務</td><td style="padding:10px 14px;font-weight:600;color:#333;">${category}｜${service}</td></tr>
          ${notes && notes !== "無" ? `<tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">備註</td><td style="padding:10px 14px;color:#555;">${notes}</td></tr>` : ""}
        </table>
        <p style="color:#aaa;font-size:12px;margin-top:20px;">此為系統自動發送，請勿直接回覆此信件。</p>
      </div>
    </div>`;
  GmailApp.sendEmail(email, subject, "", { htmlBody: body, name: SHOP_NAME });
}

// 店家：新預約通知（含確認/拒絕按鈕）
function sendToOwner_Confirm(name, phone, email, dateDisplay, time, category, service, notes, bookingId, scriptUrl) {
  const confirmUrl = `${scriptUrl}?action=confirm&id=${bookingId}`;
  const rejectUrl  = `${scriptUrl}?action=reject&id=${bookingId}`;
  const subject    = `【待確認】新預約 — ${name}（${dateDisplay} ${time}）`;
  const body = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#1e293b;padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:1.1rem;">📋 有新的預約申請！</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px 28px;">
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;width:80px;">姓名</td><td style="padding:10px 14px;font-weight:700;color:#333;">${name}</td></tr>
          <tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">電話</td><td style="padding:10px 14px;color:#333;">${phone || "未提供"}</td></tr>
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;">信箱</td><td style="padding:10px 14px;color:#333;">${email}</td></tr>
          <tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">日期</td><td style="padding:10px 14px;font-weight:600;color:#4e8ef7;">${dateDisplay}</td></tr>
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;">時間</td><td style="padding:10px 14px;font-weight:600;color:#4e8ef7;">${time}</td></tr>
          <tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">服務</td><td style="padding:10px 14px;font-weight:600;color:#333;">${category}｜${service}</td></tr>
          ${notes && notes !== "無" ? `<tr><td style="padding:10px 14px;color:#888;font-size:13px;">備註</td><td style="padding:10px 14px;color:#555;">${notes}</td></tr>` : ""}
        </table>
      </div>
      <div style="background:#f9f9f9;padding:0 28px 28px;text-align:center;">
        <a href="${confirmUrl}" style="display:inline-block;background:#22c55e;color:white;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:15px;margin-right:12px;">✅ 確認預約</a>
        <a href="${rejectUrl}"  style="display:inline-block;background:#ef4444;color:white;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:15px;">❌ 拒絕預約</a>
        <p style="color:#aaa;font-size:11px;margin-top:16px;">點擊後系統將自動通知客人，並更新預約狀態。</p>
      </div>
    </div>`;
  GmailApp.sendEmail(OWNER_EMAIL, subject, "", { htmlBody: body, name: `${SHOP_NAME} 預約系統` });
}

// 客人：預約確認 + 行事曆連結
function sendToCustomer_Confirmed(email, name, dateDisplay, time, category, service, gcalLink) {
  const subject = `【${SHOP_NAME}】預約確認通知 ✅`;
  const body = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#22c55e;padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:1.1rem;">✅ 您的預約已確認！</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px 28px;border-radius:0 0 12px 12px;">
        <p style="color:#333;">親愛的 <strong>${name}</strong>，您好！</p>
        <p style="color:#555;line-height:1.7;">您的預約已確認，期待為您服務！</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;width:90px;">日期</td><td style="padding:10px 14px;font-weight:700;color:#22c55e;">${dateDisplay}</td></tr>
          <tr style="background:#f3f3f3;"><td style="padding:10px 14px;color:#888;font-size:13px;">時間</td><td style="padding:10px 14px;font-weight:700;color:#22c55e;">${time}</td></tr>
          <tr><td style="padding:10px 14px;color:#888;font-size:13px;">服務</td><td style="padding:10px 14px;font-weight:600;color:#333;">${category}｜${service}</td></tr>
        </table>
        <div style="text-align:center;margin-top:20px;">
          <a href="${gcalLink}" style="display:inline-block;background:#4285F4;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">📅 加入 Google 行事曆</a>
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">若需更改或取消，請直接來電或私訊告知。</p>
      </div>
    </div>`;
  GmailApp.sendEmail(email, subject, "", { htmlBody: body, name: SHOP_NAME });
}

// 客人：預約無法安排（拒絕）
function sendToCustomer_Rejected(email, name, dateDisplay, time, category, service) {
  const subject = `【${SHOP_NAME}】預約通知`;
  const body = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="background:#64748b;padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:1.1rem;">📢 預約時段異動通知</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px 28px;border-radius:0 0 12px 12px;">
        <p style="color:#333;">親愛的 <strong>${name}</strong>，您好！</p>
        <p style="color:#555;line-height:1.7;">
          非常抱歉，您申請的時段（${dateDisplay} ${time}，${category}｜${service}）<br>
          目前暫時無法安排，造成不便深感抱歉。
        </p>
        <p style="color:#555;line-height:1.7;">
          歡迎您再次選擇其他時段，或直接與我們聯繫，<br>我們將盡力為您安排合適的時間！
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">此為系統自動發送，請勿直接回覆此信件。</p>
      </div>
    </div>`;
  GmailApp.sendEmail(email, subject, "", { htmlBody: body, name: SHOP_NAME });
}

// ============================================================
// 工具函式
// ============================================================

// 取得（或建立）工作表
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["日期","時間","姓名","電話","信箱","服務類別","服務項目","備註","預約ID","狀態","建立時間"]);
    const h = sheet.getRange(1, 1, 1, 11);
    h.setFontWeight("bold");
    h.setBackground("#1e293b");
    h.setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(9, 260); // 預約ID 欄位寬一點
  }
  return sheet;
}

// Google Calendar 連結（台灣時區 UTC+8）
function generateGcalLink(dateStr, time, name, category, service) {
  const start = new Date(`${dateStr}T${time}:00+08:00`);
  const end   = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
  const fmt   = d => Utilities.formatDate(d, "UTC", "yyyyMMdd'T'HHmmss'Z'");
  const text  = encodeURIComponent(`${SHOP_NAME} — ${category}｜${service}`);
  const notes = encodeURIComponent(`姓名：${name}\n服務：${category} - ${service}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${notes}`;
}

// 日期格式化：2026-03-15 → 2026年3月15日（日）
function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00+08:00");
    const weekdays = ["日","一","二","三","四","五","六"];
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const w = weekdays[d.getUTCDay()];
    return `${y}年${m}月${day}日（${w}）`;
  } catch (e) {
    return dateStr;
  }
}

// 回傳 JSON
function respondJson(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// 回傳 HTML 頁面（供店家點確認/拒絕後看到的結果頁）
function respondHtml(message) {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SHOP_NAME}</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f1f5f9; }
    .card { background: white; border-radius: 16px; padding: 40px 32px; text-align: center;
            max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    h2 { font-size: 1.1rem; color: #1e293b; margin: 0 0 12px; }
    p  { color: #64748b; font-size: 0.9rem; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${message}</h2>
    <p>您可以關閉此頁面。</p>
  </div>
</body>
</html>`;
  return HtmlService.createHtmlOutput(html);
}
