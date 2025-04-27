import express from "express";
import axios from "axios";
import cors from "cors";
import { XMLParser } from "fast-xml-parser";

const app = express();
app.use(cors());
app.use(express.json());

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Универсальный сборщик CPV-кодов из блока (объект или массив)
function extractCpvCodesFromBlock(block) {
  let cpvCodes = [];
  if (!block) return cpvCodes;

  // MainCommodityClassification
  const mainCpvBlock = block["cac:MainCommodityClassification"];
  if (mainCpvBlock) {
    const mainArr = Array.isArray(mainCpvBlock) ? mainCpvBlock : [mainCpvBlock];
    mainArr.forEach(item => {
      let codeObj = item?.["cbc:ItemClassificationCode"];
      if (codeObj) {
        if (typeof codeObj === "object" && "#text" in codeObj) {
          cpvCodes.push(String(codeObj["#text"]));
        } else {
          cpvCodes.push(String(codeObj));
        }
      }
    });
  }

  // AdditionalCommodityClassification
  const addCpvBlock = block["cac:AdditionalCommodityClassification"];
  if (addCpvBlock) {
    const addArr = Array.isArray(addCpvBlock) ? addCpvBlock : [addCpvBlock];
    addArr.forEach(item => {
      let codeObj = item?.["cbc:ItemClassificationCode"];
      if (codeObj) {
        if (typeof codeObj === "object" && "#text" in codeObj) {
          cpvCodes.push(String(codeObj["#text"]));
        } else {
          cpvCodes.push(String(codeObj));
        }
      }
    });
  }
  return cpvCodes;
}

// Универсальный извлекатель текста из строки, массива или объекта с #text
function extractXmlText(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return extractXmlText(val[0]);
  if (typeof val === "object" && "#text" in val) return val["#text"];
  return null;
}

// Парсер заказчика и исполнителя с адресами и городами (без индексов)
function parseCustomerProvider(contractNotice) {
  let customer = {};
  let provider = {};

  // Заказчик: efac:Organizations (первый)
  const orgs = contractNotice?.["ext:UBLExtensions"]?.["ext:UBLExtension"]?.["ext:ExtensionContent"]?.["efext:EformsExtension"]?.["efac:Organizations"]?.["efac:Organization"];
  if (orgs) {
    const orgArr = Array.isArray(orgs) ? orgs : [orgs];
    if (orgArr[0]?.["efac:Company"]?.["cac:PostalAddress"]) {
      const addr = orgArr[0]["efac:Company"]["cac:PostalAddress"];
      customer.name = extractXmlText(orgArr[0]["efac:Company"]["cac:PartyName"]?.["cbc:Name"]) || null;
      customer.address = extractXmlText(addr["cbc:StreetName"]) || null;
      customer.city = extractXmlText(addr["cbc:CityName"]) || null;
    }
    // Исполнитель: efac:Organizations (второй)
    if (orgArr[1]?.["efac:Company"]?.["cac:PostalAddress"]) {
      const addr = orgArr[1]["efac:Company"]["cac:PostalAddress"];
      provider.name = extractXmlText(orgArr[1]["efac:Company"]["cac:PartyName"]?.["cbc:Name"]) || null;
      provider.address = extractXmlText(addr["cbc:StreetName"]) || null;
      provider.city = extractXmlText(addr["cbc:CityName"]) || null;
    }
  }

  // Fallback: ContractingParty (если efac:Organizations нет)
  const contractingParty = contractNotice?.["cac:ContractingParty"];
  if (contractingParty && (!customer.address || !customer.city)) {
    const party = contractingParty["cac:Party"];
    if (party) {
      const address = party["cac:PostalAddress"];
      if (address) {
        customer.address = extractXmlText(address["cbc:StreetName"]) || customer.address;
        customer.city = extractXmlText(address["cbc:CityName"]) || customer.city;
      }
    }
  }

  return { customer, provider };
}

