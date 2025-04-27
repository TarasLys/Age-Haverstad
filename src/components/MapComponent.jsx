
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Официальный NUTS3-уровень GeoJSON (2021, EPSG:4326)
const NUTS_GEOJSON_URL =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2021_4326_LEVL_3.geojson";

// Центры стран (если нет NUTS или для NOZZZ)
const countryCenters = {
  "NOR": [60.472, 8.4689],
  "SWE": [60.1282, 18.6435],
  "NOZZZ": [60.472, 8.4689], // "Вся Норвегия" — центр страны
  // ... добавляй нужные страны
};

const customPinIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function getCoordsFromNuts(nutsCode, nutsCenters) {
  if (nutsCode && nutsCenters[nutsCode]) {
    return nutsCenters[nutsCode];
  }
  return null;
}

function getCoords(location, nutsCenters) {
  // Если явно заданы координаты (например, из XML), используем их
  if (
    location.coords &&
    Array.isArray(location.coords) &&
    location.coords.length === 2 &&
    !isNaN(location.coords[0]) &&
    !isNaN(location.coords[1]) &&
    (location.coords[0] !== 0 || location.coords[1] !== 0)
  ) {
    return location.coords;
  }
  // Если есть NUTS-код и он в справочнике
  const nutsCoords = getCoordsFromNuts(location.nutsCode, nutsCenters);
  if (nutsCoords) return nutsCoords;
  // Если есть страна и она в справочнике (или NOZZZ)
  if (location.country && countryCenters[location.country]) {
    return countryCenters[location.country];
  }
  if (location.nutsCode && countryCenters[location.nutsCode]) {
    // Например, NOZZZ
    return countryCenters[location.nutsCode];
  }
  // Фоллбек: центр Скандинавии
  return [61.88, 9.25];
}

function computeFeatureCenter(feature) {
  // Для Polygon и MultiPolygon вычисляем центр масс (центроид)
  let coords = feature.geometry.coordinates;
  let type = feature.geometry.type;
  let allPoints = [];
  if (type === "Polygon") {
    allPoints = coords[0];
  } else if (type === "MultiPolygon") {
    // Берём самый большой полигон (по количеству точек)
    let maxPoly = coords[0];
    for (let poly of coords) {
      if (poly[0].length > maxPoly[0].length) maxPoly = poly;
    }
    allPoints = maxPoly[0];
  }
  // Среднее арифметическое по всем точкам полигона
  if (allPoints.length > 0) {
    const lat = allPoints.reduce((sum, pt) => sum + pt[1], 0) / allPoints.length;
    const lng = allPoints.reduce((sum, pt) => sum + pt[0], 0) / allPoints.length;
    return [lat, lng];
  }
  return null;
}

const MapComponent = ({ locations }) => {
  const [nutsCenters, setNutsCenters] = useState({});
  const [geojsonError, setGeojsonError] = useState(null);

  useEffect(() => {
    fetch(NUTS_GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error("GeoJSON not found");
        return res.json();
      })
      .then((geojson) => {
        const centers = {};
        geojson.features.forEach((feature) => {
          const code = feature.properties.NUTS_ID;
          const center = computeFeatureCenter(feature);
          if (code && center) {
            centers[code] = center;
          }
        });
        setNutsCenters(centers);
      })
      .catch((err) => {
        setGeojsonError(err.message);
        console.error("Ошибка загрузки NUTS GeoJSON:", err);
      });
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {geojsonError && (
        <div style={{ color: "red", padding: "10px" }}>
          Ошибка загрузки регионов NUTS: {geojsonError}
        </div>
      )}
      <MapContainer center={[61.88, 9.25]} zoom={6} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {locations.map((location, index) => {
          const coords = getCoords(location, nutsCenters);
          return (
            <Marker key={index} position={coords} icon={customPinIcon}>
              <Popup>
                <div>
                  <strong>{location.name}</strong>
                  <br />
                  Регион (NUTS): {location.nutsCode || "Не указано"}
                  <br />
                  Страна: {location.country || "Не указано"}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;

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


