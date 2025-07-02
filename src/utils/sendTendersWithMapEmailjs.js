import html2canvas from "html2canvas";

/**
 * Получить сообщение об ошибке в виде строки
 */
function getErrorMessage(e) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  if (e.text) return e.text;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/**
 * Преобразовать массив тендеров в строки таблицы HTML
 */
function tendersToRows(tenders) {
  if (!Array.isArray(tenders) || tenders.length === 0) {
    return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
  }
  return tenders.map(t => `
    <tr>
      <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
      <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
      <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
      <td style="border: 1px solid #eaeaea; padding: 8px;">
        ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
      </td>
    </tr>
  `).join("");
}

/**
 * Получить base64 скриншот карты
 */
export async function getMapScreenshot(mapContainerId = "map-root") {
  const mapElement = document.getElementById(mapContainerId);
  if (!mapElement) {
    console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
    throw new Error("Map element not found");
  }
  const canvas = await html2canvas(mapElement, { useCORS: true });
  const base64 = canvas.toDataURL("image/png");
  if (!base64 || typeof base64 !== "string") {
    console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
    throw new Error("Не удалось получить base64 скриншота карты");
  }
  return base64;
}

/**
 * Загрузить base64 картинку на imgur через серверless endpoint
 */
export async function uploadBase64ToImgurViaServerless(base64) {
  if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
    console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
    throw new Error("base64 должен быть строкой data:image/...");
  }
  const endpoint = "/.netlify/functions/uploadToImgur";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
    throw new Error("Некорректный ответ сервера imgur: " + text);
  }
  if (data.link) {
    console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
    return data.link;
  }
  console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
  throw new Error(data.error || data.details || "Unknown error");
}

/**
 * Основная функция: формирует письмо и отправляет его через Nodemailer (Electron IPC)
 */
export async function sendTendersWithMapWorkflow({
  tenders,
  mapContainerId = "map-root",
  chunkNumber = 1,
  chunkTotal = 1,
  onStatus
}) {
  try {
    if (!Array.isArray(tenders)) {
      throw new Error("tenders должен быть массивом");
    }
    if (typeof mapContainerId !== "string") {
      throw new Error("mapContainerId должен быть строкой");
    }
    if (onStatus && typeof onStatus !== "function") {
      throw new Error("onStatus должен быть функцией");
    }

    if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
    console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
    const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
    if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
      throw new Error("Не удалось получить скриншот карты");
    }

    if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
    console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
    const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
    if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
      throw new Error("Ошибка загрузки карты на imgur");
    }

    console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
    console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
      title: t.title,
      publicationDate: t.publicationDate,
      buyer: t.buyer,
      link: t.link
    })) : tenders);
    console.log("mapUrl:", mapUrl);
    console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

    // Формируем email для Nodemailer/Electron
    let to = "";
    if (window?.env?.VITE_TO_EMAIL) {
      to = window.env.VITE_TO_EMAIL.includes(",")
        ? window.env.VITE_TO_EMAIL.split(",").map(e => e.trim()).filter(Boolean)
        : window.env.VITE_TO_EMAIL.trim();
    }
    const subject = "Siste anbud og kart (automatisk utsending)";
    const html = `
      <h2>Siste anbud og карт (automatisk utsending)</h2>
      <p>Часть ${chunkNumber} из ${chunkTotal}</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
            <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
            <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
            <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
          </tr>
        </thead>
        <tbody>
          ${tendersToRows(tenders)}
        </tbody>
      </table>
      ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
    `;

    if (onStatus) onStatus({ type: "info", message: "Письмо сформировано, отправляю..." });
    console.log("[sendTendersWithMapWorkflow] Письмо сформировано, отправляю через IPC...");

    // ОТПРАВКА ПИСЬМА через IPC/Electron (Nodemailer)
    if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
      const result = await window.electronAPI.sendTendersWithMap({ to, subject, html });
      if (result && result.success) {
        if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
        console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
        return { success: true };
      } else {
        const errMsg = result && result.error ? result.error : "Неизвестная ошибка отправки";
        if (onStatus) onStatus({ type: "error", message: "Ошибка отправки email: " + errMsg });
        throw new Error(errMsg);
      }
    } else {
      throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
    }
  } catch (e) {
    const msg = getErrorMessage(e);
    if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
    console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
    throw e;
  }
}

/**
 * Получить тендеры с сервера (пример)
 */
export async function getTenders() {
  const now = new Date();
  const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
  const toDate = osloNow.toISOString().slice(0, 10);
  const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
  const fromDate = fromDateObj.toISOString().slice(0, 10);

  const body = {
    from: fromDate,
    to: toDate,
    location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
    cpv: '45000000,45100000'
  };

  console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

  const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
  const data = await res.json();
  console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
  return data.results;
}

/**
 * Автоматическая отправка тендеров по расписанию (только через Nodemailer)
 */
