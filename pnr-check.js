import puppeteer from "puppeteer";
import fetch from "node-fetch";

// ⚙️ Configuration
const PNR = "8928583873"; // Hardcode your PNR number
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

  // ✅ Wait for PNR status text to appear
  try {
    await page.waitForSelector("body", { timeout: 30000 });

    const result = await page.evaluate(() => {
      const text = document.body.innerText;

      const pnrMatch = text.match(/PNR\s*:\s*(\d{10})/i);
      const trainMatch = text.match(/\d{5}\s*-\s*[A-Z\s]+/i);
      const passengerMatch = text.match(/GNWL.*Chance|CNF|RAC.*/i);
      const bookingMatch = text.match(/Booking Status\s*\|\s*(.*?)\s*\|/i);
      const chartMatch = text.match(/Chart.*(Prepared|not prepared)/i);

      return {
        pnr: pnrMatch ? pnrMatch[1] : null,
        train: trainMatch ? trainMatch[0] : null,
        passengerStatus: passengerMatch ? passengerMatch[0] : null,
        bookingStatus: bookingMatch ? bookingMatch[1] : null,
        chart: chartMatch ? chartMatch[0] : "Chart status unavailable",
      };
    });

    const message = `🚆 *PNR Status Update*\n
*PNR:* ${result.pnr || PNR}
*Train:* ${result.train || "N/A"}
*Passenger:* ${result.passengerStatus || "N/A"}
*Booking:* ${result.bookingStatus || "N/A"}
*Chart:* ${result.chart || "N/A"}
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

  } catch (err) {
    console.error("❌ Error extracting data:", err);
  } finally {
    await browser.close();
  }
}

await checkPNR();
