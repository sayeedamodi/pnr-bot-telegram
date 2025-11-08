import puppeteer from "puppeteer";
import fetch from "node-fetch";

const PNR = "8928583873";
const URL = `https://www.confirmtkt.com/pnr-status/${PNR}`;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

async function checkPNR() {
  console.log(`🔍 Checking PNR status for ${PNR}...\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // ✅ Wait for text that indicates content loaded
  await page.waitForFunction(
    () => document.body.innerText.includes("Chart") || document.body.innerText.includes("Booking Status"),
    { timeout: 40000 }
  );

  const text = await page.evaluate(() => document.body.innerText);

  // 🧩 Extract details using regex
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

  if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    console.log("✅ Sent to Telegram");
  } else {
    console.log("⚠️ Telegram not configured — skipping message send.");
  }

  await browser.close();
}

await checkPNR();

