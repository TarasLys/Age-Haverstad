import React, { useState, useRef } from "react";
import MapComponent from "./MapComponent";
import DynamicListComponent from "./DynamicListComponent";

const TenderDashboard = () => {
  const [locations, setLocations] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const listRef = useRef();

  const handleMarkerDoubleClick = (index) => {
    console.log("Установлен активный тендер:", index);
    setActiveTender(index);
    if (listRef.current && listRef.current.scrollToTender) {
      listRef.current.scrollToTender(index);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <DynamicListComponent ref={listRef} setLocations={setLocations} activeTender={activeTender} />
      </div>
      <div style={{ flex: 1 }}>
        <MapComponent locations={locations} onMarkerDoubleClick={handleMarkerDoubleClick} />
      </div>
    </div>
  );
};

export default TenderDashboard;




