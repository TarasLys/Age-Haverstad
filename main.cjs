require('dotenv').config(); // Загружаем переменные из .env

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Проверяем, что переменные окружения подгружаются (Mailgun)
console.log("MAILGUN_API_KEY:", process.env.MAILGUN_API_KEY);
console.log("MAILGUN_DOMAIN:", process.env.MAILGUN_DOMAIN);
console.log("IMGUR_CLIENT_ID:", process.env.IMGUR_CLIENT_ID);

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let netlifyProcess;
let scraperProcess;
let staticServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  const startUrl = 'http://localhost:8888';
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:8888') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    killAllProcesses();
  });
}

function killAllProcesses() {
  if (netlifyProcess) {
    netlifyProcess.kill();
    netlifyProcess = null;
  }
  if (scraperProcess) {
    scraperProcess.kill();
    scraperProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

function checkServerReady(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      attempts++;
      const req = http.get(`http://localhost:${port}`, (res) => {
        console.log(`Server is ready on port ${port}`);
        resolve(true);
      });
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          console.error(`Server not ready after ${maxAttempts} attempts`);
          reject(err);
        } else {
          console.log(`Attempt ${attempts}: Server not ready yet, retrying in 1 second...`);
          setTimeout(checkServer, 1000);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('Server check timeout'));
        } else {
          setTimeout(checkServer, 1000);
        }
      });
    };
    checkServer();
  });
}

async function startBackendServices() {
  const serverPort = 8888;

  if (isDev) {
    // В режиме разработки запускаем netlify dev
    console.log('Starting Netlify dev server...');
    netlifyProcess = spawn('npx', ['netlify', 'dev'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        BROWSER: 'none',
        NODE_ENV: 'development'
      }
    });

    netlifyProcess.on('error', (error) => {
      console.error('Netlify process error:', error);
    });
  } else {
    // В продакшене запускаем статический сервер
    console.log('Starting static server...');
    try {
      const createStaticServer = require('./server/staticServer.cjs');
      staticServer = createStaticServer(serverPort);
    } catch (error) {
      console.error('Failed to start static server:', error);
      throw error;
    }
  }

  // Ждем готовности сервера
  try {
    await checkServerReady(serverPort);
    console.log('Web server is ready!');
  } catch (error) {
    console.error('Web server failed to start:', error);
    throw error;
  }

  // Запускаем scraper после того как веб-сервер готов
  console.log('Starting scraper...');
  // Всегда используем относительный путь от __dirname
  const scraperPath = path.join(__dirname, 'server', 'doffinScraper.js');
  if (!fs.existsSync(scraperPath)) {
    console.error(`Scraper file not found: ${scraperPath}`);
    throw new Error(`Scraper file not found: ${scraperPath}`);
  }

  scraperProcess = spawn('node', [scraperPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
  });

  scraperProcess.on('error', (error) => {
    console.error('Scraper process error:', error);
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Starting backend services...');
    await startBackendServices();
    console.log('Creating Electron window...');
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  killAllProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  killAllProcesses();
});

process.on('SIGINT', () => {
  killAllProcesses();
  process.exit();
});

