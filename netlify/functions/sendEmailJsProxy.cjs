/**
 * Netlify serverless function: sendEmailJsProxy (чистый payload, без экранирования rows)
 */
exports.handler = async function(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    // Получаем параметры из .env
    const service_id = process.env.EMAILJS_SERVICE_ID;
    const template_id = process.env.EMAILJS_TEMPLATE_ID;
    const user_id = process.env.EMAILJS_USER_ID;
    const private_key = process.env.EMAILJS_PRIVATE_KEY;

    if (!service_id || !template_id || !user_id || !private_key) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "EmailJS env variables are not set" })
      };
    }

    // Получаем только template_params из тела запроса
    const { template_params } = JSON.parse(event.body);

    // Логируем для отладки
    console.log("Перед fetch на EmailJS:", {
      service_id, template_id, user_id, private_key, template_params
    });

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id,
        template_id,
        user_id,
        private_key,
        template_params
      })
    });

    const text = await response.text();
    console.log("Ответ от EmailJS:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: (data && data.error) || data || "Unknown error from EmailJS" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };
  } catch (e) {
    console.error("Ошибка в sendEmailJsProxy:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || "Unknown server error" })
    };
  }
};

// /**
//  * Netlify serverless function: sendEmailJsProxy (минимальный и чистый payload)
//  */
// exports.handler = async function(event) {
//   try {
//     if (event.httpMethod !== "POST") {
//       return {
//         statusCode: 405,
//         body: JSON.stringify({ error: "Method Not Allowed" })
//       };
//     }

//     // Получаем параметры из .env
//     const service_id = process.env.EMAILJS_SERVICE_ID;
//     const template_id = process.env.EMAILJS_TEMPLATE_ID;
//     const user_id = process.env.EMAILJS_USER_ID;
//     const private_key = process.env.EMAILJS_PRIVATE_KEY;

//     if (!service_id || !template_id || !user_id || !private_key) {
//       return {
//         statusCode: 500,
//         body: JSON.stringify({ error: "EmailJS env variables are not set" })
//       };
//     }

//     // Получаем только template_params из тела запроса
//     let { template_params } = JSON.parse(event.body);

//     // Оставляем только нужные поля и приводим к строкам, убираем двойное экранирование
//     template_params = {
//       to_email: String(template_params.to_email || ""),
//       map_url: String(template_params.map_url || ""),
//       chunk_number: String(template_params.chunk_number || ""),
//       chunk_total: String(template_params.chunk_total || ""),
//       rows: String(template_params.rows || "")
//         .replace(/\\n/g, "\n")
//         .replace(/\\\\/g, "\\")
//     };

//     // Логируем для отладки
//     console.log("Перед fetch на EmailJS:", {
//       service_id, template_id, user_id, private_key, template_params
//     });

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         service_id,
//         template_id,
//         user_id,
//         private_key,
//         template_params
//       })
//     });

//     const text = await response.text();
//     console.log("Ответ от EmailJS:", text);

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     if (!response.ok) {
//       return {
//         statusCode: response.status,
//         body: JSON.stringify({ error: (data && data.error) || data || "Unknown error from EmailJS" })
//       };
//     }

//     return {
//       statusCode: 200,
//       body: JSON.stringify({ success: true, data })
//     };
//   } catch (e) {
//     console.error("Ошибка в sendEmailJsProxy:", e);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: e.message || "Unknown server error" })
//     };
//   }
// };



