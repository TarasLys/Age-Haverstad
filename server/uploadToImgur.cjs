/**
 * Imgur Upload Router для Express (CommonJS)
 * Экспортирует router для подключения в Express.
 */

const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Подключаем парсер JSON для этого роутера!
router.use(express.json());

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;
if (!IMGUR_CLIENT_ID) {
  console.warn('[uploadToImgur] ВНИМАНИЕ: IMGUR_CLIENT_ID не задан в .env!');
}

router.post('/', async (req, res) => {
  // Логируем всё тело запроса для диагностики
  console.log('[uploadToImgur] BODY:', req.body);

  try {
    // Поддержка и image, и base64
    const rawImage = req.body.image || req.body.base64;
    // Убираем префикс, если есть
    const image = rawImage && typeof rawImage === 'string' && rawImage.startsWith('data:image/')
      ? rawImage.split(',')[1]
      : rawImage;
    if (!image) {
      console.error('[uploadToImgur] Нет поля image/base64 или оно пустое!');
      return res.status(400).json({ error: 'No image provided', debug: req.body });
    }

    // Проверка размера base64-строки (лимит Imgur — 10 МБ)
    const MAX_IMGUR_SIZE = 10 * 1024 * 1024; // 10 MB
    const approxFileSize = Math.floor(image.length * 3 / 4); // в байтах

    if (approxFileSize > MAX_IMGUR_SIZE) {
      console.error(`[uploadToImgur] Image too large: ${(approxFileSize / (1024 * 1024)).toFixed(2)} MB`);
      return res.status(413).json({
        error: `Image is too large for Imgur (max 10MB). Your image: ${(approxFileSize / (1024 * 1024)).toFixed(2)} MB`
      });
    }

    // Логируем параметры запроса к Imgur
    console.log('[uploadToImgur] Отправляем запрос на Imgur. Размер:', approxFileSize, 'байт');

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        image: image,
        type: "base64"
      }),
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
      console.error('[uploadToImgur] Imgur returned non-JSON response:', data);
      return res.status(response.status).json({ error: 'Imgur returned non-JSON response', details: data });
    }

    // Логируем весь ответ Imgur для диагностики
    console.log('[uploadToImgur] Imgur response:', data);

    if (!response.ok || !data.success) {
      // Показываем детали ошибки Imgur
      console.error('[uploadToImgur] Ошибка Imgur:', data);
      return res.status(response.status).json({
        error: (data && (data.error || (data.data && data.data.error))) || 'Imgur upload failed',
        details: data
      });
    }

    if (!data || !data.data || !data.data.link) {
      // Если структура ответа неожиданная
      console.error('[uploadToImgur] Imgur response missing link:', data);
      return res.status(500).json({ error: 'Imgur response missing link', details: data });
    }

    res.json({ link: data.data.link });
  } catch (e) {
    console.error('[uploadToImgur] SERVER ERROR:', e);
    res.status(500).json({ error: e.message || 'Unknown server error' });
  }
});

module.exports = router;

// /**
//  * Imgur Upload Router для Express (CommonJS)
//  * Экспортирует router для подключения в Express.
//  */

// const express = require('express');
// const router = express.Router();
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// router.post('/', async (req, res) => {
//   try {
//     console.log("[Imgur Proxy] Incoming request:", Object.keys(req.body));
//     const { base64 } = req.body;
//     if (!base64) {
//       console.error("[Imgur Proxy] No base64 data provided");
//       return res.status(400).json({ error: "No base64 data provided" });
//     }

//     // Логируем отправку на Imgur
//     console.log("[Imgur Proxy] Sending image to Imgur...");

//     const response = await fetch("https://api.imgur.com/3/image", {
//       method: "POST",
//       headers: {
//         Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ image: base64.split(',')[1] })
//     });

//     const data = await response.json();

//     // Логируем ответ от Imgur
//     console.log("[Imgur Proxy] Imgur API response:", {
//       status: response.status,
//       ok: response.ok,
//       data
//     });

//     if (!response.ok) {
//       console.error("[Imgur Proxy] Imgur API error:", data);
//       return res.status(response.status).json({ error: (data && data.data && data.data.error) || data || "Unknown error from Imgur" });
//     }

//     res.json({ link: data.data.link });
//   } catch (e) {
//     console.error("[Imgur Proxy] Internal server error:", e, e.stack);
//     res.status(500).json({ error: e.message || "Unknown server error" });
//   }
// });

// module.exports = router;


// const expressImgur = require('express');
// const fetchImgur = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// require('dotenv').config();

// const imgurRouter = expressImgur.Router();
// imgurRouter.use(expressImgur.json());

// const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;
// if (!IMGUR_CLIENT_ID) {
//   console.warn('[uploadToImgur] ВНИМАНИЕ: IMGUR_CLIENT_ID не задан в .env!');
// }

// imgurRouter.post('/', async (req, res) => {
//   console.log('=== [uploadToImgur] HEADERS ===');
//   console.log(req.headers);
//   console.log('=== [uploadToImgur] BODY ===');
//   console.log(req.body);

//   try {
//     const rawImage = req.body.image || req.body.base64;
//     // Убираем префикс, если есть
//     const image = rawImage && typeof rawImage === 'string' && rawImage.startsWith('data:image/')
//       ? rawImage.split(',')[1]
//       : rawImage;
//     if (!image) {
//       console.error('[uploadToImgur] Нет поля image/base64 или оно пустое!');
//       return res.status(400).json({ error: 'No image provided', debug: req.body });
//     }

