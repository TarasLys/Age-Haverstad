import emailjs from "emailjs-com";
import html2canvas from "html2canvas";

/**
 * Формирует строки таблицы для шаблона emailjs ({{{rows}}})
 * @param {Array} tenders
 * @returns {string} HTML строки <tr>...</tr>
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
        ${t.link ? `<a href="${t.link}">Åpne</a>` : ""}
      </td>
    </tr>
  `).join("");
}

/**
 * Делает скриншот DOM-элемента карты ��о id
 * @param {string} mapContainerId
 * @returns {Promise<string>} base64 PNG
 */
export async function getMapScreenshot(mapContainerId = "map-root") {
  const mapElement = document.getElementById(mapContainerId);
  if (!mapElement) throw new Error("Map element not found");
  const canvas = await html2canvas(mapElement, { useCORS: true });
  return canvas.toDataURL("image/png");
}

/**
 * Отправляет письмо через emailjs с поддержкой шаблона rows/chunk
 * @param {Object[]} tenders - массив тендеров
 * @param {string} mapUrl - ссылка на картинку карты
 * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
 * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
 */
export async function sendTendersWithMapEmailjs({
  tenders,
  mapUrl = "",
  chunkNumber = 1,
  chunkTotal = 1
}) {
  const serviceId = import.meta.env.VITE_EMAIL_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
  const userId = import.meta.env.VITE_EMAIL_USER_ID;
  const toEmail = import.meta.env.VITE_TO_EMAIL;
  const fromEmail = import.meta.env.VITE_FROM_EMAIL;

  const templateParams = {
    subject: "Siste anbud og kart (automatisk utsending)",
    rows: tendersToRows(tenders),
    map_url: mapUrl,
    to_email: toEmail,
    from_email: fromEmail,
    chunk_number: chunkNumber,
    chunk_total: chunkTotal,
  };

  return emailjs.send(
    serviceId,
    templateId,
    templateParams,
    userId
  );
}

// код для сервера загрузки карты в imgur
export async function uploadBase64ToImgurViaServerless(base64) {
  // Для Vercel: /api/uploadToImgur, для Netlify: /.netlify/functions/uploadToImgur
  const endpoint = "/.netlify/functions/uploadToImgur";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 }),
  });
  const data = await res.json();
  if (data.success) return data.url;
  throw new Error(data.error || "Unknown error");
}

export async function sendTendersWithMapWorkflow({
  tenders,
  mapContainerId = "map-root",
  chunkNumber = 1,
  chunkTotal = 1,
  onStatus
}) {
  try {
    if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
    const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);

    if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
    const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);

    if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
    await sendTendersWithMapEmailjs({
      tenders,
      mapUrl,
      chunkNumber,
      chunkTotal
    });

    if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
  } catch (e) {
    if (onStatus) onStatus({ type: "error", message: "Ошибка: " + (e?.message || e) });
    throw e;
  }
}

/**
 * Автоматическая отправка каждый день в 15:01, если autoLoad=true
 * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
 * @param {string} mapContainerId - id DOM-элемента карты
 * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
 * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
 * @returns {() => void} функция для остановки таймера
 */
export function setupDailyTenderEmail(
  getTenders,
  mapContainerId = "map-root",
  onStatus,
  workflow = sendTendersWithMapWorkflow
) {
  let alreadySentToday = false;
  const timer = setInterval(async () => {
    const now = new Date();
    const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
    const hours = osloNow.getHours();
    const minutes = osloNow.getMinutes();

    if (hours === 15 && minutes === 1 && !alreadySentToday) {
      try {
        if (onStatus) onStatus({ type: "info", message: "Sender e-post..." });
        const tenders = getTenders();
        await workflow({
          tenders,
          mapContainerId,
          chunkNumber: 1,
          chunkTotal: 1,
          onStatus
        });
        if (onStatus) onStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
        alreadySentToday = true;
      } catch (e) {
        if (onStatus) onStatus({ type: "error", message: "Feil ved sending av e-post: " + (e?.message || e) });
      }
    }
    // Сброс флага на следующий день
    if (hours !== 15 || minutes !== 1) {
      alreadySentToday = false;
    }
  }, 60 * 1000);

  // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
  return () => clearInterval(timer);
}

