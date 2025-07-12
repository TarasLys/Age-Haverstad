

// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// router.post('/', async (req, res) => {
//   try {
//     const {
//       service_id,
//       template_id,
//       public_key,
//       user_id,
//       template_params
//     } = req.body;

//     // Для бесплатных и новых аккаунтов EmailJS требуется public_key (или user_id)
//     let emailjsPayload = {
//       service_id,
//       template_id,
//       template_params
//     };

//     if (public_key) {
//       emailjsPayload.public_key = public_key;
//       console.log("[EmailJS Proxy] Используется public_key");
//     } else if (user_id) {
//       emailjsPayload.user_id = user_id;
//       console.log("[EmailJS Proxy] Используется user_id");
//     } else {
//       return res.status(400).json({
//         error: "Передайте public_key (или user_id для старого API) — private_key не поддерживается вашим тарифом EmailJS"
//       });
//     }

//     // Логируем итоговый payload (безопасно скрываем ключи)
//     const safePayload = { ...emailjsPayload };
//     if (safePayload.public_key) safePayload.public_key = "[HIDDEN]";
//     if (safePayload.user_id) safePayload.user_id = "[HIDDEN]";
//     console.log("[EmailJS Proxy] Payload to EmailJS:", safePayload);

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(emailjsPayload)
//     });

//     let data;
//     const text = await response.text();
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     if (!response.ok) {
//       return res.status(response.status).json({ error: (data && data.error) || data || "Unknown error from EmailJS" });
//     }

//     res.json({ success: true, data });
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;

// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// router.post('/', async (req, res) => {
//   try {
//     const { service_id, template_id, private_key, public_key, user_id, template_params } = req.body;

//     // Проверяем, что передан только один ключ
//     const keys = [!!private_key, !!public_key, !!user_id].filter(Boolean);
//     if (keys.length !== 1) {
//       return res.status(400).json({
//         error: "Передайте ровно один ключ авторизации: private_key (сервер), public_key (клиент) или user_id (старый API)"
//       });
//     }

//     let emailjsPayload;
//     if (private_key) {
//       emailjsPayload = {
//         service_id,
//         template_id,
//         private_key,
//         template_params
//       };
//     } else if (public_key) {
//       emailjsPayload = {
//         service_id,
//         template_id,
//         public_key,
//         template_params
//       };
//     } else if (user_id) {
//       emailjsPayload = {
//         service_id,
//         template_id,
//         user_id,
//         template_params
//       };
//     }

//     console.log("[EmailJS Proxy] Payload to EmailJS:", emailjsPayload);

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(emailjsPayload)
//     });

//     let data;
//     const text = await response.text();
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     if (!response.ok) {
//       return res.status(response.status).json({ error: (data && data.error) || data || "Unknown error from EmailJS" });
//     }

//     res.json({ success: true, data });
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;



// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// // Для безопасности лучше хранить ключи в process.env, но можно и передавать с клиента
// router.post('/', async (req, res) => {
//   try {
//     // Теперь деструктурируем public_key и user_id
//     const { service_id, template_id, private_key, public_key, user_id, template_params } = req.body;

//     // Логируем входящие данные (безопасно, не логируем ключи)
//     console.log("[EmailJS Proxy] Incoming request:", {
//       service_id,
//       template_id,
//       public_key: !!public_key,
//       user_id: !!user_id,
//       template_params: template_params ? Object.keys(template_params) : undefined
//     });

//     if (!service_id || !template_id || !private_key || !public_key) {
//       console.warn("[EmailJS Proxy] Missing required fields", { service_id, template_id, private_key: !!private_key, public_key: !!public_key });
//       return res.status(400).json({ error: "EmailJS service_id, template_id, private_key или public_key не заданы" });
//     }

//     // Логируем отправляемый запрос
//     console.log("[EmailJS Proxy] Sending request to EmailJS API...");

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         service_id,
//         template_id,
//         private_key,
//         public_key,   // <-- обязательно!
//         user_id,      // <-- для совместимости
//         template_params
//       })
//     });

//     let data;
//     const text = await response.text();
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     // Логируем ответ от EmailJS
//     console.log("[EmailJS Proxy] EmailJS API response:", {
//       status: response.status,
//       ok: response.ok,
//       data
//     });

//     if (!response.ok) {
//       console.error("[EmailJS Proxy] EmailJS API error:", data);
//       return res.status(response.status).json({ error: (data && data.error) || data || "Unknown error from EmailJS" });
//     }

//     res.json({ success: true, data });
//   } catch (e) {
//     // Логируем ошибку с полным стеком
//     console.error("[EmailJS Proxy] Internal server error:", e, e.stack);
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// // Для безопасности лучше хранить ключи в process.env, но можно и передавать с клиента
// router.post('/', async (req, res) => {
//   try {
//     const { service_id, template_id, private_key, template_params } = req.body;

//     // Логируем входящие данные (безопасно, не логируем ключи)
//     console.log("[EmailJS Proxy] Incoming request:", {
//       service_id,
//       template_id,
//       template_params: template_params ? Object.keys(template_params) : undefined
//     });

//     if (!service_id || !template_id || !private_key) {
//       console.warn("[EmailJS Proxy] Missing required fields", { service_id, template_id, private_key: !!private_key });
//       return res.status(400).json({ error: "EmailJS service_id, template_id или private_key не заданы" });
//     }

//     // Логируем отправляемый запрос
//     console.log("[EmailJS Proxy] Sending request to EmailJS API...");

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         service_id,
//         template_id,
//         private_key,
//         template_params
//       })
//     });

//     let data;
//     const text = await response.text();
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     // Логируем ответ от EmailJS
//     console.log("[EmailJS Proxy] EmailJS API response:", {
//       status: response.status,
//       ok: response.ok,
//       data
//     });

//     if (!response.ok) {
//       console.error("[EmailJS Proxy] EmailJS API error:", data);
//       return res.status(response.status).json({ error: (data && data.error) || data || "Unknown error from EmailJS" });
//     }

//     res.json({ success: true, data });
//   } catch (e) {
//     // Логируем ошибку с полным стеком
//     console.error("[EmailJS Proxy] Internal server error:", e, e.stack);
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;






// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// // Для безопасности лучше хранить ключи в process.env, но можно и передавать с клиента
// router.post('/', async (req, res) => {
//   try {
//     const { service_id, template_id, private_key, template_params } = req.body;

//     if (!service_id || !template_id || !private_key) {
//       return res.status(400).json({ error: "EmailJS service_id, template_id или private_key не заданы" });
//     }

//     const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         service_id,
//         template_id,
//         private_key,
//         template_params
//       })
//     });

//     let data;
//     const text = await response.text();
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     if (!response.ok) {
//       return res.status(response.status).json({ error: (data && data.error) || data || "Unknown error from EmailJS" });
//     }

//     res.json({ success: true, data });
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;