//     // Проверка размера base64-строки (лимит Imgur — 10 МБ)
//     const MAX_IMGUR_SIZE = 10 * 1024 * 1024; // 10 MB
//     const approxFileSize = Math.floor(image.length * 3 / 4); // в байтах

//     if (approxFileSize > MAX_IMGUR_SIZE) {
//       console.error(`[uploadToImgur] Image too large: ${(approxFileSize / (1024 * 1024)).toFixed(2)} MB`);
//       return res.status(413).json({
//         error: `Image is too large for Imgur (max 10MB). Your image: ${(approxFileSize / (1024 * 1024)).toFixed(2)} MB`
//       });
//     }

//     const response = await fetchImgur('https://api.imgur.com/3/image', {
//       method: 'POST',
//       headers: {
//         Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//         Accept: 'application/json'
//       },
//       body: new URLSearchParams({
//         image: image,
//         type: "base64"
//       }),
//     });

//     const contentType = response.headers.get('content-type');
//     let data;
//     if (contentType && contentType.includes('application/json')) {
//       data = await response.json();
//     } else {
//       data = await response.text();
//       console.error('[uploadToImgur] Imgur returned non-JSON response:', data);
//       return res.status(response.status).json({ error: 'Imgur returned non-JSON response', details: data });
//     }

//     // Логируем весь ответ Imgur для диагностики
//     console.log('[uploadToImgur] Imgur response:', data);

//     if (!response.ok || !data.success) {
//       // Показываем детали ошибки Imgur
//       return res.status(response.status).json({
//         error: (data && (data.error || data.data && data.data.error)) || 'Imgur upload failed',
//         details: data
//       });
//     }

//     if (!data || !data.data || !data.data.link) {
//       // Если структура ответа неожиданная
//       return res.status(500).json({ error: 'Imgur response missing link', details: data });
//     }

//     res.json({ link: data.data.link });
//   } catch (e) {
//     console.error('[uploadToImgur] SERVER ERROR:', e);
//     res.status(500).json({ error: e.message || 'Unknown server error' });
//   }
// });
// module.exports = imgurRouter;


// const express = require('express');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// require('dotenv').config();

// const router = express.Router();

// // ВАЖНО: подключаем парсер JSON для этого роутера!
// router.use(express.json());

// const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

// if (!IMGUR_CLIENT_ID) {
//   console.warn('[uploadToImgur] ВНИМАНИЕ: IMGUR_CLIENT_ID не задан в .env!');
// }

// router.post('/', async (req, res) => {
//   console.log('=== [uploadToImgur] HEADERS ===');
//   console.log(req.headers);
//   console.log('=== [uploadToImgur] BODY ===');
//   console.log(req.body);

//   try {
//     const rawImage = req.body.image || req.body.base64;
//     // Убираем префикс, если есть
//     const image = rawImage && typeof rawImage === 'string' && rawImage.startsWith('data:image/')
//       ? rawImage.split(',')[1]
//       : rawImage;
//     if (!image) {
//       console.error('[uploadToImgur] Нет поля image/base64 или оно пустое!');
//       return res.status(400).json({ error: 'No image provided', debug: req.body });
//     }

//     const response = await fetch('https://api.imgur.com/3/image', {
//       method: 'POST',
//       headers: {
//         Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ image }),
//     });

//     const contentType = response.headers.get('content-type');
//     let data;
//     if (contentType && contentType.includes('application/json')) {
//       data = await response.json();
//     } else {
//       data = await response.text();
//       console.error('[uploadToImgur] Imgur returned non-JSON response:', data);
//       return res.status(response.status).json({ error: 'Imgur returned non-JSON response', details: data });
//     }

//     // Логируем весь ответ Imgur для диагностики
//     console.log('[uploadToImgur] Imgur response:', data);

//     if (!response.ok) {
//       // Показываем детали ошибки Imgur
//       return res.status(response.status).json({
//         error: (data && (data.error || data.data && data.data.error)) || 'Imgur upload failed',
//         details: data
//       });
//     }

//     if (!data || !data.data || !data.data.link) {
//       // Если структура ответа неожиданная
//       return res.status(500).json({ error: 'Imgur response missing link', details: data });
//     }

//     res.json({ link: data.data.link });
//   } catch (e) {
//     console.error('[uploadToImgur] SERVER ERROR:', e);
//     res.status(500).json({ error: e.message || 'Unknown server error' });
//   }
// });

// module.exports = router;


// const express = require('express');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const router = express.Router();

// const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || 'YOUR_IMGUR_CLIENT_ID';

// router.post('/', async (req, res) => {
//   console.log('=== [uploadToImgur] BODY ===');
//   console.log(req.body);

//   try {
//     const { image } = req.body;
//     if (!image) {
//       return res.status(400).json({ error: 'No image provided' });
//     }

//     const response = await fetch('https://api.imgur.com/3/image', {
//       method: 'POST',
//       headers: {
//         Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ image }),
//     });

//     const data = await response.json();
//     if (!response.ok) {
//       return res.status(response.status).json({ error: data.error || 'Imgur upload failed' });
//     }

//     res.json({ link: data.data.link });
//   } catch (e) {
//     res.status(500).json({ error: e.message || 'Unknown server error' });
//   }
// });

// module.exports = router;