import React, { useState, useEffect, useRef, useCallback } from "react";
import MapComponent from "./MapComponent";
import DynamicListComponent from "./DynamicListComponent";
// Удаляем импорт sendTendersWithMapWorkflow
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

function EmailStatus({ status }) {
  if (!status) return null;
  let color = "#1976d2";
  if (status.type === "success") color = "green";
  if (status.type === "error") color = "red";
  if (status.type === "info") color = "#1976d2";
  if (status.type === "warning") color = "#ff9800";
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
  const alreadyStatusShownTodayRef = useRef(false);
  const alreadySentTodayRef = useRef(false);
  const needToAutoSendRef = useRef(false);

  // Автоматическая загрузка свежих данных каждую минуту
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

  // Новый способ отправки email через IPC (Nodemailer)
const handleManualSend = useCallback(async () => {
  setEmailStatus({ type: "info", message: "Отправляю e-post..." });
  try {
    const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
    const data = await resp.json();
    const tenders = data.results || [];
    if (!Array.isArray(tenders) || tenders.length === 0) {
      setEmailStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
      return;
    }

    // IPC вызов main process Electron для отправки email через Nodemailer
    // window.electronAPI должен быть определён в preload.js
    if (window.electronAPI && window.electronAPI.sendTendersWithMap) {
      // ВОТ СЮДА ДОБАВЬ ЛОГ:
      console.log('ВЫЗЫВАЕМ window.electronAPI.sendTendersWithMap', window.electronAPI);
      await window.electronAPI.sendTendersWithMap({
        tenders,
        mapContainerId: "map-root",
        chunkNumber: 1,
        chunkTotal: 1,
      });
      setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
      alreadySentTodayRef.current = true;
    } else {
      throw new Error("IPC API для отправки email не найден. Проверьте preload.js и main process.");
    }
  } catch (e) {
    setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
  }
}, []);

  // Показываем статус и ставим флаг для автоотправки после рендера карты
  useEffect(() => {
    if (!autoLoad) return;
    const intervalId = setInterval(() => {
      const now = new Date();
      const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
      const hours = osloNow.getHours();
      const minutes = osloNow.getMinutes();

      if (hours === 15 && minutes === 1 && !alreadyStatusShownTodayRef.current && !alreadySentTodayRef.current) {
        setEmailStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
        needToAutoSendRef.current = true;
        alreadyStatusShownTodayRef.current = true;
      }
      // Сброс флага на следующий день
      if (hours !== 15 || minutes !== 1) {
        alreadyStatusShownTodayRef.current = false;
        alreadySentTodayRef.current = false;
        needToAutoSendRef.current = false;
      }
    }, 10000); // Проверяем каждые 10 секунд
    return () => clearInterval(intervalId);
  }, [autoLoad]);

  // Автоматическая отправка email только после обновления карты
  const handleMapRendered = useCallback(() => {
    if (needToAutoSendRef.current && !alreadySentTodayRef.current) {
      handleManualSend();
      needToAutoSendRef.current = false;
    }
  }, [handleManualSend]);

  // Ручное обновление данных
  const handleManualUpdate = async () => {
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
      setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
    }
    setCronLoading(false);
  };

  const handleMarkerDoubleClick = (index) => {
    setActiveTender(index);
    if (listRef.current && listRef.current.scrollToTender) {
      listRef.current.scrollToTender(index);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "10px 20px 0 20px", background: "#f7f9fa" }}>
          <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
            <input
              type="checkbox"
              checked={autoLoad}
              onChange={() => setAutoLoad((v) => !v)}
              style={{ marginRight: "8px" }}
            />
            Vis automatisk de siste anbudene (cron 15:00)
          </label>
          <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
            Обновить данные вручную
          </button>
          <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
            Отправить e-post вручную
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
            onRendered={handleMapRendered}
          />
        </div>
      </div>
    </div>
  );
};

export default PostlistPage;

//работает с Resend// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

// function EmailStatus({ status }) {
//   if (!status) return null;
//   let color = "#1976d2";
//   if (status.type === "success") color = "green";
//   if (status.type === "error") color = "red";
//   if (status.type === "info") color = "#1976d2";
//   if (status.type === "warning") color = "#ff9800";
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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadyStatusShownTodayRef = useRef(false);
//   const alreadySentTodayRef = useRef(false);
//   const needToAutoSendRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Ручная отправка email (только со свежим fetch), теперь с проверкой на пустой массив!
//   const handleManualSend = useCallback(async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       const tenders = data.results || [];
//       if (!Array.isArray(tenders) || tenders.length === 0) {
//         setEmailStatus({ type: "warning", message: "Нет тендеров для отправки — рассылка отменена." });
//         return;
//       }
//       await sendTendersWithMapWorkflow({
//         tenders,
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//       alreadySentTodayRef.current = true;
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   }, []);

