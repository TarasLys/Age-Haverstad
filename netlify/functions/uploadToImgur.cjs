/**
 * Netlify serverless function: uploadToImgur
 * CommonJS-версия для Electron/Express/Netlify production
 */
exports.handler = async function(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const { image } = JSON.parse(event.body);

    const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;
    if (!IMGUR_CLIENT_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "IMGUR_CLIENT_ID is not set in env" })
      };
    }

    // Убираем префикс, если есть
    const base64 = typeof image === "string" && image.startsWith("data:image/")
      ? image.split(",")[1]
      : image;

    if (!base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No valid base64 image provided" })
      };
    }

    // Логируем для отладки
    console.log("Перед отправкой на Imgur:", { hasImage: !!base64, IMGUR_CLIENT_ID });

    // ВАЖНО: Imgur требует application/x-www-form-urlencoded!
    const response = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: new URLSearchParams({
        image: base64,
        type: "base64"
      })
    });

    const text = await response.text();
    console.log("Ответ от Imgur:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Если Imgur вернул не JSON, возвращаем ошибку
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Imgur returned non-JSON response", details: text })
      };
    }

    if (!response.ok || !data.success) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.data?.error || data.error || data || "Unknown error from Imgur" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ link: data.data.link })
    };
  } catch (e) {
    console.error("Ошибка в uploadToImgur:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || "Unknown server error" })
    };
  }
};

// /* eslint-env node */
// /* eslint-disable no-undef */
// /**
//  * Netlify Function: Upload base64 image to Imgur and return the image URL.
//  * This file must NOT be imported on the frontend!
//  */

// const IMGUR_API_URL = "https://api.imgur.com/3/image";

// exports.handler = async (event) => {
//   if (event.httpMethod !== "POST") {
//     return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
//   }
//   const clientId = process.env.IMGUR_CLIENT_ID;
//   if (!clientId) {
//     return { statusCode: 500, body: JSON.stringify({ error: "IMGUR_CLIENT_ID not set in environment" }) };
//   }
//   let base64;
//   try {
//     const body = JSON.parse(event.body);
//     base64 = body.base64;
//     if (!base64 || !base64.startsWith("data:image/")) {
//       throw new Error("No valid base64 image provided");
//     }
//   } catch (e) {
//     return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body: " + e.message }) };
//   }
//   const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
//   try {
//     const imgurRes = await fetch(IMGUR_API_URL, {
//       method: "POST",
//       headers: {
//         Authorization: "Client-ID " + clientId,
//         Accept: "application/json",
//       },
//       body: new URLSearchParams({
//         image: base64Data,
//         type: "base64",
//       }),
//     });
//     const data = await imgurRes.json();
//     if (data.success && data.data && data.data.link) {
//       return { statusCode: 200, body: JSON.stringify({ success: true, url: data.data.link }) };
//     } else {
//       return { statusCode: 500, body: JSON.stringify({ error: "Imgur upload failed: " + (data.data?.error || JSON.stringify(data)) }) };
//     }
//   } catch (e) {
//     return { statusCode: 500, body: JSON.stringify({ error: "Server error: " + e.message }) };
//   }
// };