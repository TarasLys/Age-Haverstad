// import express from "express";
// import cors from "cors";
// import puppeteer from "puppeteer";

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.post("/api/notices/scrape-site", async (req, res) => {
//   const { from, to, cpv = "45000000", country = "Norway" } = req.body;
//   if (!from || !to) {
//     return res.status(400).json({ error: "from and to required" });
//   }

//   const tedUrl = `https://ted.europa.eu/en/results?fs=true&searchType=ADVANCED&locale=en&noticeType=CONTRACT_NOTICE&country=${country}&CPV=${cpv}&publicationDateFrom=${from}&publicationDateTo=${to}`;

//   console.log(`Запуск браузера...`);

//   let browser;
//   try {
//     browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     console.log(`Браузер запущен`);

//     const page = await browser.newPage();
//     console.log(`Открыта страница`);

//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
//     );

//     let noticesData = null;

//     console.log(`Перехватываем XHR-ответы...`);

//     page.on("response", async (response) => {
//       const url = response.url();
//       if (url.includes("/rest/notices/search")) {
//         console.log(`XHR-ответ получен: ${url}`);
//         try {
//           const json = await response.json();
//           if (json && Array.isArray(json.notices)) {
//             noticesData = json.notices;
//             console.log(`Данные получены: ${noticesData.length} уведомлений`);
//           }
//         } catch (e) {
//           console.error(`Ошибка при обработке XHR-ответа: ${e}`);
//         }
//       }
//     });

//     await page.goto(tedUrl, { waitUntil: "networkidle2", timeout: 60000 });
//     console.log(`Страница загружена`);

//     console.log(`Ждём, пока XHR не будет перехвачен (или таймаут)...`);

//     let waitTime = 0;
//     while (noticesData === null && waitTime < 10000) {
//       await new Promise((resolve) => setTimeout(resolve, 500));
//       waitTime += 500;
//       console.log(`Ожидание XHR-ответа... (${waitTime / 1000} секунд)`);
//     }

//     if (noticesData) {
//       console.log(`Результат получен: ${noticesData.length} уведомлений`);
//       res.json({ results: noticesData });
//     } else {
//       console.log(`Результат не получен`);
//       res.json({ results: [] });
//     }
//   } catch (err) {
//     console.error("TED site scraping error:", err);
//     res.status(500).json({ error: err.message || String(err) });
//   } finally {
//     if (browser) await browser.close();
//     console.log(`Браузер закрыт`);
//   }
// });

// const PORT = 4002;
// app.listen(PORT, () => {
//   console.log(`TED site scraper running on port ${PORT}`);
// });