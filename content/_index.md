+++
title = 'a little 私藏手作美學'
date = 2026-02-21T00:00:00+08:00
draft = false
+++

<style>
.booking-wrapper {
  max-width: 560px;
  margin: 40px auto;
  background: var(--entry, #1e1e1e);
  border-radius: 12px;
  padding: 36px 40px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}

.booking-wrapper h2 {
  text-align: center;
  margin-bottom: 8px;
  font-size: 1.5rem;
}

.booking-wrapper p.subtitle {
  text-align: center;
  color: var(--secondary, #aaa);
  margin-bottom: 28px;
  font-size: 0.95rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--primary, #ddd);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border, #444);
  background: var(--theme, #121212);
  color: var(--primary, #ddd);
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4e8ef7;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background-color: #4e8ef7;
  color: white;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background-color: #3a7ae0;
}

#form-status {
  text-align: center;
  margin-top: 14px;
  font-weight: bold;
  min-height: 24px;
}
</style>

<div class="booking-wrapper">
  <h2>a little 私藏手作美學線上預約</h2>
  <p class="subtitle">歡迎填寫預約表單，我們收到申請後會盡快確認並回覆。</p>

  <form id="booking-form">
    <div class="form-group">
      <label for="name">姓名</label>
      <input type="text" id="name" name="name" placeholder="請輸入您的姓名" required>
    </div>

    <div class="form-group">
      <label for="email">電子郵件</label>
      <input type="email" id="email" name="email" placeholder="example@email.com" required>
    </div>

    <div class="form-group">
      <label for="phone">聯絡電話</label>
      <input type="tel" id="phone" name="phone" placeholder="0912-345-678" required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="date">預約日期</label>
        <input type="date" id="date" name="date" required>
      </div>
      <div class="form-group">
        <label for="time">預約時間</label>
        <input type="time" id="time" name="time" required>
      </div>
    </div>

    <div class="form-group">
      <label for="notes">備註（選填）</label>
      <textarea id="notes" name="notes" rows="3" placeholder="如有特殊需求請在此說明"></textarea>
    </div>

    <button type="submit" class="submit-btn">送出預約</button>
    <div id="form-status"></div>
  </form>
</div>

<script>
  document.getElementById("booking-form").addEventListener("submit", async function(e) {
    e.preventDefault();
    const form = e.target;
    const statusDiv = document.getElementById("form-status");
    statusDiv.textContent = "傳送中...";
    statusDiv.style.color = "#4e8ef7";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        statusDiv.textContent = "預約成功！我們已收到您的資訊，將盡快與您確認。";
        statusDiv.style.color = "#4caf50";
        form.reset();
      } else {
        const errorMsg = await response.text();
        statusDiv.textContent = "預約失敗，請稍後再試。錯誤：" + errorMsg;
        statusDiv.style.color = "#f44336";
      }
    } catch (error) {
      statusDiv.textContent = "傳送發生錯誤，請檢查網路連線。";
      statusDiv.style.color = "#f44336";
    }
  });
</script>
