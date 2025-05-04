import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Координаты для нужных муниципалитетов
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

const municipalityMapping = {
  // Åmot – административный центр: Rena (Rena, Åmot)
  "åmot": [61.267, 11.683],
  // Åsnes – административный центр: Flisa
  "åsnes": [61.217, 12.250],
  // Alvdal – административный центр: Alvdal
  "alvdal": [61.900, 10.783],
  // Dovre – административный центр: Dovre (Dovre (village): 61°59′15″N 9°15′20″E)
  "dovre": [61.988, 9.256],
  // Eidskog – административный центр: Eidskog
  "eidskog": [60.950, 11.450],
  // Elverum – административный центр: Elverum
  "elverum": [61.150, 10.500],
  // Engerdal – административный центр: Engerdal
  "engerdal": [61.570, 11.980],
  // Etnedal – административного центра точно не указано в Википедии; используем общедоступное значение
  "etnedal": [61.350, 9.250],
  // Folldal – административный центр: Folldal
  "folldal": [61.270, 9.420],
  // Gausdal – административный центр: Forset (Gausdal)
  "gausdal": [61.020, 9.970],
  // Gjøvik – административный центр: Gjøvik
  "gjøvik": [60.803, 10.693],
  // Gran – административный центр: Jaren
  "gran": [60.550, 9.900],
  // Grue – административный центр: Grue (церковный центр)
  "grue": [61.100, 12.000],
  // Hamar – административный центр: Hamar
  "hamar": [60.800, 11.080],
  // Kongsvinger – административный центр: Kongsvinger
  "kongsvinger": [60.150, 11.990],
  // Lesja – административный центр: Lesja
  "lesja": [62.100, 8.800],
  // Lillehammer – административный центр: Lillehammer
  "lillehammer": [61.117, 10.467],
  // Lom – административный центр: Lom
  "lom": [61.687, 9.041],
  // Løten – административный центр: Løten
  "løten": [60.980, 11.600],
  // Nord-Aurdal – административный центр: Fagernes
  "nord-aurdal": [61.034, 9.474],
  // Nord-Fron – административный центр: Vinstra
  "nord-fron": [61.595, 9.751],
  // Nord-Odal – административный центр: Sagstua (в окрестностях Skarnes)
  "nord-odal": [60.785, 11.590],
  // Nordre Land – административный центр: Dokka
  "nordre land": [60.762, 10.026],
  // Os – административный центр: Os i Østerdalen
  "os": [61.050, 8.870],
  // Østre Toten – административный центр: Skreia
  "østre toten": [60.864, 10.215],
  // Øyer – административный центр: Øyer
  "øyer": [61.26528, 10.41333],
  // Øystre Slidre – административный центр: Hov
  "øystre slidre": [61.000, 8.740],
  // Rendalen – административный центр: Rena (Rendalen)
  "rendalen": [61.600, 10.400],
  // Ringebu – административный центр: Otta
  "ringebu": [61.52965, 10.13889],
  // Ringsaker – административный центр: Brumunddal
  "ringsaker": [61.063, 11.431],
  // Sel – административный центр: Sel
  "sel": [61.81694, 9.57333],
  // Skjåk – административный центр: Skjåk
  "skjåk": [61.883, 7.833],
  // Søndre Land – административный центр: Sand
  "søndre land": [60.913, 10.220],
  // Sør-Aurdal – административный центр: Lillebotn
  "sør-aurdal": [60.990, 9.300],
  // Sør-Fron – административный центр: Roa
  "sør-fron": [61.082, 9.860],
  // Sør-Odal – административный центр: Skarnes
  "sør-odal": [60.930, 11.030],
  // Stange – административный центр: Stange
  "stange": [60.712, 11.070],
  // Stor-Elvdal – административный центр: Stor-Elvdal
  "stor-elvdal": [61.430, 10.850],
  // Tolga – административный центр: Tolga
  "tolga": [61.710, 10.380],
  // Trysil – административный центр: Trysil
  "trysil": [61.233, 12.117],
  // Tynset – административный центр: Tynset
  "tynset": [63.300, 10.800],
  // Vågå – административный центр: Vågå
  "vågå": [61.770, 8.970],
  // Våler – административный центр: Våler
  "våler": [60.940, 11.350],
  // Vang – административный центр: Vang i Valdres
  "vang": [61.070, 9.133],
  // Vestre Slidre – административный центр: Skrautvål
  "vestre slidre": [61.070, 8.670],
  // Vestre Toten – административный центр: Raufoss
  "vestre toten": [60.880, 10.680]
};







// Fallback-координаты (центр Innlandet)
const fallbackCoords = [61.5, 10.6667];

// Набор иконок для маркеров (без изменений)
const coloredIcons = [
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
];

// Цвета для легенды (для записей без "kommune" или с неотмеченной коммуной)
const nonKommuneColors = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33A8",
  "#FFD433",
  "#33FFF3",
  "#A833FF"
];

// Функция для формирования сокращённого названия (для легенды)
function getTruncatedName(location) {
  const buyer = location.buyer || location.Oppdragsgiver;
  if (buyer) {
    const cleanText = buyer.replace(/[-–—]/g, " ");
    const words = cleanText.trim().split(/\s+/);
    return words.slice(0, 2).join(" ");
  }
  return "unknown";
}

