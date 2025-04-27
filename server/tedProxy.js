import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/proxy-xml", async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith("https://ted.europa.eu/")) {
    return res.status(400).send("Invalid or missing url parameter");
  }
  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/xml,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    res.set("Content-Type", "application/xml");
    res.set("Access-Control-Allow-Origin", "*");
    res.send(response.data);
  } catch (e) {
    // Логируем подробности ошибки
    console.error("Failed to fetch XML:", e.message);
    if (e.response) {
      console.error("TED status:", e.response.status);
      console.error("TED headers:", e.response.headers);
      // Показываем только первые 500 символов, чтобы не засорять консоль
      console.error("TED data:", typeof e.response.data === "string" ? e.response.data.slice(0, 500) : e.response.data);
    }
    res.status(500).send("Failed to fetch XML: " + e.message);
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`TED proxy server running on port ${PORT}`);
});