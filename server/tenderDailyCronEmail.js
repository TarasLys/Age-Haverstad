// import fetch from "node-fetch";
// import cron from "node-cron";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import emailjs from "@emailjs/nodejs";
// import { fileURLToPath } from "url";

// // Получаем __dirname для ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Пути к .env и last_tenders.json
// const ENV_PATH = path.resolve(__dirname, "../.env");
// const DATA_FILE = path.resolve(__dirname, "../last_tenders.json");

// console.log("Путь к last_tenders.json:", DATA_FILE);

// // Загружаем переменные окружения
// const envResult = dotenv.config({ path: ENV_PATH });
// const env = envResult.parsed || {};

// // EmailJS config из .env
// const EMAIL_SERVICE_ID = env.VITE_EMAIL_SERVICE_ID;
// const EMAIL_TEMPLATE_ID = env.VITE_EMAIL_TEMPLATE_ID;
// const EMAIL_USER_ID = env.VITE_EMAIL_USER_ID;
// const TO_EMAIL = env.VITE_TO_EMAIL;
// const FROM_EMAIL = env.VITE_FROM_EMAIL;
// const NODE_ENV = (env.NODE_ENV || "development").toLowerCase();

// // Параметры выборки
// const CPV = "45000000";
// const LOCATION = "";

// const getToday = () => new Date().toISOString().slice(0, 10);
// const getYesterday = () => {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// // Получить тендеры за последние сутки
// async function fetchTenders() {
//   const from = getYesterday();
//   const to = getToday();
//   const body = {
//     from,
//     to,
//     cpv: CPV,
//     location: LOCATION,
//   };
//   console.log("fetchTenders: from", from, "to", to, "body", body);
//   const res = await fetch("http://localhost:4003/api/notices/doffin-scrape", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error("Ошибка запроса тендеров: " + res.statusText);
//   const data = await res.json();
//   console.log("fetchTenders: получено тендеров", (data.results || []).length);
//   return data.results || [];
// }

// // Сравнить с предыдущими тендерами и вернуть только новые
// function getNewTenders(current, previous) {
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   return current.filter(t => !(prevSet.has(t.link || t.title)));
// }

// // Загрузить предыдущие тендеры
// function loadPreviousTenders() {
//   if (!fs.existsSync(DATA_FILE)) return [];
//   try {
//     return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
//   } catch (e) {
//     console.error("Ошибка чтения last_tenders.json:", e);
//     return [];
//   }
// }

// // Сохранить текущие тендеры для следующего запуска
// function saveTendersFull(currentTenders) {
//   try {
//     fs.writeFileSync(DATA_FILE, JSON.stringify(currentTenders, null, 2), "utf-8");
//     console.log(`last_tenders.json обновлён: ${DATA_FILE} (тендеров: ${currentTenders.length})`);
//   } catch (e) {
//     console.error("Ошибка записи last_tenders.json:", e);
//   }
// }

// // Сформировать текст письма
// function formatEmailBody(tenders) {
//   if (!tenders.length) return "Нет новых тендеров за последние сутки.";
//   return tenders.map(t =>
//     `Название: ${t.title}\nОписание: ${t.description || "-"}\nСсылка: ${t.link}\nДата публикации: ${t.publicationDate}\nОппdragsgiver: ${t.buyer}\n`
//   ).join("\n----------------------\n");
// }

// // Отправить email через EmailJS
// async function sendEmail(newTenders) {
//   const message = formatEmailBody(newTenders);
//   const templateParams = {
//     from_email: FROM_EMAIL,
//     to_email: TO_EMAIL,
//     message,
//     subject: "Новые тендеры за сутки",
//   };
//   await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, {
//     publicKey: EMAIL_USER_ID,
//   });
//   console.log("Email отправлен через EmailJS");
// }

// // Основная функция: всегда сохраняет тендеры, даже если письмо не ушло
// async function checkAndSendTenders() {
//   let currentTenders = [];
//   try {
//     currentTenders = await fetchTenders();
//     console.log("Тендеры, полученные от API:", currentTenders.length, currentTenders);
//     const previousTenders = loadPreviousTenders();
//     const newTenders = getNewTenders(currentTenders, previousTenders);

