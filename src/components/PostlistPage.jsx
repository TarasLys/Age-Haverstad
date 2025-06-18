import React, { useState, useEffect, useRef } from "react";
import MapComponent from "./MapComponent";
import DynamicListComponent from "./DynamicListComponent";
import {
  setupDailyTenderEmail,
} from "../utils/sendTendersWithMapEmailjs";

function EmailStatus({ status }) {
  if (!status) return null;
  let color = "#1976d2";
  if (status.type === "success") color = "green";
  if (status.type === "error") color = "red";
  if (status.type === "info") color = "#1976d2";
  return (
    <div style={{
      margin: "10px 0",
      padding: "10px",
      border: `1px solid ${color}`,
      borderRadius: "6px",
      color,
      background: "#f7f9fa"
    }}>
      {status.message}
    </div>
  );
}

const PostlistPage = () => {
  const [locations, setLocations] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [autoLoad, setAutoLoad] = useState(true);
  const [cronNotices, setCronNotices] = useState([]);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronError, setCronError] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  const listRef = useRef();

  useEffect(() => {
    let intervalId;
    async function fetchCronData() {
      setCronLoading(true);
      setCronError(null);
      try {
        const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
        if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
        const data = await resp.json();
        setCronNotices(data.results || []);
      } catch (e) {
        setCronError(e.message || "Feil ved загрузке cron-данных");
        setCronNotices([]);
      }
      setCronLoading(false);
    }
    if (autoLoad) {
      fetchCronData();
      intervalId = setInterval(fetchCronData, 60000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoLoad]);

  useEffect(() => {
    if (!autoLoad) return;
    const stop = setupDailyTenderEmail(
      () => cronNotices,
      "map-root",
      (status) => setEmailStatus(status)
    );
    return stop;
  }, [autoLoad, cronNotices]);

  const handleMarkerDoubleClick = (index) => {
    setActiveTender(index);
    if (listRef.current && listRef.current.scrollToTender) {
      listRef.current.scrollToTender(index);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{
          padding: "10px 20px 0 20px",
          background: "#f7f9fa"
        }}>
          <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
            <input
              type="checkbox"
              checked={autoLoad}
              onChange={() => setAutoLoad((v) => !v)}
              style={{ marginRight: "8px" }}
            />
            Vis automatisk de siste anbudene (cron 15:00)
          </label>
        </div>
        <EmailStatus status={emailStatus} />
        <DynamicListComponent
          ref={listRef}
          setLocations={setLocations}
          activeTender={activeTender}
          notices={autoLoad ? cronNotices : undefined}
          disableLoadButton={autoLoad}
          onTenderClick={setActiveTender}
        />
        {autoLoad && cronLoading && <p style={{ padding: "20px" }}>Laster...</p>}
        {autoLoad && cronError && <p style={{ color: "red", padding: "20px" }}>{cronError}</p>}
      </div>
      <div style={{ flex: 1 }}>
        <div id="map-root" style={{ width: "100%", height: "100%" }}>
          <MapComponent
            locations={autoLoad ? cronNotices : locations}
            onMarkerDoubleClick={handleMarkerDoubleClick}
          />
        </div>
      </div>
    </div>
  );
};

export default PostlistPage;

// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { setupDailyTenderEmail } from "../utils/sendTendersWithMapEmailjs";

// /**
//  * Компонент для отображения статуса отправки email
//  */
// function EmailStatus({ status }) {
//   if (!status) return null;
//   let color = "#1976d2";
//   if (status.type === "success") color = "green";
//   if (status.type === "error") color = "red";
//   if (status.type === "info") color = "#1976d2";
//   return (
//     <div style={{
//       margin: "10px 0",
//       padding: "10px",
//       border: `1px solid ${color}`,
//       borderRadius: "6px",
//       color,
//       background: "#f7f9fa"
//     }}>
//       {status.message}
//     </div>
//   );
// }

// /**
//  * TenderDashboard с поддержкой статуса отправки email
//  */
// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true); // галочка включена по умолчанию
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

//   // Загрузка данных cron
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//         const data = await resp.json();
//         setCronNotices(data.results || []);
//       } catch (e) {
//         setCronError(e.message || "Feil ved загрузке cron-данных");
//         setCronNotices([]);
//       }
//       setCronLoading(false);
//     }
//     if (autoLoad) {
//       fetchCronData();
//       intervalId = setInterval(fetchCronData, 60000);
//     }
//     return () => {
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, [autoLoad]);

//   // Автоматическая отправка email и статус
//   useEffect(() => {
//     if (!autoLoad) return;
//     // Передаём функцию для обновления статуса
//     const stop = setupDailyTenderEmail(
//       () => cronNotices,
//       "map-root",
//       (status) => setEmailStatus(status)
//     );
//     return stop;
//   }, [autoLoad, cronNotices]);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
//     }
//   };

