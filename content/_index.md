+++
title = '線上預約'
date = 2026-02-21T00:00:00+08:00
draft = false
+++

歡迎填寫預約表單，我們收到您的申請後會盡快確認並回覆給您。

<!-- HTML Form -->
<form id="booking-form" style="max-width: 500px; margin: auto; display: flex; flex-direction: column; gap: 15px;">
  
  <label for="name">姓名:</label>
  <input type="text" id="name" name="name" required style="padding: 8px;">

  <label for="email">電子郵件:</label>
  <input type="email" id="email" name="email" required style="padding: 8px;">

  <label for="phone">聯絡電話:</label>
  <input type="tel" id="phone" name="phone" required style="padding: 8px;">

  <label for="date">預約日期:</label>
  <input type="date" id="date" name="date" required style="padding: 8px;">

  <label for="time">預約時間:</label>
  <input type="time" id="time" name="time" required style="padding: 8px;">

  <label for="notes">備註:</label>
  <textarea id="notes" name="notes" rows="4" style="padding: 8px;"></textarea>

  <button type="submit" style="padding: 10px 15px; background-color: #007bff; color: white; border: none; cursor: pointer;">
    送出預約
  </button>
  
  <div id="form-status" style="margin-top: 10px; font-weight: bold;"></div>
</form>

<script>
  document.getElementById("booking-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const statusDiv = document.getElementById("form-status");
    statusDiv.textContent = "傳送中...";
    statusDiv.style.color = "blue";
    
    // 從表單收集資料
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      // 呼叫 Cloudflare Pages Functions
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        statusDiv.textContent = "預約成功！我們已收到您的資訊。";
        statusDiv.style.color = "green";
        form.reset();
      } else {
        const errorMsg = await response.text();
        statusDiv.textContent = "預約失敗，請稍後再試。錯誤：" + errorMsg;
        statusDiv.style.color = "red";
      }
    } catch (error) {
      statusDiv.textContent = "傳送發生錯誤，請檢查網路連線。";
      statusDiv.style.color = "red";
    }
  });
</script>
