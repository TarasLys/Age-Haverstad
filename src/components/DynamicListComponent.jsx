
 import React, { useState } from "react";

// Universell funksjon for å hente ut tekst fra streng, objekt med #text eller array av slike objekter
function extractText(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "#text" in val) return val["#text"];
  if (Array.isArray(val)) return val.map(extractText).join("; ");
  return "";
}

const DynamicListComponent = ({ setLocations }) => {
  const [notices, setNotices] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pendingFromDate, setPendingFromDate] = useState("");
  const [pendingToDate, setPendingToDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Laster data fra backend-script (alle felter fra JSON og XML er allerede inne)
  const handleLoad = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4001/api/notices/with-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromDate, to: toDate })
      });
      const data = await response.json();
      setNotices(data.results || []);

      // Lager locations for kartet (region, land)
      const locations = (data.results || []).map((notice) => ({
        name: extractText(notice["notice-title"]?.eng) || "Ukjent",
        nutsCode: notice.nutsCode || "Ingen data",
        country: notice.country || "Ingen data",
      }));
      setLocations(locations);
    } catch (e) {
      console.error("Feil ved lasting av data:", e);
      setNotices([]);
    }
    setLoading(false);
  };

  // Logger notices ved hver render
  React.useEffect(() => {
    console.log("notices (state):", notices);
  }, [notices]);

  return (
    <div
      style={{
        padding: "20px",
        background: "#f7f9fa",
        minHeight: "100vh",
      }}
    >
      <h2>Anbud</h2>
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <label htmlFor="fromDate">Fra dato:</label>
        <input
          id="fromDate"
          type="date"
          value={pendingFromDate}
          onChange={(e) => setPendingFromDate(e.target.value)}
          onBlur={() => setFromDate(pendingFromDate)}
          style={{ marginRight: "10px" }}
        />
        <label htmlFor="toDate">Til dato:</label>
        <input
          id="toDate"
          type="date"
          value={pendingToDate}
          onChange={(e) => setPendingToDate(e.target.value)}
          onBlur={() => setToDate(pendingToDate)}
          style={{ marginRight: "10px" }}
        />
        <button
          style={{
            marginLeft: "20px",
            padding: "8px 18px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.08)",
            transition: "background 0.2s",
          }}
          onClick={handleLoad}
          disabled={loading || !fromDate || !toDate}
        >
          Last inn
        </button>
      </div>
      {loading ? (
        <p>Laster...</p>
      ) : notices.length === 0 ? (
        <p>Ingen data å vise</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            width: "100%",
          }}
        >
          {notices.map((notice, index) => (
            <div
              key={index}
              style={{
                border: "1.5px solid #d1e3f6",
                borderRadius: "10px",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(25, 118, 210, 0.04)",
                padding: "18px 22px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                transition: "box-shadow 0.2s",
                wordBreak: "break-word",
              }}
            >
              <p>
                <strong>Tittel:</strong> {extractText(notice["notice-title"]?.eng) || "Ukjent"}
              </p>
              <p>
                <strong>Beskrivelse:</strong>{" "}
                {extractText(notice["description-lot"]?.eng) || "Ingen data"}
              </p>
              <p>
                <strong>Publiseringsdato:</strong> {notice["publication-date"] || "Ingen data"}
              </p>
              <p>
                <strong>Region (NUTS):</strong> {notice.nutsCode || "Ingen data"}
              </p>
              <p>
                <strong>Land:</strong> {notice.country || "Ingen data"}
              </p>
              <p>
                <strong>CPV-koder:</strong>{" "}
                {Array.isArray(notice.cpvCodes)
                  ? notice.cpvCodes.join(", ")
                  : notice.cpvCodes || "Ingen data"}
              </p>
              <p>
                <strong>Arbeidstype:</strong>{" "}
                {extractText(notice["description-lot"]?.eng) || "Ingen data"}
              </p>
              <p>
                <strong>Oppdragsgiver:</strong>{" "}
                {extractText(notice.customer?.name) || "Ingen data"}
                {notice.customer?.address && (
                  <> — {extractText(notice.customer.address)}, {extractText(notice.customer.city)}</>
                )}
              </p>
              <p>
                <strong>Leverandør:</strong>{" "}
                {extractText(notice.provider?.name) || "Ingen data"}
                {notice.provider?.address && (
                  <> — {extractText(notice.provider.address)}, {extractText(notice.provider.city)}</>
                )}
              </p>
              {notice?.links?.xml?.MUL && (
                <p>
                  <a href={notice.links.xml.MUL} target="_blank" rel="noopener noreferrer">
                    XML
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DynamicListComponent;

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