//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         <div style={{ padding: "10px 20px 0 20px", background: "#f7f9fa" }}>
//           <label style={{ fontWeight: 500, fontSize: "16px" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//         </div>
//         {/* Статус отправки email */}
//         {autoLoad && <EmailStatus status={emailStatus} />}
//         <DynamicListComponent
//           ref={listRef}
//           setLocations={setLocations}
//           activeTender={activeTender}
//           notices={autoLoad ? cronNotices : undefined}
//           disableLoadButton={autoLoad}
//           onTenderClick={setActiveTender}
//         />
//         {autoLoad && cronLoading && <p style={{ padding: "20px" }}>Laster...</p>}
//         {autoLoad && cronError && <p style={{ color: "red", padding: "20px" }}>{cronError}</p>}
//       </div>
//       <div style={{ flex: 1 }}>
//         <div id="map-root" style={{ width: "100%", height: "100%" }}>
//           <MapComponent
//             locations={autoLoad ? cronNotices : locations}
//             onMarkerDoubleClick={handleMarkerDoubleClick}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PostlistPage;


// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { setupDailyTenderEmail } from "../utils/sendTendersWithMapEmailjs";

// /**
//  * Компонент для отображения статуса отправки email
//  */
// function EmailStatus({ status }) {
//   if (!status) return null;
//   let color = "#1976d2";
//   if (status.type === "success") color = "green";
//   if (status.type === "error") color = "red";
//   if (status.type === "info") color = "#1976d2";
//   return (
//     <div style={{
//       margin: "10px 0",
//       padding: "10px",
//       border: `1px solid ${color}`,
//       borderRadius: "6px",
//       color,
//       background: "#f7f9fa"
//     }}>
//       {status.message}
//     </div>
//   );
// }

// /**
//  * TenderDashboard с поддержкой статуса отправки email
//  */
// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true); // галочка включена по умолчанию
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

//   // Загрузка данных cron
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//         const data = await resp.json();
//         setCronNotices(data.results || []);
//       } catch (e) {
//         setCronError(e.message || "Feil ved загрузке cron-данных");
//         setCronNotices([]);
//       }
//       setCronLoading(false);
//     }
//     if (autoLoad) {
//       fetchCronData();
//       intervalId = setInterval(fetchCronData, 60000);
//     }
//     return () => {
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, [autoLoad]);

//   // Автоматическая отправка email и статус
//   useEffect(() => {
//     if (!autoLoad) return;
//     // Передаём функцию для обновления статуса
//     const stop = setupDailyTenderEmail(
//       () => cronNotices,
//       "map-root",
//       (status) => setEmailStatus(status)
//     );
//     return stop;
//   }, [autoLoad, cronNotices]);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
//     }
//   };

//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         <div style={{ padding: "10px 20px 0 20px", background: "#f7f9fa" }}>
//           <label style={{ fontWeight: 500, fontSize: "16px" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//         </div>
//         {/* Статус отправки email */}
//         {autoLoad && <EmailStatus status={emailStatus} />}
//         <DynamicListComponent
//           ref={listRef}
//           setLocations={setLocations}
//           activeTender={activeTender}
//           notices={autoLoad ? cronNotices : undefined}
//           disableLoadButton={autoLoad}
//           onTenderClick={setActiveTender}
//         />
//         {autoLoad && cronLoading && <p style={{ padding: "20px" }}>Laster...</p>}
//         {autoLoad && cronError && <p style={{ color: "red", padding: "20px" }}>{cronError}</p>}
//       </div>
//       <div style={{ flex: 1 }}>
//         <MapComponent
//           locations={autoLoad ? cronNotices : locations}
//           onMarkerDoubleClick={handleMarkerDoubleClick}
//         />
//       </div>
//     </div>
//   );
// };

// export default PostlistPage;


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

//   // Отправка письма
//   return emailjs.send(
//     serviceId,
//     templateId,
//     templateParams,
//     userId
//   );
// }

// /**
//  * Автоматическая отправка каждый день в 15:01, если autoLoad=true
//  * Вызывать из DynamicListComponent или TenderDashboard
//  * @param {() => Array} getTenders - функция, возвращающая актуальный массив тендеров
//  * @param {string} mapContainerId - id DOM-элемента карты
//  */
// export function setupDailyTenderEmail(getTenders, mapContainerId = "map-root") {
//   // Проверяем каждую минуту, если сейчас 15:01 по Oslo — отправляем
//   let alreadySentToday = false;
//   setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       try {
//         const tenders = getTenders();
//         const mapScreenshotBase64 = await getMapScreenshot(mapContainerId);
//         await sendTendersWithMapEmailjs({
//           tenders,
//           mapScreenshotBase64,
//           chunkNumber: 1,
//           chunkTotal: 1
//         });
        
//         console.log("[EMAILJS] Автоматическая отправка тендеров и карты выполнена!");
//         alreadySentToday = true;
//       } catch (e) {
        
//         console.error("[EMAILJS] Ошибка при автоматической отправке:", e);
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 60 * 1000);
// }