//     if (newTenders.length > 0) {
//       await sendEmail(newTenders);
//     } else {
//       console.log("Новых тендеров нет, письмо не отправляется.");
//     }
//   } catch (err) {
//     console.error("Ошибка в ежедневной задаче тендеров:", err);
//   } finally {
//     // Сохраняем тендеры всегда, даже если отправка письма не удалась
//     if (currentTenders.length > 0) {
//       saveTendersFull(currentTenders);
//     }
//   }
// }

// // Запускать каждый день в 14:00
// cron.schedule("0 14 * * *", () => {
//   console.log("Запуск ежедневной проверки тендеров в 14:00");
//   checkAndSendTenders();
// });

// // Для ручного теста (можно удалить в проде)
// if (NODE_ENV !== "production") {
//   checkAndSendTenders();
// }

// import fetch from "node-fetch";
// import cron from "node-cron";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import emailjs from "@emailjs/nodejs";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const ENV_PATH = path.resolve(__dirname, "../.env");
// const DATA_FILE = path.resolve(__dirname, "../last_tenders.json");

// console.log("Путь к last_tenders.json:", DATA_FILE);

// const envResult = dotenv.config({ path: ENV_PATH });
// const env = envResult.parsed || {};

// const EMAIL_SERVICE_ID = env.VITE_EMAIL_SERVICE_ID;
// const EMAIL_TEMPLATE_ID = env.VITE_EMAIL_TEMPLATE_ID;
// const EMAIL_USER_ID = env.VITE_EMAIL_USER_ID;
// const TO_EMAIL = env.VITE_TO_EMAIL;
// const FROM_EMAIL = env.VITE_FROM_EMAIL;
// const NODE_ENV = (env.NODE_ENV || "development").toLowerCase();

// const CPV = "45000000";
// const LOCATION = "";

// const getToday = () => new Date().toISOString().slice(0, 10);
// const getYesterday = () => {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// async function fetchTenders() {
//   const from = getYesterday();
//   const to = getToday();
//   const body = {
//     from,
//     to,
//     cpv: CPV,
//     location: LOCATION,
//   };
//   console.log("fetchTenders: from", from, "to", to, "body", body);
//   const res = await fetch("http://localhost:4003/api/notices/doffin-scrape", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error("Ошибка запроса тендеров: " + res.statusText);
//   const data = await res.json();
//   console.log("fetchTenders: получено тендеров", (data.results || []).length);
//   return data.results || [];
// }

// function getNewTenders(current, previous) {
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   return current.filter(t => !(prevSet.has(t.link || t.title)));
// }

// function loadPreviousTenders() {
//   if (!fs.existsSync(DATA_FILE)) return [];
//   try {
//     return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
//   } catch (e) {
//     console.error("Ошибка чтения last_tenders.json:", e);
//     return [];
//   }
// }

// function saveTendersFull(currentTenders) {
//   try {
//     fs.writeFileSync(DATA_FILE, JSON.stringify(currentTenders, null, 2), "utf-8");
//     console.log(`last_tenders.json обновлён: ${DATA_FILE} (тендеров: ${currentTenders.length})`);
//   } catch (e) {
//     console.error("Ошибка записи last_tenders.json:", e);
//   }
// }

// function formatEmailBody(tenders) {
//   if (!tenders.length) return "Нет новых тендеров за последние сутки.";
//   return tenders.map(t =>
//     `Название: ${t.title}\nОписание: ${t.description || "-"}\nСсылка: ${t.link}\nДата публикации: ${t.publicationDate}\nОппdragsgiver: ${t.buyer}\n`
//   ).join("\n----------------------\n");
// }

// async function sendEmail(newTenders) {
//   const message = formatEmailBody(newTenders);
//   const templateParams = {
//     from_email: FROM_EMAIL,
//     to_email: TO_EMAIL,
//     message,
//     subject: "Новые тендеры за сутки",
//   };
//   await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, {
//     publicKey: EMAIL_USER_ID,
//   });
//   console.log("Email отправлен через EmailJS");
// }

// async function checkAndSendTenders() {
//   try {
//     const currentTenders = await fetchTenders();
//     console.log("Тендеры, полученные от API:", currentTenders.length, currentTenders);
//     const previousTenders = loadPreviousTenders();
//     const newTenders = getNewTenders(currentTenders, previousTenders);

