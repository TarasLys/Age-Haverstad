const express = require('express');
const path = require('path');

function createStaticServer(port = 8888) {
  const app = express();

  // CORS middleware
  console.log('app.use: CORS middleware');
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // JSON parser with increased limit
  console.log('app.use: express.json()');
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Resend proxy endpoint
  try {
    console.log("app.use: /api/send-resend -> sendResendProxy.cjs");
    const sendResendProxy = require('./sendResendProxy.cjs');
    app.use('/api/send-resend', sendResendProxy);
  } catch (e) {
    console.warn('sendResendProxy.cjs not found or failed to load:', e.message);
  }

  // Imgur upload endpoint (если нужен)
  try {
    console.log("app.use: /.netlify/functions/uploadToImgur -> uploadToImgur.cjs");
    const uploadToImgur = require('./uploadToImgur.cjs');
    app.use('/.netlify/functions/uploadToImgur', uploadToImgur);
  } catch (e) {
    console.warn('uploadToImgur.cjs not found or failed to load:', e.message);
  }

  // Static files
  const distPath = path.join(__dirname, '../dist');
  console.log('app.use: express.static(', distPath, ')');
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('cron_doffin_last.json')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  }));

  // SPA fallback
  console.log('app.get: * (SPA fallback)');
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const server = app.listen(port, () => {
    console.log(`Static server running on port ${port}`);
  });

  return server;
}

module.exports = createStaticServer;

// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();

//   // CORS middleware
//   console.log('app.use: CORS middleware');
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });

//   // JSON parser with increased limit
//   console.log('app.use: express.json()');
//   app.use(express.json({ limit: '20mb' }));
//   app.use(express.urlencoded({ limit: '20mb', extended: true }));

//   // Resend proxy endpoint
//   try {
//     console.log("app.use: /api/send-resend -> sendResendProxy.cjs");
//     const sendResendProxy = require('./sendResendProxy.cjs');
//     app.use('/api/send-resend', sendResendProxy);
//   } catch (e) {
//     console.warn('sendResendProxy.cjs not found or failed to load:', e.message);
//   }

//   // Imgur upload endpoint (если нужен)
//   try {
//     console.log("app.use: /.netlify/functions/uploadToImgur -> uploadToImgur.cjs");
//     const uploadToImgur = require('./uploadToImgur.cjs');
//     app.use('/.netlify/functions/uploadToImgur', uploadToImgur);
//   } catch (e) {
//     console.warn('uploadToImgur.cjs not found or failed to load:', e.message);
//   }

//   // Static files
//   const distPath = path.join(__dirname, '../dist');
//   console.log('app.use: express.static(', distPath, ')');
//   app.use(express.static(distPath, {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (filePath.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (filePath.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));

//   // SPA fallback
//   console.log('app.get: * (SPA fallback)');
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(distPath, 'index.html'));
//   });

//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });

//   return server;
// }

// module.exports = createStaticServer;

// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();

//   // CORS middleware
//   console.log('app.use: CORS middleware');
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });

//   // JSON parser with increased limit
//   console.log('app.use: express.json()');
//   app.use(express.json({ limit: '20mb' }));
//   app.use(express.urlencoded({ limit: '20mb', extended: true }));

//   // Resend proxy endpoint
//   try {
//     console.log("app.use: /api/send-resend -> sendResendProxy.cjs");
//     const sendResendProxy = require('./sendResendProxy.cjs');
//     app.use('/api/send-resend', sendResendProxy);
//   } catch (e) {
//     console.warn('sendResendProxy.cjs not found or failed to load:', e.message);
//   }

//   // Imgur upload endpoint
//   try {
//     console.log("app.use: /.netlify/functions/uploadToImgur -> uploadToImgur.cjs");
//     const uploadToImgur = require('./uploadToImgur.cjs');
//     app.use('/.netlify/functions/uploadToImgur', uploadToImgur);
//   } catch (e) {
//     console.warn('uploadToImgur.cjs not found or failed to load:', e.message);
//   }

//   // Static files
//   const distPath = path.join(__dirname, '../dist');
//   console.log('app.use: express.static(', distPath, ')');
//   app.use(express.static(distPath, {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (filePath.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (filePath.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));

//   // SPA fallback
//   console.log('app.get: * (SPA fallback)');
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(distPath, 'index.html'));
//   });

//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });

//   return server;
// }

// module.exports = createStaticServer;

// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();

//   // CORS middleware
//   console.log('app.use: CORS middleware');
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });

//   // JSON parser with increased limit
//   console.log('app.use: express.json()');
//   app.use(express.json({ limit: '20mb' }));
//   app.use(express.urlencoded({ limit: '20mb', extended: true }));

//   // Mailgun proxy endpoint
//   try {
//     console.log("app.use: /api/send-mailgun -> sendMailgunProxy.cjs");
//     const sendMailgunProxy = require('./sendMailgunProxy.cjs');
//     app.use('/api/send-mailgun', sendMailgunProxy);
//   } catch (e) {
//     console.warn('sendMailgunProxy.cjs not found or failed to load:', e.message);
//   }

//   // EmailJS proxy endpoint (если ещё нужен)
//   try {
//     console.log("app.use: /.netlify/functions/sendEmailJsProxy -> sendEmailJsProxy.cjs");
//     const emailJsProxy = require('./sendEmailJsProxy.cjs');
//     app.use('/.netlify/functions/sendEmailJsProxy', emailJsProxy);
//   } catch (e) {
//     console.warn('sendEmailJsProxy.cjs not found or failed to load:', e.message);
//   }

