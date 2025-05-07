import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";

function extractText(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "#text" in val) return val["#text"];
  if (Array.isArray(val)) return val.map(extractText).join("; ");
  return "";
}

function getTruncatedName(location) {
  const buyer = location.buyer || location.Oppdragsgiver;
  if (buyer) {
    const cleanText = buyer.replace(/[-–—]/g, " ");
    const words = cleanText.trim().split(/\s+/);
    return words.slice(0, 2).join(" ");
  }
  return "unknown";
}

// Функция нормализации: удаляет запятые, приводит строку к нижнему регистру и убирает пробелы
function normalizeName(name) {
  return name.replace(/,/g, "").toLowerCase().trim();
}

// Функция форматирования строки для отображения (первая буква заглавная, остальные — строчные)
function capitalizeName(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
  const [notices, setNotices] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pendingFromDate, setPendingFromDate] = useState("");
  const [pendingToDate, setPendingToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [useScraping, setUseScraping] = useState(false);
  const [useDoffinScraping, setUseDoffinScraping] = useState(false);
  const [cpvCode, setCpvCode] = useState("45000000");
  const [filterValue, setFilterValue] = useState(""); // Состояние выбранного фильтра
  const listRefs = useRef([]);
  const listContainerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToTender: (index) => {
      if (listRefs.current[index]) {
        listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }));

  const handleLoad = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      let url, body;
      if (useDoffinScraping) {
        url = "http://localhost:4003/api/notices/doffin-scrape";
        body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
      } else if (useScraping) {
        url = "http://localhost:4002/api/notices/scrape-site";
        body = JSON.stringify({ from: fromDate, to: toDate });
      } else {
        url = apiURL;
        body = JSON.stringify({ from: fromDate, to: toDate });
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await response.json();
      setNotices(data.results || []);

      // Вычисляем полный список локаций для карты
      const fullLocations = (data.results || []).map((notice) => ({
        name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
        buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
        nutsCode: notice.nutsCode || "Ingen data",
        country: notice.country || "Ingen data"
      }));
      setLocations(fullLocations);
    } catch (e) {
      console.error("Feil ved lasting av data:", e);
      setNotices([]);
    }
    setLoading(false);
  };

  // При изменении фильтра или списка аукционов обновляем данные для карты.
  // Здесь фильтрация происходит по нормализованным значениям
  useEffect(() => {
    const filteredNotices = filterValue
      ? notices.filter((notice) => normalizeName(getTruncatedName(notice)) === filterValue)
      : notices;
    const filteredLocations = filteredNotices.map((notice) => ({
      name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
      buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
      nutsCode: notice.nutsCode || "Ingen data",
      country: notice.country || "Ingen data"
    }));
    setLocations(filteredLocations);
  }, [filterValue, notices, setLocations]);

  // Фильтруем список аукционов для отображения по нормализованным значениям
  const displayedNotices = filterValue
    ? notices.filter((notice) => normalizeName(getTruncatedName(notice)) === filterValue)
    : notices;

  // Опции фильтра формируются из нормализованных значений, чтобы, например,
  // "dovre kommune" и "dovre kommune" считались одинаковыми.
  const filterOptions = Array.from(
    new Set(notices.map((notice) => normalizeName(getTruncatedName(notice))))
  ).sort();

  const handleItemClick = (index) => {
    if (listRefs.current[index]) {
      listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Обработчик для стрелочки – прокручивает контейнер списка к началу
  const scrollListToTop = () => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
      <h2>Anbud</h2>
      {/* Контрольная панель */}
      <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Чекбоксы для выбора режима скрапинга */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "16px", fontWeight: "500" }}>
            <input
              type="checkbox"
              checked={useScraping}
              onChange={() => {
                setUseScraping((v) => !v);
                if (useDoffinScraping) setUseDoffinScraping(false);
              }}
              style={{ marginRight: "8px" }}
            />
            Bruk TED-nettskraping
          </label>
          <label style={{ fontSize: "16px", fontWeight: "500" }}>
            <input
              type="checkbox"
              checked={useDoffinScraping}
              onChange={() => {
                setUseDoffinScraping((v) => !v);
                if (useScraping) setUseScraping(false);
              }}
              style={{ marginRight: "8px" }}
            />
            Bruk Doffin-databasen
          </label>
        </div>
        {useDoffinScraping && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
              CPV kode og ord:
            </label>
            <input
              id="cpv"
              type="text"
              value={cpvCode}
              onChange={(e) => setCpvCode(e.target.value)}
              placeholder="45000000 eller nord-fron"
              style={{
                padding: "6px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                width: "180px"
              }}
            />
          </div>
        )}
        {/* Поля выбора дат */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
              Fra dato:
            </label>
            <input
              id="fromDate"
              type="date"
              value={pendingFromDate}
              onChange={(e) => setPendingFromDate(e.target.value)}
              onBlur={() => setFromDate(pendingFromDate)}
              style={{
                padding: "6px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc"
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
              Til dato:
            </label>
            <input
              id="toDate"
              type="date"
              value={pendingToDate}
              onChange={(e) => setPendingToDate(e.target.value)}
              onBlur={() => setToDate(pendingToDate)}
              style={{
                padding: "6px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc"
              }}
            />
          </div>
        </div>
        {/* Новый фильтр – селект, который появляется после скрапинга */}
        {notices.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <label htmlFor="filterSelect" style={{ fontSize: "16px", fontWeight: "500" }}>
              Filtrer etter oppdragsgiver:
            </label>
            <select
              id="filterSelect"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              style={{
                padding: "6px",
                fontSize: "16px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                width: "100%",
                maxWidth: "300px",
              }}
            >
              <option value="">Alle</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {capitalizeName(opt)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            style={{
              background: "linear-gradient(145deg, #1976d2, #0d47a1)",
              border: "none",
              borderRadius: "10px",
              boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "16px",
              padding: "12px 24px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
            onClick={handleLoad}
            disabled={loading || !fromDate || !toDate}
          >
            Last inn
          </button>
        </div>
      </div>
      {loading ? (
        <p>Laster...</p>
      ) : notices.length === 0 ? (
        <p>Ingen data å vise</p>
      ) : (
        // Оборачиваем список в контейнер с фиксированной максимальной высотой и вертикальной прокруткой
        <div
          ref={listContainerRef}
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            paddingRight: "10px" // чтобы не обрезался скроллбар
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              width: "100%",
            }}
          >
            {displayedNotices.map((notice, index) => (
              <div
                key={index}
                ref={(el) => (listRefs.current[index] = el)}
                onClick={() => handleItemClick(index)}
                style={{
                  border: "1.5px solid #d1e3f6",
                  borderRadius: "10px",
                  background: activeTender === index ? "#e0e0e0" : "#fff",
                  boxShadow:
                    activeTender === index
                      ? "0 2px 8px rgba(25, 118, 210, 0.2)"
                      : "0 2px 8px rgba(25, 118, 210, 0.04)",
                  padding: "18px 22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                  transition: "box-shadow 0.2s",
                  wordBreak: "break-word",
                  cursor: "pointer",
                }}
              >
                <p>
                  <strong>Tittel:</strong> {notice.title || "Ukjent"}
                </p>
                {notice.buyer && (
                  <p>
                    <strong>Oppdragsgiver:</strong> {notice.buyer}
                  </p>
                )}
                {notice.typeAnnouncement && (
                  <p>
                    <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
                  </p>
                )}
                {notice.announcementSubtype && (
                  <p>
                    <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
                  </p>
                )}
                {notice.description && (
                  <p>
                    <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
                  </p>
                )}
                {notice.location && (
                  <p>
                    <strong>Sted:</strong> {notice.location}
                  </p>
                )}
                {notice.estValue && (
                  <p>
                    <strong>Estimert verdi:</strong> {notice.estValue}
                  </p>
                )}
                {notice.publicationDate && (
                  <p>
                    <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
                  </p>
                )}
                {notice.deadline && (
                  <p>
                    <strong>Frist:</strong> {notice.deadline}
                  </p>
                )}
                {notice.eoes && (
                  <p>
                    <strong>EØS:</strong> {notice.eoes}
                  </p>
                )}
                {notice.link && (
                  <p>
                    <a href={notice.link} target="_blank" rel="noopener noreferrer">
                      Se mer informasjon
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Кнопка-стрелочка вверх для прокрутки контейнера списка к началу */}
      {notices.length > 0 && (
        <button
          onClick={scrollListToTop}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "linear-gradient(145deg, #2196F3, #1976D2)",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            minWidth: "50px",
            minHeight: "50px",
            fontSize: "28px",
            lineHeight: "1",
            color: "#fff",
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "0",
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
});

export default DynamicListComponent;




// import React, {
//   useState,
//   useRef,
//   useImperativeHandle,
//   forwardRef,
//   useEffect,
// } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   const [cpvCode, setCpvCode] = useState("45000000");
//   const [filterValue, setFilterValue] = useState(""); // Состояние выбранного фильтра
//   const listRefs = useRef([]);
//   const listContainerRef = useRef(null);

//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     },
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Вычисляем полный список локаций для карты
//       const fullLocations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(fullLocations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При изменении фильтра или списка аукционов обновляем данные для карты
//   useEffect(() => {
//     const filteredNotices = filterValue
//       ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//       : notices;
//     const filteredLocations = filteredNotices.map((notice) => ({
//       name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//       buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//       nutsCode: notice.nutsCode || "Ingen data",
//       country: notice.country || "Ingen data",
//     }));
//     setLocations(filteredLocations);
//   }, [filterValue, notices, setLocations]);

//   // Вычисляем данные для отображения в списке на основе выбранного фильтра
//   const displayedNotices = filterValue
//     ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//     : notices;

//   // Опции фильтра формируются из уникальных значений, полученных посредством getTruncatedName
//   const filterOptions = Array.from(new Set(notices.map((notice) => getTruncatedName(notice)))).sort();

//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   // Обработчик для стрелочки – прокручивает контейнер списка к началу
//   const scrollListToTop = () => {
//     if (listContainerRef.current) {
//       listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Чекбоксы для выбора режима скрапинга */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode og ord:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="f.eks. 45000000,48000000"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "180px",
//               }}
//             />
//           </div>
//         )}
//         {/* Поля выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//               }}
//             />
//           </div>
//         </div>
//         {/* Новый фильтр – селект, который появляется после скрапинга */}
//         {notices.length > 0 && (
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "row",
//               flexWrap: "wrap",
//               alignItems: "center",
//               gap: "10px",
//             }}
//           >
//             <label htmlFor="filterSelect" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Filtrer etter oppdragsgiver:
//             </label>
//             <select
//               id="filterSelect"
//               value={filterValue}
//               onChange={(e) => setFilterValue(e.target.value)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "100%",
//                 maxWidth: "300px",
//               }}
//             >
//               <option value="">Alle</option>
//               {filterOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s",
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         // Оборачиваем список в контейнер с фиксированной максимальной высотой и вертикальной прокруткой
//         <div
//           ref={listContainerRef}
//           style={{
//             maxHeight: "70vh",
//             overflowY: "auto",
//             paddingRight: "10px" // чтобы не обрезался скроллбар
//           }}
//         >
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//               gap: "24px",
//               width: "100%",
//             }}
//           >
//             {displayedNotices.map((notice, index) => (
//               <div
//                 key={index}
//                 ref={(el) => (listRefs.current[index] = el)}
//                 onClick={() => handleItemClick(index)}
//                 style={{
//                   border: "1.5px solid #d1e3f6",
//                   borderRadius: "10px",
//                   background: activeTender === index ? "#e0e0e0" : "#fff",
//                   boxShadow:
//                     activeTender === index
//                       ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                       : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                   padding: "18px 22px",
//                   display: "flex",
//                   flexDirection: "column",
//                   justifyContent: "space-between",
//                   height: "100%",
//                   transition: "box-shadow 0.2s",
//                   wordBreak: "break-word",
//                   cursor: "pointer",
//                 }}
//               >
//                 <p>
//                   <strong>Tittel:</strong> {notice.title || "Ukjent"}
//                 </p>
//                 {notice.buyer && (
//                   <p>
//                     <strong>Oppdragsgiver:</strong> {notice.buyer}
//                   </p>
//                 )}
//                 {notice.typeAnnouncement && (
//                   <p>
//                     <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                   </p>
//                 )}
//                 {notice.announcementSubtype && (
//                   <p>
//                     <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                   </p>
//                 )}
//                 {notice.description && (
//                   <p>
//                     <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.location && (
//                   <p>
//                     <strong>Sted:</strong> {notice.location}
//                   </p>
//                 )}
//                 {notice.estValue && (
//                   <p>
//                     <strong>Estimert verdi:</strong> {notice.estValue}
//                   </p>
//                 )}
//                 {notice.publicationDate && (
//                   <p>
//                     <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.deadline && (
//                   <p>
//                     <strong>Frist:</strong> {notice.deadline}
//                   </p>
//                 )}
//                 {notice.eoes && (
//                   <p>
//                     <strong>EØS:</strong> {notice.eoes}
//                   </p>
//                 )}
//                 {notice.link && (
//                   <p>
//                     <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                       Se mer informasjon
//                     </a>
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//       {/* Кнопка-стрелочка вверх для прокрутки контейнера списка к началу */}
//       {notices.length > 0 && (
//         <button
//           onClick={scrollListToTop}
//           style={{
//             position: "fixed",
//             bottom: "20px",
//             right: "20px",
//             background: "linear-gradient(145deg, #2196F3, #1976D2)",
//             border: "none",
//             borderRadius: "50%",
//             width: "50px",
//             height: "50px",
//             minWidth: "50px",
//             minHeight: "50px",
//             fontSize: "28px",
//             lineHeight: "1",
//             color: "#fff",
//             boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 1000,
//             padding: "0",
//           }}
//         >
//           ↑
//         </button>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;



// import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   const [cpvCode, setCpvCode] = useState("45000000");
//   const [filterValue, setFilterValue] = useState(""); // Состояние выбранного фильтра
//   const listRefs = useRef([]);
//   const listContainerRef = useRef(null);

//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Вычисляем полный список локаций для карты
//       const fullLocations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(fullLocations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При изменении фильтра или списка аукционов обновляем данные для карты
//   useEffect(() => {
//     const filteredNotices = filterValue
//       ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//       : notices;
//     const filteredLocations = filteredNotices.map((notice) => ({
//       name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//       buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//       nutsCode: notice.nutsCode || "Ingen data",
//       country: notice.country || "Ingen data"
//     }));
//     setLocations(filteredLocations);
//   }, [filterValue, notices, setLocations]);

//   // Вычисляем данные для отображения в списке на основе выбранного фильтра
//   const displayedNotices = filterValue
//     ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//     : notices;

//   // Опции фильтра формируются из уникальных значений, полученных посредством getTruncatedName
//   const filterOptions = Array.from(new Set(notices.map((notice) => getTruncatedName(notice)))).sort();

//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   // Обработчик для стрелочки - прокручивает контейнер списка к началу
//   const scrollListToTop = () => {
//     if (listContainerRef.current) {
//       listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Чекбоксы для выбора режима скрапинга */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="f.eks. 45000000,48000000"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "180px"
//               }}
//             />
//           </div>
//         )}
//         {/* Поля выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Новый фильтр – селект, который появляется после скрапинга */}
//         {notices.length > 0 && (
//           <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="filterSelect" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Filtrer etter oppdragsgiver:
//             </label>
//             <select
//               id="filterSelect"
//               value={filterValue}
//               onChange={(e) => setFilterValue(e.target.value)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "auto",
//                 display: "inline-block"
//               }}
//             >
//               <option value="">Alle</option>
//               {filterOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         // Оборачиваем список в контейнер с фиксированной максимальной высотой и вертикальной прокруткой
//         <div
//           ref={listContainerRef}
//           style={{
//             maxHeight: "70vh",
//             overflowY: "auto",
//             paddingRight: "10px" // чтобы не было обрезания скроллбара
//           }}
//         >
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//               gap: "24px",
//               width: "100%"
//             }}
//           >
//             {displayedNotices.map((notice, index) => (
//               <div
//                 key={index}
//                 ref={(el) => (listRefs.current[index] = el)}
//                 onClick={() => handleItemClick(index)}
//                 style={{
//                   border: "1.5px solid #d1e3f6",
//                   borderRadius: "10px",
//                   background: activeTender === index ? "#e0e0e0" : "#fff",
//                   boxShadow:
//                     activeTender === index
//                       ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                       : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                   padding: "18px 22px",
//                   display: "flex",
//                   flexDirection: "column",
//                   justifyContent: "space-between",
//                   height: "100%",
//                   transition: "box-shadow 0.2s",
//                   wordBreak: "break-word",
//                   cursor: "pointer"
//                 }}
//               >
//                 <p>
//                   <strong>Tittel:</strong> {notice.title || "Ukjent"}
//                 </p>
//                 {notice.buyer && (
//                   <p>
//                     <strong>Oppdragsgiver:</strong> {notice.buyer}
//                   </p>
//                 )}
//                 {notice.typeAnnouncement && (
//                   <p>
//                     <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                   </p>
//                 )}
//                 {notice.announcementSubtype && (
//                   <p>
//                     <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                   </p>
//                 )}
//                 {notice.description && (
//                   <p>
//                     <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.location && (
//                   <p>
//                     <strong>Sted:</strong> {notice.location}
//                   </p>
//                 )}
//                 {notice.estValue && (
//                   <p>
//                     <strong>Estimert verdi:</strong> {notice.estValue}
//                   </p>
//                 )}
//                 {notice.publicationDate && (
//                   <p>
//                     <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.deadline && (
//                   <p>
//                     <strong>Frist:</strong> {notice.deadline}
//                   </p>
//                 )}
//                 {notice.eoes && (
//                   <p>
//                     <strong>EØS:</strong> {notice.eoes}
//                   </p>
//                 )}
//                 {notice.link && (
//                   <p>
//                     <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                       Se mer informasjon
//                     </a>
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//       {/* Красивая кнопка-стрелочка вверх для прокрутки списка */}
//       {notices.length > 0 && (
//         <button
//           onClick={scrollListToTop}
//           style={{
//             position: "fixed",
//             bottom: "20px",
//             right: "20px",
//             background: "linear-gradient(145deg, #2196F3, #1976D2)",
//             border: "none",
//             borderRadius: "50%",
//             width: "50px",
//             height: "50px",
//             fontSize: "28px",
//             color: "#fff",
//             boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 1000
//           }}
//         >
//           ↑
//         </button>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;




// import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   const [cpvCode, setCpvCode] = useState("45000000");
//   const [filterValue, setFilterValue] = useState(""); // Состояние выбранного фильтра
//   const listRefs = useRef([]);

//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Вычисляем полный список локаций для карты
//       const fullLocations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(fullLocations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При изменении фильтра или списка аукционов обновляем данные для карты
//   useEffect(() => {
//     const filteredNotices = filterValue
//       ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//       : notices;
//     const filteredLocations = filteredNotices.map((notice) => ({
//       name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//       buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//       nutsCode: notice.nutsCode || "Ingen data",
//       country: notice.country || "Ingen data"
//     }));
//     setLocations(filteredLocations);
//   }, [filterValue, notices, setLocations]);

//   // Вычисляем данные для отображения в списке на основе выбранного фильтра
//   const displayedNotices = filterValue
//     ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//     : notices;

//   // Опции фильтра формируются из уникальных значений, полученных посредством getTruncatedName
//   const filterOptions = Array.from(new Set(notices.map((notice) => getTruncatedName(notice)))).sort();

//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Чекбоксы для выбора режима скрапинга */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="f.eks. 45000000,48000000"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "180px"
//               }}
//             />
//           </div>
//         )}
//         {/* Поля выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Новый фильтр — селект, который появляется после скрапинга */}
//         {notices.length > 0 && (
//           <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="filterSelect" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Filtrer etter oppdragsgiver:
//             </label>
//             <select
//               id="filterSelect"
//               value={filterValue}
//               onChange={(e) => setFilterValue(e.target.value)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "auto",       // динамическая ширина
//                 display: "inline-block"
//               }}
//             >
//               <option value="">Alle</option>
//               {filterOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%"
//           }}
//         >
//           {displayedNotices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Se mer informasjon
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;



// import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   const [cpvCode, setCpvCode] = useState("45000000");
//   const [filterValue, setFilterValue] = useState(""); // Состояние выбранного фильтра
//   const listRefs = useRef([]);

//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Вычисляем полный список локаций для карты
//       const fullLocations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(fullLocations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При изменении фильтра или списка аукционов обновляем данные для карты
//   useEffect(() => {
//     const filteredNotices = filterValue
//       ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//       : notices;
//     const filteredLocations = filteredNotices.map((notice) => ({
//       name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//       buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//       nutsCode: notice.nutsCode || "Ingen data",
//       country: notice.country || "Ingen data"
//     }));
//     setLocations(filteredLocations);
//   }, [filterValue, notices, setLocations]);

//   // Вычисляем данные для отображения в списке на основе выбранного фильтра
//   const displayedNotices = filterValue
//     ? notices.filter((notice) => getTruncatedName(notice) === filterValue)
//     : notices;

//   // Опции фильтра формируются из уникальных значений, полученных посредством getTruncatedName
//   const filterOptions = Array.from(new Set(notices.map((notice) => getTruncatedName(notice)))).sort();

//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Чекбоксы для выбора режима скрапинга */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="f.eks. 45000000,48000000"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "180px"
//               }}
//             />
//           </div>
//         )}
//         {/* Поля выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Новый фильтр — селект, который появляется после скрапинга */}
//         {notices.length > 0 && (
//           <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="filterSelect" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Filtrer etter oppdragsgiver:
//             </label>
//             <select
//               id="filterSelect"
//               value={filterValue}
//               onChange={(e) => setFilterValue(e.target.value)}
//               style={{ padding: "6px", fontSize: "16px", borderRadius: "4px", border: "1px solid #ccc" }}
//             >
//               <option value="">Alle</option>
//               {filterOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%"
//           }}
//         >
//           {displayedNotices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Se mer informasjon
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;



//работает с cpv// import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   // В поле можно вводить несколько CPV-кодов, разделённых запятыми, например: "45000000,48000000"
//   const [cpvCode, setCpvCode] = useState("45000000");

//   // Создаём ref для каждого элемента списка
//   const listRefs = useRef([]);

//   // Императивный метод для прокрутки к выбранному элементу
//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         // Передаём значение CPV-кодов как есть (строка с запятыми)
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем массив локаций для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При клике на элемент списка – прокручиваем к нему
//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Чекбоксы для выбора режима скрапинга */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {/* Поле ввода CPV-кодов (можно ввести несколько через запятую) */}
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="f.eks. 45000000,48000000"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "180px"
//               }}
//             />
//           </div>
//         )}
//         {/* Поля выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Кнопка загрузки */}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Se mer informasjon
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;




//200% раб код// import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);
//   const [cpvCode, setCpvCode] = useState("45000000");

//   // Создаем ref для каждого элемента списка
//   const listRefs = useRef([]);

//   // Императивный метод для прокрутки к выбранному элементу
//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate, cpv: cpvCode });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формирование массива локаций для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При клике на элемент списка – прокручиваем к нему
//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Контрольная панель */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Колонка для чекбоксов */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {/* Поле ввода для CPV-кода (показывается, если выбран Doffin) */}
//         {useDoffinScraping && (
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="cpv" style={{ fontSize: "16px", fontWeight: "500" }}>
//               CPV kode:
//             </label>
//             <input
//               id="cpv"
//               type="text"
//               value={cpvCode}
//               onChange={(e) => setCpvCode(e.target.value)}
//               placeholder="8-siffer"
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc",
//                 width: "120px"
//               }}
//             />
//           </div>
//         )}
//         {/* Поля для выбора дат */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Центрированная кнопка "Last inn" */}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Se mer informasjon
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;



//100% раб код// import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";

// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Oppretter ref for hvert element i listen
//   const listRefs = useRef([]);

//   // Impertativ metode for å rulle til valgt element
//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Forming av et array med locations for kartet
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // Ved klikk på et listeelement – rull til det
//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       {/* Kontrollpanelet */}
//       <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
//         {/* Kolonne for sjekkbokser */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useScraping}
//               onChange={() => {
//                 setUseScraping((v) => !v);
//                 if (useDoffinScraping) setUseDoffinScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk TED-nettskraping
//           </label>
//           <label style={{ fontSize: "16px", fontWeight: "500" }}>
//             <input
//               type="checkbox"
//               checked={useDoffinScraping}
//               onChange={() => {
//                 setUseDoffinScraping((v) => !v);
//                 if (useScraping) setUseScraping(false);
//               }}
//               style={{ marginRight: "8px" }}
//             />
//             Bruk Doffin-databasen
//           </label>
//         </div>
//         {/* Datoer vises i kolonne */}
//         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="fromDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Fra dato:
//             </label>
//             <input
//               id="fromDate"
//               type="date"
//               value={pendingFromDate}
//               onChange={(e) => setPendingFromDate(e.target.value)}
//               onBlur={() => setFromDate(pendingFromDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <label htmlFor="toDate" style={{ fontSize: "16px", fontWeight: "500" }}>
//               Til dato:
//             </label>
//             <input
//               id="toDate"
//               type="date"
//               value={pendingToDate}
//               onChange={(e) => setPendingToDate(e.target.value)}
//               onBlur={() => setToDate(pendingToDate)}
//               style={{
//                 padding: "6px",
//                 fontSize: "16px",
//                 borderRadius: "4px",
//                 border: "1px solid #ccc"
//               }}
//             />
//           </div>
//         </div>
//         {/* Sentrert knapp med redusert skyggeeffekt */}
//         <div style={{ display: "flex", justifyContent: "center" }}>
//           <button
//             style={{
//               background: "linear-gradient(145deg, #1976d2, #0d47a1)",
//               border: "none",
//               borderRadius: "10px",
//               boxShadow: "2px 2px 4px rgba(25, 118, 210, 0.05)",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "16px",
//               padding: "12px 24px",
//               cursor: loading ? "not-allowed" : "pointer",
//               transition: "all 0.2s"
//             }}
//             onClick={handleLoad}
//             disabled={loading || !fromDate || !toDate}
//           >
//             Last inn
//           </button>
//         </div>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Se mer informasjon
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;





// import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Создаем ref для каждого элемента списка
//   const listRefs = useRef([]);

//   // Императивный метод для прокрутки выбранного элемента
//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL;
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем массив locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // При клике на элемент списка – прокручиваем его в зону видимости и устанавливаем activeTender
//   const handleItemClick = (index) => {
//     if (listRefs.current[index]) {
//       listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//     }
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s"
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               onClick={() => handleItemClick(index)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow:
//                   activeTender === index
//                     ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                     : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//                 cursor: "pointer"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Peréyti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;





//РАбочая прокрутка// import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = forwardRef(({ setLocations, activeTender, apiURL }, ref) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Создаем ref для каждого элемента списка
//   const listRefs = useRef([]);

//   // Императивный метод для прокрутки нужного элемента в зону видимости
//   useImperativeHandle(ref, () => ({
//     scrollToTender: (index) => {
//       if (listRefs.current[index]) {
//         listRefs.current[index].scrollIntoView({ behavior: "smooth", block: "center" });
//       }
//     }
//   }));

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = apiURL; // Используем переданный apiURL
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формирование массива локаций для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data"
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   return (
//     <div style={{ padding: "20px", background: "#f7f9fa", minHeight: "100vh" }}>
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s"
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               ref={(el) => (listRefs.current[index] = el)}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: activeTender === index ? "#e0e0e0" : "#fff",
//                 boxShadow: activeTender === index
//                   ? "0 2px 8px rgba(25, 118, 210, 0.2)"
//                   : "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word"
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Peréyti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// });

// export default DynamicListComponent;












//РАБ КОД 777// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты,
//       // добавляя поле buyer (или, если его нет, Oppdragsgiver)
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         buyer: notice.buyer || notice.Oppdragsgiver || "Ikke spesifisert",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div
//         style={{
//           marginBottom: "20px",
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           flexWrap: "wrap",
//         }}
//       >
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => {
//             console.log("777", notice.buyer);
//             return (
//               <div
//                 key={index}
//                 style={{
//                   border: "1.5px solid #d1e3f6",
//                   borderRadius: "10px",
//                   background: "#fff",
//                   boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                   padding: "18px 22px",
//                   display: "flex",
//                   flexDirection: "column",
//                   justifyContent: "space-between",
//                   height: "100%",
//                   transition: "box-shadow 0.2s",
//                   wordBreak: "break-word",
//                 }}
//               >
//                 <p>
//                   <strong>Tittel:</strong> {notice.title || "Ukjent"}
//                 </p>
//                 {notice.buyer && (
//                   <p>
//                     <strong>Oppdragsgiver:</strong> {notice.buyer}
//                   </p>
//                 )}
//                 {notice.typeAnnouncement && (
//                   <p>
//                     <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                   </p>
//                 )}
//                 {notice.announcementSubtype && (
//                   <p>
//                     <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                   </p>
//                 )}
//                 {notice.description && (
//                   <p>
//                     <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.location && (
//                   <p>
//                     <strong>Sted:</strong> {notice.location}
//                   </p>
//                 )}
//                 {notice.estValue && (
//                   <p>
//                     <strong>Estimert verdi:</strong> {notice.estValue}
//                   </p>
//                 )}
//                 {notice.publicationDate && (
//                   <p>
//                     <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                   </p>
//                 )}
//                 {notice.deadline && (
//                   <p>
//                     <strong>Frist:</strong> {notice.deadline}
//                   </p>
//                 )}
//                 {notice.eoes && (
//                   <p>
//                     <strong>EØS:</strong> {notice.eoes}
//                   </p>
//                 )}
//                 {notice.link && (
//                   <p>
//                     <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                       Peréyti k uvedomleniyu
//                     </a>
//                   </p>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div
//         style={{
//           marginBottom: "20px",
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           flexWrap: "wrap",
//         }}
//       >
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Peréyti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name:
//           extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div
//         style={{
//           marginBottom: "20px",
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           flexWrap: "wrap",
//         }}
//       >
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Peréyti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name:
//           extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div
//         style={{
//           marginBottom: "20px",
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           flexWrap: "wrap",
//         }}
//       >
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.typeAnnouncement && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.typeAnnouncement}
//                 </p>
//               )}
//               {notice.announcementSubtype && (
//                 <p>
//                   <strong>Kunngjøringstype:</strong> {notice.announcementSubtype}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.deadline && (
//                 <p>
//                   <strong>Frist:</strong> {notice.deadline}
//                 </p>
//               )}
//               {notice.eoes && (
//                 <p>
//                   <strong>EØS:</strong> {notice.eoes}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Peréyti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name:
//           extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div
//         style={{
//           marginBottom: "20px",
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           flexWrap: "wrap",
//         }}
//       >
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.buyer && (
//                 <p>
//                   <strong>Oppdragsgiver:</strong> {notice.buyer}
//                 </p>
//               )}
//               {notice.announcementType && (
//                 <p>
//                   <strong>Type kunngjøring:</strong> {notice.announcementType}
//                 </p>
//               )}
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong>{" "}
//                   {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.location && (
//                 <p>
//                   <strong>Sted:</strong> {notice.location}
//                 </p>
//               )}
//               {notice.estValue && (
//                 <p>
//                   <strong>Estimert verdi:</strong> {notice.estValue}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Per\u00E9yti k uvedomleniyu
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// РАБОЧИЙ ФАЙЛ С ПАГИНАЦИЕЙ И ПО РЕГИОНУ// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false);

//   // Загрузка данных с бэкенда
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false);
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 minWidth: 0,
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {notice.title || "Ukjent"}
//               </p>
//               {notice.description && (
//                 <p>
//                   <strong>Beskrivelse:</strong> {notice.description || "Ingen data"}
//                 </p>
//               )}
//               {notice.publicationDate && (
//                 <p>
//                   <strong>Publiseringsdato:</strong> {notice.publicationDate || "Ingen data"}
//                 </p>
//               )}
//               {notice.noticeId && (
//                 <p>
//                   <strong>ID уведомления:</strong> {notice.noticeId || "Ingen data"}
//                 </p>
//               )}
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Перейти к уведомлению
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false);
//   const [useDoffinScraping, setUseDoffinScraping] = useState(false); // Новый стейт

//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useDoffinScraping) {
//         url = "http://localhost:4003/api/notices/doffin-scrape"; // URL для базы Doffin
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body,
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка при загрузке данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => {
//               setUseScraping((v) => !v);
//               if (useDoffinScraping) setUseDoffinScraping(false); // Убрать выбор базы Doffin
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={useDoffinScraping}
//             onChange={() => {
//               setUseDoffinScraping((v) => !v);
//               if (useScraping) setUseScraping(false); // Убрать выбор TED
//             }}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать базу Doffin
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 minWidth: 0,
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               {/* Уведомления (настройка отображения) */}
//               <p>
//                 <strong>Tittel:</strong>{" "}
//                 {extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent"}
//               </p>
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     Перейти
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useState } from "react";

// // Универсальная функция для извлечения текста из строки, объекта с #text или массива таких объектов
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [useScraping, setUseScraping] = useState(false); // Новый стейт для переключателя

//   // Загрузка данных с бэкенда (API или скрапинг)
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       let url, body;
//       if (useScraping) {
//         url = "http://localhost:4002/api/notices/scrape-site";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       } else {
//         url = "http://localhost:4001/api/notices/with-xml";
//         body = JSON.stringify({ from: fromDate, to: toDate });
//       }
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты (регион, страна)
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // Логируем notices при каждом изменении
//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
//         <label>
//           <input
//             type="checkbox"
//             checked={useScraping}
//             onChange={() => setUseScraping((v) => !v)}
//             style={{ marginRight: "8px" }}
//           />
//           Использовать скрапинг сайта TED
//         </label>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 minWidth: 0,
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Номер уведомления:</strong>{" "}
//                 {notice.noticeId || notice.noticeID || notice.notice_id || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Tittel:</strong>{" "}
//                 {extractText(notice["notice-title"]?.eng || notice.title) || "Ukjent"}
//               </p>
//               <p>
//                 <strong>Beskrivelse:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng || notice.description) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Publiseringsdato:</strong>{" "}
//                 {notice["publication-date"] || notice.publicationDate || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Region (NUTS):</strong> {notice.nutsCode || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Land:</strong> {notice.country || "Ingen data"}
//               </p>
//               <p>
//                 <strong>CPV-koder:</strong>{" "}
//                 {Array.isArray(notice.cpvCodes)
//                   ? notice.cpvCodes.join(", ")
//                   : Array.isArray(notice.cpv_codes)
//                   ? notice.cpv_codes.join(", ")
//                   : notice.cpvCodes || notice.cpv_codes || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Arbeidstype:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng || notice.description) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Oppdragsgiver:</strong>{" "}
//                 {extractText(notice.customer?.name) || notice.buyer || "Ingen data"}
//                 {notice.customer?.address && (
//                   <> — {extractText(notice.customer.address)}, {extractText(notice.customer.city)}</>
//                 )}
//               </p>
//               <p>
//                 <strong>Leverandør:</strong>{" "}
//                 {extractText(notice.provider?.name) || notice.provider || "Ingen data"}
//                 {notice.provider?.address && (
//                   <> — {extractText(notice.provider.address)}, {extractText(notice.provider.city)}</>
//                 )}
//               </p>
//               {notice.link && (
//                 <p>
//                   <a href={notice.link} target="_blank" rel="noopener noreferrer">
//                     TED
//                   </a>
//                 </p>
//               )}
//               {notice?.links?.xml?.MUL && (
//                 <p>
//                   <a href={notice.links.xml.MUL} target="_blank" rel="noopener noreferrer">
//                     XML
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;


//РАБОЧИЙ С API// import React, { useState } from "react";

// // Универсальная функция для извлечения текста из строки, объекта с #text или массива таких объектов
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Загрузка данных с бэкенда (все поля из JSON и XML уже включены)
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       const response = await fetch("http://localhost:4001/api/notices/with-xml", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ from: fromDate, to: toDate })
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты (регион, страна)
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // Логируем notices при каждом изменении
//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 minWidth: 0,
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Номер уведомления:</strong> {notice.noticeId || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Tittel:</strong> {extractText(notice["notice-title"]?.eng) || "Ukjent"}
//               </p>
//               <p>
//                 <strong>Beskrivelse:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Publiseringsdato:</strong> {notice["publication-date"] || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Region (NUTS):</strong> {notice.nutsCode || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Land:</strong> {notice.country || "Ingen data"}
//               </p>
//               <p>
//                 <strong>CPV-koder:</strong>{" "}
//                 {Array.isArray(notice.cpvCodes)
//                   ? notice.cpvCodes.join(", ")
//                   : notice.cpvCodes || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Arbeidstype:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Oppdragsgiver:</strong>{" "}
//                 {extractText(notice.customer?.name) || "Ingen data"}
//                 {notice.customer?.address && (
//                   <> — {extractText(notice.customer.address)}, {extractText(notice.customer.city)}</>
//                 )}
//               </p>
//               <p>
//                 <strong>Leverandør:</strong>{" "}
//                 {extractText(notice.provider?.name) || "Ingen data"}
//                 {notice.provider?.address && (
//                   <> — {extractText(notice.provider.address)}, {extractText(notice.provider.city)}</>
//                 )}
//               </p>
//               {notice?.links?.xml?.MUL && (
//                 <p>
//                   <a href={notice.links.xml.MUL} target="_blank" rel="noopener noreferrer">
//                     XML
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;


//  import React, { useState } from "react";

// // Universell funksjon for å hente ut tekst fra streng, objekt med #text eller array av slike objekter
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Laster data fra backend-script (alle felter fra JSON og XML er allerede inne)
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       const response = await fetch("http://localhost:4001/api/notices/with-xml", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ from: fromDate, to: toDate })
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Lager locations for kartet (region, land)
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng) || "Ukjent",
//         nutsCode: notice.nutsCode || "Ingen data",
//         country: notice.country || "Ingen data",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Feil ved lasting av data:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // Logger notices ved hver render
//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div
//       style={{
//         padding: "20px",
//         background: "#f7f9fa",
//         minHeight: "100vh",
//       }}
//     >
//       <h2>Anbud</h2>
//       <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
//         <label htmlFor="fromDate">Fra dato:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">Til dato:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{
//             marginLeft: "20px",
//             padding: "8px 18px",
//             background: "#1976d2",
//             color: "#fff",
//             border: "none",
//             borderRadius: "5px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontWeight: "bold",
//             fontSize: "16px",
//             boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
//             transition: "background 0.2s",
//           }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Last inn
//         </button>
//       </div>
//       {loading ? (
//         <p>Laster...</p>
//       ) : notices.length === 0 ? (
//         <p>Ingen data å vise</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//             gap: "24px",
//             width: "100%",
//           }}
//         >
//           {notices.map((notice, index) => (
//             <div
//               key={index}
//               style={{
//                 border: "1.5px solid #d1e3f6",
//                 borderRadius: "10px",
//                 background: "#fff",
//                 boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
//                 padding: "18px 22px",
//                 minWidth: 0,
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "space-between",
//                 height: "100%",
//                 transition: "box-shadow 0.2s",
//                 wordBreak: "break-word",
//               }}
//             >
//               <p>
//                 <strong>Tittel:</strong> {extractText(notice["notice-title"]?.eng) || "Ukjent"}
//               </p>
//               <p>
//                 <strong>Beskrivelse:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Publiseringsdato:</strong> {notice["publication-date"] || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Region (NUTS):</strong> {notice.nutsCode || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Land:</strong> {notice.country || "Ingen data"}
//               </p>
//               <p>
//                 <strong>CPV-koder:</strong>{" "}
//                 {Array.isArray(notice.cpvCodes)
//                   ? notice.cpvCodes.join(", ")
//                   : notice.cpvCodes || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Arbeidstype:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Ingen data"}
//               </p>
//               <p>
//                 <strong>Oppdragsgiver:</strong>{" "}
//                 {extractText(notice.customer?.name) || "Ingen data"}
//                 {notice.customer?.address && (
//                   <> — {extractText(notice.customer.address)}, {extractText(notice.customer.city)}</>
//                 )}
//               </p>
//               <p>
//                 <strong>Leverandør:</strong>{" "}
//                 {extractText(notice.provider?.name) || "Ingen data"}
//                 {notice.provider?.address && (
//                   <> — {extractText(notice.provider.address)}, {extractText(notice.provider.city)}</>
//                 )}
//               </p>
//               {notice?.links?.xml?.MUL && (
//                 <p>
//                   <a href={notice.links.xml.MUL} target="_blank" rel="noopener noreferrer">
//                     XML
//                   </a>
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;

// import React, { useState } from "react";

// // Универсальная функция для извлечения текста из строки, объекта с #text или массива таких объектов
// function extractText(val) {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object" && "#text" in val) return val["#text"];
//   if (Array.isArray(val)) return val.map(extractText).join("; ");
//   return "";
// }

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");
//   const [pendingFromDate, setPendingFromDate] = useState("");
//   const [pendingToDate, setPendingToDate] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Загрузка данных с backend-скрипта (все поля из JSON и XML уже внутри)
//   const handleLoad = async () => {
//     if (!fromDate || !toDate) return;
//     setLoading(true);
//     try {
//       const response = await fetch("http://localhost:4001/api/notices/with-xml", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ from: fromDate, to: toDate })
//       });
//       const data = await response.json();
//       setNotices(data.results || []);

//       // Формируем locations для карты (регион, страна)
//       const locations = (data.results || []).map((notice) => ({
//         name: extractText(notice["notice-title"]?.eng) || "Unknown",
//         nutsCode: notice.nutsCode || "Данные отсутствуют",
//         country: notice.country || "Данные отсутствуют",
//       }));
//       setLocations(locations);
//     } catch (e) {
//       console.error("Ошибка загрузки данных:", e);
//       setNotices([]);
//     }
//     setLoading(false);
//   };

//   // Логируем notices каждый рендер
//   React.useEffect(() => {
//     console.log("notices (state):", notices);
//   }, [notices]);

//   return (
//     <div style={{ padding: "10px" }}>
//       <h2>Тендеры</h2>
//       <div style={{ marginBottom: "20px" }}>
//         <label htmlFor="fromDate">С даты:</label>
//         <input
//           id="fromDate"
//           type="date"
//           value={pendingFromDate}
//           onChange={(e) => setPendingFromDate(e.target.value)}
//           onBlur={() => setFromDate(pendingFromDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <label htmlFor="toDate">По дату:</label>
//         <input
//           id="toDate"
//           type="date"
//           value={pendingToDate}
//           onChange={(e) => setPendingToDate(e.target.value)}
//           onBlur={() => setToDate(pendingToDate)}
//           style={{ marginRight: "10px" }}
//         />
//         <button
//           style={{ marginLeft: "10px" }}
//           onClick={handleLoad}
//           disabled={loading || !fromDate || !toDate}
//         >
//           Загрузить
//         </button>
//       </div>
//       {loading ? (
//         <p>Загрузка...</p>
//       ) : notices.length === 0 ? (
//         <p>Нет данных для отображения</p>
//       ) : (
//         <ul>
//           {notices.map((notice, index) => (
//             <li key={index} style={{ marginBottom: "20px" }}>
//               <p>
//                 <strong>Название:</strong> {extractText(notice["notice-title"]?.eng) || "Unknown"}
//               </p>
//               <p>
//                 <strong>Описание:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Дата публикации:</strong> {notice["publication-date"] || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Регион (NUTS):</strong> {notice.nutsCode || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Страна:</strong> {notice.country || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>CPV-коды:</strong>{" "}
//                 {Array.isArray(notice.cpvCodes)
//                   ? notice.cpvCodes.join(", ")
//                   : notice.cpvCodes || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Виды работ:</strong>{" "}
//                 {extractText(notice["description-lot"]?.eng) || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Заказчик:</strong>{" "}
//                 {extractText(notice.customer?.name) || "Данные отсутствуют"}
//                 {notice.customer?.address && (
//                   <> — {extractText(notice.customer.address)}, {extractText(notice.customer.city)}</>
//                 )}
//               </p>
//               <p>
//                 <strong>Исполнитель:</strong>{" "}
//                 {extractText(notice.provider?.name) || "Данные отсутствуют"}
//                 {notice.provider?.address && (
//                   <> — {extractText(notice.provider.address)}, {extractText(notice.provider.city)}</>
//                 )}
//               </p>
//               {notice?.links?.xml?.MUL && (
//                 <p>
//                   <a href={notice.links.xml.MUL} target="_blank" rel="noopener noreferrer">
//                     XML
//                   </a>
//                 </p>
//               )}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useEffect, useState } from "react";
// import fetchData from "../api/fetchData";
// import processXMLData from "../api/processXML";

// const DynamicListComponent = ({ setLocations, xmlURL }) => {
//   const [notices, setNotices] = useState([]); // Основные данные из API
//   const [additionalData, setAdditionalData] = useState([]); // Дополнительные данные из XML
//   const [filterDate, setFilterDate] = useState(""); // Фильтр по дате
//   const [pendingDate, setPendingDate] = useState(""); // Ввод даты пользователем

//   // Получение данных из API
//   useEffect(() => {
//     const fetchDataFromAPI = async () => {
//       if (!filterDate) return;

//       const today = new Date();
//       const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      
//       console.log("Запрос к API с диапазоном дат:", { from: filterDate, to: formattedToday });

//       const apiData = await fetchData(filterDate, formattedToday); // Запрос к API
//       setNotices(apiData);

//       // Формируем данные для карты
//       const locations = apiData.map((notice) => ({
//         name: notice["notice-title"]?.eng || "Unknown",
//         coords: [
//           parseFloat(notice["place-performance-coords-latitude"]) || 0,
//           parseFloat(notice["place-performance-coords-longitude"]) || 0,
//         ],
//         street: notice["place-performance-streetline1-part"] || "Данные отсутствуют",
//         postCode: notice["place-of-performance-post-code-part"] || "Данные отсутствуют",
//         country: notice["place-of-performance-country-part"] || "Данные отсутствуют",
//       }));
//       setLocations(locations);
//     };

//     fetchDataFromAPI();
//   }, [filterDate, setLocations]);

//   // Загрузка данных из XML
//   useEffect(() => {
//     const fetchAdditionalDataFromXML = async () => {
//       if (!xmlURL) return;

//       try {
//         const xmlData = await processXMLData(xmlURL); // Обработка XML
//         setAdditionalData(xmlData.organizations || []); // Сохраняем данные
//         console.log("Дополнительные данные из XML:", xmlData);
//       } catch (error) {
//         console.error("Ошибка загрузки XML:", error.message);
//       }
//     };

//     fetchAdditionalDataFromXML();
//   }, [xmlURL]);

//   // Объединяем данные из API и XML
//   const combinedNotices = notices.map((notice, index) => ({
//     ...notice,
//     additional: additionalData[index] || null,
//   }));

//   return (
//     <div style={{ padding: "10px", borderLeft: "1px solid #ccc" }}>
//       <h2>Тендеры</h2>
//       <div style={{ marginBottom: "20px" }}>
//         <label htmlFor="date">Показать данные с даты:</label>
//         <input
//           id="date"
//           type="date"
//           value={pendingDate}
//           onChange={(e) => setPendingDate(e.target.value)}
//           onBlur={() => setFilterDate(pendingDate)} // Устанавливаем дату фильтрации
//         />
//       </div>
//       {combinedNotices.length === 0 ? (
//         <p>Нет данных для отображения</p>
//       ) : (
//         <ul>
//           {combinedNotices.map((notice, index) => (
//             <li key={index}>
//               <p>
//                 <strong>Название:</strong>{" "}
//                 {notice["notice-title"]?.eng || "Unknown"}
//               </p>
//               <p>
//                 <strong>Описание:</strong>{" "}
//                 {notice["description-lot"]?.eng || "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Дата публикации:</strong>{" "}
//                 {notice["publication-date"]
//                   ? new Date(notice["publication-date"]).toLocaleDateString()
//                   : "Данные отсутствуют"}
//               </p>
//               <p>
//                 <strong>Организация:</strong>{" "}
//                 {notice["organisation-name-serv-prov"]?.eng || "Unknown"}
//               </p>
//               <p>
//                 <strong>Дополнительная информация (из XML):</strong>{" "}
//                 {notice.additional
//                   ? `${notice.additional.name}, ${
//                       notice.additional.address?.city || "Данные отсутствуют"
//                     }`
//                   : "Данные отсутствуют"}
//               </p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;










// import React, { useEffect, useState } from "react";
// import fetchData from "../api/fetchData";

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [filterDate, setFilterDate] = useState("");
//   const [pendingDate, setPendingDate] = useState("");

//   useEffect(() => {
//     const fetchNotices = async () => {
//       if (!filterDate) return;

//       const today = new Date();
//       const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
//       console.log("Отправляем запрос с диапазоном дат:", { from: filterDate, to: formattedToday });

//       const data = await fetchData(filterDate, formattedToday);
//       console.log("Данные из API:", data);
//       setNotices(data);

//       const locations = data.map((notice) => {
//         console.log("Пример уведомления:", notice);
//         return {
//           name: notice["notice-title"]?.eng || "Unknown",
//           coords: [
//             parseFloat(notice["place-performance-coords-latitude"]) || 0,
//             parseFloat(notice["place-performance-coords-longitude"]) || 0,
//           ],
//           street: notice["place-performance-streetline1-part"] || "Данные отсутствуют",
//           postCode: notice["place-of-performance-post-code-part"] || "Данные отсутствуют",
//           country: notice["place-of-performance-country-part"] || "Данные отсутствуют",
//         };
//       });

//       console.log("Координаты для карты:", locations);
//       setLocations(locations);
//     };

//     fetchNotices();
//   }, [filterDate, setLocations]);

//   return (
//     <div style={{ padding: "10px", borderLeft: "1px solid #ccc" }}>
//       <h2>Организации</h2>
//       <div style={{ marginBottom: "20px" }}>
//         <label htmlFor="date">Показать данные с даты:</label>
//         <input
//           id="date"
//           type="date"
//           value={pendingDate}
//           onChange={(e) => setPendingDate(e.target.value)}
//           onBlur={() => {
//             setFilterDate(pendingDate);
//             console.log("Подтверждённая дата фильтрации:", pendingDate);
//           }}
//         />
//       </div>
//       {notices.length === 0 ? (
//         <p>Нет данных для отображения</p>
//       ) : (
//         <ul>
//           {notices.map((notice, index) => (
//             <li key={index}>
//               <p><strong>Название:</strong> {notice["notice-title"]?.eng || "Unknown"}</p>
//               <p><strong>Дата публикации:</strong> {notice["publication-date"] ? new Date(notice["publication-date"]).toLocaleDateString() : "Данные отсутствуют"}</p>
//               <p><strong>Улица:</strong> {notice["place-performance-streetline1-part"] || "Данные отсутствуют"}</p>
//               <p><strong>Почтовый код:</strong> {notice["place-of-performance-post-code-part"] || "Данные отсутствуют"}</p>
//               <p><strong>Страна:</strong> {notice["place-of-performance-country-part"] || "Данные отсутствуют"}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;



// import React, { useEffect, useState } from "react";
// import fetchData from "../api/fetchData";

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [filterDate, setFilterDate] = useState("");
//   const [pendingDate, setPendingDate] = useState(""); // Сохраняем вводимую дату до подтверждения

//   useEffect(() => {
//     const fetchNotices = async () => {
//       if (!filterDate) return; // Если дата не выбрана, не выполняем запрос

//       const today = new Date();
//       const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
//       console.log("Отправляем запрос с диапазоном дат:", { from: filterDate, to: formattedToday });

//       const data = await fetchData(filterDate, formattedToday);
//       console.log("Данные из API:", data);
//       setNotices(data);

//       const locations = data.map((notice) => {
//         console.log("Пример уведомления:", notice);
//         return {
//           name: notice["notice-title"]?.swe || notice["notice-title"]?.eng || "Unknown",
//           coords: [
//             parseFloat(notice["place-performance-coords-latitude"]) || 0, // Проверяем наличие координат
//             parseFloat(notice["place-performance-coords-longitude"]) || 0,
//           ],
//           street: notice["place-performance-streetline1-part"] || "Данные отсутствуют", // Проверяем наличие улицы
//           postCode: notice["place-of-performance-post-code-part"] || "Данные отсутствуют", // Проверяем наличие почтового кода
//         };
//       });

//       console.log("Координаты для карты:", locations);
//       setLocations(locations);
//     };

//     fetchNotices();
//   }, [filterDate, setLocations]);

//   return (
//     <div style={{ padding: "10px", borderLeft: "1px solid #ccc" }}>
//       <h2>Организации</h2>
//       <div style={{ marginBottom: "20px" }}>
//         <label htmlFor="date">Показать данные с даты:</label>
//         <input
//           id="date"
//           type="date"
//           value={pendingDate} // Используем временное состояние для ввода
//           onChange={(e) => setPendingDate(e.target.value)} // Сохраняем вводимую дату
//           onBlur={() => {
//             setFilterDate(pendingDate); // Устанавливаем дату для запроса только при уходе фокуса
//             console.log("Подтверждённая дата фильтрации:", pendingDate);
//           }}
//         />
//       </div>
//       {notices.length === 0 ? (
//         <p>Нет данных для отображения</p>
//       ) : (
//         <ul>
//           {notices.map((notice, index) => (
//             <li key={index}>
//               <p><strong>Название:</strong> {notice["notice-title"]?.swe || notice["notice-title"]?.eng || "Unknown"}</p>
//               <p><strong>Дата публикации:</strong> {new Date(notice["publication-date"]).toLocaleDateString()}</p>
//               <p><strong>Улица:</strong> {notice["place-performance-streetline1-part"] || "Данные отсутствуют"}</p>
//               <p><strong>Почтовый код:</strong> {notice["place-of-performance-post-code-part"] || "Данные отсутствуют"}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;








// import React, { useEffect, useState } from "react";
// import fetchData from "../api/fetchData";

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);
//   const [filteredNotices, setFilteredNotices] = useState([]);
//   const [filterDate, setFilterDate] = useState("");

//   useEffect(() => {
//     const fetchNotices = async () => {
//       const data = await fetchData();
//       console.log("Исходные данные из базы:", data); // Лог всех данных, полученных из API
//       setNotices(data);
//       setFilteredNotices(data);

//       const locations = data.map((notice) => ({
//         name: notice["organisation-name-serv-prov"]?.eng[0] || "Unknown",
//         coords: [
//           parseFloat(notice["place-performance-streetline1-part"]) || 0,
//           parseFloat(notice["place-of-performance-post-code-part"]) || 0,
//         ],
//       }));
//       console.log("Сформированные координаты для карты:", locations);
//       setLocations(locations);
//     };

//     fetchNotices();
//   }, [setLocations]);

//   useEffect(() => {
//     if (filterDate) {
//       const formattedFilterDate = filterDate.replace(/-/g, "");
//       const today = new Date();
//       const formattedToday = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
//         today.getDate()
//       ).padStart(2, "0")}`;

//       const filtered = notices.filter((notice) => {
//         let publicationDate = notice["publication-date"];
//         if (publicationDate.includes("+")) {
//           publicationDate = publicationDate.split("+")[0];
//         }
//         if (publicationDate.includes("Z")) {
//           publicationDate = publicationDate.split("Z")[0];
//         }

//         const publicationFormatted = publicationDate.replace(/-/g, "").trim();
//         return publicationFormatted >= formattedFilterDate && publicationFormatted <= formattedToday;
//       });

//       console.log("Отфильтрованные данные:", filtered); // Лог отфильтрованных данных
//       setFilteredNotices(filtered);

//       const updatedLocations = filtered.map((notice) => ({
//         name: notice["organisation-name-serv-prov"]?.eng[0] || "Unknown",
//         coords: [
//           parseFloat(notice["place-performance-streetline1-part"]) || 0,
//           parseFloat(notice["place-of-performance-post-code-part"]) || 0,
//         ],
//       }));

//       console.log("Координаты после фильтрации:", updatedLocations); // Лог координат после фильтрации
//       setLocations(updatedLocations);
//     } else {
//       setFilteredNotices(notices);
//       const locations = notices.map((notice) => ({
//         name: notice["organisation-name-serv-prov"]?.eng[0] || "Unknown",
//         coords: [
//           parseFloat(notice["place-performance-streetline1-part"]) || 0,
//           parseFloat(notice["place-of-performance-post-code-part"]) || 0,
//         ],
//       }));
//       console.log("Координаты для карты (без фильтрации):", locations);
//       setLocations(locations);
//     }
//   }, [filterDate, notices, setLocations]);

//   return (
//     <div style={{ padding: "10px", borderLeft: "1px solid #ccc" }}>
//       <h2>Организации</h2>
//       <div style={{ marginBottom: "20px" }}>
//         <label htmlFor="date">Показать данные с даты:</label>
//         <input
//           id="date"
//           type="date"
//           value={filterDate}
//           onChange={(e) => setFilterDate(e.target.value)}
//         />
//       </div>
//       {filteredNotices.length === 0 ? (
//         <p>Нет данных для отображения</p>
//       ) : (
//         <ul>
//           {filteredNotices.map((notice, index) => (
//             <li key={index}>
//               <p><strong>Название:</strong> {notice["organisation-name-serv-prov"]?.eng[0]}</p>
//               <p><strong>Дата публикации:</strong> {new Date(notice["publication-date"]).toLocaleDateString()}</p>
//               <p><strong>Улица:</strong> {notice["place-performance-streetline1-part"]}</p>
//               <p><strong>Почтовый код:</strong> {notice["place-of-performance-post-code-part"]}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default DynamicListComponent;














// import React, { useEffect, useState } from "react";
// import fetchData from "../api/fetchData";

// const DynamicListComponent = ({ setLocations }) => {
//   const [notices, setNotices] = useState([]);

//   useEffect(() => {
//     const fetchNotices = async () => {
//       const data = await fetchData();
//       setNotices(data);

//       // Передаем данные для маркеров на карту
//       setLocations(
//         data.map((notice) => ({
//           name: notice["organisation-name-serv-prov"]?.eng[0] || "Unknown",
//           coords: [
//             parseFloat(notice["place-performance-streetline1-part"]) || 0,
//             parseFloat(notice["place-of-performance-post-code-part"]) || 0,
//           ],
//         }))
//       );
//     };

//     fetchNotices();
//   }, [setLocations]);

//   return (
//     <div style={{ padding: "10px", borderLeft: "1px solid #ccc" }}>
//       <h2>Организации</h2>
//       <ul style={{ listStyleType: "none", padding: 0 }}>
//         {notices.map((notice, index) => (
//           <li key={index} style={{ marginBottom: "10px" }}>
//             <p>
//               <strong>Название:</strong> {notice["organisation-name-serv-prov"]?.eng[0]}
//             </p>
//             <p>
//               <strong>Дата публикации:</strong> {new Date(notice["publication-date"]).toLocaleDateString()}
//             </p>
//             <p>
//               <strong>Улица:</strong> {notice["place-performance-streetline1-part"]}
//             </p>
//             <p>
//               <strong>Почтовый код:</strong> {notice["place-of-performance-post-code-part"]}
//             </p>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default DynamicListComponent;