//   // Показываем статус и ставим флаг для автоотправки после рендера карты
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(() => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadyStatusShownTodayRef.current && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         needToAutoSendRef.current = true;
//         alreadyStatusShownTodayRef.current = true;
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadyStatusShownTodayRef.current = false;
//         alreadySentTodayRef.current = false;
//         needToAutoSendRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Автоматическая отправка email только после обновления карты
//   const handleMapRendered = useCallback(() => {
//     if (needToAutoSendRef.current && !alreadySentTodayRef.current) {
//       handleManualSend();
//       needToAutoSendRef.current = false;
//     }
//   }, [handleManualSend]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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
//             onRendered={handleMapRendered}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PostlistPage;


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadyStatusShownTodayRef = useRef(false);
//   const alreadySentTodayRef = useRef(false);
//   const needToAutoSendRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Ручная отправка email (только со свежим fetch), БЕЗ проверки на пустой массив!
//   const handleManualSend = useCallback(async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       // УБРАНА ПРОВЕРКА НА ПУСТОЙ МАССИВ!
//       await sendTendersWithMapWorkflow({
//         tenders: data.results || [],
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//       alreadySentTodayRef.current = true;
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   }, []);

//   // Показываем статус и ставим флаг для автоотправки после рендера карты
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(() => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadyStatusShownTodayRef.current && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         needToAutoSendRef.current = true;
//         alreadyStatusShownTodayRef.current = true;
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadyStatusShownTodayRef.current = false;
//         alreadySentTodayRef.current = false;
//         needToAutoSendRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Автоматическая отправка email только после обновления карты
//   const handleMapRendered = useCallback(() => {
//     if (needToAutoSendRef.current && !alreadySentTodayRef.current) {
//       handleManualSend();
//       needToAutoSendRef.current = false;
//     }
//   }, [handleManualSend]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отпр��вить e-post вручную
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
//             onRendered={handleMapRendered}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PostlistPage;


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadyStatusShownTodayRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Только показываем статус, не отправляем email автоматически!
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(() => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadyStatusShownTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         alreadyStatusShownTodayRef.current = true;
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadyStatusShownTodayRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Ручная отправка email (только со свежим fetch)
//   const handleManualSend = useCallback(async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       if (!data.results || data.results.length === 0) {
//         throw new Error("Нет обновлённых тендеров для отправки");
//       }
//       await sendTendersWithMapWorkflow({
//         tenders: data.results,
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   }, []);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);
//   const manualSendRef = useRef(null);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Ручная отправка email (только со свежим fetch)
//   const handleManualSend = useCallback(async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       if (!data.results || data.results.length === 0) {
//         throw new Error("Нет обновлённых тендеров для отправки");
//       }
//       await sendTendersWithMapWorkflow({
//         tenders: data.results,
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   }, []);

//   // Делаем функцию доступной для автоматического вызова
//   manualSendRef.current = handleManualSend;

//   // Автоматическая отправка email в 15:01 Oslo, через handleManualSend (имитация ручного нажатия)
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(() => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Ждём обновления карты для e-post..." });
//         // Имитация нажатия на кнопку "Отправить e-post вручную"
//         if (manualSendRef.current) {
//           manualSendRef.current();
//         }
//         alreadySentTodayRef.current = true;
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadySentTodayRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;


// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Новый useEffect: отправка email только после обновления cronNotices в нужное время
//   useEffect(() => {
//     if (!autoLoad) return;
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     // Проверяем, что сейчас 15:01 и данные только что обновились
//     if (
//       hours === 15 &&
//       minutes === 1 &&
//       !alreadySentTodayRef.current &&
//       cronNotices.length > 0
//     ) {
//       setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//       sendTendersWithMapWorkflow({
//         tenders: cronNotices,
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       })
//         .then(() => {
//           setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//           alreadySentTodayRef.current = true;
//         })
//         .catch((e) => {
//           setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//         });
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentTodayRef.current = false;
//     }
//   }, [cronNotices, autoLoad]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

