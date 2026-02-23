// =========================================================
// Google Apps Script — 美甲美睫預約系統後端
// =========================================================
// 使用說明：
//   1. 開啟你的 Google Sheet
//   2. 上方選單 > 擴充功能 > Apps Script
//   3. 把這整段程式碼貼入，取代原有的空白程式碼
//   4. 點左上角「儲存」
//   5. 點「部署」> 「新增部署作業」
//      - 類型：網頁應用程式
//      - 執行身分：我（你的帳號）
//      - 誰可以存取：所有人（包含匿名使用者）
//   6. 複製部署完成後的「網頁應用程式網址」
//   7. 貼到 layouts/index.html 的 APPS_SCRIPT_URL 變數
// =========================================================

// 試算表中記錄預約的工作表名稱
const SHEET_NAME = "預約紀錄";

// =========================================================
// GET 請求處理（讀取預約 & 寫入新預約）
// =========================================================
function doGet(e) {
  const action = e.parameter.action;

  if (action === "getBooked") {
    return handleGetBooked();
  }

  if (action === "book") {
    return handleBook(e.parameter);
  }

  return respond({ error: "未知的 action" });
}

// ---------------------------------------------------------
// 回傳所有已預約的「日期_時間」組合
// 格式範例：["2026-03-15_14:00", "2026-03-16_10:00"]
// ---------------------------------------------------------
function handleGetBooked() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    // 只有標題列或空白，回傳空陣列
    return respond({ booked: [] });
  }

  // 讀取 A 欄（日期）和 B 欄（時間），從第 2 列開始
  const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const timeCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();

  const booked = [];
  for (let i = 0; i < dateCol.length; i++) {
    const rawDate = dateCol[i][0];
    const time    = timeCol[i][0];
    if (!rawDate || !time) continue;

    // 將 Date 物件或字串統一轉成 "YYYY-MM-DD" 格式
    let dateStr;
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, "Asia/Taipei", "yyyy-MM-dd");
    } else {
      dateStr = String(rawDate).substring(0, 10);
    }

    booked.push(`${dateStr}_${time}`);
  }

  return respond({ booked });
}

// ---------------------------------------------------------
// 寫入一筆新預約
// ---------------------------------------------------------
function handleBook(params) {
  const { date, time, name, phone, email, category, service, notes } = params;

  // 基本驗證
  if (!date || !time || !name) {
    return respond({ success: false, error: "缺少必要欄位" });
  }

  const sheet = getSheet();

  // 防止重複預約：確認該時段是否已存在
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const timeCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < dateCol.length; i++) {
      const rawDate = dateCol[i][0];
      let existingDate;
      if (rawDate instanceof Date) {
        existingDate = Utilities.formatDate(rawDate, "Asia/Taipei", "yyyy-MM-dd");
      } else {
        existingDate = String(rawDate).substring(0, 10);
      }
      if (existingDate === date && timeCol[i][0] === time) {
        return respond({ success: false, error: "此時段已被預約" });
      }
    }
  }

  // 寫入新一列
  sheet.appendRow([
    date,
    time,
    name,
    phone || "",
    email || "",
    category || "",
    service || "",
    notes || "",
    Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss")
  ]);

  return respond({ success: true });
}

// ---------------------------------------------------------
// 取得（或建立）工作表，並確保標題列存在
// ---------------------------------------------------------
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 若是空白表格，新增標題列
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["日期", "時間", "姓名", "電話", "信箱", "服務類別", "服務項目", "備註", "建立時間"]);
    // 格式化標題列
    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4e8ef7");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// ---------------------------------------------------------
// 統一回傳 JSON（含 CORS header）
// ---------------------------------------------------------
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