process.on('SIGTERM', () => {
  killAllProcesses();
  process.exit();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:8888') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});





// require('dotenv').config(); // Загружаем переменные из .env

// const { app, BrowserWindow, shell } = require('electron');
// const { spawn } = require('child_process');
// const path = require('path');
// const http = require('http');
// const fs = require('fs');

// // ВРЕМЕННО: Проверяем, что переменные окружения подгружаются
// console.log("IMGUR_CLIENT_ID:", process.env.IMGUR_CLIENT_ID);

// const isDev = process.env.NODE_ENV !== 'production';

// let mainWindow;
// let netlifyProcess;
// let scraperProcess;
// let staticServer;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       webSecurity: false,
//       allowRunningInsecureContent: true,
//       experimentalFeatures: true
//     },
//     icon: path.join(__dirname, 'assets/icon.png'),
//     show: false
//   });

//   const startUrl = 'http://localhost:8888';
//   mainWindow.loadURL(startUrl);

//   mainWindow.once('ready-to-show', () => {
//     mainWindow.show();
//     if (isDev) {
//       mainWindow.webContents.openDevTools();
//     }
//   });

//   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
//     if (url.startsWith('http://') || url.startsWith('https://')) {
//       if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
//         shell.openExternal(url);
//         return { action: 'deny' };
//       }
//     }
//     return { action: 'deny' };
//   });

//   mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });

//   mainWindow.webContents.on('new-window', (event, url) => {
//     event.preventDefault();
//     shell.openExternal(url);
//   });

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     killAllProcesses();
//   });
// }

// function killAllProcesses() {
//   if (netlifyProcess) {
//     netlifyProcess.kill();
//     netlifyProcess = null;
//   }
//   if (scraperProcess) {
//     scraperProcess.kill();
//     scraperProcess = null;
//   }
//   if (staticServer) {
//     staticServer.close();
//     staticServer = null;
//   }
// }

// function checkServerReady(port, maxAttempts = 30) {
//   return new Promise((resolve, reject) => {
//     let attempts = 0;
//     const checkServer = () => {
//       attempts++;
//       const req = http.get(`http://localhost:${port}`, (res) => {
//         console.log(`Server is ready on port ${port}`);
//         resolve(true);
//       });
//       req.on('error', (err) => {
//         if (attempts >= maxAttempts) {
//           console.error(`Server not ready after ${maxAttempts} attempts`);
//           reject(err);
//         } else {
//           console.log(`Attempt ${attempts}: Server not ready yet, retrying in 1 second...`);
//           setTimeout(checkServer, 1000);
//         }
//       });
//       req.setTimeout(1000, () => {
//         req.destroy();
//         if (attempts >= maxAttempts) {
//           reject(new Error('Server check timeout'));
//         } else {
//           setTimeout(checkServer, 1000);
//         }
//       });
//     };
//     checkServer();
//   });
// }

// async function startBackendServices() {
//   const serverPort = 8888;

//   if (isDev) {
//     // В режиме разработки запускаем netlify dev
//     console.log('Starting Netlify dev server...');
//     netlifyProcess = spawn('npx', ['netlify', 'dev'], {
//       cwd: process.cwd(),
//       stdio: 'inherit',
//       shell: true,
//       env: {
//         ...process.env,
//         BROWSER: 'none',
//         NODE_ENV: 'development'
//       }
//     });

//     netlifyProcess.on('error', (error) => {
//       console.error('Netlify process error:', error);
//     });
//   } else {
//     // В продакшене запускаем статический сервер
//     console.log('Starting static server...');
//     try {
//       const createStaticServer = require('./server/staticServer.cjs');
//       staticServer = createStaticServer(serverPort);
//     } catch (error) {
//       console.error('Failed to start static server:', error);
//       throw error;
//     }
//   }

//   // Ждем готовности сервера
//   try {
//     await checkServerReady(serverPort);
//     console.log('Web server is ready!');
//   } catch (error) {
//     console.error('Web server failed to start:', error);
//     throw error;
//   }

//   // Запускаем scraper после того как веб-сервер готов
//   console.log('Starting scraper...');
//   // Всегда используем относительный путь от __dirname
//   const scraperPath = path.join(__dirname, 'server', 'doffinScraper.js');
//   if (!fs.existsSync(scraperPath)) {
//     console.error(`Scraper file not found: ${scraperPath}`);
//     throw new Error(`Scraper file not found: ${scraperPath}`);
//   }

//   scraperProcess = spawn('node', [scraperPath], {
//     cwd: process.cwd(),
//     stdio: 'inherit',
//     shell: true
//   });

//   scraperProcess.on('error', (error) => {
//     console.error('Scraper process error:', error);
//   });
// }

// app.whenReady().then(async () => {
//   try {
//     console.log('Starting backend services...');
//     await startBackendServices();
//     console.log('Creating Electron window...');
//     createWindow();
//   } catch (error) {
//     console.error('Failed to start application:', error);
//     app.quit();
//   }
// });

// app.on('window-all-closed', () => {
//   killAllProcesses();
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// app.on('before-quit', () => {
//   killAllProcesses();
// });

// process.on('SIGINT', () => {
//   killAllProcesses();
//   process.exit();
// });

// process.on('SIGTERM', () => {
//   killAllProcesses();
//   process.exit();
// });

// app.on('web-contents-created', (event, contents) => {
//   contents.on('new-window', (event, navigationUrl) => {
//     event.preventDefault();
//     shell.openExternal(navigationUrl);
//   });

//   contents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });
// });


// const { app, BrowserWindow, shell } = require('electron');
// const { spawn } = require('child_process');
// const path = require('path');
// const http = require('http');
// const fs = require('fs');

// // Простая проверка режима разработки вместо electron-is-dev
// const isDev = process.env.NODE_ENV !== 'production';

// let mainWindow;
// let netlifyProcess;
// let scraperProcess;
// let staticServer;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       webSecurity: false,
//       allowRunningInsecureContent: true,
//       experimentalFeatures: true
//     },
//     icon: path.join(__dirname, 'assets/icon.png'),
//     show: false
//   });

//   const startUrl = 'http://localhost:8888';
//   mainWindow.loadURL(startUrl);

//   mainWindow.once('ready-to-show', () => {
//     mainWindow.show();
//     if (isDev) {
//       mainWindow.webContents.openDevTools();
//     }
//   });

//   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
//     if (url.startsWith('http://') || url.startsWith('https://')) {
//       if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
//         shell.openExternal(url);
//         return { action: 'deny' };
//       }
//     }
//     return { action: 'deny' };
//   });

//   mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });

//   mainWindow.webContents.on('new-window', (event, url) => {
//     event.preventDefault();
//     shell.openExternal(url);
//   });

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     killAllProcesses();
//   });
// }

// function killAllProcesses() {
//   if (netlifyProcess) {
//     netlifyProcess.kill();
//     netlifyProcess = null;
//   }
//   if (scraperProcess) {
//     scraperProcess.kill();
//     scraperProcess = null;
//   }
//   if (staticServer) {
//     staticServer.close();
//     staticServer = null;
//   }
// }

// function checkServerReady(port, maxAttempts = 30) {
//   return new Promise((resolve, reject) => {
//     let attempts = 0;
//     const checkServer = () => {
//       attempts++;
//       const req = http.get(`http://localhost:${port}`, (res) => {
//         console.log(`Server is ready on port ${port}`);
//         resolve(true);
//       });
//       req.on('error', (err) => {
//         if (attempts >= maxAttempts) {
//           console.error(`Server not ready after ${maxAttempts} attempts`);
//           reject(err);
//         } else {
//           console.log(`Attempt ${attempts}: Server not ready yet, retrying in 1 second...`);
//           setTimeout(checkServer, 1000);
//         }
//       });
//       req.setTimeout(1000, () => {
//         req.destroy();
//         if (attempts >= maxAttempts) {
//           reject(new Error('Server check timeout'));
//         } else {
//           setTimeout(checkServer, 1000);
//         }
//       });
//     };
//     checkServer();
//   });
// }

// async function startBackendServices() {
//   const serverPort = 8888;

//   if (isDev) {
//     // В режиме разработки запускаем netlify dev
//     console.log('Starting Netlify dev server...');
//     netlifyProcess = spawn('npx', ['netlify', 'dev'], {
//       cwd: process.cwd(),
//       stdio: 'inherit',
//       shell: true,
//       env: {
//         ...process.env,
//         BROWSER: 'none',
//         NODE_ENV: 'development'
//       }
//     });

//     netlifyProcess.on('error', (error) => {
//       console.error('Netlify process error:', error);
//     });
//   } else {
//     // В продакшене запускаем статический сервер
//     console.log('Starting static server...');
//     try {
//       const createStaticServer = require('./server/staticServer.cjs');
//       staticServer = createStaticServer(serverPort);
//     } catch (error) {
//       console.error('Failed to start static server:', error);
//       throw error;
//     }
//   }

//   // Ждем готовности сервера
//   try {
//     await checkServerReady(serverPort);
//     console.log('Web server is ready!');
//   } catch (error) {
//     console.error('Web server failed to start:', error);
//     throw error;
//   }

//   // Запускаем scraper после того как веб-сервер готов
//   console.log('Starting scraper...');
//   // Всегда используем относительный путь от __dirname
//   const scraperPath = path.join(__dirname, 'server', 'doffinScraper.js');
//   if (!fs.existsSync(scraperPath)) {
//     console.error(`Scraper file not found: ${scraperPath}`);
//     throw new Error(`Scraper file not found: ${scraperPath}`);
//   }

//   scraperProcess = spawn('node', [scraperPath], {
//     cwd: process.cwd(),
//     stdio: 'inherit',
//     shell: true
//   });

//   scraperProcess.on('error', (error) => {
//     console.error('Scraper process error:', error);
//   });
// }

// app.whenReady().then(async () => {
//   try {
//     console.log('Starting backend services...');
//     await startBackendServices();
//     console.log('Creating Electron window...');
//     createWindow();
//   } catch (error) {
//     console.error('Failed to start application:', error);
//     app.quit();
//   }
// });

// app.on('window-all-closed', () => {
//   killAllProcesses();
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// app.on('before-quit', () => {
//   killAllProcesses();
// });

// process.on('SIGINT', () => {
//   killAllProcesses();
//   process.exit();
// });

// process.on('SIGTERM', () => {
//   killAllProcesses();
//   process.exit();
// });

// app.on('web-contents-created', (event, contents) => {
//   contents.on('new-window', (event, navigationUrl) => {
//     event.preventDefault();
//     shell.openExternal(navigationUrl);
//   });

//   contents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });
// });


// const { app, BrowserWindow, shell } = require('electron');
// const { spawn } = require('child_process');
// const path = require('path');
// const http = require('http');

// // Простая проверка режима разработки вместо electron-is-dev
// //const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
// const isDev = process.env.NODE_ENV !== 'production';

// let mainWindow;
// let netlifyProcess;
// let scraperProcess;
// let staticServer;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       webSecurity: false, // Отключаем для работы с внешними API (emailjs)
//       allowRunningInsecureContent: true, // Разрешаем небезопасный контент для локальной разработки
//       experimentalFeatures: true
//     },
//     icon: path.join(__dirname, 'assets/icon.png'),
//     show: false // Не показываем окно пока не загрузится
//   });

//   const startUrl = 'http://localhost:8888';
  
//   mainWindow.loadURL(startUrl);

//   // Показываем окно только когда страница загрузилась
//   mainWindow.once('ready-to-show', () => {
//     mainWindow.show();
    
//     if (isDev) {
//       mainWindow.webContents.openDevTools();
//     }
//   });

//   // Обработка внешних ссылок - открываем в системном браузере
//   mainWindow.webContents.setWindowOpenHandler(({ url }) => {
//     // Если это внешняя ссылка (не localhost), открываем в браузере
//     if (url.startsWith('http://') || url.startsWith('https://')) {
//       if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
//         shell.openExternal(url);
//         return { action: 'deny' };
//       }
//     }
//     return { action: 'deny' };
//   });

//   // Обработка навигации - внешние ссылки в браузере
//   mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
    
//     // Если это внешняя ссылка, открываем в браузере
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });

//   // Обработка новых окон
//   mainWindow.webContents.on('new-window', (event, url) => {
//     event.preventDefault();
//     shell.openExternal(url);
//   });

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     killAllProcesses();
//   });
// }

// function killAllProcesses() {
//   if (netlifyProcess) {
//     netlifyProcess.kill();
//     netlifyProcess = null;
//   }
//   if (scraperProcess) {
//     scraperProcess.kill();
//     scraperProcess = null;
//   }
//   if (staticServer) {
//     staticServer.close();
//     staticServer = null;
//   }
// }

// // Функция для проверки готовности сервера
// function checkServerReady(port, maxAttempts = 30) {
//   return new Promise((resolve, reject) => {
//     let attempts = 0;
    
//     const checkServer = () => {
//       attempts++;
      
//       const req = http.get(`http://localhost:${port}`, (res) => {
//         console.log(`Server is ready on port ${port}`);
//         resolve(true);
//       });
      
//       req.on('error', (err) => {
//         if (attempts >= maxAttempts) {
//           console.error(`Server not ready after ${maxAttempts} attempts`);
//           reject(err);
//         } else {
//           console.log(`Attempt ${attempts}: Server not ready yet, retrying in 1 second...`);
//           setTimeout(checkServer, 1000);
//         }
//       });
      