//   // Ручная отправка email (только со свежим fetch)
//   const handleManualSend = async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       await sendTendersWithMapWorkflow({
//         tenders: data.results || [],
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;

// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Диспатч события MAP_UPDATED после обновления cronNotices и рендера карты
//   useEffect(() => {
//     if (autoLoad && cronNotices.length > 0) {
//       // Диспатчим событие после того, как cronNotices обновились
//       setTimeout(() => {
//         if (typeof window !== "undefined" && window.dispatchEvent) {
//           window.dispatchEvent(new CustomEvent("MAP_UPDATED", { detail: cronNotices }));
//         }
//       }, 0); // после рендера
//     }
//   }, [cronNotices, autoLoad]);

//   // Автоматическая отправка email в 15:01 Oslo, только со свежим fetch
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//         try {
//           // Делаем свежий fetch прямо перед отправкой!
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           await sendTendersWithMapWorkflow({
//             tenders: data.results || [],
//             mapContainerId: "map-root",
//             chunkNumber: 1,
//             chunkTotal: 1,
//             onStatus: setEmailStatus,
//           });
//           setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//           alreadySentTodayRef.current = true;
//         } catch (e) {
//           setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//         }
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadySentTodayRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

//   // Ручная отправка email (только со свежим fetch)
//   const handleManualSend = async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       await sendTendersWithMapWorkflow({
//         tenders: data.results || [],
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;


// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);

//   // Автоматическая загрузка свежих данных каждую минуту
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

//   // Автоматическая отправка email в 15:01 Oslo, только со свежим fetch
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//         try {
//           // Делаем свежий fetch прямо перед отправкой!
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//           const data = await resp.json();
//           await sendTendersWithMapWorkflow({
//             tenders: data.results || [],
//             mapContainerId: "map-root",
//             chunkNumber: 1,
//             chunkTotal: 1,
//             onStatus: setEmailStatus,
//           });
//           setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//           alreadySentTodayRef.current = true;
//         } catch (e) {
//           setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//         }
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadySentTodayRef.current = false;
//       }
//     }, 10000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // Ручное обновление данных
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

//   // Ручная отправка email (только со свежим fetch)
//   const handleManualSend = async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       await sendTendersWithMapWorkflow({
//         tenders: data.results || [],
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   };

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
//           <label style={{ fontWeight: 500, fontSize: "16px", display: "block" }}>
//             <input
//               type="checkbox"
//               checked={autoLoad}
//               onChange={() => setAutoLoad((v) => !v)}
//               style={{ marginRight: "8px" }}
//             />
//             Vis automatisk de siste anbudene (cron 15:00)
//           </label>
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;

// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();

//   // Подписка на событие обновления тендеров (централизованное расписание)
//   useEffect(() => {
//     function handleUpdate(e) {
//       setCronNotices(e.detail || []);
//       setCronLoading(false);
//       setCronError(null);
//     }
//     window.addEventListener("TENDERS_UPDATED", handleUpdate);
//     return () => window.removeEventListener("TENDERS_UPDATED", handleUpdate);
//   }, []);

//   // Если нужно вручную обновить данные (например, по кнопке)
//   const handleManualUpdate = async () => {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   };

//   // Если нужно вручную отправить email (например, по кнопке)
//   const handleManualSend = async () => {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//       const data = await resp.json();
//       await sendTendersWithMapWorkflow({
//         tenders: data.results || [],
//         mapContainerId: "map-root",
//         chunkNumber: 1,
//         chunkTotal: 1,
//         onStatus: setEmailStatus,
//       });
//       setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//     } catch (e) {
//       setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//     }
//   };

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
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
//           <button onClick={handleManualUpdate} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Обновить данные вручную
//           </button>
//           <button onClick={handleManualSend} style={{ marginLeft: 12, marginBottom: 8 }}>
//             Отправить e-post вручную
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

// export default PostlistPage;

// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadyScrapedTodayRef = useRef(false);
//   const alreadyUpdatedTodayRef = useRef(false);

//   // 1. Таймер для запуска скрапинга Doffin в 15:00
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 0 && !alreadyScrapedTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Запуск скрапинга Doffin..." });
//         try {
//           // Запуск скрапинга через серверный endpoint (POST)
//           const res = await fetch("http://localhost:4003/api/notices/doffin-scrape", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({}), // Можно передать параметры, если нужно
//           });
//           if (!res.ok) throw new Error("Ошибка запуска скрапинга Doffin");
//           setEmailStatus({ type: "success", message: "Скрабинг Doffin успешно запущен!" });
//           alreadyScrapedTodayRef.current = true;
//         } catch (e) {
//           setEmailStatus({ type: "error", message: "Ошибка запуска скрапинга: " + (e.message || e) });
//         }
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 0) {
//         alreadyScrapedTodayRef.current = false;
//       }
//     }, 10 * 1000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // 2. Таймер для обновления данных для UI (cronNotices) в 15:01
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadyUpdatedTodayRef.current) {
//         setCronLoading(true);
//         setCronError(null);
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//           if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//           const data = await resp.json();
//           setCronNotices(data.results || []);
//           alreadyUpdatedTodayRef.current = true;
//         } catch (e) {
//           setCronError(e.message || "Feil ved загрузке cron-данных");
//           setCronNotices([]);
//           setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//         }
//         setCronLoading(false);
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadyUpdatedTodayRef.current = false;
//       }
//     }, 10 * 1000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // 3. Таймер для отправки email в 15:01 (только через свежий fetch, не через cronNotices!)
//   useEffect(() => {
//   if (!autoLoad) return;
//   let alreadySentToday = false;
//   const intervalId = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     // Изменено на 15:03
//     if (hours === 15 && minutes === 3 && !alreadySentToday) {
//       setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//       try {
//         const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//         const data = await resp.json();
//         console.log("Данные для письма (свежий fetch):", data.results);
//         await sendTendersWithMapWorkflow({
//           tenders: data.results || [],
//           mapContainerId: "map-root",
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus: setEmailStatus,
//         });
//         setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 3) {
//       alreadySentToday = false;
//     }
//   }, 10 * 1000); // Проверяем каждые 10 секунд
//   return () => clearInterval(intervalId);
// }, [autoLoad]);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
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

// export default PostlistPage;


// import React, { useState, useEffect, useRef } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadyScrapedTodayRef = useRef(false);
//   const alreadyUpdatedTodayRef = useRef(false);
//   const alreadySentTodayRef = useRef(false);

//   // Новый ref для отслеживания даты последнего обновления файла
//   const prevFileDateRef = useRef(null);

//   // 1. Таймер для запуска скрабинга Doffin в 15:00
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 0 && !alreadyScrapedTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Запуск скрабинга Doffin..." });
//         try {
//           // Запуск скрабинга через серверный endpoint (POST)
//           const res = await fetch("http://localhost:4003/api/notices/doffin-scrape", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({}), // Можно передать параметры, если нужно
//           });
//           if (!res.ok) throw new Error("Ошибка запуска скрабинга Doffin");
//           setEmailStatus({ type: "success", message: "Скрабинг Doffin успешно запущен!" });
//           alreadyScrapedTodayRef.current = true;
//         } catch (e) {
//           setEmailStatus({ type: "error", message: "Ошибка запуска скрабинга: " + (e.message || e) });
//         }
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 0) {
//         alreadyScrapedTodayRef.current = false;
//       }
//     }, 10 * 1000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // 2. Таймер для обновления данных в 15:01 (оставляем для совместимости, но статус обновления теперь только по факту обновления файла)
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();

//       if (hours === 15 && minutes === 1 && !alreadyUpdatedTodayRef.current) {
//         setCronLoading(true);
//         setCronError(null);
//         try {
//           const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//           if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//           const data = await resp.json();
//           setCronNotices(data.results || []);
//           // Не ставим статус здесь!
//           alreadyUpdatedTodayRef.current = true;
//         } catch (e) {
//           setCronError(e.message || "Feil ved загрузке cron-данных");
//           setCronNotices([]);
//           setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//         }
//         setCronLoading(false);
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadyUpdatedTodayRef.current = false;
//       }
//     }, 10 * 1000); // Проверяем каждые 10 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad]);

//   // 3. Таймер для отправки email в 15:01:30
//   useEffect(() => {
//     if (!autoLoad) return;
//     const intervalId = setInterval(async () => {
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();
//       const seconds = osloNow.getSeconds();

//       if (
//         hours === 15 &&
//         minutes === 1 &&
//         seconds >= 30 && seconds < 36 && // диапазон на всякий случай
//         !alreadySentTodayRef.current &&
//         cronNotices.length > 0
//       ) {
//         setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//         try {
//           await sendTendersWithMapWorkflow({
//             tenders: cronNotices,
//             mapContainerId: "map-root",
//             chunkNumber: 1,
//             chunkTotal: 1,
//             onStatus: setEmailStatus,
//           });
//           setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//           alreadySentTodayRef.current = true;
//         } catch (e) {
//           setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//         }
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || minutes !== 1) {
//         alreadySentTodayRef.current = false;
//       }
//     }, 5 * 1000); // Проверяем каждые 5 секунд
//     return () => clearInterval(intervalId);
//   }, [autoLoad, cronNotices]);

//   // Новый useEffect: следим за реальным обновлением файла cron_doffin_last.json и только тогда показываем статус обновления!
//   // 3. Таймер для отправки email в 15:01:30

// useEffect(() => {
//   if (!autoLoad) return;
//   let alreadySentToday = false;
//   const intervalId = setInterval(async () => {
//     const now = new Date();
//     const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//     const hours = osloNow.getHours();
//     const minutes = osloNow.getMinutes();

//     if (hours === 15 && minutes === 1 && !alreadySentToday) {
//       setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//       try {
//         // Делаем свежий fetch прямо перед отправкой!
//         const resp = await fetch("http://localhost:4003/cron_doffin_last.json?t=" + Date.now(), { cache: "no-store" });
//         const data = await resp.json();
//         console.log("Данные для письма (свежий fetch):", data.results);
//         await sendTendersWithMapWorkflow({
//           tenders: data.results || [],
//           mapContainerId: "map-root",
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus: setEmailStatus,
//         });
//         setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentToday = true;
//       } catch (e) {
//         setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//       }
//     }
//     // Сброс флага на следующий день
//     if (hours !== 15 || minutes !== 1) {
//       alreadySentToday = false;
//     }
//   }, 10 * 1000); // Проверяем каждые 10 секунд
//   return () => clearInterval(intervalId);
// }, [autoLoad]);


//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
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

// export default PostlistPage;

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);
//   const needToSendEmailRef = useRef(false);

