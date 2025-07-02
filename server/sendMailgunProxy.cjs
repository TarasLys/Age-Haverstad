// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// require('dotenv').config();

// /**
//  * Ожидает в body:
//  * {
//  *   to: "recipient@example.com",
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

//     const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
//     const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
//     const FROM_EMAIL = from || process.env.MAILGUN_FROM_EMAIL;

//     if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !FROM_EMAIL) {
//       return res.status(500).json({ error: "Mailgun credentials не заданы в .env" });
//     }

//     const params = new URLSearchParams();
//     params.append("from", FROM_EMAIL);
//     params.append("to", to);
//     params.append("subject", subject);
//     params.append("html", html);
//     if (text) params.append("text", text);

//     const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
//       method: "POST",
//       headers: {
//         Authorization: "Basic " + Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64"),
//         "Content-Type": "application/x-www-form-urlencoded"
//       },
//       body: params
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       return res.status(response.status).json({ error: data && data.message ? data.message : data });
//     }

//     res.json({ success: true, id: data.id, message: data.message });
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;