//       req.setTimeout(1000, () => {
//         req.destroy();
//         if (attempts >= maxAttempts) {
//           reject(new Error('Server check timeout'));
//         } else {
//           setTimeout(checkServer, 1000);
//         }
//       });
//     };
    
//     checkServer();
//   });
// }

// async function startBackendServices() {
//   const serverPort = 8888;
  
//   if (isDev) {
//     // В режиме разработки запускаем netlify dev
//     console.log('Starting Netlify dev server...');
//     netlifyProcess = spawn('npx', ['netlify', 'dev'], {
//       cwd: process.cwd(),
//       stdio: 'inherit',
//       shell: true,
//       env: {
//         ...process.env,
//         // Добавляем переменные окружения для лучшей работы с CORS
//         BROWSER: 'none', // Предотвращаем автоматическое открытие браузера
//         NODE_ENV: 'development'
//       }
//     });

//     netlifyProcess.on('error', (error) => {
//       console.error('Netlify process error:', error);
//     });
//   } else {
//     // В продакшене запускаем статический сервер
//     console.log('Starting static server...');
//     try {
//       const createStaticServer = require('./server/staticServer.cjs');
//       staticServer = createStaticServer(serverPort);
//     } catch (error) {
//       console.error('Failed to start static server:', error);
//       throw error;
//     }
//   }

