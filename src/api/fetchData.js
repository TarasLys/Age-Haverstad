import axios from "axios";

/**
 * Выполняет поиск тендеров по дате и городу Осло через API.
 * @param {string} fromDate - Начальная дата в формате YYYY-MM-DD
 * @param {string} toDate - Конечная дата в формате YYYY-MM-DD
 * @returns {Promise<Array>} - Массив найденных тендеров или пустой массив при ошибке
 */
const fetchData = async (fromDate, toDate) => {
  const url = "/api/notices/search"; // Используем прокси URL (через Vite proxy)

  // Преобразование дат в формат YYYYMMDD для запроса
  const formattedFromDate = fromDate.replace(/-/g, "");
  const formattedToDate = toDate.replace(/-/g, "");

  // Формируем параметры поиска
  const params = {
    query: `publication-date>=${formattedFromDate} AND publication-date<=${formattedToDate} AND organisation-city-serv-prov=Oslo`,
    fields: [
      "place-performance-streetline1-part",
      "place-of-performance-post-code-part",
      "place-of-performance-country-part",
      "organisation-name-serv-prov",
      "publication-date",
      "notice-title",
      "publication-number",
      "description-lot",
      "notice-type",
      "contract-nature",
    ],
    limit: 100, // Лимит записей
  };

  try {
    console.log("URL запроса:", url);
    console.log("Параметры запроса:", params);

    // Выполняем POST-запрос с авторизацией
    const response = await axios.post(url, params, {
      headers: {
        Authorization: "Bearer cbec13ae7aa045ff9196be57be915552", // Ваш API токен
      },
    });

    console.log("Ответ API:", response.data);
    // Возвращаем массив тендеров
    return response.data.notices;
  } catch (error) {
    // Логируем ошибку и возвращаем пустой массив
    console.error("Ошибка запроса:", error.response?.data || error.message);
    return [];
  }
};

export default fetchData;




// import axios from "axios";

// const fetchData = async (fromDate, toDate) => {
//   const url = "/api/notices/search"; // Используем прокси URL

//   // Преобразование дат в формат YYYYMMDD
//   const formattedFromDate = fromDate.replace(/-/g, "");
//   const formattedToDate = toDate.replace(/-/g, "");

//   const params = {
//     query: `publication-date>=${formattedFromDate} AND publication-date<=${formattedToDate} AND organisation-city-serv-prov=Oslo`,
//     fields: [
//       "place-performance-streetline1-part",
//       "place-of-performance-post-code-part",
//       "place-of-performance-country-part",
//       "organisation-name-serv-prov",
//       "publication-date",
//       "notice-title",
//       "publication-number",
//       "description-lot",
//       "notice-type",
//       "contract-nature",
//     ],
//     limit: 100, // Лимит записей
//   };

//   try {
//     console.log("URL запроса:", url);
//     console.log("Параметры запроса:", params);

//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552", // Ваш API токен
//       },
//     });

//     console.log("Ответ API:", response.data);
//     return response.data.notices;
//   } catch (error) {
//     console.error("Ошибка запроса:", error.response?.data || error.message);
//     return [];
//   }
// };

// export default fetchData;



// import axios from "axios";

// const fetchData = async (fromDate, toDate) => {
//   const url = "/api/notices/search"; // Используем прокси URL

//   // Преобразование дат в формат YYYYMMDD
//   const formattedFromDate = fromDate.replace(/-/g, "");
//   const formattedToDate = toDate.replace(/-/g, "");

//   const params = {
//     query: ` publication-date>=${formattedFromDate} AND publication-date<=${formattedToDate} AND organisation-city-serv-prov=Oslo`, // Добавлено условие на Осло
//       fields: [
//           "place-performance-streetline1-part",
//     "place-of-performance-post-code-part",
//     "place-of-performance-country-part",
//     "organisation-name-serv-prov",
//       "publication-date",
//       "notice-title",
//     "publication-number",
//     "description-lot",
//           "place-of-performance-country-lot",
//           "place-performance-coords-latitude",
//         "place-performance-coords-longitude",
//    "notice-type",
//    "contract-nature",
//           ],
//     limit: 100, // Лимит записей
//   };

//   try {
//     console.log("URL запроса:", url);
//     console.log("Параметры запроса:", params);

//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552", // Ваш API токен
//       },
//     });
//     console.log("Ответ API:", response.data);
//     return response.data.notices;
//   } catch (error) {
//     console.error("Ошибка запроса:", error.response?.data || error.message);
//     return [];
//   }
// };

// export default fetchData;


// import axios from "axios";

// const fetchData = async (fromDate, toDate) => {
//   const url = "/api/notices/search"; // Прокси URL

//   // Преобразование дат в формат YYYYMMDD
//   const formattedFromDate = fromDate.replace(/-/g, "");
//   const formattedToDate = toDate.replace(/-/g, "");

//   const params = {
//     query: `publication-date>=${formattedFromDate} AND publication-date<=${formattedToDate}`, // Исправленный формат
//     fields: [
//       "organisation-name-serv-prov",
//       "publication-date",
//       "place-performance-streetline1-part",
//       "place-of-performance-post-code-part",
//       "notice-title",
//       "publication-number",
//       "description-lot",
//       "place-of-performance-country-lot",
//     ],
//     limit: 10, // Лимит записей
//   };

//   try {
//     console.log("URL запроса:", url);
//     console.log("Параметры запроса:", params);

//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552", // Ваш API токен
//       },
//     });
//     console.log("Ответ API:", response.data);
//     return response.data.notices;
//   } catch (error) {
//     console.error("Ошибка запроса:", error.response?.data || error.message);
//     return [];
//   }
// };

// export default fetchData;







// import axios from "axios";

// const fetchData = async () => {
//   const url = "/api/notices/search";
//   const params = {
//     query: "organisation-city-serv-prov=Oslo", // Убираем фильтрацию по дате
//     fields: [
//       "organisation-name-serv-prov",
//       "publication-date",
//       "place-performance-streetline1-part",
//         "place-of-performance-post-code-part",
//       "notice-title",
//     "publication-number",
//     "description-lot",
//         "place-of-performance-country-lot",
//     "place-performance-streetline1-part",
//         "place-of-performance-post-code-part"
//       ],
//     limit: 250, // Увеличиваем лимит для получения большего количества данных
//   };

//   try {
//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552",
//       },
//     });
//     return response.data.notices;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }
// };

// export default fetchData;




// import axios from "axios";

// const fetchData = async () => {
//   const url = "/api/notices/search"; // Используем прокси для перенаправления запросов
//   const params = {
//     query: "organisation-city-serv-prov=Oslo",
//     fields: [
//       "organisation-name-serv-prov",
//       "publication-date",
//       "place-performance-streetline1-part",
//       "place-of-performance-post-code-part",
//     ],
//     limit: 10,
//   };

//   try {
//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552", // Ключ авторизации
//       },
//     });
//     return response.data.notices;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }
// };

// export default fetchData;



// import axios from "axios";

// const fetchData = async () => {
//   const url = "https://api.ted.europa.eu/v3/notices/search";
//   const params = {
//     query: "organisation-city-serv-prov=Oslo",
//     fields: [
//       "organisation-name-serv-prov",
//       "publication-date",
//       "place-performance-streetline1-part",
//       "place-of-performance-post-code-part",
//     ],
//     limit: 10,
//   };

//   try {
//     const response = await axios.post(url, params, {
//       headers: {
//         Authorization: "Bearer cbec13ae7aa045ff9196be57be915552",
//       },
//     });
//     return response.data.notices;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return [];
//   }
// };

// export default fetchData;
