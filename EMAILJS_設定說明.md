# EmailJS 設定說明

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
        點擊按鈕即可將此預約加入 Google 行事曆（預設時長 90 分鐘）
      </p>
    </div>
  </div>
  <div style="padding: 16px 32px; background: #eee; text-align: center; font-size: 12px; color: #aaa;">
    此信件由預約系統自動發送
  </div>
</div>
```

4. 點 **Save** 儲存模板
5. 記下畫面顯示的 **Template ID**（格式類似 `template_xxxxxxx`）

---

## 第四步：取得 Public Key

1. 右上角點你的頭像 → **Account**
2. 找到 **Public Key**（格式類似 `xxxxxxxxxxxxxxxxxxx`）

---

## 第五步：填入程式碼

打開 `layouts/index.html`，找到以下這段（約第 169–171 行）：

```js
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
```

把三個 `"YOUR_..."` 換成你剛才取得的實際值，例如：

```js
const EMAILJS_PUBLIC_KEY  = "xxxxxxxxxxxxxxxxxxx";
const EMAILJS_SERVICE_ID  = "service_abc1234";
const EMAILJS_TEMPLATE_ID = "template_xyz5678";
```

儲存後重新 deploy 到 Cloudflare Pages，即可正常運作。

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