//   // Ждем готовности сервера
//   try {
//     await checkServerReady(serverPort);
//     console.log('Web server is ready!');
//   } catch (error) {
//     console.error('Web server failed to start:', error);
//     throw error;
//   }

//   // Запускаем scraper после того как веб-сервер готов
//   console.log('Starting scraper...');
//   const scraperPath = isDev 
//     ? path.join('server', 'doffinScraper.js')
//     : path.join(process.resourcesPath, 'server', 'doffinScraper.js');
    
//   scraperProcess = spawn('node', [scraperPath], {
//     cwd: process.cwd(),
//     stdio: 'inherit',
//     shell: true
//   });

//   scraperProcess.on('error', (error) => {
//     console.error('Scraper process error:', error);
//   });
// }

// app.whenReady().then(async () => {
//   try {
//     console.log('Starting backend services...');
//     await startBackendServices();
    
//     console.log('Creating Electron window...');
//     createWindow();
//   } catch (error) {
//     console.error('Failed to start application:', error);
//     app.quit();
//   }
// });

// app.on('window-all-closed', () => {
//   killAllProcesses();
  
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// // Обработка завершения приложения
// app.on('before-quit', () => {
//   killAllProcesses();
// });

// // Обработка SIGINT
// process.on('SIGINT', () => {
//   killAllProcesses();
//   process.exit();
// });

// // Обработка других сигналов завершения
// process.on('SIGTERM', () => {
//   killAllProcesses();
//   process.exit();
// });

// // Глобальная обработка внешних ссылок
// app.on('web-contents-created', (event, contents) => {
//   contents.on('new-window', (event, navigationUrl) => {
//     event.preventDefault();
//     shell.openExternal(navigationUrl);
//   });
  
//   contents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl);
    
//     // Разрешаем навигацию только внутри нашего приложения
//     if (parsedUrl.origin !== 'http://localhost:8888') {
//       event.preventDefault();
//       shell.openExternal(navigationUrl);
//     }
//   });
// });


// const { app, BrowserWindow } = require('electron');
// const { spawn } = require('child_process');
// const path = require('path');

// // Простая проверка режима разработки вместо electron-is-dev
// const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// let mainWindow;
// let netlifyProcess;
// let scraperProcess;
// let staticServer;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false
//     },
//     icon: path.join(__dirname, 'assets/icon.png')
//   });

//   // В режиме разработки загружаем localhost, в продакшене - тоже localhost но со статическим сервером
//   const startUrl = 'http://localhost:8888';
  
//   mainWindow.loadURL(startUrl);

//   if (isDev) {
//     mainWindow.webContents.openDevTools();
//   }

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     // Убиваем все дочерние процессы при закрытии окна
//     killAllProcesses();
//   });
// }

// function killAllProcesses() {
//   if (netlifyProcess) {
//     netlifyProcess.kill();
//     netlifyProcess = null;
//   }
//   if (scraperProcess) {
//     scraperProcess.kill();
//     scraperProcess = null;
//   }
//   if (staticServer) {
//     staticServer.close();
//     staticServer = null;
//   }
// }

// async function startBackendServices() {
//   if (isDev) {
//     // В режиме разработки запускаем netlify dev (как в вашем оригинальном скрипте)
//     netlifyProcess = spawn('npx', ['netlify', 'dev'], {
//       cwd: process.cwd(),
//       stdio: 'inherit', // Используем inherit как в оригинале для лучшего отображения логов
//       shell: true
//     });

//     netlifyProcess.on('error', (error) => {
//       console.error('Netlify process error:', error);
//     });
//   } else {
//     // В продакшене запускаем статический сервер
//     try {
//       const createStaticServer = require('./server/staticServer.cjs');
//       staticServer = createStaticServer(8888);
//     } catch (error) {
//       console.error('Failed to start static server:', error);
//     }
//   }