// Парсер CPV, региона, страны, заказчика и исполнителя
function parseXmlFields(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const xml = parser.parse(xmlText);

  let cpvCodes = [];
  let nutsCode = null;
  let country = null;
  let customer = {};
  let provider = {};

  try {
    const contractNotice = xml?.ContractNotice;
    if (!contractNotice) {
      console.warn("Нет ContractNotice в XML");
      return { cpvCodes, nutsCode, country, customer, provider };
    }

    // 1. CPV на первом уровне
    cpvCodes = cpvCodes.concat(extractCpvCodesFromBlock(contractNotice));

    // 2. CPV и регион/страна внутри cac:ProcurementProject (может быть массивом!)
    const procurementProjects = contractNotice["cac:ProcurementProject"];
    if (procurementProjects) {
      const ppArr = Array.isArray(procurementProjects) ? procurementProjects : [procurementProjects];
      ppArr.forEach(pp => {
        cpvCodes = cpvCodes.concat(extractCpvCodesFromBlock(pp));
        // Регион и страна
        const realizedLoc = pp["cac:RealizedLocation"];
        if (realizedLoc) {
          const locArr = Array.isArray(realizedLoc) ? realizedLoc : [realizedLoc];
          locArr.forEach(loc => {
            const addr = loc["cac:Address"];
            if (addr) {
              if (addr["cbc:CountrySubentityCode"] && !nutsCode) nutsCode = extractXmlText(addr["cbc:CountrySubentityCode"]);
              if (addr["cac:Country"]?.["cbc:IdentificationCode"] && !country) country = extractXmlText(addr["cac:Country"]["cbc:IdentificationCode"]);
            }
          });
        }
      });
    }

    // 3. CPV и регион/страна внутри cac:ProcurementProjectLot (может быть массивом!)
    const procurementProjectLots = contractNotice["cac:ProcurementProjectLot"];
    if (procurementProjectLots) {
      const pplArr = Array.isArray(procurementProjectLots) ? procurementProjectLots : [procurementProjectLots];
      pplArr.forEach(ppl => {
        cpvCodes = cpvCodes.concat(extractCpvCodesFromBlock(ppl));
        const lotPP = ppl["cac:ProcurementProject"];
        if (lotPP) {
          const lotPPArr = Array.isArray(lotPP) ? lotPP : [lotPP];
          lotPPArr.forEach(lpp => {
            cpvCodes = cpvCodes.concat(extractCpvCodesFromBlock(lpp));
            // Регион и страна
            const realizedLoc = lpp["cac:RealizedLocation"];
            if (realizedLoc) {
              const locArr = Array.isArray(realizedLoc) ? realizedLoc : [realizedLoc];
              locArr.forEach(loc => {
                const addr = loc["cac:Address"];
                if (addr) {
                  if (addr["cbc:CountrySubentityCode"] && !nutsCode) nutsCode = extractXmlText(addr["cbc:CountrySubentityCode"]);
                  if (addr["cac:Country"]?.["cbc:IdentificationCode"] && !country) country = extractXmlText(addr["cac:Country"]["cbc:IdentificationCode"]);
                }
              });
            }
          });
        }
      });
    }

    // 4. Заказчик/исполнитель
    const parties = parseCustomerProvider(contractNotice);
    customer = parties.customer;
    provider = parties.provider;

  } catch (err) {
    console.warn("Ошибка при парсинге XML:", err);
  }

  return { cpvCodes, nutsCode, country, customer, provider };
}

// Пагинация TED API
async function fetchAllNotices(params, headers, maxPages = 10) {
  let allNotices = [];
  let cursor = null;
  let page = 1;
  do {
    const pageParams = { ...params, limit: 250 };
    if (cursor) pageParams.cursor = cursor;
    console.log(`Запрос к TED API, страница ${page}, cursor: ${cursor || "none"}`);
    const response = await axios.post(
      "https://api.ted.europa.eu/v3/notices/search?paginationMode=ITERATION",
      pageParams,
      { headers }
    );
    const notices = response.data.notices || [];
    allNotices = allNotices.concat(notices);
    cursor = response.data.nextPageCursor;
    page++;
  } while (cursor && page <= maxPages);
  return allNotices;
}

app.post("/api/notices/with-xml", async (req, res) => {
  const { from, to } = req.body;
  console.log("Получен запрос на /api/notices/with-xml:", req.body);

  if (!from || !to) {
    console.log("Ошибка: не указаны from и to");
    return res.status(400).json({ error: "from and to required" });
  }

  try {
    const query = `publication-date>=${from.replace(/-/g, "")} AND publication-date<=${to.replace(/-/g, "")} AND organisation-country-serv-prov=NOR`;
    // const query = `publication-date>=${from.replace(/-/g, "")} AND publication-date<=${to.replace(/-/g, "")} AND organisation-city-serv-prov=Oslo`;
    const params = {
      query,
      fields: [
        "notice-title",
        "publication-date",
        "links",
        "organisation-name-serv-prov",
        "place-performance-streetline1-part",
        "place-of-performance-post-code-part",
        "place-of-performance-country-part",
        "organisation-city-serv-prov",
        "description-lot"
      ]
    };
    const headers = {
      "Authorization": "Bearer cbec13ae7aa045ff9196be57be915552",
      "Content-Type": "application/json"
    };

    const notices = await fetchAllNotices(params, headers, 10); // maxPages=10 (2500 записей максимум)
    console.log("Всего получено notices:", notices.length);

    const results = [];
    // Массив целевых CPV-кодов (только 8-значные строки!)
    const targetCpvs = "45000000";
    //const targetCpvs = ["45000000", "45221200", "45240000", "45233100"];
    for (const notice of notices) {
      const xmlUrl = notice?.links?.xml?.MUL;
      let xmlFields = {};
      if (xmlUrl) {
        try {
          console.log("Скачиваем XML по адресу:", xmlUrl);
          const xmlResp = await axios.get(xmlUrl, {
            responseType: "text",
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/xml"
            }
          });
          xmlFields = parseXmlFields(xmlResp.data);

          // Фильтрация по массиву CPV-кодов
          if (!xmlFields.cpvCodes.some(cpv => targetCpvs.includes(cpv))) {
            console.log(`Пропущено: нет нужных CPV в тендере`, xmlFields.cpvCodes);
            await delay(500);
            continue;
          }
          await delay(2000);
        } catch (err) {
          console.error(`Ошибка при скачивании или парсинге XML для notice ${notice["notice-title"] || ""}:`, err.message);
          xmlFields = { error: "Failed to fetch or parse XML", details: err.message };
        }
      } else {
        continue;
      }
      results.push({
        ...notice,
        ...xmlFields
      });
    }

    console.log("Отправляем на фронт:", results.length, "тендеров с нужными CPV");
    res.json({ results });
  } catch (err) {
    console.error("Batch XML scraper error:", err.message);
    if (err.response) {
      console.error("TED API response data:", err.response.data);
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`TED batch XML scraper running on port ${PORT}`);
});