/**
 * Автоматическая отправка email сразу после обновления данных.
 * @param {Object[]} tenders - массив тендеров
 * @param {string} mapContainerId - id DOM-элемента карты
 * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
 * @param {Function} [workflow=sendTendersWithMapWorkflow] - функция-воркфлоу для отправки (можно передать свою)
 * @returns {Promise<void>}
 */
export async function autoSendTendersWithMap({
  tenders,
  mapContainerId = "map-root",
  onStatus,
  workflow = sendTendersWithMapWorkflow
}) {
  if (!Array.isArray(tenders) || tenders.length === 0) {
    if (onStatus) onStatus({ type: "info", message: "Ingen nye anbud å sende." });
    return;
  }
  await workflow({
    tenders,
    mapContainerId,
    chunkNumber: 1,
    chunkTotal: 1,
    onStatus
  });
}


// import emailjs from "emailjs-com";
// import html2canvas from "html2canvas";

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
//         ${t.link ? `<a href="${t.link}">Åpne</a>` : ""}
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
//   if (!mapElement) throw new Error("Map element not found");
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   return canvas.toDataURL("image/png");
// }

// /**
//  * Отправляет письмо через emailjs с поддержкой шаблона rows/chunk
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapUrl - ссылка на картинку карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */
// export async function sendTendersWithMapEmailjs({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   const serviceId = import.meta.env.VITE_EMAIL_SERVICE_ID;
//   const templateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
//   const userId = import.meta.env.VITE_EMAIL_USER_ID;
//   const toEmail = import.meta.env.VITE_TO_EMAIL;
//   const fromEmail = import.meta.env.VITE_FROM_EMAIL;

//   const templateParams = {
//     subject: "Siste anbud og kart (automatisk utsending)",
//     rows: tendersToRows(tenders),
//     map_url: mapUrl,
//     to_email: toEmail,
//     from_email: fromEmail,
//     chunk_number: chunkNumber,
//     chunk_total: chunkTotal,
//   };

//   return emailjs.send(
//     serviceId,
//     templateId,
//     templateParams,
//     userId
//   );
// }

// // код для сервера загрузки карты в imgur
// export async function uploadBase64ToImgurViaServerless(base64) {
//   // Для Vercel: /api/uploadToImgur, для Netlify: /.netlify/functions/uploadToImgur
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ base64 }),
//   });
//   const data = await res.json();
//   if (data.success) return data.url;
//   throw new Error(data.error || "Unknown error");
// }

// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     await sendTendersWithMapEmailjs({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//   } catch (e) {
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + (e?.message || e) });
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
//         if (onStatus) onStatus({ type: "info", message: "Отправка email..." });
//         const tenders = getTenders();
//         await workflow({
//           tenders,
//           mapContainerId,
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus
//         });
//         if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//         alreadySentToday = true;
//       } catch (e) {
//         if (onStatus) onStatus({ type: "error", message: "Ошибка при отправке email: " + (e?.message || e) });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => clearInterval(timer);
// }




// import emailjs from "emailjs-com";
// import html2canvas from "html2canvas";

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
//         ${t.link ? `<a href="${t.link}">Åpne</a>` : ""}
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
//   if (!mapElement) throw new Error("Map element not found");
//   const canvas = await html2canvas(mapElement, { useCORS: true });
//   return canvas.toDataURL("image/png");
// }

// /**
//  * Отправляет письмо через emailjs с поддержкой шаблона rows/chunk
//  * @param {Object[]} tenders - массив тендеров
//  * @param {string} mapScreenshotBase64 - base64 PNG скриншот карты
//  * @param {number} chunkNumber - номер части (если разбиваете на части, иначе 1)
//  * @param {number} chunkTotal - всего частей (если разбиваете на части, иначе 1)
//  */


// export async function sendTendersWithMapEmailjs({
//   tenders,
//   mapUrl = "",
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   const serviceId = import.meta.env.VITE_EMAIL_SERVICE_ID;
//   const templateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
//   const userId = import.meta.env.VITE_EMAIL_USER_ID;
//   const toEmail = import.meta.env.VITE_TO_EMAIL;
//   const fromEmail = import.meta.env.VITE_FROM_EMAIL;

