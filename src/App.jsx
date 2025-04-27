import React, { useState } from "react";
import MapComponent from "./components/MapComponent";
import DynamicListComponent from "./components/DynamicListComponent";

const App = () => {
  const [locations, setLocations] = useState([]);
  const apiURL = "/api/notices/search"; // Укажите базовый путь для API
  const xmlURL = "https://example.com/data.xml"; // Укажите путь для XML

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      margin: "0",
      padding: "0"
    }}>
      <div style={{
        flex: "2",
        borderRight: "1px solid #ccc",
        display: "flex",
        flexDirection: "column"
      }}>
        <MapComponent locations={locations} />
      </div>
      <div style={{
        flex: "1",
        padding: "10px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}>
        <DynamicListComponent 
          setLocations={setLocations} 
          apiURL={apiURL} 
          xmlURL={xmlURL} 
        />
      </div>
    </div>
  );
};

export default App;




// import React, { useState } from "react";
// import MapComponent from "./components/MapComponent";
// import DynamicListComponent from "./components/DynamicListComponent";

// const App = () => {
//   const [locations, setLocations] = useState([]); // Инициализируем состояние

//   return (
//     <div style={{
//       display: "flex",
//       height: "100vh",
//       width: "100vw",
//       margin: "0",
//       padding: "0"
//     }}>
//       <div style={{
//         flex: "2",
//         borderRight: "1px solid #ccc",
//         display: "flex",
//         flexDirection: "column"
//       }}>
//         {/* Передаем locations в MapComponent */}
//         <MapComponent locations={locations} />
//       </div>
//       <div style={{
//         flex: "1",
//         padding: "10px",
//         overflowY: "auto",
//         display: "flex",
//         flexDirection: "column"
//       }}>
//         {/* Передаем setLocations для обновления состояния */}
//         <DynamicListComponent setLocations={setLocations} />
//       </div>
//     </div>
//   );
// };

// export default App;




// import React, { useState } from "react";
// import MapComponent from "./components/MapComponent";
// import DynamicListComponent from "./components/DynamicListComponent";

// const App = () => {
//   const [locations, setLocations] = useState([]);

//   return (
//     <div style={{
//       display: "flex",
//       height: "100vh",
//       width: "100vw",
//       margin: "0",
//       padding: "0"
//     }}>
//       <div style={{
//         flex: "2",
//         borderRight: "1px solid #ccc",
//         display: "flex",
//         flexDirection: "column"
//       }}>
//         <MapComponent locations={locations} />
//       </div>
//       <div style={{
//         flex: "1",
//         padding: "10px",
//         overflowY: "auto",
//         display: "flex",
//         flexDirection: "column"
//       }}>
//         <DynamicListComponent setLocations={setLocations} />
      
//       </div>
//     </div>
//   );
// };

// export default App;







// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