//   // Новый ref для хранения актуальных данных
//   const cronNoticesRef = useRef([]);
//   useEffect(() => {
//     cronNoticesRef.current = cronNotices;
//   }, [cronNotices]);

//   // 1. Фетчим данные по расписанию, но НЕ отправляем email сразу!
//   useEffect(() => {
//   let intervalId;
//   async function fetchCronData() {
//     setCronLoading(true);
//     setCronError(null);
//     try {
//       const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//       if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//       const data = await resp.json();
//       setCronNotices(data.results || []);
//       // Проверяем время: если сейчас 15:00:50 Oslo, ставим флаг на отправку email и показываем статус!
//       const now = new Date();
//       const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//       const hours = osloNow.getHours();
//       const minutes = osloNow.getMinutes();
//       const seconds = osloNow.getSeconds();

//       if (hours === 15 && minutes === 0 && seconds === 50 && !alreadySentTodayRef.current) {
//         setEmailStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//         needToSendEmailRef.current = true;
//       }
//       // Сброс флага на следующий день
//       if (hours !== 15 || (minutes !== 0 && minutes !== 1)) {
//         alreadySentTodayRef.current = false;
//       }
//     } catch (e) {
//       setCronError(e.message || "Feil ved загрузке cron-данных");
//       setCronNotices([]);
//       setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
//     }
//     setCronLoading(false);
//   }
//   if (autoLoad) {
//     fetchCronData();
//     intervalId = setInterval(fetchCronData, 1000); // Проверяем каждую секунду!
//   }
//   return () => {
//     if (intervalId) clearInterval(intervalId);
//   };
// }, [autoLoad]);