//   // Imgur upload endpoint
//   try {
//     console.log("app.use: /.netlify/functions/uploadToImgur -> uploadToImgur.cjs");
//     const uploadToImgur = require('./uploadToImgur.cjs');
//     app.use('/.netlify/functions/uploadToImgur', uploadToImgur);
//   } catch (e) {
//     console.warn('uploadToImgur.cjs not found or failed to load:', e.message);
//   }

//   // Static files
//   const distPath = path.join(__dirname, '../dist');
//   console.log('app.use: express.static(', distPath, ')');
//   app.use(express.static(distPath, {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (filePath.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (filePath.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));

//   // SPA fallback
//   console.log('app.get: * (SPA fallback)');
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(distPath, 'index.html'));
//   });

//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });

//   return server;
// }

// module.exports = createStaticServer;


// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();

//   // CORS middleware
//   console.log('app.use: CORS middleware');
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });

//   // JSON parser with increased limit
//   console.log('app.use: express.json()');
//   app.use(express.json({ limit: '20mb' }));
//   app.use(express.urlencoded({ limit: '20mb', extended: true }));

//   // EmailJS proxy endpoint
//   try {
//     console.log("app.use: /.netlify/functions/sendEmailJsProxy -> sendEmailJsProxy.cjs");
//     const emailJsProxy = require('./sendEmailJsProxy.cjs');
//     app.use('/.netlify/functions/sendEmailJsProxy', emailJsProxy);
//   } catch (e) {
//     console.warn('sendEmailJsProxy.cjs not found or failed to load:', e.message);
//   }

//   // Imgur upload endpoint
//   try {
//     console.log("app.use: /.netlify/functions/uploadToImgur -> uploadToImgur.cjs");
//     const uploadToImgur = require('./uploadToImgur.cjs');
//     app.use('/.netlify/functions/uploadToImgur', uploadToImgur);
//   } catch (e) {
//     console.warn('uploadToImgur.cjs not found or failed to load:', e.message);
//   }

//   // Static files
//   const distPath = path.join(__dirname, '../dist');
//   console.log('app.use: express.static(', distPath, ')');
//   app.use(express.static(distPath, {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (filePath.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (filePath.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));

//   // SPA fallback
//   console.log('app.get: * (SPA fallback)');
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(distPath, 'index.html'));
//   });

//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });

//   return server;
// }

// module.exports = createStaticServer;


// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();

//   // CORS middleware
//   console.log('app.use: CORS middleware');
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });

//   // JSON parser
//   console.log('app.use: express.json()');
//   //app.use(express.json());
// app.use(express.json({ limit: '20mb' })); // или больше, если нужно
// app.use(express.urlencoded({ limit: '20mb', extended: true }));
//   // EmailJS proxy endpoint
//   try {
//     console.log("app.use: /.netlify/functions/sendEmailJsProxy -> sendEmailJsProxy.cjs");
//     const emailJsProxy = require('./sendEmailJsProxy.cjs');
//     // Проверяем, что импортирован именно Router, а не объект с default
//     app.use('/.netlify/functions/sendEmailJsProxy', emailJsProxy);
//   } catch (e) {
//     console.warn('sendEmailJsProxy.cjs not found or failed to load:', e.message);
//   }

//   // Static files
//   const distPath = path.join(__dirname, '../dist');
//   console.log('app.use: express.static(', distPath, ')');
//   app.use(express.static(distPath, {
//     setHeaders: (res, filePath) => {
//       if (filePath.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (filePath.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (filePath.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));

//   // SPA fallback
//   console.log('app.get: * (SPA fallback)');
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(distPath, 'index.html'));
//   });

//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });

//   return server;
// }

// module.exports = createStaticServer;

// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();
  
//   // Добавляем CORS заголовки для работы с внешними API (emailjs)
//   app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
//     // Обработка preflight запросов
//     if (req.method === 'OPTIONS') {
//       res.sendStatus(200);
//     } else {
//       next();
//     }
//   });
  
//   // Обслуживание статических файлов из папки dist (Vite build output)
//   app.use(express.static(path.join(__dirname, '../dist'), {
//     // Добавляем правильные MIME типы
//     setHeaders: (res, path) => {
//       if (path.endsWith('.js')) {
//         res.setHeader('Content-Type', 'application/javascript');
//       } else if (path.endsWith('.css')) {
//         res.setHeader('Content-Type', 'text/css');
//       } else if (path.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//       }
//     }
//   }));
  
//   // Для SPA - все маршруты возвращают index.html
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../dist/index.html'));
//   });
  
//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });
  
//   return server;
// }

// module.exports = createStaticServer;

// // Если файл запускается напрямую
// if (require.main === module) {
//   createStaticServer();
// }


// const express = require('express');
// const path = require('path');

// function createStaticServer(port = 8888) {
//   const app = express();
  
//   // Обслуживание статических файлов из папки build
//   app.use(express.static(path.join(__dirname, '../build')));
  
//   // Для SPA - все маршруты возвращают index.html
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../build/index.html'));
//   });
  
//   const server = app.listen(port, () => {
//     console.log(`Static server running on port ${port}`);
//   });
  
//   return server;
// }

// module.exports = createStaticServer;

// // Если файл запускается напрямую
// if (require.main === module) {
//   createStaticServer();
// }