//     if (newTenders.length > 0) {
//       await sendEmail(newTenders);
//     } else {
//       console.log("Новых тендеров нет, письмо не отправляется.");
//     }
//     saveTendersFull(currentTenders);
//   } catch (err) {
//     console.error("Ошибка в ежедневной задаче тендеров:", err);
//   }
// }

// cron.schedule("0 14 * * *", () => {
//   console.log("Запуск ежедневной проверки тендеров в 14:00");
//   checkAndSendTenders();
// });

// if (NODE_ENV !== "production") {
//   checkAndSendTenders();
// }





// import fetch from "node-fetch";
// import cron from "node-cron";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import emailjs from "@emailjs/nodejs";
// import { fileURLToPath } from "url";

// // Получаем __dirname для ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Пути к .env и last_tenders.json
// const ENV_PATH = path.resolve(__dirname, "../.env");
// const DATA_FILE = path.resolve(__dirname, "../last_tenders.json");

// // Загружаем переменные окружения
// const envResult = dotenv.config({ path: ENV_PATH });
// const env = envResult.parsed || {};

// // EmailJS config из .env
// const EMAIL_SERVICE_ID = env.VITE_EMAIL_SERVICE_ID;
// const EMAIL_TEMPLATE_ID = env.VITE_EMAIL_TEMPLATE_ID;
// const EMAIL_USER_ID = env.VITE_EMAIL_USER_ID;
// const TO_EMAIL = env.VITE_TO_EMAIL;
// const FROM_EMAIL = env.VITE_FROM_EMAIL;
// const NODE_ENV = (env.NODE_ENV || "development").toLowerCase();

// // Параметры выборки (можно расширить)
// const CPV = "45000000";
// const LOCATION = ""; // или нужный регион

// const getToday = () => new Date().toISOString().slice(0, 10);
// const getYesterday = () => {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// // Получить тендеры за последние сутки
// async function fetchTenders() {
//   const from = getYesterday();
//   const to = getToday();
//   const body = {
//     from,
//     to,
//     cpv: CPV,
//     location: LOCATION,
//   };
//   const res = await fetch("http://localhost:4003/api/notices/doffin-scrape", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error("Ошибка запроса тендеров: " + res.statusText);
//   const data = await res.json();
//   return data.results || [];
// }

// // Сравнить с предыдущими тендерами и вернуть только новые
// function getNewTenders(current, previous) {
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   return current.filter(t => !(prevSet.has(t.link || t.title)));
// }

// // Загрузить предыдущие тендеры
// function loadPreviousTenders() {
//   if (!fs.existsSync(DATA_FILE)) return [];
//   try {
//     return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
//   } catch (e) {
//     console.error("Ошибка чтения last_tenders.json:", e);
//     return [];
//   }
// }

