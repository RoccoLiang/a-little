# 預約系統設定說明

本系統由兩個部分組成：
- **EmailJS**：客人送出預約時，自動寄通知信到你的 Gmail
- **Google Sheets + Apps Script**：記錄已預約時段，讓前端日曆顯示反灰

---

# Part 1 — EmailJS 設定說明

預約表單使用 [EmailJS](https://www.emailjs.com) 寄送通知信。
以下步驟完成後，每次有客人送出預約，就會自動寄信到你的 Gmail。

---

## 第一步：註冊 EmailJS 帳號

1. 前往 https://www.emailjs.com 點選 **Sign Up Free**
2. 用你的 Gmail（rocco.liang@gmail.com）註冊

---

## 第二步：新增 Email Service（連結 Gmail）

1. 登入後，左側選單點 **Email Services**
2. 點 **Add New Service**，選擇 **Gmail**
3. 點 **Connect Account**，登入你的 Gmail 帳號授權
4. Service Name 可填 `gmail`，點 **Create Service**
5. 記下畫面顯示的 **Service ID**（格式類似 `service_xxxxxxx`）

---

## 第三步：建立 Email Template（信件模板）

1. 左側選單點 **Email Templates**
2. 點 **Create New Template**
3. 依照以下設定填寫：

### Template Settings（上方欄位）

| 欄位 | 填入內容 |
|------|---------|
| **To Email** | `rocco.liang@gmail.com` |
| **From Name** | `預約系統通知` |
| **Subject** | `新預約：{{name}} — {{category}} {{service}}（{{date}} {{time}}）` |
| **Reply To** | `{{email}}` |

### Template Body（選 HTML 頁籤，貼上以下內容）

```html
<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; overflow: hidden;">
  <div style="background: #4e8ef7; padding: 24px 32px;">
    <h2 style="color: white; margin: 0;">📋 新預約通知</h2>
  </div>
  <div style="padding: 28px 32px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #888; width: 100px; font-size: 14px;">姓名</td>
        <td style="padding: 8px 0; font-weight: bold; color: #222;">{{name}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #888; font-size: 14px;">電話</td>
        <td style="padding: 8px 0; color: #222;">{{phone}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #888; font-size: 14px;">信箱</td>
        <td style="padding: 8px 0; color: #222;">{{email}}</td>
      </tr>
      <tr style="background: #f0f5ff;">
        <td style="padding: 10px 8px; color: #555; font-size: 14px; border-radius: 6px;">服務類別</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #4e8ef7;">{{category}}</td>
      </tr>
      <tr style="background: #f0f5ff;">
        <td style="padding: 10px 8px; color: #555; font-size: 14px;">服務項目</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #4e8ef7;">{{service}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #888; font-size: 14px;">日期</td>
        <td style="padding: 8px 0; color: #222;">{{date}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #888; font-size: 14px;">時間</td>
        <td style="padding: 8px 0; color: #222;">{{time}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #888; font-size: 14px; vertical-align: top;">備註</td>
        <td style="padding: 8px 0; color: #222;">{{notes}}</td>
      </tr>
    </table>

    <div style="margin-top: 28px; text-align: center;">
      <a href="{{gcal_link}}"
         style="display: inline-block; background: #4285F4; color: white; text-decoration: none;
                padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: bold;">
        📅 一鍵加入 Google 行事曆
      </a>
      <p style="font-size: 12px; color: #aaa; margin-top: 10px;">
        點擊按鈕即可將此預約加入 Google 行事曆（時長 60 分鐘）
      </p>
    </div>

    {{#if surcharge}}
    <div style="margin-top: 16px; background: #fff8e1; border: 1px solid #ffcc02; border-radius: 8px; padding: 10px 16px; font-size: 14px; color: #e65100;">
      ⚠️ 加班費：{{surcharge}}
    </div>
    {{/if}}

  </div>
  <div style="padding: 16px 32px; background: #eee; text-align: center; font-size: 12px; color: #aaa;">
    此信件由預約系統自動發送
  </div>
</div>
```

> **注意：** EmailJS 的模板語法不支援 `{{#if}}`。若要顯示加班費，請改成這個簡單版本（直接顯示 surcharge 欄位，不為空時才有意義）：
>
> 在表格中多加一列：
> ```html
> <tr>
>   <td style="padding: 8px 0; color: #888; font-size: 14px;">加班費</td>
>   <td style="padding: 8px 0; color: #e65100; font-weight: bold;">{{surcharge}}</td>
> </tr>
> ```
> 插入在「備註」那列前面即可。

4. 點 **Save** 儲存模板
5. 記下畫面顯示的 **Template ID**（格式類似 `template_xxxxxxx`）

---

## 第四步：取得 Public Key

1. 右上角點你的頭像 → **Account**
2. 找到 **Public Key**（格式類似 `xxxxxxxxxxxxxxxxxxx`）

---

## 第五步：填入程式碼

✅ EmailJS 的三組金鑰已填入 `layouts/index.html`。

完成 Part 2（Google Apps Script）設定後，再將 Apps Script 網址填入 `APPS_SCRIPT_URL` 欄位，即可正常運作。

---

## 免費額度說明

EmailJS 免費方案每月可寄送 **200 封信**。若預約量增加，可考慮付費升級或評估其他方案（Resend 免費 3,000 封/月但需設定自訂網域）。

---

## 服務項目自訂

如需新增或修改美甲、美睫的服務項目，編輯 `layouts/index.html` 中的 `SERVICES` 物件：

```js
const SERVICES = {
  nail: {
    items: [
      "凝膠指甲（素色）",
      "凝膠指甲（設計款）",
      // ← 在這裡新增或修改美甲項目
    ]
  },
  lash: {
    items: [
      "自然款（單根嫁接）",
      // ← 在這裡新增或修改美睫項目
    ]
  }
};
```

---
---

# Part 2 — Google Sheets + Apps Script 設定說明

這個部分讓網站能「記住」哪些時段已被預約，並在日曆上自動反灰。

---

## 第一步：建立 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com)，建立一個新的試算表
2. 名稱可隨意取，例如「美甲美睫預約紀錄」
3. 不需要手動建立欄位，程式會自動建立標題列

---

## 第二步：開啟 Apps Script

1. 在 Google Sheet 上方選單點「**擴充功能**」→「**Apps Script**」
2. 預設會有一個空白的 `function myFunction() {}` 程式碼
3. **全選並刪除**，然後**貼上 `GOOGLE_APPS_SCRIPT.js` 的全部內容**
4. 點左上角**磁碟圖示**儲存（或按 Ctrl+S）

---

## 第三步：部署為網頁應用程式

1. 點右上角「**部署**」→「**新增部署作業**」
2. 點左側齒輪圖示，選「**網頁應用程式**」
3. 設定如下：

| 欄位 | 設定值 |
|------|--------|
| **執行身分** | 我（你的 Google 帳號） |
| **誰可以存取** | 所有人（包含匿名使用者） |

4. 點「**部署**」
5. Google 可能要求你授權，點「授予存取權」→ 選你的帳號 → 點「允許」
6. 複製畫面上的「**網頁應用程式網址**」（格式類似 `https://script.google.com/macros/s/xxxxx/exec`）

---

## 第四步：填入網址

打開 `layouts/index.html`，找到這一行（約第 280 行）：

```js
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_URL";
```

替換成你剛才複製的網址：

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/xxxxx/exec";
```

---

## 第五步：重新部署到 Cloudflare

```bash
git add layouts/index.html
git commit -m "設定 Google Apps Script URL"
git push origin master
```

---

## 日後更新 Apps Script 程式碼

若你之後修改了 `GOOGLE_APPS_SCRIPT.js` 的內容，需要在 Apps Script 裡重新部署才會生效：

1. 在 Apps Script 點「**部署**」→「**管理部署作業**」
2. 點右側鉛筆圖示編輯
3. 版本選「**建立新版本**」
4. 點「**部署**」（網址不變，不需要重新填入）

---

## 如何手動封鎖某個時段？

直接在 Google Sheet 的「預約紀錄」工作表手動新增一列，填入日期和時間即可。頁面下次載入時，那個時段就會自動反灰。

| 日期 | 時間 | 姓名 | 備註 |
|------|------|------|------|
| 2026-03-20 | 14:00 | （休假） | 封鎖時段 |
