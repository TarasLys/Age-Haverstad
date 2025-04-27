
import axios from "axios";
import parseXML from "./parseXML";

const processXMLData = async (xmlURL) => {
  try {
    const response = await axios.get(xmlURL, {
      headers: { "Content-Type": "application/xml" },
    });
    const xmlData = response.data;
    const parsedData = parseXML(xmlData);

    console.log("Обработанные данные:", parsedData);
    return parsedData;
  } catch (error) {
    console.error("Ошибка обработки XML:", error.message);
    return {};
  }
};

export default processXMLData;