// // Инкрементальное сохранение новых тендеров
// function saveTendersIncremental(newTenders) {
//   const previous = loadPreviousTenders();
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   const merged = [
//     ...previous,
//     ...newTenders.filter(t => !(prevSet.has(t.link || t.title)))
//   ];
//   fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), "utf-8");
//   console.log(`Сохранено тендеров всего: ${merged.length} (добавлено новых: ${newTenders.length})`);
// }

// // Сформировать текст письма
// function formatEmailBody(tenders) {
//   if (!tenders.length) return "Нет новых тендеров за последние сутки.";
//   return tenders.map(t =>
//     `Название: ${t.title}\nОписание: ${t.description || "-"}\nСсылка: ${t.link}\nДата публикации: ${t.publicationDate}\nОппdragsgiver: ${t.buyer}\n`
//   ).join("\n----------------------\n");
// }

// // Отправить email через EmailJS
// async function sendEmail(newTenders) {
//   const message = formatEmailBody(newTenders);
//   const templateParams = {
//     from_email: FROM_EMAIL,
//     to_email: TO_EMAIL,
//     message,
//     subject: "Новые тендеры за сутки",
//   };
//   await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, {
//     publicKey: EMAIL_USER_ID,
//   });
//   console.log("Email отправлен через EmailJS");
// }

// // Основная функция
// async function checkAndSendTenders() {
//   try {
//     const currentTenders = await fetchTenders();
//     const previousTenders = loadPreviousTenders();
//     const newTenders = getNewTenders(currentTenders, previousTenders);

//     if (newTenders.length > 0) {
//       await sendEmail(newTenders);
//       saveTendersIncremental(newTenders);
//     } else {
//       console.log("Новых тендеров нет, письмо не отправляется.");
//     }
//   } catch (err) {
//     console.error("Ошибка в ежедневной задаче тендеров:", err);
//   }
// }

// // Запускать каждый день в 14:00
// cron.schedule("0 14 * * *", () => {
//   console.log("Запуск ежедневной проверки тендеров в 14:00");
//   checkAndSendTenders();
// });

// // Для ручного теста (можно удалить в проде)
// if (NODE_ENV !== "production") {
//   checkAndSendTenders();
// }


// /* eslint-env node */
// import fetch from "node-fetch";
// import cron from "node-cron";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import emailjs from "@emailjs/nodejs";

// dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// const API_URL = "http://localhost:4003/api/notices/doffin-scrape";
// const DATA_FILE = path.resolve(process.cwd(), "last_tenders.json");

// // EmailJS config from .env
// const EMAIL_SERVICE_ID = process.env.VITE_EMAIL_SERVICE_ID;
// const EMAIL_TEMPLATE_ID = process.env.VITE_EMAIL_TEMPLATE_ID;
// const EMAIL_USER_ID = process.env.VITE_EMAIL_USER_ID;
// const TO_EMAIL = process.env.VITE_TO_EMAIL;
// const FROM_EMAIL = process.env.VITE_FROM_EMAIL;

// // Параметры выборки (можно расширить)
// const CPV = "45000000";
// const LOCATION = ""; // или нужный регион

// const getToday = () => new Date().toISOString().slice(0, 10);
// const getYesterday = () => {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// // Получить тендеры за последние сутки
// async function fetchTenders() {
//   const from = getYesterday();
//   const to = getToday();
//   const body = {
//     from,
//     to,
//     cpv: CPV,
//     location: LOCATION,
//   };
//   const res = await fetch(API_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error("Ошибка запроса тендеров: " + res.statusText);
//   const data = await res.json();
//   return data.results || [];
// }

// // Сравнить с предыдущими тендерами и вернуть только новые
// function getNewTenders(current, previous) {
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   return current.filter(t => !(prevSet.has(t.link || t.title)));
// }

// // Загрузить предыдущие тендеры
// function loadPreviousTenders() {
//   if (!fs.existsSync(DATA_FILE)) return [];
//   try {
//     return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
//   } catch (e) {
//     console.error("Ошибка чтения last_tenders.json:", e);
//     return [];
//   }
// }

// // Инкрементальное сохранение новых тендеров
// function saveTendersIncremental(newTenders) {
//   const previous = loadPreviousTenders();
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   const merged = [
//     ...previous,
//     ...newTenders.filter(t => !(prevSet.has(t.link || t.title)))
//   ];
//   fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), "utf-8");
//   console.log(`Сохранено тендеров всего: ${merged.length} (добавлено новых: ${newTenders.length})`);
// }

// // Сформировать текст письма
// function formatEmailBody(tenders) {
//   if (!tenders.length) return "Нет новых тендеров за последние сутки.";
//   return tenders.map(t =>
//     `Название: ${t.title}\nОписание: ${t.description || "-"}\nСсылка: ${t.link}\nДата публикации: ${t.publicationDate}\nОппdragsgiver: ${t.buyer}\n`
//   ).join("\n----------------------\n");
// }

// // Отправить email через EmailJS
// async function sendEmail(newTenders) {
//   const message = formatEmailBody(newTenders);
//   const templateParams = {
//     from_email: FROM_EMAIL,
//     to_email: TO_EMAIL,
//     message,
//     subject: "Новые тендеры за сутки",
//   };
//   await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, {
//     publicKey: EMAIL_USER_ID,
//   });
//   console.log("Email отправлен через EmailJS");
// }

// // Основная функция
// async function checkAndSendTenders() {
//   try {
//     const currentTenders = await fetchTenders();
//     const previousTenders = loadPreviousTenders();
//     const newTenders = getNewTenders(currentTenders, previousTenders);

//     if (newTenders.length > 0) {
//       await sendEmail(newTenders);
//       saveTendersIncremental(newTenders);
//     } else {
//       console.log("Новых тендеров нет, письмо не отправляется.");
//     }
//   } catch (err) {
//     console.error("Ошибка в ежедневной задаче тендеров:", err);
//   }
// }

// // Запускать каждый день в 14:00
// cron.schedule("0 14 * * *", () => {
//   console.log("Запуск ежедневной проверки тендеров в 14:00");
//   checkAndSendTenders();
// });

// // Для ручного теста (можно удалить в проде)
// if (process.env.NODE_ENV !== "production") {
//   checkAndSendTenders();
// }




//  /* eslint-env node */
// import fetch from "node-fetch";
// import cron from "node-cron";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import emailjs from "@emailjs/nodejs";

// dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// const API_URL = "http://localhost:4003/api/notices/doffin-scrape";
// const DATA_FILE = path.resolve(process.cwd(), "last_tenders.json");

// // EmailJS config from .env
// const EMAIL_SERVICE_ID = process.env.VITE_EMAIL_SERVICE_ID;
// const EMAIL_TEMPLATE_ID = process.env.VITE_EMAIL_TEMPLATE_ID;
// const EMAIL_USER_ID = process.env.VITE_EMAIL_USER_ID;
// const TO_EMAIL = process.env.VITE_TO_EMAIL;
// const FROM_EMAIL = process.env.VITE_FROM_EMAIL;

// // Параметры выборки (можно расширить)
// const CPV = "45000000";
// const LOCATION = ""; // или нужный регион
// const getToday = () => new Date().toISOString().slice(0, 10);
// const getYesterday = () => {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// // Получить тендеры за последние сутки
// async function fetchTenders() {
//   const from = getYesterday();
//   const to = getToday();
//   const body = {
//     from,
//     to,
//     cpv: CPV,
//     location: LOCATION,
//   };
//   const res = await fetch(API_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) throw new Error("Ошибка запроса тендеров: " + res.statusText);
//   const data = await res.json();
//   return data.results || [];
// }

// // Сравнить с предыдущими тендерами и вернуть только новые
// function getNewTenders(current, previous) {
//   const prevSet = new Set((previous || []).map(t => t.link || t.title));
//   return current.filter(t => !(prevSet.has(t.link || t.title)));
// }

// // Сохранить текущие тендеры для следующего запуска
// function saveTenders(tenders) {
//   fs.writeFileSync(DATA_FILE, JSON.stringify(tenders, null, 2), "utf-8");
// }

// // Загрузить предыдущие тендеры
// function loadPreviousTenders() {
//   if (!fs.existsSync(DATA_FILE)) return [];
//   try {
//     return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
//   } catch {
//     return [];
//   }
// }

// // Сформировать текст письма
// function formatEmailBody(tenders) {
//   if (!tenders.length) return "Нет новых тендеров за последние сутки.";
//   return tenders.map(t =>
//     `Название: ${t.title}\nОписание: ${t.description || "-"}\nСсылка: ${t.link}\nДата публикации: ${t.publicationDate}\nОппdragsgiver: ${t.buyer}\n`
//   ).join("\n----------------------\n");
// }

// // Отправить email через EmailJS
// async function sendEmail(newTenders) {
//   const message = formatEmailBody(newTenders);
//   const templateParams = {
//     from_email: FROM_EMAIL,
//     to_email: TO_EMAIL,
//     message,
//     subject: "Новые тендеры за сутки",
//   };
//   await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, {
//     publicKey: EMAIL_USER_ID,
//   });
//   console.log("Email отправлен через EmailJS");
// }

// // Основная функция
// async function checkAndSendTenders() {
//   try {
//     const currentTenders = await fetchTenders();
//     const previousTenders = loadPreviousTenders();
//     const newTenders = getNewTenders(currentTenders, previousTenders);

//     if (newTenders.length > 0) {
//       await sendEmail(newTenders);
//     } else {
//       console.log("Новых тендеров нет, письмо не отправляется.");
//     }
//     saveTenders(currentTenders);
//   } catch (err) {
//     console.error("Ошибка в ежедневной задаче тендеров:", err);
//   }
// }

// // Запускать каждый день в 14:00
// cron.schedule("0 14 * * *", () => {
//   console.log("Запуск ежедневной проверки тендеров в 14:00");
//   checkAndSendTenders();
// });

// // Для ручного теста (можно удалить в проде)
// if (process.env.NODE_ENV !== "production") {
//   checkAndSendTenders();
// }