export function setupDailyTenderEmail(
  getTenders,
  mapContainerId = "map-root",
  onStatus,
  workflow = sendTendersWithMapWorkflow
) {
  console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
  let alreadyUpdatedToday = false;
  let alreadySentToday = false;

  function waitForMapUpdated(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let timer = null;
      function handler(e) {
        window.removeEventListener("MAP_UPDATED", handler);
        if (timer) clearTimeout(timer);
        resolve(e && e.detail ? e.detail : null);
      }
      window.addEventListener("MAP_UPDATED", handler);
      timer = setTimeout(() => {
        window.removeEventListener("MAP_UPDATED", handler);
        reject(new Error("MAP_UPDATED timeout"));
      }, timeoutMs);
    });
  }

  const timer = setInterval(async () => {
    const now = new Date();
    const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
    const hours = osloNow.getHours();
    const minutes = osloNow.getMinutes();
    console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

    // 1. В 15:00 — обновить данные и инициировать обновление компонентов
    if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
      try {
        if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
        console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
        const freshTenders = await getTenders();
        console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
        if (typeof window !== "undefined" && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
        }
        alreadyUpdatedToday = true;
      } catch (e) {
        const msg = getErrorMessage(e);
        if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
        console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
      }
    }

    // 2. В 15:01 — отправить письмо с актуальными тендерами (fetch cron_doffin_last.json), только после обновления карты
    if (hours === 15 && minutes === 1 && !alreadySentToday) {
      try {
        if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
        try {
          await waitForMapUpdated(15000); // 15 секунд максимум
        } catch (e) {
          if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
        }
        // --- КЛЮЧЕВОЕ: fetch актуальные данные, как в ручной отправке ---
        let cronNotices = [];
        try {
          const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
          const data = await resp.json();
          cronNotices = data.results || [];
        } catch (e) {
          if (onStatus) onStatus({ type: "error", message: "Не удалось получить актуальные тендеры: " + (e.message || e) });
          cronNotices = [];
        }
        // --- ВАЖНО: ПРОВЕРКА НА ПУСТОЙ МАССИВ ---
        if (!Array.isArray(cronNotices) || cronNotices.length === 0) {
          if (onStatus) onStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
          console.warn("[setupDailyTenderEmail] Автоматическая отправка отменена: нет тендеров.");
          alreadySentToday = true;
          return;
        }
        if (onStatus) onStatus({ type: "info", message: "Формирую и отправляю письмо для e-post..." });
        await workflow({
          tenders: cronNotices,
          mapContainerId,
          chunkNumber: 1,
          chunkTotal: 1,
          onStatus
        });
        if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
        alreadySentToday = true;
      } catch (e) {
        const msg = getErrorMessage(e);
        if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
        console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
      }
    }

    // Сброс флагов на следующий день
    if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
      alreadyUpdatedToday = false;
      alreadySentToday = false;
    }
  }, 60 * 1000);

  // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
  return () => {
    console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
    clearInterval(timer);
  };
}

// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// // ... (закомментированные Resend функции без изменений)

// /**
//  * Теперь функция только формирует письмо и возвращает {to, subject, html}
//  * Отправку письма делайте отдельно через window.electronAPI.sendTendersWithMap({to, subject, html})
//  */
// // export async function sendTendersWithMapWorkflow({
// //   tenders,
// //   mapContainerId = "map-root",
// //   chunkNumber = 1,
// //   chunkTotal = 1,
// //   onStatus
// // }) {
// //   try {
// //     if (!Array.isArray(tenders)) {
// //       throw new Error("tenders должен быть массивом");
// //     }
// //     if (typeof mapContainerId !== "string") {
// //       throw new Error("mapContainerId должен быть строкой");
// //     }
// //     if (onStatus && typeof onStatus !== "function") {
// //       throw new Error("onStatus должен быть функцией");
// //     }

// //     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
// //     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
// //     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
// //     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
// //       throw new Error("Не удалось получить скриншот карты");
// //     }

// //     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
// //     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
// //     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
// //     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
// //       throw new Error("Ошибка загрузки карты на imgur");
// //     }

// //     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
// //     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
// //       title: t.title,
// //       publicationDate: t.publicationDate,
// //       buyer: t.buyer,
// //       link: t.link
// //     })) : tenders);
// //     console.log("mapUrl:", mapUrl);
// //     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

// //     // Формируем email для Nodemailer/Electron
// //     let to = "";
// //     if (window?.env?.VITE_TO_EMAIL) {
// //       to = window.env.VITE_TO_EMAIL.includes(",")
// //         ? window.env.VITE_TO_EMAIL.split(",").map(e => e.trim()).filter(Boolean)
// //         : window.env.VITE_TO_EMAIL.trim();
// //     }
// //     const subject = "Siste anbud og kart (automatisk utsending)";
// //     const html = `
// //       <h2>Siste anbud og карт (automatisk utsending)</h2>
// //       <p>Часть ${chunkNumber} из ${chunkTotal}</p>
// //       <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
// //         <thead>
// //           <tr>
// //             <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
// //             <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
// //             <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
// //             <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
// //           </tr>
// //         </thead>
// //         <tbody>
// //           ${tendersToRows(tenders)}
// //         </tbody>
// //       </table>
// //       ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
// //     `;

// //     if (onStatus) onStatus({ type: "info", message: "Письмо сформировано, готово к отправке." });
// //     console.log("[sendTendersWithMapWorkflow] Письмо сформировано, возвращаю объект для отправки.");

// //     // Возвращаем объект, а не отправляем письмо!
// //     return { to, subject, html };
// //   } catch (e) {
// //     const msg = getErrorMessage(e);
// //     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
// //     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
// //     throw e;
// //   }
// // }
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     // Формируем email для Nodemailer/Electron
//     let to = "";
//     if (window?.env?.VITE_TO_EMAIL) {
//       to = window.env.VITE_TO_EMAIL.includes(",")
//         ? window.env.VITE_TO_EMAIL.split(",").map(e => e.trim()).filter(Boolean)
//         : window.env.VITE_TO_EMAIL.trim();
//     }
//     const subject = "Siste anbud og kart (automatisk utsending)";
//     const html = `
//       <h2>Siste anbud og карт (automatisk utsending)</h2>
//       <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//       <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//         <thead>
//           <tr>
//             <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${tendersToRows(tenders)}
//         </tbody>
//       </table>
//       ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//     `;

//     if (onStatus) onStatus({ type: "info", message: "Письмо сформировано, отправляю..." });
//     console.log("[sendTendersWithMapWorkflow] Письмо сформировано, отправляю через IPC...");

