import React, { useState, useEffect, useRef } from "react";
import MapComponent from "./MapComponent";
import DynamicListComponent from "./DynamicListComponent";
import {
  setupDailyTenderEmail,
} from "../utils/sendTendersWithMapEmailjs";
import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

/**
 * Компонент для отображения статуса отправки email
 */
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

/**
 * TenderDashboard с поддержкой статуса отправки email и ручной кнопкой
 */
const TenderDashboard = () => {
  const [locations, setLocations] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [autoLoad, setAutoLoad] = useState(true);
  const [cronNotices, setCronNotices] = useState([]);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronError, setCronError] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);

  const listRef = useRef();

  // --- Новый useRef для хранения актуальных cronNotices ---
  const cronNoticesRef = useRef(cronNotices);
  useEffect(() => {
    cronNoticesRef.current = cronNotices;
  }, [cronNotices]);

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

  // --- Исправленный useEffect для автоотправки ---
  useEffect(() => {
    if (!autoLoad) return;
    const stop = setupDailyTenderEmail(
      () => cronNoticesRef.current, // всегда актуальные данные
      "map-root",
      (status) => setEmailStatus(status),
      sendTendersWithMapWorkflow
    );
    return stop;
  }, [autoLoad]); // только autoLoad!

  const handleMarkerDoubleClick = (index) => {
    setActiveTender(index);
    if (listRef.current && listRef.current.scrollToTender) {
      listRef.current.scrollToTender(index);
    }
  };

  const handleManualEmailSend = async () => {
    try {
      await sendTendersWithMapWorkflow({
        tenders: cronNotices,
        mapContainerId: "map-root",
        chunkNumber: 1,
        chunkTotal: 1,
        onStatus: setEmailStatus
      });
    } catch {
      // Ошибка уже обработана через onStatus
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
          {/* Кнопка ручной отправки email ПОД чекбоксом */}
          <button
            style={{
              marginTop: "18px",
              padding: "10px 22px",
              fontSize: "16px",
              borderRadius: "6px",
              border: "1.5px solid #1976d2",
              background: "#fff",
              color: "#1976d2",
              fontWeight: 500,
              cursor: cronNotices.length === 0 ? "not-allowed" : "pointer",
              opacity: cronNotices.length === 0 ? 0.5 : 1,
              boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
              display: "block"
            }}
            onClick={handleManualEmailSend}
            disabled={cronNotices.length === 0}
            title={cronNotices.length === 0 ? "Нет данных для отправки" : ""}
          >
            Sende e-post manuelt
          </button>
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

export default TenderDashboard;

// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import {
//   setupDailyTenderEmail,
// } from "../utils/sendTendersWithMapEmailjs";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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
//  * TenderDashboard с поддержкой статуса отправки email и ручной кнопкой
//  */
// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

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

//   // --- Изменено: передаём sendTendersWithMapWorkflow в setupDailyTenderEmail ---
//   useEffect(() => {
//     if (!autoLoad) return;
//     const stop = setupDailyTenderEmail(
//       () => cronNotices,
//       "map-root",
//       (status) => setEmailStatus(status),
//       sendTendersWithMapWorkflow // <--- теперь автоматическая отправка использует тот же workflow!
//     );
//     return stop;
//   }, [autoLoad, cronNotices]);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
//     }
//   };

//   const handleManualEmailSend = async () => {
//     try {
//       await sendTendersWithMapWorkflow({
//         tenders: cronNotices,
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus
//       });
//     } catch {
//       // Ошибка уже обработана через onStatus
//     }
//   };

//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         <div style={{
//           padding: "10px 20px 0 20px",
//           background: "#f7f9fa"
//         }}>
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           {/* Кнопка ручной отправки email ПОД чекбоксом */}
//           <button
//             style={{
//               marginTop: "18px",
//               padding: "10px 22px",
//               fontSize: "16px",
//               borderRadius: "6px",
//               border: "1.5px solid #1976d2",
//               background: "#fff",
//               color: "#1976d2",
//               fontWeight: 500,
//               cursor: cronNotices.length === 0 ? "not-allowed" : "pointer",
//               opacity: cronNotices.length === 0 ? 0.5 : 1,
//               boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
//               display: "block"
//             }}
//             onClick={handleManualEmailSend}
//             disabled={cronNotices.length === 0}
//             title={cronNotices.length === 0 ? "Нет данных для отправки" : ""}
//           >
//             Отправить email вручную
//           </button>
//         </div>
//         <EmailStatus status={emailStatus} />
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

// export default TenderDashboard;


// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import {
//   setupDailyTenderEmail,
//  //  getMapScreenshot,
//  // sendTendersWithMapEmailjs
// } from "../utils/sendTendersWithMapEmailjs";
// //import { uploadBase64ToImgur } from "../utils/uploadToImgur.js";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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
//  * TenderDashboard с поддержкой статуса отправки email и ручной кнопкой
//  */
// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

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

//   useEffect(() => {
//     if (!autoLoad) return;
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


// const handleManualEmailSend = async () => {
//   try {
//     await sendTendersWithMapWorkflow({
//       tenders: cronNotices,
//       mapContainerId: "map-root",
//       chunkNumber: 1,
//       chunkTotal: 1,
//       onStatus: setEmailStatus
//     });
//   } catch {
//     // Ошибка уже обработана через onStatus
//   }
// };
//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         <div style={{
//           padding: "10px 20px 0 20px",
//           background: "#f7f9fa"
//         }}>
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           {/* Кнопка ручной отправки email ПОД чекбоксом */}
//           <button
//             style={{
//               marginTop: "18px",
//               padding: "10px 22px",
//               fontSize: "16px",
//               borderRadius: "6px",
//               border: "1.5px solid #1976d2",
//               background: "#fff",
//               color: "#1976d2",
//               fontWeight: 500,
//               cursor: cronNotices.length === 0 ? "not-allowed" : "pointer",
//               opacity: cronNotices.length === 0 ? 0.5 : 1,
//               boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
//               display: "block"
//             }}
//             onClick={handleManualEmailSend}
//             disabled={cronNotices.length === 0}
//             title={cronNotices.length === 0 ? "Нет данных для отправки" : ""}
//           >
//             Отправить email вручную
//           </button>
//         </div>
//         <EmailStatus status={emailStatus} />
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

// export default TenderDashboard;



  // Кнопка ручной отправки email
//   const handleManualEmailSend = async () => {
//   try {
//     const tenders = cronNotices;
//      const mapScreenshotBase64 = await getMapScreenshot("map-root");
//     //const mapScreenshotBase64 = "";
//     await sendTendersWithMapEmailjs({
//       tenders,
//       mapScreenshotBase64,
//       chunkNumber: 1,
//       chunkTotal: 1
//     });
//     setEmailStatus({ type: "success", message: "Email успешно отправлен вручную!" });
//   } catch (e) {
//     setEmailStatus({
//       type: "error",
//       message: "Ошибка при ручной отправке: " + (e?.message || JSON.stringify(e))
//     });
//     console.error("Ошибка при ручной отправке:", e);
//   }
  // };
  
//   const handleManualEmailSend = async () => {
//   try {
//     const tenders = cronNotices;
//     const mapElement = document.getElementById("map-root");
//     const originalWidth = mapElement.style.width;
//     const originalHeight = mapElement.style.height;

//     // Уменьшаем размер карты для скриншота
//     mapElement.style.width = "300px";
//     mapElement.style.height = "300px";

//     const mapScreenshotBase64 = await getMapScreenshot("map-root", "image/img", 0.05);
//     console.log("mapScreenshotBase64:", mapScreenshotBase64);
//     // const mapScreenshotBase64 = await getMapScreenshot("map-root", "image/png");

//     // Возвращаем размер обратно
//     mapElement.style.width = originalWidth;
//     mapElement.style.height = originalHeight;

//     if (mapScreenshotBase64.length > 50000) {
//       setEmailStatus({ type: "error", message: "Скриншот карты слишком большой для EmailJS даже после сжатия! Попробуйте ещё уменьшить размер или отправьте без карты." });
//       return;
//     }
//     await sendTendersWithMapEmailjs({
//       tenders,
//       mapScreenshotBase64,
//       chunkNumber: 1,
//       chunkTotal: 1
//     });
//     setEmailStatus({ type: "success", message: "Email успешно отправлен вручную!" });
//   } catch (e) {
//     setEmailStatus({
//       type: "error",
//       message: "Ошибка при ручной отправке: " + (e?.message || JSON.stringify(e))
//     });
//     console.error("Ошибка при ручной отправке:", e);
//   }
  // };
  
//   const handleManualEmailSend = async () => {
//   try {
//     const tenders = cronNotices;
//     const mapElement = document.getElementById("map-root");
//     const originalWidth = mapElement.style.width;
//     const originalHeight = mapElement.style.height;

//     // Уменьшаем размер карты для скриншота
//     mapElement.style.width = "300px";
//     mapElement.style.height = "300px";

//     const mapScreenshotBase64 = await getMapScreenshot("map-root", "image/png");
//     mapElement.style.width = originalWidth;
//     mapElement.style.height = originalHeight;

//     setEmailStatus({ type: "info", message: "Загружаю карту на imgur..." });
//     const mapUrl = await uploadBase64ToImgur(mapScreenshotBase64);

//     setEmailStatus({ type: "info", message: "Отправляю email с картой..." });
//     await sendTendersWithMapEmailjs({
//       tenders,
//       mapUrl, // передаём ссылку!
//       chunkNumber: 1,
//       chunkTotal: 1
//     });
//     setEmailStatus({ type: "success", message: "Email успешно отправлен вручную!" });
//   } catch (e) {
//     setEmailStatus({
//       type: "error",
//       message: "Ошибка при ручной отправке: " + (e?.message || JSON.stringify(e))
//     });
//     console.error("Ошибка при ручной отправке:", e);
//   }
// };





// import React, { useState, useRef, useEffect } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { setupDailyTenderEmail } from "../utils/sendTendersWithMapEmailjs";

// // Path to the cron-scraped data file (served statically from server)
// const CRON_DATA_URL = "http://localhost:4003/cron_doffin_last.json";

// // Компонент для статуса email
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

// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

//   useEffect(() => {
//     console.log("cronNotices oppdatert:", cronNotices);
//     console.log("locations oppdatert:", locations);
//   }, [cronNotices, locations]);

//   // Poll cron data every 60s if autoLoad is enabled
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       console.log("Henter cron-data...");
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch(CRON_DATA_URL, { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved lasting av cron-data");
//         const data = await resp.json();
//         console.log("Hentet cron-data:", data);
//         setCronNotices(data.results || []);
//       } catch (e) {
//         console.error("Feil ved henting av cron-data:", e);
//         setCronError(e.message || "Feil ved lasting av cron-data");
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

//   // Email отправка и статус
//   useEffect(() => {
//     if (!autoLoad) return;
//     const stop = setupDailyTenderEmail(
//       () => cronNotices,
//       "map-root",
//       (status) => setEmailStatus(status)
//     );
//     return stop;
//   }, [autoLoad, cronNotices]);

//   const handleMarkerDoubleClick = (index) => {
//     console.log("Markør dobbeltklikket, indeks:", index);
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
//               onChange={() => {
//                 console.log("Bytter autoLoad:", !autoLoad);
//                 setAutoLoad((v) => !v);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           {/* Статус отправки email только под галочкой */}
//           {autoLoad && <EmailStatus status={emailStatus} />}
//         </div>
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

// export default TenderDashboard;


// import React, { useState, useRef, useEffect } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";

// // Path to the cron-scraped data file (served statically from server)
// const CRON_DATA_URL = "http://localhost:4003/cron_doffin_last.json";

// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);

//   const listRef = useRef();

//   useEffect(() => {
//     console.log("cronNotices oppdatert:", cronNotices);
//     console.log("locations oppdatert:", locations);
//   }, [cronNotices, locations]);

//   // Poll cron data every 60s if autoLoad is enabled
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       console.log("Henter cron-data...");
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch(CRON_DATA_URL, { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved lasting av cron-data");
//         const data = await resp.json();
//         console.log("Hentet cron-data:", data);
//         setCronNotices(data.results || []);
//       } catch (e) {
//         console.error("Feil ved henting av cron-data:", e);
//         setCronError(e.message || "Feil ved lasting av cron-data");
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

//   const handleMarkerDoubleClick = (index) => {
//     console.log("Markør dobbeltklikket, indeks:", index);
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
//               onChange={() => {
//                 console.log("Bytter autoLoad:", !autoLoad);
//                 setAutoLoad((v) => !v);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//         </div>
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

// export default TenderDashboard;


// import React, { useState, useRef, useEffect } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";

// // Path to the cron-scraped data file (served statically from server)
// const CRON_DATA_URL = "http://localhost:4003/cron_doffin_last.json";

// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(false);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);

//   const listRef = useRef();

//   useEffect(() => {
//     console.log("cronNotices updated:", cronNotices);
//     console.log("locations updated:", locations);
//   }, [cronNotices, locations]);

//   // Poll cron data every 60s if autoLoad is enabled
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       console.log("Fetching cron data...");
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch(CRON_DATA_URL, { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//         const data = await resp.json();
//         console.log("Fetched cron data:", data);
//         setCronNotices(data.results || []);
//       } catch (e) {
//         console.error("Error fetching cron data:", e);
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

//   const handleMarkerDoubleClick = (index) => {
//     console.log("Marker double-clicked, index:", index);
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
//               onChange={() => {
//                 console.log("Toggling autoLoad:", !autoLoad);
//                 setAutoLoad((v) => !v);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Автоматически показывать последние тендеры (cron 15:00)
//           </label>
//         </div>
//         <DynamicListComponent
//           ref={listRef}
//           setLocations={setLocations}
//           activeTender={activeTender}
//           notices={autoLoad ? cronNotices : undefined}
//           disableLoadButton={autoLoad}
//           onTenderClick={setActiveTender}
//         />
//         {autoLoad && cronLoading && <p style={{ padding: "20px" }}>Загрузка...</p>}
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

// export default TenderDashboard;


// import React, { useState, useRef, useEffect } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";

// // Path to the cron-scraped data file (served statically from server)
// const CRON_DATA_URL = "http://localhost:4003/cron_doffin_last.json";

// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(false);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLocations, setCronLocations] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);

//   const listRef = useRef();

//   // Helper to convert cron tender data to locations for the map
//   function convertTendersToLocations(tenders) {
//     return (tenders || []).map((notice) => ({
//       name: notice.title || "Ukjent",
//       buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//       nutsCode: notice.nutsCode || "Ingen data",
//       country: notice.country || "Ingen data"
//     }));
//   }

//   // Poll cron data every 60s if autoLoad is enabled
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       setCronLoading(true);
//       setCronError(null);
//       try {
//         const resp = await fetch(CRON_DATA_URL, { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//         const data = await resp.json();
//         setCronNotices(data.results || []);
//         setCronLocations(convertTendersToLocations(data.results));
//       } catch (e) {
//         setCronError(e.message || "Feil ved загрузке cron-данных");
//         setCronNotices([]);
//         setCronLocations([]);
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

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
//     }
//   };

//   // When autoLoad is enabled, always show cron data in both list and map
//   // When disabled, use manual search logic (DynamicListComponent controls locations)
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
//             Автоматически показывать последние тендеры (cron 15:00)
//           </label>
//         </div>
//         {autoLoad ? (
//           <div style={{ padding: "20px" }}>
//             <h2>Автоматически загруженные тендеры (cron)</h2>
//             {cronLoading ? (
//               <p>Загрузка...</p>
//             ) : cronError ? (
//               <p style={{ color: "red" }}>{cronError}</p>
//             ) : cronNotices.length === 0 ? (
//               <p>Нет данных за сегодня</p>
//             ) : (
//               <div
//                 style={{
//                   maxHeight: "70vh",
//                   overflowY: "auto",
//                   paddingRight: "10px"
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "grid",
//                     gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//                     gap: "24px",
//                     width: "100%",
//                   }}
//                 >
//                   {cronNotices.map((notice, index) => (
//                     <div
//                       key={index}
//                       onClick={() => setActiveTender(index)}
//                       style={{
//                         border: "1.5px solid #d1e3f6",
//                         borderRadius: "10px",
//                         background: activeTender === index ? "#e0e0e0" : "#fff",
//                         boxShadow:
//                           activeTender === index
//                             ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                             : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                         padding: "18px 22px",
//                         display: "flex",
//                         flexDirection: "column",
//                         justifyContent: "space-between",
//                         height: "100%",
//                         transition: "box-shadow 0.2s",
//                         wordBreak: "break-word",
//                         cursor: "pointer",
//                       }}
//                     >
//                       <p>
//                         <strong>Tittel:</strong> {notice.title || "Ukjent"}
//                       </p>
//                       {notice.buyer && (
//                         <p>
//                           <strong>Oppdragsgiver:</strong> {notice.buyer}
//                         </p>
//                       )}
//                       {notice.typeAnnouncement && (
//                         <p>
//                           <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                         </p>
//                       )}
//                       {notice.announcementSubtype && (
//                         <p>
//                           <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                         </p>
//                       )}
//                       {notice.description && (
//                         <p>
//                           <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                         </p>
//                       )}
//                       {notice.location && (
//                         <p>
//                           <strong>Sted:</strong> {notice.location}
//                         </p>
//                       )}
//                       {notice.estValue && (
//                         <p>
//                           <strong>Estimert verdi:</strong> {notice.estValue}
//                         </p>
//                       )}
//                       {notice.publicationDate && (
//                         <p>
//                           <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                         </p>
//                       )}
//                       {notice.deadline && (
//                         <p>
//                           <strong>Frist:</strong> {notice.deadline}
//                         </p>
//                       )}
//                       {notice.eoes && (
//                         <p>
//                           <strong>EØS:</strong> {notice.eoes}
//                         </p>
//                       )}
//                       {notice.link && typeof notice.link === "string" && notice.link.trim() !== "" && (
//                         <p>
//                           <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                             Se mer informasjon
//                           </a>
//                         </p>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : (
//           <DynamicListComponent
//             ref={listRef}
//             setLocations={setLocations}
//             activeTender={activeTender}
//           />
//         )}
//       </div>
//       <div style={{ flex: 1 }}>
//         <MapComponent
//           locations={autoLoad ? cronLocations : locations}
//           onMarkerDoubleClick={handleMarkerDoubleClick}
//         />
//       </div>
//     </div>
//   );
// };

// export default TenderDashboard;


// import React, { useState, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";

// const TenderDashboard = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const listRef = useRef();

//   const handleMarkerDoubleClick = (index) => {
//     console.log("Установлен активный тендер:", index);
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
//     }
//   };

//   return (
//     <div style={{ display: "flex", height: "100vh" }}>
//       <div style={{ flex: 1, overflowY: "auto" }}>
//         <DynamicListComponent ref={listRef} setLocations={setLocations} activeTender={activeTender} />
//       </div>
//       <div style={{ flex: 1 }}>
//         <MapComponent locations={locations} onMarkerDoubleClick={handleMarkerDoubleClick} />
//       </div>
//     </div>
//   );
// };

// export default TenderDashboard;