// Вспомогательная функция для вычисления муниципалитета
// Извлекает название муниципалитета, обрезая разделители перед и после первой части строки
function getMunicipality(location) {
  const buyer = location.buyer || location.Oppdragsgiver;
  if (buyer) {
    // Приводим строку к нижнему регистру и удаляем лишние пробелы
    const lower = buyer.toLowerCase().trim();
    // Если присутствует " kommune", берём подстроку до этого слова
    const kommuneIndex = lower.indexOf(" kommune");
    if (kommuneIndex !== -1) {
      return lower.substring(0, kommuneIndex).trim();
    }
    // Если присутствует " fylkeskommune", беру подстроку до него
    const fylkeskommuneIndex = lower.indexOf(" fylkeskommune");
    if (fylkeskommuneIndex !== -1) {
      return lower.substring(0, fylkeskommuneIndex).trim();
    }
    // В противном случае, разделяем по разделителям: пробел, запятая, точка, тире
    const tokens = lower.split(/[\s,.-]+/);
    return tokens[0].trim();
  }
  return null;
}

const MapComponent = ({ locations, onMarkerDoubleClick, onLegendItemClick }) => {
  // Для смещения маркеров при совпадении координат
  const duplicateCoords = {};

  // Формирование списка для легенды.
  // Включаем записи, где:
  // 1) В buyer/Oppdragsgiver отсутствует слово "kommune",
  // или
  // 2) Если слово "kommune" присутствует, но извлечённое значение муниципалитета отсутствует в municipalityMapping.
  const legendItems = locations
    .map((loc, idx) => ({ location: loc, index: idx }))
    .filter((item) => {
      const text = (item.location.buyer || item.location.Oppdragsgiver || "").toLowerCase();
      if (!text.includes("kommune")) {
        return true;
      }
      const municipality = getMunicipality(item.location);
      return !(municipality && municipalityMapping[municipality]);
    });

  // Сортировка пунктов легенды по сокращённому названию
  const sortedLegendItems = legendItems.sort((a, b) => {
    const ta = getTruncatedName(a.location);
    const tb = getTruncatedName(b.location);
    return ta.localeCompare(tb);
  });

  // Стили для легенды
  const legendItemStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    cursor: "pointer"
  };
  const legendBoxStyle = { width: "24px", height: "24px", borderRadius: "50%" };
  const colorMap = {};
  let colorIndex = 0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Отключаем зум по dblclick, чтобы событие достигало нашего обработчика */}
      <MapContainer
        center={fallbackCoords}
        zoom={6}
        doubleClickZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {locations.map((location, index) => {
          // Скройте маркер, если в buyer/Oppdragsgiver не содержится отдельное слово "kommune"
          const tokens = (location.buyer || location.Oppdragsgiver || "")
            .toLowerCase()
            .split(/\s+/)
            .map(token => token.replace(/[,.-]/g, ""));
          if (!tokens.includes("kommune")) {
            return null;
          }
          
          const originalCoords = (() => {
            const municipality = getMunicipality(location);
            // Если название коммуника отсутствует в municipalityMapping, возвращаем null,
            // чтобы не отображать такой маркер (например, для "Oslo kommune")
            if (!municipality || !municipalityMapping[municipality]) {
              return null;
            }
            return municipalityMapping[municipality];
          })();
          
          if (!originalCoords) {
            return null;
          }
          
          const key = originalCoords.join(",");
          if (duplicateCoords[key] === undefined) {
            duplicateCoords[key] = 0;
          } else {
            duplicateCoords[key]++;
          }
          const count = duplicateCoords[key];
          const offsetDelta = 0.05;
          const offsetCoords =
            count > 0
              ? [originalCoords[0] + offsetDelta * count, originalCoords[1] - offsetDelta * count]
              : originalCoords;
          const markerIcon = coloredIcons[count % coloredIcons.length];

          return (
            <Marker
              key={index}
              position={offsetCoords}
              icon={markerIcon}
              eventHandlers={{
                dblclick: () => {
                  console.log("Marker dblclick, indeks:", index);
                  if (onMarkerDoubleClick) {
                    onMarkerDoubleClick(index);
                  }
                }
              }}
            >
              <Popup>
                <div>
                  <strong>{location.name}</strong>
                  <br />
                  <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
                  <br />
                  <strong>Kommune:</strong>{" "}
                  {(() => {
                    const m = getMunicipality(location);
                    return m ? `${m} kommune` : "Ukjent";
                  })()}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {/* Legende */}
      {sortedLegendItems.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            backgroundColor: "rgba(255,255,255,0.85)",
            padding: "8px",
            borderRadius: "8px"
          }}
        >
          {sortedLegendItems.map((item) => {
            const tName = getTruncatedName(item.location);
            if (!(tName in colorMap)) {
              colorMap[tName] = nonKommuneColors[colorIndex % nonKommuneColors.length];
              colorIndex++;
            }
            return (
              <div
                key={item.index}
                style={legendItemStyle}
                onClick={() => {
                  if (onLegendItemClick) {
                    onLegendItemClick(item.index);
                  }
                }}
              >
                <div style={{ ...legendBoxStyle, backgroundColor: colorMap[tName] }}></div>
                <div>{tName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapComponent;












// import React from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных муниципалитетов
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров (без изменений)
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// // Цвета для легенды (для записей без "kommune" или с неотмеченной коммуной)
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF"
// ];

// // Функция для формирования сокращённого названия (для легенды)
// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// // Вспомогательная функция для вычисления муниципалитета
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// const MapComponent = ({ locations, onMarkerDoubleClick, onLegendItemClick }) => {
//   // Для смещения маркеров при совпадении координат
//   const duplicateCoords = {};

//   // Формирование списка для легенды.
//   // Включаем записи, где:
//   // 1) В buyer/Oppdragsgiver отсутствует слово "kommune",
//   // или
//   // 2) Если слово "kommune" присутствует, но извлечённое значение муниципалитета отсутствует в municipalityMapping.
//   const legendItems = locations
//     .map((loc, idx) => ({ location: loc, index: idx }))
//     .filter((item) => {
//       const text = (item.location.buyer || item.location.Oppdragsgiver || "").toLowerCase();
//       if (!text.includes("kommune")) {
//         return true;
//       }
//       const municipality = getMunicipality(item.location);
//       return !(municipality && municipalityMapping[municipality]);
//     });

//   // Сортировка пунктов легенды по сокращённому названию
//   const sortedLegendItems = legendItems.sort((a, b) => {
//     const ta = getTruncatedName(a.location);
//     const tb = getTruncatedName(b.location);
//     return ta.localeCompare(tb);
//   });

//   // Стили для легенды
//   const legendItemStyle = {
//     display: "flex",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: "6px",
//     fontSize: "14px",
//     cursor: "pointer"
//   };
//   const legendBoxStyle = { width: "24px", height: "24px", borderRadius: "50%" };
//   const colorMap = {};
//   let colorIndex = 0;

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       {/* Отключаем зум по dblclick, чтобы событие достигало нашего обработчика */}
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         doubleClickZoom={false}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           // Скройте маркер, если в buyer/Oppdragsgiver не содержится отдельное слово "kommune"
//           const tokens = (location.buyer || location.Oppdragsgiver || "")
//             .toLowerCase()
//             .split(/\s+/);
//           if (!tokens.includes("kommune")) {
//             return null;
//           }
          
//           const originalCoords = (() => {
//             const municipality = getMunicipality(location);
//             // Если название коммуника отсутствует в municipalityMapping, возвращаем null,
//             // чтобы не отображать такой маркер (например, «Oslo kommune»)
//             if (!municipality || !municipalityMapping[municipality]) {
//               return null;
//             }
//             return municipalityMapping[municipality];
//           })();
          
//           if (!originalCoords) {
//             return null;
//           }
          
//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];
//           const offsetDelta = 0.05;
//           const offsetCoords =
//             count > 0
//               ? [originalCoords[0] + offsetDelta * count, originalCoords[1] - offsetDelta * count]
//               : originalCoords;
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           return (
//             <Marker
//               key={index}
//               position={offsetCoords}
//               icon={markerIcon}
//               eventHandlers={{
//                 dblclick: () => {
//                   console.log("Marker dblclick, indeks:", index);
//                   if (onMarkerDoubleClick) {
//                     onMarkerDoubleClick(index);
//                   }
//                 }
//               }}
//             >
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {(() => {
//                     const m = getMunicipality(location);
//                     return m ? `${m} kommune` : "Ukjent";
//                   })()}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Legende */}
//       {sortedLegendItems.length > 0 && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "10px",
//             left: "10px",
//             zIndex: 1000,
//             display: "flex",
//             flexDirection: "column",
//             gap: "8px",
//             backgroundColor: "rgba(255,255,255,0.85)",
//             padding: "8px",
//             borderRadius: "8px"
//           }}
//         >
//           {sortedLegendItems.map((item) => {
//             const tName = getTruncatedName(item.location);
//             if (!(tName in colorMap)) {
//               colorMap[tName] = nonKommuneColors[colorIndex % nonKommuneColors.length];
//               colorIndex++;
//             }
//             return (
//               <div
//                 key={item.index}
//                 style={legendItemStyle}
//                 onClick={() => {
//                   if (onLegendItemClick) {
//                     onLegendItemClick(item.index);
//                   }
//                 }}
//               >
//                 <div style={{ ...legendBoxStyle, backgroundColor: colorMap[tName] }}></div>
//                 <div>{tName}</div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;



// import React from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных муниципалитетов
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров (без изменений)
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// // Цвета для легенды (для записей без "kommune" или с неотмеченной коммуной)
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF"
// ];

// // Функция для формирования сокращённого названия (для легенды)
// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// // Вспомогательная функция для вычисления муниципалитета
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// const MapComponent = ({ locations, onMarkerDoubleClick, onLegendItemClick }) => {
//   // Для смещения маркеров при совпадении координат
//   const duplicateCoords = {};

//   // Формирование списка для легенды.
//   // Включаем записи, где:
//   // 1) В buyer/Oppdragsgiver отсутствует слово "kommune",
//   // или
//   // 2) Если слово "kommune" присутствует, но извлечённое значение муниципалитета отсутствует в municipalityMapping.
//   const legendItems = locations
//     .map((loc, idx) => ({ location: loc, index: idx }))
//     .filter((item) => {
//       const text = (item.location.buyer || item.location.Oppdragsgiver || "").toLowerCase();
//       if (!text.includes("kommune")) {
//         return true;
//       }
//       const municipality = getMunicipality(item.location);
//       return !(municipality && municipalityMapping[municipality]);
//     });

//   // Сортировка пунктов легенды по сокращённому названию
//   const sortedLegendItems = legendItems.sort((a, b) => {
//     const ta = getTruncatedName(a.location);
//     const tb = getTruncatedName(b.location);
//     return ta.localeCompare(tb);
//   });

//   // Стили для легенды
//   const legendItemStyle = {
//     display: "flex",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: "6px",
//     fontSize: "14px",
//     cursor: "pointer"
//   };
//   const legendBoxStyle = { width: "24px", height: "24px", borderRadius: "50%" };
//   const colorMap = {};
//   let colorIndex = 0;

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       {/* Отключаем зум по dblclick, чтобы событие достигало нашего обработчика */}
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         doubleClickZoom={false}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           // Скройте маркер, если в buyer/Oppdragsgiver не содержится отдельное слово "kommune"
//           const tokens = (location.buyer || location.Oppdragsgiver || "")
//             .toLowerCase()
//             .split(/\s+/);
//           if (!tokens.includes("kommune")) {
//             return null;
//           }
          
//           const originalCoords = (() => {
//             const municipality = getMunicipality(location);
//             return municipality && municipalityMapping[municipality]
//               ? municipalityMapping[municipality]
//               : fallbackCoords;
//           })();

//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];
//           const offsetDelta = 0.05;
//           const offsetCoords =
//             count > 0
//               ? [originalCoords[0] + offsetDelta * count, originalCoords[1] - offsetDelta * count]
//               : originalCoords;
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           return (
//             <Marker
//               key={index}
//               position={offsetCoords}
//               icon={markerIcon}
//               eventHandlers={{
//                 dblclick: () => {
//                   console.log("Marker dblclick, index:", index);
//                   if (onMarkerDoubleClick) {
//                     onMarkerDoubleClick(index);
//                   }
//                 }
//               }}
//             >
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {(() => {
//                     const m = getMunicipality(location);
//                     return m ? `${m} kommune` : "Ukjent";
//                   })()}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Легенда */}
//       {sortedLegendItems.length > 0 && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "10px",
//             left: "10px",
//             zIndex: 1000,
//             display: "flex",
//             flexDirection: "column",
//             gap: "8px",
//             backgroundColor: "rgba(255,255,255,0.85)",
//             padding: "8px",
//             borderRadius: "8px"
//           }}
//         >
//           {sortedLegendItems.map((item) => {
//             const tName = getTruncatedName(item.location);
//             if (!(tName in colorMap)) {
//               colorMap[tName] = nonKommuneColors[colorIndex % nonKommuneColors.length];
//               colorIndex++;
//             }
//             return (
//               <div
//                 key={item.index}
//                 style={legendItemStyle}
//                 onClick={() => {
//                   if (onLegendItemClick) {
//                     onLegendItemClick(item.index);
//                   }
//                 }}
//               >
//                 <div style={{ ...legendBoxStyle, backgroundColor: colorMap[tName] }}></div>
//                 <div>{tName}</div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;







// import React from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// // Добавлены также координаты для Осло
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "oslo": [59.9139, 10.7522],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров — одинаковая форма для всех
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// // Цвета для легенды (для записей без "kommune")
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF"
// ];

// // Функция для формирования сокращённого названия (для легенды)
// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// // Вспомогательная функция для вычисления муниципалитета
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// const MapComponent = ({ locations, onMarkerDoubleClick, onLegendItemClick }) => {
//   // Для смещения маркеров при совпадении координат
//   const duplicateCoords = {};

//   // Формируем список для легенды: выбираем те записи, где buyer не содержит "kommune"
//   const legendItems = locations
//     .map((loc, idx) => ({ location: loc, index: idx }))
//     .filter((item) => {
//       const text = (item.location.buyer || item.location.Oppdragsgiver || "").toLowerCase();
//       return !text.includes("kommune");
//     });

//   // Сортируем легенду по сокращённому названию
//   const sortedLegendItems = legendItems.sort((a, b) => {
//     const ta = getTruncatedName(a.location);
//     const tb = getTruncatedName(b.location);
//     return ta.localeCompare(tb);
//   });

//   // Стили легенды
//   const legendItemStyle = { display: "flex", flexDirection: "row", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" };
//   const legendBoxStyle = { width: "24px", height: "24px", borderRadius: "50%" };
//   const colorMap = {};
//   let colorIndex = 0;

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       {/* Отключаем зум по двойному клику, чтобы наше событие срабатывало */}
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         doubleClickZoom={false}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
//         {locations.map((location, index) => {
//           const originalCoords = (() => {
//             const municipality = getMunicipality(location);
//             return municipality && municipalityMapping[municipality]
//               ? municipalityMapping[municipality]
//               : fallbackCoords;
//           })();

//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];
//           const offsetDelta = 0.001;
//           const offsetCoords =
//             count > 0
//               ? [originalCoords[0] + offsetDelta * count, originalCoords[1] - offsetDelta * count]
//               : originalCoords;
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           return (
//             <Marker
//               key={index}
//               position={offsetCoords}
//               icon={markerIcon}
//               eventHandlers={{
//                 dblclick: () => {
//                   console.log("Marker dblclick, index:", index);
//                   if (onMarkerDoubleClick) {
//                     onMarkerDoubleClick(index);
//                   }
//                 }
//               }}
//             >
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {(() => {
//                     const m = getMunicipality(location);
//                     return m ? `${m} kommune` : "Ukjent";
//                   })()}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Легенда */}
//       {sortedLegendItems.length > 0 && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "10px",
//             left: "10px",
//             zIndex: 1000,
//             display: "flex",
//             flexDirection: "column",
//             gap: "8px",
//             backgroundColor: "rgba(255,255,255,0.85)",
//             padding: "8px",
//             borderRadius: "8px"
//           }}
//         >
//           {sortedLegendItems.map((item) => {
//             const tName = getTruncatedName(item.location);
//             if (!(tName in colorMap)) {
//               colorMap[tName] = nonKommuneColors[colorIndex % nonKommuneColors.length];
//               colorIndex++;
//             }
//             return (
//               <div
//                 key={item.index}
//                 style={legendItemStyle}
//                 onClick={() => {
//                   if (onLegendItemClick) {
//                     onLegendItemClick(item.index);
//                   }
//                 }}
//               >
//                 <div style={{ ...legendBoxStyle, backgroundColor: colorMap[tName] }}></div>
//                 <div>{tName}</div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;



//РАбочая прокрутка// import React from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// // Добавлены также координаты для Осло
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "oslo": [59.9139, 10.7522],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров – одинаковая форма для всех
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// const MapComponent = ({ locations, onMarkerDoubleClick }) => {
//   // Для смещения маркеров при дублировании координат
//   const duplicateCoords = {};

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       {/* Отключаем зум по dblclick, чтобы событие достучалось до нашего обработчика */}
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         doubleClickZoom={false}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const originalCoords = (() => {
//             const municipality = getMunicipality(location);
//             if (municipality && municipalityMapping[municipality]) {
//               return municipalityMapping[municipality];
//             }
//             return fallbackCoords;
//           })();

//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];
//           const offsetDelta = 0.001;
//           const offsetCoords =
//             count > 0
//               ? [
//                   originalCoords[0] + offsetDelta * count,
//                   originalCoords[1] - offsetDelta * count
//                 ]
//               : originalCoords;

//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           return (
//             <Marker
//               key={index}
//               position={offsetCoords}
//               icon={markerIcon}
//               eventHandlers={{
//                 dblclick: () => {
//                   console.log("Двойной клик по маркеру, индекс:", index);
//                   if (onMarkerDoubleClick) {
//                     onMarkerDoubleClick(index);
//                   }
//                 }
//               }}
//             >
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {(() => {
//                     const m = getMunicipality(location);
//                     return m ? `${m} kommune` : "Ukjent";
//                   })()}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* При необходимости можно добавить легенду, используя, например, функцию getTruncatedName */}
//     </div>
//   );
// };

// // Вспомогательная функция для вычисления муниципалитета (без изменений)
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// export default MapComponent;







//РАБ КОД 777// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// // Добавлены координаты для Осло
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "oslo": [59.9139, 10.7522],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров — одинаковая форма для всех
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// // Массив цветов для легенды (для записей, где в buyer/Oppdragsgiver не встречается слово "kommune")
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF"
// ];

// // Функция для обрезания названия до двух слов – тире заменяются пробелами
// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// // Функция для вычисления обрезанного названия муниципалитета (без изменений)
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// // Функция для вычисления координат по имени муниципалитета
// function getCoords(location) {
//   const municipalityName = getMunicipality(location);
//   if (municipalityName && municipalityMapping[municipalityName]) {
//     return municipalityMapping[municipalityName];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     // Логирование не требуется
//   }, [locations]);

//   // Для карты – отслеживаем повторения координат (для смещения маркеров)
//   const duplicateCoords = {};

//   // Для легенды: фильтруем только те записи, где в buyer/Oppdragsgiver 
//   // не встречается слово "kommune"
//   const legendLocations = locations.filter((location) => {
//     const text = (location.buyer || location.Oppdragsgiver || "").toLowerCase();
//     return !text.includes("kommune");
//   });

//   // Сортируем записи для легенды по обрезанному названию
//   const sortedLegendLocations = legendLocations.slice().sort((a, b) => {
//     const ta = getTruncatedName(a);
//     const tb = getTruncatedName(b);
//     return ta.localeCompare(tb);
//   });

//   // Для легенды: каждому обрезанному названию назначаем фиксированный цвет при первой встрече
//   const colorMap = {};
//   let colorIndex = 0;

//   // Изменённые стили для более крупного отображения легенды
//   const legendItemStyle = { display: "flex", flexDirection: "row", alignItems: "center", gap: "6px", fontSize: "14px" };
//   const legendBoxStyle = { width: "24px", height: "24px", borderRadius: "50%" };

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer center={fallbackCoords} zoom={6} style={{ width: "100%", height: "100%" }}>
//         <TileLayer 
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
//           attribution="&copy; OpenStreetMap contributors" 
//         />
//         {locations.map((location, index) => {
//           const originalCoords = getCoords(location);
//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];

//           // Смещение маркера, чтобы они не накладывались
//           const offsetDelta = 0.001;
//           const offsetCoords =
//             count > 0
//               ? [originalCoords[0] + offsetDelta * count, originalCoords[1] - offsetDelta * count]
//               : originalCoords;

//           // Выбираем иконку для маркера
//           const markerIcon = coloredIcons[count % coloredIcons.length];
//           const municipality = getMunicipality(location);
//           console.log("Trimmed municipality:", municipality);
//           return (
//             <Marker key={index} position={offsetCoords} icon={markerIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong> {municipality ? `${municipality} kommune` : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Легенда – перенесена в левый нижний угол, список отображается как вертикальный список */}
//       {sortedLegendLocations.length > 0 && (
//         <div style={{
//           position: "absolute",
//           bottom: "10px",
//           left: "10px",
//           zIndex: 1000,
//           display: "flex",
//           flexDirection: "column",
//           gap: "8px",
//           backgroundColor: "rgba(255,255,255,0.85)",
//           padding: "8px",
//           borderRadius: "8px"
//         }}>
//           {sortedLegendLocations.map((location, idx) => {
//             const tName = getTruncatedName(location);
//             if (!(tName in colorMap)) {
//               colorMap[tName] = nonKommuneColors[colorIndex % nonKommuneColors.length];
//               colorIndex++;
//             }
//             return (
//               <div key={idx} style={legendItemStyle}>
//                 <div style={{ ...legendBoxStyle, backgroundColor: colorMap[tName] }}></div>
//                 <div>{tName}</div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;














// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для маркеров (одинаковая форма для всех маркеров)
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41]
//   })
// ];

// // Массив цветов для предприятий (Oppdragsgiver) в легенде (для локаций без слова "kommune")
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF"
// ];

// // Функция для обрезания названия до двух слов без учета тире (тире заменяются пробелами)
// function getTruncatedName(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     // Заменяем тире (любые варианты тире) на пробелы
//     const cleanText = buyer.replace(/[-–—]/g, " ");
//     const words = cleanText.trim().split(/\s+/);
//     return words.slice(0, 2).join(" ");
//   }
//   return "unknown";
// }

// // Функция для вычисления обрезанного названия муниципалитета (как раньше)
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// // Вычисление координат на основе названия муниципалитета
// function getCoords(location) {
//   const municipalityName = getMunicipality(location);
//   if (municipalityName && municipalityMapping[municipalityName]) {
//     return municipalityMapping[municipalityName];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     // Дополнительных логов не нужно
//   }, [locations]);

//   // Словарь для отслеживания количества маркеров с одинаковыми координатами
//   const duplicateCoords = {};

//   // Фильтруем локации, у которых значение из buyer или Oppdragsgiver не содержит слово "kommune"
//   const nonKommuneLocations = locations.filter((location) => {
//     const text = (location.buyer || location.Oppdragsgiver || "").toLowerCase();
//     return !text.includes("kommune");
//   });

//   // Сортируем полученные локации по обрезанному названию (без учета тире)
//   const sortedNonKommuneLocations = nonKommuneLocations
//     .slice()
//     .sort((a, b) => {
//       const ta = getTruncatedName(a);
//       const tb = getTruncatedName(b);
//       return ta.localeCompare(tb);
//     });

//   // Для легенды: назначаем цвет каждому обрезанному названию при первой встрече
//   const colorMap = {};
//   let colorIndex = 0;

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const originalCoords = getCoords(location);
//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];

//           // Смещение маркера при наложении
//           const offsetDelta = 0.05;
//           const offsetCoords =
//             count > 0
//               ? [
//                   originalCoords[0] + offsetDelta * count,
//                   originalCoords[1] - offsetDelta * count,
//                 ]
//               : originalCoords;

//           // Выбор цвета для маркера – используем иконки из coloredIcons
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           const municipality = getMunicipality(location);
//           console.log("Trimmed municipality:", municipality);

//           return (
//             <Marker key={index} position={offsetCoords} icon={markerIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong>{" "}
//                   {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {municipality ? `${municipality} kommune` : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Легенда внизу карты: выводятся все записи (без группировки) для локаций, где buyer/Oppdragsgiver не содержит "kommune" */}
//       {sortedNonKommuneLocations.length > 0 && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "10px",
//             left: 0,
//             right: 0,
//             zIndex: 1000,
//             display: "flex",
//             flexWrap: "wrap",
//             justifyContent: "center",
//             gap: "10px",
//             backgroundColor: "rgba(255,255,255,0.8)",
//             padding: "5px",
//             borderRadius: "5px"
//           }}
//         >
//           {sortedNonKommuneLocations.map((location, idx) => {
//             const tName = getTruncatedName(location);
//             // Если для данного обрезанного названия ещё не назначен цвет, делаем это сейчас
//             if (!(tName in colorMap)) {
//               colorMap[tName] =
//                 nonKommuneColors[colorIndex % nonKommuneColors.length];
//               colorIndex++;
//             }
//             return (
//               <div
//                 key={idx}
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   alignItems: "center"
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "20px",
//                     height: "20px",
//                     backgroundColor: colorMap[tName],
//                     borderRadius: "50%",
//                     marginBottom: "5px"
//                   }}
//                 ></div>
//                 <div style={{ fontSize: "12px" }}>{tName}</div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;






// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet), если нужная commune не найдена
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок для отображения маркеров на карте (выбор цвета для дублирующихся координат)
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
// ];

// // Массив цветов для отображения предприятий (без слова "kommune")
// const nonKommuneColors = [
//   "#FF5733",
//   "#33FF57",
//   "#3357FF",
//   "#FF33A8",
//   "#FFD433",
//   "#33FFF3",
//   "#A833FF",
// ];

// // Функция для вычисления обрезанного названия муниципалитета  
// // Приводит значение к нижнему регистру, отсекает запятые и известные суффиксы
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// // Вычисление координат на основе названия муниципалитета
// function getCoords(location) {
//   const municipalityName = getMunicipality(location);
//   if (municipalityName && municipalityMapping[municipalityName]) {
//     return municipalityMapping[municipalityName];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     // Дополнительных логов не нужно
//   }, [locations]);

//   // Словарь для отслеживания количества маркеров с одинаковыми координатами
//   const duplicateCoords = {};

//   // Фильтруем маркеры, у которых поле buyer не содержит слово "kommune"
//   const nonKommuneLocations = locations.filter((location) => {
//     const buyer = (location.buyer || "").toLowerCase();
//     return !buyer.includes("kommune");
//   });

//   // Группируем по уникальному значению buyer (предприятию)
//   const uniqueNonKommune = {};
//   nonKommuneLocations.forEach((location) => {
//     const buyer = location.buyer || "unknown";
//     uniqueNonKommune[buyer] = true;
//   });
//   const uniqueNonKommuneNames = Object.keys(uniqueNonKommune);

//   // Назначаем каждому уникальному предприятию один из цветов (если их больше - круг)
//   const nonKommuneColorMap = {};
//   uniqueNonKommuneNames.forEach((name, index) => {
//     nonKommuneColorMap[name] = nonKommuneColors[index % nonKommuneColors.length];
//   });

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const originalCoords = getCoords(location);
//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];

//           // Смещение маркера при наложении
//           const offsetDelta = 0.05;
//           const offsetCoords =
//             count > 0
//               ? [
//                   originalCoords[0] + offsetDelta * count,
//                   originalCoords[1] - offsetDelta * count,
//                 ]
//               : originalCoords;

//           // Выбор цвета для маркера по количеству дубликатов
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           const municipality = getMunicipality(location);
//           console.log("Trimmed municipality:", municipality);

//           return (
//             <Marker key={index} position={offsetCoords} icon={markerIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong>{" "}
//                   {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {municipality ? `${municipality} kommune` : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//       {/* Отображаем фильтрованные (без "kommune") предприятия в ряд снизу карты */}
//       {uniqueNonKommuneNames.length > 0 && (
//         <div
//           style={{
//             position: "absolute",
//             bottom: "10px",
//             left: "50%",
//             transform: "translateX(-50%)",
//             backgroundColor: "rgba(255,255,255,0.8)",
//             padding: "10px",
//             borderRadius: "5px",
//             display: "flex",
//             gap: "10px",
//             overflowX: "auto",
//           }}
//         >
//           {uniqueNonKommuneNames.map((name, idx) => (
//             <div
//               key={idx}
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//               }}
//             >
//               <div
//                 style={{
//                   width: "20px",
//                   height: "20px",
//                   backgroundColor: nonKommuneColorMap[name],
//                   borderRadius: "50%",
//                   marginBottom: "5px",
//                 }}
//               ></div>
//               <div style={{ fontSize: "12px" }}>{name}</div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MapComponent;



// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };

// // Fallback-координаты (центр Innlandet), если нужная commune не найдена
// const fallbackCoords = [61.5, 10.6667];

// // Набор иконок из leaflet-color-markers
// const coloredIcons = [
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
//   new L.Icon({
//     iconUrl:
//       "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
//     shadowUrl:
//       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowSize: [41, 41],
//   }),
// ];

// // Функция для вычисления обрезанного названия муниципалитета  
// // Приводит значение к нижнему регистру, отсекает запятые и известные суффиксы
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(",")) {
//       trimmed = trimmed.split(",")[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// // Вычисление координат на основе названия муниципалитета
// function getCoords(location) {
//   const municipalityName = getMunicipality(location);
//   if (municipalityName && municipalityMapping[municipalityName]) {
//     return municipalityMapping[municipalityName];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     // Дополнительных логов не нужно
//   }, [locations]);

//   // Словарь для отслеживания количества маркеров с одинаковыми координатами
//   const duplicateCoords = {};

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer
//         center={fallbackCoords}
//         zoom={6}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const originalCoords = getCoords(location);
//           const key = originalCoords.join(",");
//           if (duplicateCoords[key] === undefined) {
//             duplicateCoords[key] = 0;
//           } else {
//             duplicateCoords[key]++;
//           }
//           const count = duplicateCoords[key];

//           // Смещение маркера только для случаев, когда их несколько
//           const offsetDelta = 0.05; // смещение в градусах
//           const offsetCoords =
//             count > 0
//               ? [
//                   originalCoords[0] + offsetDelta * count,
//                   originalCoords[1] - offsetDelta * count,
//                 ]
//               : originalCoords;

//           // Выбор цвета: если маркер отображается впервые, то используем первый цвет;
//           // для повторных отображений — третий, четвертый и так далее.
//           const markerIcon = coloredIcons[count % coloredIcons.length];

//           const municipality = getMunicipality(location);
//           console.log("Trimmed municipality:", municipality);

//           return (
//             <Marker key={index} position={offsetCoords} icon={markerIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong>{" "}
//                   {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong>{" "}
//                   {municipality ? `${municipality} kommune` : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapComponent;





//раб код// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Координаты для нужных коммун (ключи в нижнем регистре)
// const municipalityMapping = {
//   "åmot": [61.36, 10.23],
//   "åsnes": [61.20, 11.50],
//   "alvdal": [61.85, 10.95],
//   "dovre": [61.46, 9.70],
//   "eidskog": [60.95, 11.45],
//   "elverum": [61.15, 10.50],
//   "engerdal": [61.5667, 11.9833],
//   "etnedal": [61.35, 9.25],
//   "folldal": [61.27, 9.42],
//   "gausdal": [61.02, 9.97],
//   "gjøvik": [60.80, 10.69],
//   "gran": [60.55, 9.90],
//   "grue": [61.10, 12.00],
//   "hamar": [60.80, 11.08],
//   "kongsvinger": [60.15, 11.99],
//   "lesja": [62.10, 8.80],
//   "lillehammer": [61.12, 10.45],
//   "lom": [61.60, 8.98],
//   "løten": [60.98, 11.60],
//   "nord-aurdal": [60.97, 9.35],
//   "nord-fron": [61.15, 9.70],
//   "nord-odal": [60.75, 11.60],
//   "nordre land": [60.95, 9.95],
//   "os": [61.00, 8.85],
//   "østre toten": [60.85, 10.15],
//   "øyer": [60.68, 8.83],
//   "øystre slidre": [61.00, 8.75],
//   "rendalen": [61.60, 10.40],
//   "ringebu": [61.50, 9.40],
//   "ringsaker": [61.10, 11.45],
//   "sel": [61.30, 9.50],
//   "skjåk": [61.8833, 7.8333],
//   "søndre land": [60.91, 10.22],
//   "sør-aurdal": [60.95, 9.32],
//   "sør-fron": [61.15, 9.83],
//   "sør-odal": [60.72, 11.32],
//   "stange": [60.7167, 11.0833],
//   "stor-elvdal": [61.43, 10.85],
//   "tolga": [61.70, 10.40],
//   "trysil": [61.18, 12.04],
//   "tynset": [63.25, 10.80],
//   "vågå": [61.77, 8.97],
//   "våler": [60.94, 11.35],
//   "vang": [61.05, 9.75],
//   "vestre slidre": [61.07, 8.68],
//   "vestre toten": [60.85, 10.50]
// };


// // Fallback-координаты (центр Innlandet), если нужная commune не найдена
// const fallbackCoords = [61.5, 10.6667];

// // Иконка для маркеров
// const customPinIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
//   iconSize: [35, 35],
//   iconAnchor: [17, 35]
// });

// // Функция для вычисления обрезанного названия муниципалитета
// // Приводит значение к нижнему регистру, отсекает запятые и известные суффиксы
// function getMunicipality(location) {
//   const buyer = location.buyer || location.Oppdragsgiver;
//   if (buyer) {
//     let trimmed = buyer.trim().toLowerCase();
//     if (trimmed.includes(',')) {
//       trimmed = trimmed.split(',')[0].trim();
//     }
//     const suffixes = [" kommune", " fylkeskommune"];
//     for (const suffix of suffixes) {
//       if (trimmed.endsWith(suffix)) {
//         trimmed = trimmed.slice(0, trimmed.length - suffix.length).trim();
//         break;
//       }
//     }
//     return trimmed;
//   }
//   return null;
// }

// // Вычисление координат на основе названия муниципалитета
// function getCoords(location) {
//   const municipalityName = getMunicipality(location);
//   if (municipalityName && municipalityMapping[municipalityName]) {
//     return municipalityMapping[municipalityName];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     // Дополнительные логи не нужны
//   }, [locations]);

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer center={fallbackCoords} zoom={6} style={{ width: "100%", height: "100%" }}>
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const coords = getCoords(location);
//           const municipality = getMunicipality(location);
//           // Единственный лог, который выводит обрезанное название коммуны
//           console.log("Trimmed municipality:", municipality);

//           return (
//             <Marker key={index} position={coords} icon={customPinIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.buyer || "Ikke spesifisert"}
//                   <br />
//                   <strong>Kommune:</strong> {municipality ? `${municipality} kommune` : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapComponent;






// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Задаём координаты для трёх нужных коммун (ключи записаны в нижнем регистре)
// const municipalityMapping = {
//   "skjåk": [61.8833, 7.8333],
//   "engerdal": [61.5667, 11.9833],
//   "stange": [60.7167, 11.0833]
// };

// // Если значение Oppdragsgiver отсутствует или его не удалось распознать,
// // используются fallback-координаты (например, центр Innlandet)
// const fallbackCoords = [61.5, 10.6667];

// // Иконка для маркеров
// const customPinIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
//   iconSize: [35, 35],
//   iconAnchor: [17, 35]
// });

// // Функция, которая из поля Oppdragsgiver (ожидается формат: "Skjåk kommune")
// // отрезает суффикс " kommune" и возвращает название в нижнем регистре.
// function getMunicipality(loc) {
//   if (loc.Oppdragsgiver) {
//     const trimmed = loc.Oppdragsgiver.trim();
//     const suffix = " kommune";
//     if (trimmed.toLowerCase().endsWith(suffix)) {
//       // Возвращаем название до слова " kommune", приведённое к нижнему регистру
//       return trimmed.slice(0, trimmed.length - suffix.length).trim().toLowerCase();
//     }
//     // Если формат иной, можно вернуть результат в нижнем регистре
//     return trimmed.toLowerCase();
//   }
//   return null;
// }

// // Функция для вычисления координат на основе поля Oppdragsgiver
// function getCoords(location) {
//   const municipality = getMunicipality(location);
//   if (municipality && municipalityMapping[municipality]) {
//     return municipalityMapping[municipality];
//   }
//   return fallbackCoords;
// }

// const MapComponent = ({ locations }) => {
//   useEffect(() => {
//     console.log("Processed locations:", locations);
//   }, [locations]);

//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer center={fallbackCoords} zoom={6} style={{ width: "100%", height: "100%" }}>
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution="&copy; OpenStreetMap contributors"
//         />
//         {locations.map((location, index) => {
//           const coords = getCoords(location);
//           console.log("Marker coordinates:", coords, "for location:", location);
//           return (
//             <Marker key={index} position={coords} icon={customPinIcon}>
//               <Popup>
//                 <div>
//                   <strong>{location.name}</strong>
//                   <br />
//                   <strong>Oppdragsgiver:</strong> {location.Oppdragsgiver || "Ikke spesifisert"}
//                   <br />
//                   Kommune: {location.Oppdragsgiver ? getMunicipality(location) : "Ukjent"}
//                 </div>
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapComponent;
















// работает хромает со всеми серверами

// import React from "react";
// import { MapContainer, TileLayer, Marker } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Кастомная иконка для маркеров
// const customPinIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
//   iconSize: [60, 60],
//   iconAnchor: [15, 30],
// });

// const MapComponent = ({ locations }) => {
//   return (
//     <div style={{ width: "100%", height: "100%", position: "relative" }}>
//       <MapContainer
//         center={[61.88, 9.25]}
//         zoom={8}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//         />
//         {locations.map((location, index) => (
//           <Marker key={index} position={location.coords} icon={customPinIcon} />
//         ))}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapComponent;



// import React from "react";
// import { MapContainer, TileLayer, Marker } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Кастомная иконка для маркеров
// const customPinIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
//   iconSize: [30, 30],
//   iconAnchor: [15, 30],
// });

// const MapComponent = ({ locations }) => {
//   return (
//     <MapContainer
//       center={[61.88, 9.25]}
//       zoom={8}
//       style={{ height: "100vh", width: "70%" }}
//     >
//       <TileLayer
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//       />
//       {locations.map((location, index) => (
//         <Marker
//           key={index}
//           position={location.coords}
//           icon={customPinIcon}
//         />
//       ))}
//     </MapContainer>
//   );
// };

// export default MapComponent;