//     // СРАЗУ ОТПРАВЛЯЕМ ПИСЬМО через IPC/Electron
//     if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
//       await window.electronAPI.sendTendersWithMap({ to, subject, html });
//       if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//       return { success: true };
//     } else {
//       throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
//     }
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }
// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с актуальными тендерами (fetch cron_doffin_last.json), только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с актуальными тендерами (fetch cron_doffin_last.json), только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         try {
//           await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // --- КЛЮЧЕВОЕ: fetch актуальные данные, как в ручной отправке ---
//         let cronNotices = [];
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           cronNotices = data.results || [];
//         } catch (e) {
//           if (onStatus) onStatus({ type: "error", message: "Не удалось получить актуальные тендеры: " + (e.message || e) });
//           cronNotices = [];
//         }
//         // --- ВАЖНО: ПРОВЕРКА НА ПУСТОЙ МАССИВ ---
//         if (!Array.isArray(cronNotices) || cronNotices.length === 0) {
//           if (onStatus) onStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
//           console.warn("[setupDailyTenderEmail] Автоматическая отправка отменена: нет тендеров.");
//           alreadySentToday = true;
//           return;
//         }
//         if (onStatus) onStatus({ type: "info", message: "Формирую письмо для e-post..." });
//         // Получаем готовое письмо
//         const { to, subject, html } = await workflow({
//           tenders: cronNotices,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         // Отправляем через IPC
//         if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
//           await window.electronAPI.sendTendersWithMap({ to, subject, html });
//         } else {
//           throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
//         }
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// // ... (закомментированные Resend функции без изменений)

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     // Формируем email для Nodemailer/Electron
//     // Получаем to из глобального window.env или оставляем пустым (main process подставит из .env)
//     let to = "";
//     if (window?.env?.VITE_TO_EMAIL) {
//       to = window.env.VITE_TO_EMAIL.includes(",")
//         ? window.env.VITE_TO_EMAIL.split(",").map(e => e.trim()).filter(Boolean)
//         : window.env.VITE_TO_EMAIL.trim();
//     }
//     const subject = "Siste anbud og kart (automatisk utsending)";
//     const html = `
//       <h2>Siste anbud og карт (automatisk utsending)</h2>
//       <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//       <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//         <thead>
//           <tr>
//             <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//             <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${tendersToRows(tenders)}
//         </tbody>
//       </table>
//       ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//     `;

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");