//   // 2. Когда cronNotices обновились, показываем статус "Данные обновлены!"
//   // useEffect(() => {
//   //   if (cronNotices.length > 0) {
//   //     setEmailStatus({ type: "success", message: "Данные обновлены!" });
//   //   }
//   // }, [cronNotices]);

//   // 3. Callback, который вызовется когда карта реально обновилась
//   const handleMapRendered = useCallback(() => {
//     if (needToSendEmailRef.current) {
//       setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//       // Делаем свежий fetch cron_doffin_last.json прямо перед отправкой email!
//       fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" })
//         .then(resp => resp.json())
//         .then(data => {
//           const tendersToSend = data.results || [];
//           console.log("Данные для email (свежий fetch):", tendersToSend);
//           return sendTendersWithMapWorkflow({
//             tenders: tendersToSend,
//             mapContainerId: "map-root",
//             chunkNumber: 1,
//             chunkTotal: 1,
//             onStatus: setEmailStatus,
//           });
//         })
//         .then(() => {
//           setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//           alreadySentTodayRef.current = true;
//         })
//         .catch(e => {
//           setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//         });
//       needToSendEmailRef.current = false;
//     }
//   }, []);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
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
//             onRendered={handleMapRendered} // ВАЖНО: передаем callback!
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PostlistPage;


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import MapComponent from "./MapComponent";
// import DynamicListComponent from "./DynamicListComponent";
// import { sendTendersWithMapWorkflow } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
//   const [locations, setLocations] = useState([]);
//   const [activeTender, setActiveTender] = useState(null);
//   const [autoLoad, setAutoLoad] = useState(true);
//   const [cronNotices, setCronNotices] = useState([]);
//   const [cronLoading, setCronLoading] = useState(false);
//   const [cronError, setCronError] = useState(null);
//   const [emailStatus, setEmailStatus] = useState(null);

