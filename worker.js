export default {
  async fetch(request, env) {
    // 處理 CORS 跨域請求（因為你的 Hugo 網站跟 Worker 網址不同）
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Only POST method is allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const { name, email, phone, date, time, notes } = data;

      // 產生 Google Calendar 的加入連結
      // 格式：https://calendar.google.com/calendar/r/eventedit?text=事件標題&dates=開始時間/結束時間&details=內容
      // 這裡將日期時間轉換為 YYYYMMDDTHHMMSSZ 的格式
      const startTime = new Date(`${date}T${time}:00`);
      // 預設一小時
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 

      // 將時間轉為 UTC 格式以符合 Google Calendar (移除 - 或 : 並加上 Z)
      const formatTime = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      
      const gcalTitle = encodeURIComponent(`預約：${name}`);
      const gcalDetails = encodeURIComponent(`姓名: ${name}\n電話: ${phone}\n信箱: ${email}\n備註: ${notes || '無'}`);
      const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${gcalDetails}`;

      // 使用 MailChannels 寄送信件
      // 注意：發件人(from)請設定為你剛建立的專屬 Gmail，或者其他能用的信箱
      const myEmail = "你的Gmail信箱@gmail.com"; // ★★★ 換成你的收件與發件信箱

      const mailBody = {
        personalizations: [
          {
            to: [{ email: myEmail, name: "預約管理員" }],
          },
        ],
        from: {
          email: "no-reply@你的專案名稱.workers.dev", // 這裡發信人網域隨意，MailChannels 通常能過
          name: "新預約通知",
        },
        subject: `新預約通知：${name} (${date} ${time})`,
        content: [
          {
            type: "text/html",
            value: `
              <h2>收到新的線上預約！</h2>
              <p><strong>姓名:</strong> ${name}</p>
              <p><strong>電話:</strong> ${phone}</p>
              <p><strong>電子郵件:</strong> ${email}</p>
              <p><strong>預約日期:</strong> ${date}</p>
              <p><strong>預約時間:</strong> ${time}</p>
              <p><strong>備註:</strong> ${notes || '無'}</p>
              <hr>
              <p>
                👉 <a href="${gcalLink}" target="_blank" style="background-color:#4285F4;color:white;padding:10px;text-decoration:none;border-radius:5px;">
                  點擊一鍵加入 Google 行事曆
                </a>
              </p>
            `,
          },
        ],
      };

      const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mailBody),
      });

      if (!mailResponse.ok) {
        const err = await mailResponse.text();
        return new Response("寄信失敗：" + err, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }

      return new Response("預約成功", { 
        status: 200, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      });

    } catch (error) {
      return new Response(error.toString(), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  }
};