//     // Новый вызов через IPC (Electron) — теперь передаём все нужные поля
//     if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
//       await window.electronAPI.sendTendersWithMap({
//         to, // если пусто — main process подставит из .env
//         subject,
//         html
//       });
//     } else {
//       throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
//     }

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return { success: true };
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с актуальными тендерами (fetch cron_doffin_last.json), только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с актуальными тендерами (fetch cron_doffin_last.json), только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         try {
//           await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // --- КЛЮЧЕВОЕ: fetch актуальные данные, как в ручной отправке ---
//         let cronNotices = [];
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           cronNotices = data.results || [];
//         } catch (e) {
//           if (onStatus) onStatus({ type: "error", message: "Не удалось получить актуальные тендеры: " + (e.message || e) });
//           cronNotices = [];
//         }
//         // --- ВАЖНО: ПРОВЕРКА НА ПУСТОЙ МАССИВ ---
//         if (!Array.isArray(cronNotices) || cronNotices.length === 0) {
//           if (onStatus) onStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
//           console.warn("[setupDailyTenderEmail] Автоматическая отправка отменена: нет тендеров.");
//           alreadySentToday = true;
//           return;
//         }
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         await workflow({
//           tenders: cronNotices,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }



// // export async function sendTendersWithMapResend({
// //   tenders,
// //   mapUrl = "",
// //   chunkNumber = 1,
// //   chunkTotal = 1
// // }) {
// //   if (!Array.isArray(tenders)) {
// //     throw new Error("tenders должен быть массивом");
// //   }
// //   if (typeof mapUrl !== "string") {
// //     throw new Error("mapUrl должен быть строкой");
// //   }

// //   const html = `
// //     <h2>Siste anbud og kart (automatisk utsending)</h2>
// //     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
// //     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
// //       <thead>
// //         <tr>
// //           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
// //           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
// //           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
// //           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
// //         </tr>
// //       </thead>
// //       <tbody>
// //         ${tendersToRows(tenders)}
// //       </tbody>
// //     </table>
// //     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
// //   `;

// //   const toRaw = import.meta.env.VITE_TO_EMAIL;
// //   const to = toRaw.includes(",")
// //     ? toRaw.split(",").map(e => e.trim()).filter(Boolean)
// //     : toRaw.trim();

// //   const payload = {
// //     to,
// //     from: import.meta.env.VITE_FROM_EMAIL,
// //     subject: "Siste anbud og kart (automatisk utsending)",
// //     html
// //   };

// //   const endpoint = "/api/send-resend";

// //   try {
// //     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
// //     const res = await fetch(endpoint, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(payload),
// //     });
// //     const text = await res.text();
// //     let data;
// //     try {
// //       data = JSON.parse(text);
// //     } catch {
// //       data = text;
// //     }
// //     if (!res.ok) {
// //       if (typeof data === "object") {
// //         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
// //         throw new Error(
// //           "Ошибка Resend: " +
// //           (data.error?.message || data.error || data.message || JSON.stringify(data))
// //         );
// //       }
// //       throw new Error(data || "Unknown error from backend Resend proxy");
// //     }
// //     if (data.success) {
// //       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
// //       return data;
// //     }
// //     throw new Error(
// //       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
// //       data ||
// //       "Unknown error from backend Resend proxy"
// //     );
// //   } catch (e) {
// //     const msg = getErrorMessage(e);
// //     console.error("[sendTendersWithMapResend] Ошибка:", msg);
// //     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
// //   }
// // }






// // export async function sendTendersWithMapWorkflow({
// //   tenders,
// //   mapContainerId = "map-root",
// //   chunkNumber = 1,
// //   chunkTotal = 1,
// //   onStatus
// // }) {
// //   try {
// //     if (!Array.isArray(tenders)) {
// //       throw new Error("tenders должен быть массивом");
// //     }
// //     if (typeof mapContainerId !== "string") {
// //       throw new Error("mapContainerId должен быть строкой");
// //     }
// //     if (onStatus && typeof onStatus !== "function") {
// //       throw new Error("onStatus должен быть функцией");
// //     }

// //     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
// //     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
// //     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
// //     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
// //       throw new Error("Не удалось получить скриншот карты");
// //     }

// //     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
// //     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
// //     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
// //     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
// //       throw new Error("Ошибка загрузки карты на imgur");
// //     }

// //     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
// //     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
// //       title: t.title,
// //       publicationDate: t.publicationDate,
// //       buyer: t.buyer,
// //       link: t.link
// //     })) : tenders);
// //     console.log("mapUrl:", mapUrl);
// //     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

// //     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
// //     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
// //     const emailResult = await sendTendersWithMapResend({
// //       tenders,
// //       mapUrl,
// //       chunkNumber,
// //       chunkTotal
// //     });

// //     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
// //     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
// //     return emailResult;
// //   } catch (e) {
// //     const msg = getErrorMessage(e);
// //     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
// //     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
// //     throw e;
// //   }
// // }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");

//     // Новый вызов через IPC (Electron)
//     if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
//       await window.electronAPI.sendTendersWithMap({
//         tenders,
//         mapUrl,
//         chunkNumber,
//         chunkTotal
//       });
//     } else {
//       throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
//     }

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return { success: true };
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }




// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с актуальными тендерами (fetch cron_doffin_last.json), только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с актуальными тендерами (fetch cron_doffin_last.json), только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         try {
//           await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // --- КЛЮЧЕВОЕ: fetch актуальные данные, как в ручной отправке ---
//         let cronNotices = [];
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           cronNotices = data.results || [];
//         } catch (e) {
//           if (onStatus) onStatus({ type: "error", message: "Не удалось получить актуальные тендеры: " + (e.message || e) });
//           cronNotices = [];
//         }
//         // --- ВАЖНО: ПРОВЕРКА НА ПУСТОЙ МАССИВ ---
//         if (!Array.isArray(cronNotices) || cronNotices.length === 0) {
//           if (onStatus) onStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
//           console.warn("[setupDailyTenderEmail] Автоматическая отправка отменена: нет тендеров.");
//           alreadySentToday = true;
//           return;
//         }
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         await workflow({
//           tenders: cronNotices,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }


// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend";

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с актуальными тендерами (fetch cron_doffin_last.json), только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с актуальными тендерами (fetch cron_doffin_last.json), только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         try {
//           await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // --- КЛЮЧЕВОЕ: fetch актуальные данные, как в ручной отправке ---
//         let cronNotices = [];
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           cronNotices = data.results || [];
//         } catch (e) {
//           if (onStatus) onStatus({ type: "error", message: "Не удалось получить актуальные тендеры: " + (e.message || e) });
//           cronNotices = [];
//         }
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         await workflow({
//           tenders: cronNotices,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend";

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с обновлёнными тендерами, только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;
//   let lastTenders = [];

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         // e.detail содержит актуальные тендеры, которые реально отрисованы на карте!
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         // Не обновляем lastTenders здесь!
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         // Обновление компонентов через кастомное событие
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         // Не ставим статус "Данные обновлены!" пока не обновится карта!
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с уже обновлёнными данными, только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         // Ждём событие MAP_UPDATED (UI должен диспатчить его после рендера карты)
//         let actualTenders = null;
//         try {
//           actualTenders = await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // Если MAP_UPDATED пришёл с detail, используем его как lastTenders
//         if (actualTenders && Array.isArray(actualTenders)) {
//           lastTenders = actualTenders;
//         }
//         if (onStatus) onStatus({ type: "success", message: "Данные обновлены! Ждём обновления карты..." });
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         // УДАЛЕНО: if (!Array.isArray(lastTenders) || lastTenders.length === 0) { throw new Error("Нет обновлённых тендеров для отправки"); }
//         await workflow({
//           tenders: lastTenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }


// import html2canvas from "html2canvas";

// /* ...остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend";

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с обновлёнными тендерами, только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;
//   let lastTenders = [];

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         // e.detail содержит актуальные тендеры, которые реально отрисованы на карте!
//         resolve(e && e.detail ? e.detail : null);
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и инициировать обновление компонентов
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         // Не обновляем lastTenders здесь!
//         const freshTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(freshTenders) ? freshTenders.length : typeof freshTenders);
//         // Обновление компонентов через кастомное событие
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: freshTenders }));
//         }
//         // Не ставим статус "Данные обновлены!" пока не обновится карта!
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с уже обновлёнными данными, только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         // Ждём событие MAP_UPDATED (UI должен диспатчить его после рендера карты)
//         let actualTenders = null;
//         try {
//           actualTenders = await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         // Если MAP_UPDATED пришёл с detail, используем его как lastTenders
//         if (actualTenders && Array.isArray(actualTenders)) {
//           lastTenders = actualTenders;
//         }
//         if (onStatus) onStatus({ type: "success", message: "Данные обновлены! Ждём обновления карты..." });
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         if (!Array.isArray(lastTenders) || lastTenders.length === 0) {
//           throw new Error("Нет обновлённых тендеров для отправки");
//         }
//         await workflow({
//           tenders: lastTenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// import html2canvas from "html2canvas";

// /* ...весь остальной код без изменений... */

// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend";

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с обновлёнными тендерами, только после того как карта обновилась (ждём событие MAP_UPDATED)
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;
//   let lastTenders = [];
//   let mapUpdatedPromise = null;
//   let mapUpdatedResolve = null;

//   // Слушаем событие MAP_UPDATED (UI должен диспатчить его после обновления карты)
//   function waitForMapUpdated(timeoutMs = 15000) {
//     return new Promise((resolve, reject) => {
//       let timer = null;
//       function handler(e) {
//         window.removeEventListener("MAP_UPDATED", handler);
//         if (timer) clearTimeout(timer);
//         resolve();
//       }
//       window.addEventListener("MAP_UPDATED", handler);
//       timer = setTimeout(() => {
//         window.removeEventListener("MAP_UPDATED", handler);
//         reject(new Error("MAP_UPDATED timeout"));
//       }, timeoutMs);
//     });
//   }

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и обновить компоненты
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         lastTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(lastTenders) ? lastTenders.length : typeof lastTenders);
//         // Обновление компонентов через кастомное событие
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: lastTenders }));
//         }
//         if (onStatus) onStatus({ type: "success", message: "Данные обновлены! Ждём обновления карты..." });
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с уже обновлёнными данными, только после обновления карты
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         // Ждём событие MAP_UPDATED (UI должен диспатчить его после рендера карты)
//         try {
//           await waitForMapUpdated(15000); // 15 секунд максимум
//         } catch (e) {
//           if (onStatus) onStatus({ type: "warning", message: "Карта не обновилась вовремя, отправляем как есть." });
//         }
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         if (!Array.isArray(lastTenders) || lastTenders.length === 0) {
//           throw new Error("Нет обновлённых тендеров для отправки");
//         }
//         await workflow({
//           tenders: lastTenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для email (HTML <tr>...</tr>)
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Resend
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   // Формируем HTML письма
//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   // Поддержка нескольких email-адресов через запятую в .env
//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend"; // backend endpoint для Resend

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Resend backend proxy
//  */
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     // ЛОГИРУЕМ ДАННЫЕ, КОТОРЫЕ УЙДУТ В ПИСЬМО
//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// /**
//  * Асинхронная функция получения тендеров с запуском парсера doffin через серверный endpoint.
//  * Использует POST /api/notices/doffin-scrape для реального запуска puppeteer.
//  */
// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   // data.results — массив тендеров
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Централизованная автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с обновлёнными тендерами
//  * Используйте только эту функцию для расписания!
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;
//   let lastTenders = [];

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и обновить компоненты
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         lastTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(lastTenders) ? lastTenders.length : typeof lastTenders);
//         // Обновление компонентов через кастомное событие
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: lastTenders }));
//         }
//         if (onStatus) onStatus({ type: "success", message: "Данные обновлены!" });
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с уже обновлёнными данными
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         if (!Array.isArray(lastTenders) || lastTenders.length === 0) {
//           throw new Error("Нет обновлённых тендеров для отправки");
//         }
//         await workflow({
//           tenders: lastTenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }


// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для email (HTML <tr>...</tr>)
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Resend
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   // Формируем HTML письма
//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   // Поддержка нескольких email-адресов через запятую в .env
//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend"; // backend endpoint для Resend

//   try {
//     console.log("[sendTendersWithMapResend] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResend] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResend] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapResend] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Resend backend proxy
//  */

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflow] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflow] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     // ЛОГИРУЕМ ДАННЫЕ, КОТОРЫЕ УЙДУТ В ПИСЬМО
//     console.log("[sendTendersWithMapWorkflow] ДАННЫЕ ДЛЯ EMAIL:");
//     console.log("tenders:", Array.isArray(tenders) ? tenders.map(t => ({
//       title: t.title,
//       publicationDate: t.publicationDate,
//       buyer: t.buyer,
//       link: t.link
//     })) : tenders);
//     console.log("mapUrl:", mapUrl);
//     console.log("chunkNumber:", chunkNumber, "chunkTotal:", chunkTotal);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflow] Отправляю email...");
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflow] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflow] Ошибка:", msg);
//     throw e;
//   }
// }