//   const listRef = useRef();
//   const alreadySentTodayRef = useRef(false);
//   const needToSendEmailRef = useRef(false);

//   // Новый ref для хранения актуальных данных
//   const cronNoticesRef = useRef([]);
//   useEffect(() => {
//     cronNoticesRef.current = cronNotices;
//   }, [cronNotices]);

//   // 1. Фетчим данные по расписанию, но НЕ отправляем email сразу!
//   useEffect(() => {
//     let intervalId;
//     async function fetchCronData() {
//       setCronLoading(true);
//       setCronError(null);
//       setEmailStatus({ type: "info", message: "Обновляю тендеры за сутки..." });
//       try {
//         const resp = await fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" });
//         if (!resp.ok) throw new Error("Feil ved загрузке cron-данных");
//         const data = await resp.json();
//         setCronNotices(data.results || []);
//         // Проверяем время: если сейчас 15:01 Oslo, ставим флаг на отправку email
//         const now = new Date();
//         const osloNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));
//         const hours = osloNow.getHours();
//         const minutes = osloNow.getMinutes();

//         if (hours === 15 && minutes === 1 && !alreadySentTodayRef.current) {
//           needToSendEmailRef.current = true;
//         }
//         // Сброс флага на следующий день
//         if (hours !== 15 || minutes !== 1) {
//           alreadySentTodayRef.current = false;
//         }
//       } catch (e) {
//         setCronError(e.message || "Feil ved загрузке cron-данных");
//         setCronNotices([]);
//         setEmailStatus({ type: "error", message: e.message || "Feil ved загрузке cron-данных" });
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

//   // 2. Когда cronNotices обновились, показываем статус "Данные обновлены!"
//   useEffect(() => {
//     if (cronNotices.length > 0) {
//       setEmailStatus({ type: "success", message: "Данные обновлены!" });
//     }
//   }, [cronNotices]);

//   // 3. Callback, который вызовется когда карта реально обновилась
//   const handleMapRendered = useCallback(() => {
//   if (needToSendEmailRef.current) {
//     setEmailStatus({ type: "info", message: "Отправляю e-post..." });
//     // Делаем свежий fetch cron_doffin_last.json прямо перед отправкой email!
//     fetch("http://localhost:4003/cron_doffin_last.json", { cache: "no-store" })
//       .then(resp => resp.json())
//       .then(data => {
//         const tendersToSend = data.results || [];
//         console.log("Данные для email (свежий fetch):", tendersToSend);
//         return sendTendersWithMapWorkflow({
//           tenders: tendersToSend,
//           mapContainerId: "map-root",
//           chunkNumber: 1,
//           chunkTotal: 1,
//           onStatus: setEmailStatus,
//         });
//       })
//       .then(() => {
//         setEmailStatus({ type: "success", message: "E-posten ble sendt vellykket!" });
//         alreadySentTodayRef.current = true;
//       })
//       .catch(e => {
//         setEmailStatus({ type: "error", message: "Feil ved sending av e-post: " + (e.message || e) });
//       });
//     needToSendEmailRef.current = false;
//   }
// }, []);

//   const handleMarkerDoubleClick = (index) => {
//     setActiveTender(index);
//     if (listRef.current && listRef.current.scrollToTender) {
//       listRef.current.scrollToTender(index);
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
//             onRendered={handleMapRendered} // ВАЖНО: передаем callback!
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
// import {
//   setupDailyTenderEmail,
// } from "../utils/sendTendersWithMapEmailjs";

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

// const PostlistPage = () => {
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