//   // Запускаем scraper (и в dev, и в prod режиме) - как в вашем оригинальном скрипте
//   const scraperPath = isDev 
//     ? path.join('server', 'doffinScraper.js')
//     : path.join(process.resourcesPath, 'server', 'doffinScraper.js');
    
//   scraperProcess = spawn('node', [scraperPath], {
//     cwd: process.cwd(),
//     stdio: 'inherit', // Используем inherit как в оригинале
//     shell: true
//   });

//   scraperProcess.on('error', (error) => {
//     console.error('Scraper process error:', error);
//   });
// }

// app.whenReady().then(async () => {
//   await startBackendServices();
  
//   // Даем время серверам запуститься (как в вашем оригинальном скрипте - 3 секунды)
//   setTimeout(() => {
//     createWindow();
//   }, 3000);
// });

// app.on('window-all-closed', () => {
//   killAllProcesses();
  
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// // Обработка завершения приложения (как в вашем оригинальном скрипте)
// app.on('before-quit', () => {
//   killAllProcesses();
// });

// // Обработка SIGINT (как в вашем оригинальном скрипте)
// process.on('SIGINT', () => {
//   killAllProcesses();
//   process.exit();
// });

// // Обработка других сигналов завершения
// process.on('SIGTERM', () => {
//   killAllProcesses();
//   process.exit();
// });


// const { app, BrowserWindow } = require('electron');
// const { spawn } = require('child_process');
// const path = require('path');
// const isDev = require('electron-is-dev');

// let mainWindow;
// let netlifyProcess;
// let scraperProcess;
// let staticServer;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false
//     },
//     icon: path.join(__dirname, 'assets/icon.png')
//   });

//   // В режиме разработки загружаем localhost, в продакшене - тоже localhost но со статическим сервером
//   const startUrl = 'http://localhost:8888';
  
//   mainWindow.loadURL(startUrl);

//   if (isDev) {
//     mainWindow.webContents.openDevTools();
//   }

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     // Убиваем все дочерние процессы при закрытии окна
//     killAllProcesses();
//   });
// }

// function killAllProcesses() {
//   if (netlifyProcess) {
//     netlifyProcess.kill();
//     netlifyProcess = null;
//   }
//   if (scraperProcess) {
//     scraperProcess.kill();
//     scraperProcess = null;
//   }
//   if (staticServer) {
//     staticServer.close();
//     staticServer = null;
//   }
// }

// function startBackendServices() {
//   if (isDev) {
//     // В режиме разработки запускаем netlify dev (как в вашем оригинальном скрипте)
//     netlifyProcess = spawn('npx', ['netlify', 'dev'], {
//       cwd: process.cwd(),
//       stdio: 'inherit', // Используем inherit как в оригинале для лучшего отображения логов
//       shell: true
//     });

//     netlifyProcess.on('error', (error) => {
//       console.error('Netlify process error:', error);
//     });
//   } else {
//     // В продакшене запускаем статический сервер
//     try {
//       const createStaticServer = require('./server/staticServer');
//       staticServer = createStaticServer(8888);
//     } catch (error) {
//       console.error('Failed to start static server:', error);
//     }
//   }

//   // Запускаем scraper (и в dev, и в prod режиме) - как в вашем оригинальном скрипте
//   const scraperPath = isDev 
//     ? path.join('server', 'doffinScraper.js')
//     : path.join(process.resourcesPath, 'server', 'doffinScraper.js');
    
//   scraperProcess = spawn('node', [scraperPath], {
//     cwd: process.cwd(),
//     stdio: 'inherit', // Используем inherit как в оригинале
//     shell: true
//   });

//   scraperProcess.on('error', (error) => {
//     console.error('Scraper process error:', error);
//   });
// }

// app.whenReady().then(() => {
//   startBackendServices();
  
//   // Даем время серверам запуститься (как в вашем оригинальном скрипте - 3 секунды)
//   setTimeout(() => {
//     createWindow();
//   }, 3000);
// });

// app.on('window-all-closed', () => {
//   killAllProcesses();
  
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// // Обработка завершения приложения (как в вашем оригинальном скрипте)
// app.on('before-quit', () => {
//   killAllProcesses();
// });

// // Обработка SIGINT (как в вашем оригинальном скрипте)
// process.on('SIGINT', () => {
//   killAllProcesses();
//   process.exit();
// });

// // Обработка других сигналов завершения
// process.on('SIGTERM', () => {
//   killAllProcesses();
//   process.exit();
// });