// /**
//  * Асинхронная функция получения тендеров с запуском парсера doffin через серверный endpoint.
//  * Использует POST /api/notices/doffin-scrape для реального запуска puppeteer.
//  */
// export async function getTenders() {
//   const now = new Date();
//   const osloNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
//   const toDate = osloNow.toISOString().slice(0, 10);
//   const fromDateObj = new Date(osloNow.getTime() - 24 * 60 * 60 * 1000);
//   const fromDate = fromDateObj.toISOString().slice(0, 10);

//   const body = {
//     from: fromDate,
//     to: toDate,
//     location: 'NO020%2CNO081%2CNO085%2CNO083%2CNO084',
//     cpv: '45000000,45100000'
//   };

//   console.log("[getTenders] Запрос на запуск скрабинга doffin:", body);

//   const res = await fetch('http://localhost:4003/api/notices/doffin-scrape', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) throw new Error('Ошибка запуска парсера doffin');
//   const data = await res.json();
//   // data.results — массив тендеров
//   console.log("[getTenders] Получено тендеров после скрабинга:", Array.isArray(data.results) ? data.results.length : typeof data.results);
//   return data.results;
// }

// /**
//  * Автоматическая проверка и отправка тендеров:
//  * - В 15:00: обновляет данные (getTenders), обновляет компоненты через событие "TENDERS_UPDATED"
//  * - В 15:01: отправляет email с обновлёнными тендерами
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadyUpdatedToday = false;
//   let alreadySentToday = false;
//   let lastTenders = [];

//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();
//     console.log(`[setupDailyTenderEmail] Проверка времени: ${hours}:${minutes}, alreadyUpdatedToday: ${alreadyUpdatedToday}, alreadySentToday: ${alreadySentToday}`);

//     // 1. В 15:00 — обновить данные и обновить компоненты
//     if (hours === 15 && minutes === 0 && !alreadyUpdatedToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async) для обновления данных...");
//         lastTenders = await getTenders();
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(lastTenders) ? lastTenders.length : typeof lastTenders);
//         // Обновление компонентов через кастомное событие
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("TENDERS_UPDATED", { detail: lastTenders }));
//         }
//         if (onStatus) onStatus({ type: "success", message: "Данные обновлены!" });
//         alreadyUpdatedToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Ошибка обновления тендеров: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка обновления тендеров:", msg);
//       }
//     }

//     // 2. В 15:01 — отправить письмо с уже обновлёнными данными
//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Отправляю e-post..." });
//         if (!Array.isArray(lastTenders) || lastTenders.length === 0) {
//           throw new Error("Нет обновлённых тендеров для отправки");
//         }
//         await workflow({
//           tenders: lastTenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }

//     // Сброс флагов на следующий день
//     if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//       alreadyUpdatedToday = false;
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }



// import html2canvas from "html2canvas";

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//     return data.link;
//   }
//   console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Resend (теперь сервер сам формирует html!)
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  * @param {string} subject - тема письма
//  * @param {string|string[]} to - получатель(и)
//  * @param {string} from - отправитель (опционально)
//  */
// export async function sendTendersWithMapResendAdapted({
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   subject = "Siste anbud og kart (automatisk utsending)",
//   to = null,
//   from = null
// }) {
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   let toRaw = to || import.meta.env.VITE_TO_EMAIL;
//   const toField = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to: toField,
//     from: from || import.meta.env.VITE_FROM_EMAIL,
//     subject,
//     mapUrl,
//     chunkNumber,
//     chunkTotal
//   };

//   const endpoint = "/api/send-resend";

//   try {
//     console.log("[sendTendersWithMapResendAdapted] Отправка письма через Resend. Payload:", payload);
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         console.error("[sendTendersWithMapResendAdapted] Ошибка Resend:", data);
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) {
//       console.log("[sendTendersWithMapResendAdapted] Письмо успешно отправлено через Resend:", data);
//       return data;
//     }
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = e.message || String(e);
//     console.error("[sendTendersWithMapResendAdapted] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Resend backend proxy (адаптирован)
//  */
// export async function sendTendersWithMapWorkflowAdapted({
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus,
//   subject,
//   to,
//   from
// }) {
//   try {
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflowAdapted] Делаю скриншот карты...");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflowAdapted] Загружаю карту на imgur...");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflowAdapted] Отправляю email...");
//     const emailResult = await sendTendersWithMapResendAdapted({
//       mapUrl,
//       chunkNumber,
//       chunkTotal,
//       subject,
//       to,
//       from
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflowAdapted] Email успешно отправлен!");
//     return emailResult;
//   } catch (e) {
//     const msg = e.message || String(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     console.error("[sendTendersWithMapWorkflowAdapted] Ошибка:", msg);
//     throw e;
//   }
// }



