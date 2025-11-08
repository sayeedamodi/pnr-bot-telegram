import puppeteer from "puppeteer";
import fetch from "node-fetch";

// ⚙️ Configuration
const PNR = "8928583873"; // your PNR
const URL = `https://www.confirmtkt.com/pnr-status/${PNR}`;

// Secrets (injected from GitHub Actions)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const CHAT_ID_VALIDATION = process.env.CHAT_ID_VALIDATION || ""; // new secondary chat

async function sendToTelegram(message, chatId) {
  if (!TELEGRAM_TOKEN || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Sent message to chat ${chatId}`);
    } else {
      console.error(`⚠️ Failed to send to ${chatId}:`, data.description);
    }
  } catch (err) {
    console.error(`❌ Error sending to chat ${chatId}:`, err);
  }
}

async function checkPNR() {
  console.log(`🔍 Checking PNR status for ${PNR}...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // wait for dynamic data
  await page.waitForFunction(
    () => document.body.innerText.includes("Chart") || document.body.innerText.includes("Booking Status"),
    { timeout: 40000 }
  );

  const text = await page.evaluate(() => document.body.innerText);

  const train = text.match(/\d{5}\s*-\s*[A-Z\s]+/)?.[0] || "N/A";
  const passengerStatus = text.match(/(CNF|RAC|WL)\s*\d*\s*\(?\d*%?\s*Chance\)?/i)?.[0] || "N/A";
  const bookingStatus = text.match(/Booking Status\s*\|\s*(.*?)\s*\|/i)?.[1] || "N/A";
  const chart = text.match(/Chart\s*(Prepared|not prepared)/i)?.[0] || "Chart status unavailable";

  const message = `🚆 *PNR Status Update*\n
*PNR:* ${PNR}
*Train:* ${train}
*Passenger:* ${passengerStatus}
*Booking:* ${bookingStatus}
*Chart:* ${chart}
⏰ ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

  console.log(message);

  // send to both chats
  if (TELEGRAM_TOKEN) {
    if (TELEGRAM_CHAT_ID) await sendToTelegram(message, TELEGRAM_CHAT_ID);
    if (CHAT_ID_VALIDATION) await sendToTelegram(message, CHAT_ID_VALIDATION);
  } else {
    console.log("⚠️ Telegram not configured — skipping message send.");
  }

  await browser.close();
}

await checkPNR();
