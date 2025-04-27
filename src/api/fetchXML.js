import axios from "axios";

const fetchXML = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: { "Content-Type": "application/xml" },
    });
    return response.data; // Возвращаем полученные XML-данные
  } catch (error) {
    console.error("Ошибка загрузки XML:", error.message);
    return null; // Если произошла ошибка, возвращаем null
  }
};

export default fetchXML;