//   const templateParams = {
//     subject: "Siste anbud og kart (automatisk utsending)",
//     rows: tendersToRows(tenders),
//     map_url: mapUrl,
//     to_email: toEmail,
//     from_email: fromEmail,
//     chunk_number: chunkNumber,
//     chunk_total: chunkTotal,
//   };

//   return emailjs.send(
//     serviceId,
//     templateId,
//     templateParams,
//     userId
//   );
// }

// // код для сервера загрузки карты в imgur
// export async function uploadBase64ToImgurViaServerless(base64) {
//   // Для Vercel: /api/uploadToImgur, для Netlify: /.netlify/functions/uploadToImgur
//   //const endpoint = "/api/uploadToImgur"; // или "/.netlify/functions/uploadToImgur"
//   const endpoint = "/.netlify/functions/uploadToImgur";
//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ base64 }),
//   });
//   const data = await res.json();
//   if (data.success) return data.url;
//   throw new Error(data.error || "Unknown error");
// }
// export async function sendTendersWithMapWorkflow({
//   tenders,
//   mapContainerId = "map-root",
//   chunkNumber = 1,
//   chunkTotal = 1,
//   onStatus
// }) {
//   try {
//     if (onStatus) onStatus({ type: "info", message: "Делаю скриншот карты..." });
//     const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);

//     if (onStatus) onStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgurViaServerless(mapScreenshotBase64);

//     if (onStatus) onStatus({ type: "info", message: "Отправляю email..." });
//     await sendTendersWithMapEmailjs({
//       tenders,
//       mapUrl,
//       chunkNumber,
//       chunkTotal
//     });

//     if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//   } catch (e) {
//     if (onStatus) onStatus({ type: "error", message: "Ошибка: " + (e?.message || e) });
//     throw e;
//   }
// }


// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  * @param {(status: {type: string, message: string}) => void} [onStatus] - колбэк для статуса
//  * @returns {() => void} функция для остановки таймера
//  */
// export function setupDailyTenderEmail(getTenders, mapContainerId = "map-root", onStatus) {
//   let alreadySentToday = false;
//   const timer = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         if (onStatus) onStatus({ type: "info", message: "Отправка email..." });
//         const tenders = getTenders();
//         const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//         await sendTendersWithMapEmailjs({
//           tenders,
//           mapScreenshotBase64,
//           chunkNumber: 1,
//           chunkTotal: 1
//         });
//         if (onStatus) onStatus({ type: "success", message: "Email успешно отправлен!" });
//         alreadySentToday = true;
//       } catch (e) {
//         if (onStatus) onStatus({ type: "error", message: "Ошибка при отправке email: " + (e?.message || e) });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);

//   // Возвращаем функцию для остановки таймера (на случай размонтирования компонента)
//   return () => clearInterval(timer);
// }












// export async function sendTendersWithMapEmailjs({
//   tenders,
//   mapScreenshotBase64,
//   chunkNumber = 1,
//   chunkTotal = 1
// }) {
//   // Читаем переменные из .env (Vite)
//   const serviceId = import.meta.env.VITE_EMAIL_SERVICE_ID;
//   const templateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
//   const userId = import.meta.env.VITE_EMAIL_USER_ID;
//   const toEmail = import.meta.env.VITE_TO_EMAIL;
//   const fromEmail = import.meta.env.VITE_FROM_EMAIL;

//   // Формируем параметры для шаблона emailjs
//   const templateParams = {
//     subject: "Siste anbud og kart (automatisk utsending)",
//     rows: tendersToRows(tenders),
//     map_image: mapScreenshotBase64,
//     to_email: toEmail,
//     from_email: fromEmail,
//     chunk_number: chunkNumber,
//     chunk_total: chunkTotal,
//   };

//   console.log("serviceId:", serviceId);
//   console.log("templateId:", templateId);
//   console.log("userId:", userId);
//   console.log("toEmail:", toEmail);
//   console.log("fromEmail:", fromEmail);
//   console.log("templateParams:", templateParams);


//   // Отправка письма
//   return emailjs.send(
//     serviceId,
//     templateId,
//     templateParams,
//     userId
//   );
// }