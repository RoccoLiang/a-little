export async function onRequestPost(context) {
  try {
    const { request } = context;
    const data = await request.json();
    const { name, email, phone, date, time, notes } = data;

    // 產生 Google Calendar 的加入連結
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 

    const formatTime = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    const gcalTitle = encodeURIComponent(`預約：${name}`);
    const gcalDetails = encodeURIComponent(`姓名: ${name}\n電話: ${phone}\n信箱: ${email}\n備註: ${notes || '無'}`);
    const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${formatTime(startTime)}/${formatTime(endTime)}&details=${gcalDetails}`;

    // 使用 MailChannels 寄送信件
    const myEmail = "YOUR_EMAIL@gmail.com"; // ★★★ 到時候把這裡換成你的真實信箱

    const mailBody = {
      personalizations: [
        {
          to: [{ email: myEmail, name: "預約管理員" }],
        },
      ],
      from: {
        // MailChannels 要求發信人的網域最好是固定的，所以我們用 Cloudflare Pages 預設網址
        email: "no-reply@a-little.pages.dev", 
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
      return new Response("寄信失敗：" + err, { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: "預約成功！" }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.toString() }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
