import puppeteer from "puppeteer";
import fetch from "node-fetch";

// ⚙️ Configuration
const PNR = "8928583873"; // 👈 Hardcode your PNR number here
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
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

  const pnrData = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split("\n").map(x => x.trim()).filter(Boolean);

    const train = lines.find(x => x.match(/\d{5} - /)) || "";
    const passengerStatus = lines.find(x => x.includes("Chance") || x.includes("CNF") || x.includes("WL")) || "";
    const bookingStatus = lines.find(x => x.includes("Booking Status")) || "";
    const chart = lines.find(x => x.toLowerCase().includes("chart")) || "";

    return { train, passengerStatus, bookingStatus, chart };
  });

  await browser.close();

  const message = `🚆 *PNR Status Update*\n
*PNR:* ${PNR}
*Train:* ${pnrData.train || "N/A"}
*Passenger:* ${pnrData.passengerStatus || "N/A"}
*Booking:* ${pnrData.bookingStatus || "N/A"}
*Chart:* ${pnrData.chart || "N/A"}
⏰ ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

  console.log(message);

  if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
    try {
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
    } catch (err) {
      console.error("⚠️ Failed to send Telegram message:", err);
    }
  } else {
    console.log("⚠️ Telegram not configured — skipping message send.");
  }
}

await checkPNR();