/**
 * Пример подписки на обновление данных в компоненте:
 * 
 * useEffect(() => {
 *   function handleUpdate(e) {
 *     setTenders(e.detail); // или другой способ обновить state
 *   }
 *   window.addEventListener("TENDERS_UPDATED", handleUpdate);
 *   return () => window.removeEventListener("TENDERS_UPDATED", handleUpdate);
 * }, []);
 */

/**
 * Пример вызова автоматической отправки (в вашем компоненте или главном файле):
 *
 * import { setupDailyTenderEmail, getTenders } from "./utils/sendTendersWithMapEmailjs";
 *
 * setupDailyTenderEmail(getTenders, "map-root", (status) => {
 *   console.log("[STATUS]", status);
 * });
 */






// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для email (HTML <tr>...</tr>)
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     return data.link;
//   }
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Resend
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   // Формируем HTML письма
//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   // Поддержка нескольких email-адресов через запятую в .env
//   const toRaw = import.meta.env.VITE_TO_EMAIL;
//   const to = toRaw.includes(",")
//     ? toRaw.split(",").map(e => e.trim())
//     : toRaw.trim();

//   const payload = {
//     to,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend"; // backend endpoint для Resend

//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       if (typeof data === "object") {
//         throw new Error(
//           "Ошибка Resend: " +
//           (data.error?.message || data.error || data.message || JSON.stringify(data))
//         );
//       }
//       throw new Error(data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) return data;
//     throw new Error(
//       (typeof data === "object" && (data.error?.message || data.error || data.message)) ||
//       data ||
//       "Unknown error from backend Resend proxy"
//     );
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Resend backend proxy
//  */
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     throw e;
//   }
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Promise<Array>} getTenders - асинхронная функция, возвращающая актуальный массив тендеров (fetch/парсер)
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflowServerless] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflowServerless
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки (async getTenders)");
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
//         console.log("[setupDailyTenderEmail] Вызов getTenders (async)...");
//         const tenders = await getTenders(); // <-- обязательно await!
//         console.log("[setupDailyTenderEmail] Получено тендеров:", Array.isArray(tenders) ? tenders.length : typeof tenders);
//         if (!Array.isArray(tenders)) {
//           console.error("[setupDailyTenderEmail] getTenders не вернул массив!", tenders);
//           throw new Error("getTenders должен возвращать массив");
//         }
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = (typeof getErrorMessage === "function") ? getErrorMessage(e) : (e && e.message ? e.message : String(e));
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }










// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для email (HTML <tr>...</tr>)
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     return data.link;
//   }
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Resend
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapResend({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   // Формируем HTML письма
//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const payload = {
//     to: import.meta.env.VITE_TO_EMAIL,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-resend"; // backend endpoint для Resend

//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       throw new Error((data && data.error) || data || "Unknown error from backend Resend proxy");
//     }
//     if (data.success) return data;
//     throw new Error(data.error || "Unknown error from backend Resend proxy");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     throw new Error("Ошибка при отправке email через Resend backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Resend backend proxy
//  */
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     const emailResult = await sendTendersWithMapResend({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     throw e;
//   }
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
//         const tenders = getTenders();
//         if (!Array.isArray(tenders)) {
//           throw new Error("getTenders должен возвращать массив");
//         }
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     clearInterval(timer);
//   };
// }


// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для email (HTML <tr>...</tr>)
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     return data.link;
//   }
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Отправляет письмо через backend-прокси Mailgun
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapMailgun({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }

//   // Формируем HTML письма
//   const html = `
//     <h2>Siste anbud og kart (automatisk utsending)</h2>
//     <p>Часть ${chunkNumber} из ${chunkTotal}</p>
//     <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
//       <thead>
//         <tr>
//           <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
//           <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tendersToRows(tenders)}
//       </tbody>
//     </table>
//     ${mapUrl ? `<div><img src="${mapUrl}" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>` : ""}
//   `;

//   const payload = {
//     to: import.meta.env.VITE_TO_EMAIL,
//     from: import.meta.env.VITE_FROM_EMAIL,
//     subject: "Siste anbud og kart (automatisk utsending)",
//     html
//   };

//   const endpoint = "/api/send-mailgun"; // ваш backend endpoint

//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     const text = await res.text();
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }
//     if (!res.ok) {
//       throw new Error((data && data.error) || data || "Unknown error from backend Mailgun proxy");
//     }
//     if (data.success) return data;
//     throw new Error(data.error || "Unknown error from backend Mailgun proxy");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     throw new Error("Ошибка при отправке email через Mailgun backend: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через Mailgun backend proxy
//  */
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     const emailResult = await sendTendersWithMapMailgun({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     throw e;
//   }
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
//         const tenders = getTenders();
//         if (!Array.isArray(tenders)) {
//           throw new Error("getTenders должен возвращать массив");
//         }
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     clearInterval(timer);
//   };
// }


// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для шаблона emailjs ({{{rows}}})
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     throw new Error("Map element not found");
//   }
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   return base64;
// }

// /**
//  * Отправляет письмо через EmailJS напрямую с фронта (только user_id!)
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapDirect({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     throw new Error("mapUrl должен быть строкой");
//   }
//   const templateParams = {
//     subject: "Siste anbud og kart (automatisk utsending)",
//     rows: tendersToRows(tenders),
//     map_url: mapUrl,
//     to_email: import.meta.env.VITE_TO_EMAIL,
//     from_email: import.meta.env.VITE_FROM_EMAIL,
//     chunk_number: chunkNumber,
//     chunk_total: chunkTotal,
//   };

//   const userId = import.meta.env.VITE_EMAIL_USER_ID;
//   let payload = {
//     service_id: import.meta.env.VITE_EMAIL_SERVICE_ID,
//     template_id: import.meta.env.VITE_EMAIL_TEMPLATE_ID,
//     template_params: templateParams
//   };

//   // Используем только user_id для фронта!
//   if (userId && userId.trim() !== "") {
//     payload.user_id = userId;
//   } else {
//     throw new Error(
//       "Не найден user_id (VITE_EMAIL_USER_ID) для EmailJS. Проверьте .env файл!"
//     );
//   }

//   // Для отладки: покажи, что реально уходит в EmailJS
//   console.log("[sendTendersWithMapDirect] payload:", payload);

//   const endpoint = "https://api.emailjs.com/api/v1.0/email/send";
//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const text = await res.text();
//       throw new Error(text);
//     }
//     const data = await res.json();
//     if (data.success || data.data) return data;
//     throw new Error(data.error || "Unknown error from EmailJS");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     throw new Error("Ошибка при отправке email через EmailJS: " + msg);
//   }
// }

// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ image: base64 }),
//   });
//   const text = await res.text();
//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch (e) {
//     throw new Error("Некорректный ответ сервера imgur: " + text);
//   }
//   if (data.link) {
//     return data.link;
//   }
//   throw new Error(data.error || data.details || "Unknown error");
// }

// /**
//  * Основной workflow отправки тендеров с картой через EmailJS напрямую с фронта
//  */
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (!Array.isArray(tenders)) {
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       throw new Error("Не удалось получить скриншот карты");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       throw new Error("Ошибка загрузки карты на imgur");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     const emailResult = await sendTendersWithMapDirect({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     return emailResult;
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     throw e;
//   }
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// ) {
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
//         const tenders = getTenders();
//         if (!Array.isArray(tenders)) {
//           throw new Error("getTenders должен возвращать массив");
//         }
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     clearInterval(timer);
//   };
// }

// /**
//  * Автоматическая отправка email сразу после обновления данных.
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {Promise<void>}
//  */
// export async function autoSendTendersWithMap({
//   tenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflow
// }) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     if (onStatus) onStatus({ type: "info", message: "Ingen nye anbud å sende." });
//     return;
//   }
//   try {
//     await workflow({
//       tenders,
//       mapContainerId,
//       chunkNumber: 1,
//       chunkTotal: 1,
//       onStatus
//     });
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка при отправке email: " + msg });
//     throw e;
//   }
// }


// import html2canvas from "html2canvas";

// /**
//  * Универсальный парсер ошибок для человекочитаемого сообщения.
//  * @param {any} e
//  * @returns {string}
//  */
// function getErrorMessage(e) {
//   if (!e) return "Unknown error";
//   if (typeof e === "string") return e;
//   if (e.message) return e.message;
//   if (e.text) return e.text;
//   try {
//     return JSON.stringify(e);
//   } catch {
//     return String(e);
//   }
// }

// /**
//  * Формирует строки таблицы для шаблона emailjs ({{{rows}}})
//  * @param {Array} tenders
//  * @returns {string} HTML строки <tr>...</tr>
//  */
// function tendersToRows(tenders) {
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     return `<tr><td colspan="4" style="text-align:center;">Ingen anbud å sende.</td></tr>`;
//   }
//   return tenders.map(t => `
//     <tr>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.publicationDate || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.title || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">${t.buyer || ""}</td>
//       <td style="border: 1px solid #eaeaea; padding: 8px;">
//         ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener noreferrer">Åpne</a>` : ""}
//       </td>
//     </tr>
//   `).join("");
// }

// /**
//  * Делает скриншот DOM-элемента карты по id
//  * @param {string} mapContainerId
//  * @returns {Promise<string>} base64 PNG
//  */
// export async function getMapScreenshot(mapContainerId = "map-root") {
//   console.log(`[getMapScreenshot] Вызвана. mapContainerId: ${mapContainerId}`);
//   const mapElement = document.getElementById(mapContainerId);
//   if (!mapElement) {
//     console.error(`[getMapScreenshot] Элемент с id "${mapContainerId}" не найден!`);
//     throw new Error("Map element not found");
//   }
//   console.log(`[getMapScreenshot] Элемент найден:`, mapElement);
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   const base64 = canvas.toDataURL("image/png");
//   if (!base64 || typeof base64 !== "string") {
//     console.error("[getMapScreenshot] Не удалось получить base64 из canvas!");
//     throw new Error("Не удалось получить base64 скриншота карты");
//   }
//   console.log(`[getMapScreenshot] base64 длина: ${base64.length}`);
//   return base64;
// }

// /**
//  * Отправляет письмо через серверless-функцию-прокси, чтобы избежать ограничений EmailJS в Electron.
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */

// export async function sendTendersWithMapViaServerless({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   if (!Array.isArray(tenders)) {
//     console.error("[sendTendersWithMapViaServerless] tenders не массив!", tenders);
//     throw new Error("tenders должен быть массивом");
//   }
//   if (typeof mapUrl !== "string") {
//     console.error("[sendTendersWithMapViaServerless] mapUrl не строка!", mapUrl);
//     throw new Error("mapUrl должен быть строкой");
//   }
//   const templateParams = {
//     subject: "Siste anbud og kart (automatisk utsending)",
//     rows: tendersToRows(tenders),
//     map_url: mapUrl,
//     to_email: import.meta.env.VITE_TO_EMAIL,
//     from_email: import.meta.env.VITE_FROM_EMAIL,
//     chunk_number: chunkNumber,
//     chunk_total: chunkTotal,
//   };

//   // Используем только private_key для EmailJS strict mode
//   const privateKey = import.meta.env.VITE_EMAIL_PRIVATE_KEY;
//   if (!privateKey) {
//     throw new Error("Не найден private_key (VITE_EMAIL_PRIVATE_KEY) для EmailJS. Проверьте .env файл!");
//   }

//   const payload = {
//     service_id: import.meta.env.VITE_EMAIL_SERVICE_ID,
//     template_id: import.meta.env.VITE_EMAIL_TEMPLATE_ID,
//     private_key: privateKey,
//     template_params: templateParams
//   };

//   console.log("[sendTendersWithMapViaServerless] payload:", { ...payload, private_key: "[HIDDEN]" });

//   const endpoint = "/.netlify/functions/sendEmailJsProxy";
//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const text = await res.text();
//       console.error("[sendTendersWithMapViaServerless] Сервер вернул ошибку:", text);
//       throw new Error(text);
//     }
//     const data = await res.json();
//     console.log("[sendTendersWithMapViaServerless] Ответ:", data);
//     if (data.success || data.data) return data;
//     throw new Error(data.error || "Unknown error from serverless email proxy");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error("[sendTendersWithMapViaServerless] Ошибка:", msg);
//     throw new Error("Ошибка при отправке email через серверless: " + msg);
//   }
// }


// /**
//  * Загружает base64 изображение на Imgur через serverless функцию
//  * @param {string} base64 - base64 строка изображения
//  * @returns {Promise<string>} URL загруженного изображения
//  */
// export async function uploadBase64ToImgurViaServerless(base64) {
//   console.log("[uploadBase64ToImgurViaServerless] Вызвана");
  
//   if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image/")) {
//     console.error("[uploadBase64ToImgurViaServerless] base64 невалидный!", base64 ? base64.slice(0, 50) : base64);
//     throw new Error("base64 должен быть строкой data:image/...");
//   }
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ image: base64 }),
//     });
//     const text = await res.text();
//     console.log('[uploadBase64ToImgurViaServerless] RAW response:', text);
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch (e) {
//       console.error('[uploadBase64ToImgurViaServerless] Не удалось распарсить JSON:', e, text);
//       throw new Error("Некорректный ответ сервера imgur: " + text);
//     }
//     console.log('[uploadBase64ToImgurViaServerless] Ответ от uploadToImgur:', data);
//     if (data.link) {
//       console.log('[uploadBase64ToImgurViaServerless] Картинка успешно загружена на imgur:', data.link);
//       return data.link;
//     }
//     console.error('[uploadBase64ToImgurViaServerless] Ошибка от Imgur:', data);
//     throw new Error(data.error || data.details || "Unknown error");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error('[uploadBase64ToImgurViaServerless] Ошибка:', msg);
//     throw new Error("Ошибка загрузки карты на imgur: " + msg);
//   }
// }

// /**
//  * Основной workflow отправки тендеров с картой через серверless-функцию
//  */
// export async function sendTendersWithMapWorkflowServerless({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   console.log("[sendTendersWithMapWorkflowServerless] Старт workflow");
  
//   try {
//     if (!Array.isArray(tenders)) {
//       console.error("[sendTendersWithMapWorkflowServerless] tenders не массив!", tenders);
//       throw new Error("tenders должен быть массивом");
//     }
//     if (typeof mapContainerId !== "string") {
//       console.error("[sendTendersWithMapWorkflowServerless] mapContainerId не строка!", mapContainerId);
//       throw new Error("mapContainerId должен быть строкой");
//     }
//     if (onStatus && typeof onStatus !== "function") {
//       console.error("[sendTendersWithMapWorkflowServerless] onStatus не функция!", onStatus);
//       throw new Error("onStatus должен быть функцией");
//     }

//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     console.log("[sendTendersWithMapWorkflowServerless] Вызов getMapScreenshot");
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//     if (!mapScreenshotBase64 || typeof mapScreenshotBase64 !== "string") {
//       console.error("[sendTendersWithMapWorkflowServerless] Скриншот карты не получен или не строка!");
//       throw new Error("Не удалось получить скриншот карты");
//     }
//     console.log(`[sendTendersWithMapWorkflowServerless] Скриншот карты получен, длина base64: ${mapScreenshotBase64.length}`);

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     console.log("[sendTendersWithMapWorkflowServerless] Вызов uploadBase64ToImgurViaServerless");
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);
//     if (!mapUrl || typeof mapUrl !== "string" || !mapUrl.startsWith("http")) {
//       console.error("[sendTendersWithMapWorkflowServerless] Ошибка загрузки карты на imgur, mapUrl:", mapUrl);
//       throw new Error("Ошибка загрузки карты на imgur");
//     }
//     console.log('[sendTendersWithMapWorkflowServerless] mapUrl:', mapUrl);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     console.log("[sendTendersWithMapWorkflowServerless] Вызов sendTendersWithMapViaServerless");
//     const emailResult = await sendTendersWithMapViaServerless({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });
//     console.log("[sendTendersWithMapWorkflowServerless] Email отправлен, результат:", emailResult);

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//     console.log("[sendTendersWithMapWorkflowServerless] Workflow завершён успешно");
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     console.error('[sendTendersWithMapWorkflowServerless] Ошибка:', msg);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + msg });
//     throw e;
//   }
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflowServerless] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(
//   getTenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflowServerless
// ) {
//   console.log("[setupDailyTenderEmail] Запуск таймера автоотправки");
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
//         const tenders = getTenders();
//         if (!Array.isArray(tenders)) {
//           console.error("[setupDailyTenderEmail] getTenders не вернул массив!", tenders);
//           throw new Error("getTenders должен возвращать массив");
//         }
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         const msg = getErrorMessage(e);
//         if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + msg });
//         console.error("[setupDailyTenderEmail] Ошибка автоотправки:", msg);
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => {
//     console.log("[setupDailyTenderEmail] Остановлен таймер автоотправки");
//     clearInterval(timer);
//   };
// }

// /**
//  * Автоматическая отправка email сразу после обновления данных.
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @param {Function} [workflow=sendTendersWithMapWorkflowServerless] - функция-воркфлоу для отправки (можно передать свою)
//  * @returns {Promise<void>}
//  */
// export async function autoSendTendersWithMap({
//   tenders,
//   mapContainerId = "map-root",
//   onStatus,
//   workflow = sendTendersWithMapWorkflowServerless
// }) {
//   console.log("[autoSendTendersWithMap] Вызвана");
//   if (!Array.isArray(tenders) || tenders.length === 0) {
//     if (onStatus) onStatus({ type: "info", message: "Ingen nye anbud å sende." });
//     console.log("[autoSendTendersWithMap] Нет новых тендеров для отправки");
//     return;
//   }
//   try {
//     await workflow({
//       tenders,
//       mapContainerId,
//       chunkNumber: 1,
//       chunkTotal: 1,
//       onStatus
//     });
//   } catch (e) {
//     const msg = getErrorMessage(e);
//     if (onStatus) onStatus({ type: "error", message: "Ошибка при отправке email: " + msg });
//     console.error("[autoSendTendersWithMap] Ошибка:", msg);
//     throw e;
//   }
// }

// export { sendTendersWithMapWorkflowServerless as sendTendersWithMapWorkflow };
