const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const router = express.Router();

/**
 * Ожидает в body:
 * {
 *   to: "recipient@example.com" или ["recipient1@example.com", "recipient2@example.com"],
 *   subject: "Тема письма",
 *   html: "<b>HTML-контент</b>",
 *   text: "Текстовое содержимое" (опционально),
 *   from: "отправитель@домен" (опционально, по умолчанию из .env)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      to,
      subject,
      html,
      text,
      from
    } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Поля to, subject, html обязательны" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = from || process.env.RESEND_FROM_EMAIL;

    if (!RESEND_API_KEY || !FROM_EMAIL) {
      return res.status(500).json({ error: "Resend credentials не заданы в .env" });
    }

    // Не преобразовываем массив в строку!
    const payload = {
      from: FROM_EMAIL,
      to, // может быть строкой или массивом
      subject,
      html,
    };
    if (text) payload.text = text;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // Показываем подробную ошибку
      return res.status(response.status).json({ error: data && data.error ? data.error : data });
    }

    res.json({ success: true, id: data.id, message: data.message || "Email sent via Resend" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown server error" });
  }
});

module.exports = router;

// const express = require('express');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// require('dotenv').config();

// const router = express.Router();

// /**
//  * Ожидает в body:
//  * {
//  *   to: "recipient@example.com" или ["recipient1@example.com", "recipient2@example.com"],
//  *   subject: "Тема письма",
//  *   html: "<b>HTML-контент</b>",
//  *   text: "Текстовое содержимое" (опционально),
//  *   from: "отправитель@домен" (опционально, по умолчанию из .env)
//  * }
//  */
// router.post('/', async (req, res) => {
//   try {
//     const {
//       to,
//       subject,
//       html,
//       text,
//       from
//     } = req.body;

//     if (!to || !subject || !html) {
//       return res.status(400).json({ error: "Поля to, subject, html обязательны" });
//     }

//     const RESEND_API_KEY = process.env.RESEND_API_KEY;
//     const FROM_EMAIL = from || process.env.RESEND_FROM_EMAIL;

//     if (!RESEND_API_KEY || !FROM_EMAIL) {
//       return res.status(500).json({ error: "Resend credentials не заданы в .env" });
//     }

//     // Важно: не преобразовывать to в массив, если это строка!
//     const payload = {
//       from: FROM_EMAIL,
//       to,
//       subject,
//       html,
//     };
//     if (text) payload.text = text;

//     const response = await fetch("https://api.resend.com/emails", {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${RESEND_API_KEY}`,
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify(payload)
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       // Показываем подробную ошибку
//       return res.status(response.status).json({ error: data && data.error ? data.error : data });
//     }

//     res.json({ success: true, id: data.id, message: data.message || "Email sent via Resend" });
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;