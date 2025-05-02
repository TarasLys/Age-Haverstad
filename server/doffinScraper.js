import puppeteer from 'puppeteer';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4003;

app.use(cors());
app.use(express.json());

app.post('/api/notices/doffin-scrape', async (req, res) => {
  const { from, to, location } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
  }

  // Если регион не передан, используем стандартное значение
  const loc = location || 'NO020';

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Формируем базовый URL с выбранным диапазоном дат и регионом
    const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}&location=${loc}`;
    const tenders = [];
    let pageNumber = 1;

    // Функция автоскроллинга
    async function autoScroll(page) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
    }

    // Функция извлечения тендеров со страницы с дополнительными полями
    const extractTenders = async () => {
      return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
        items.map(item => {
          const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
          const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();

          // Извлечение ссылки и преобразование в абсолютный URL, если ссылка относительная
          const rawLink = item.querySelector('a')?.getAttribute('href');
          const link = rawLink && rawLink.startsWith('/') ? `https://www.doffin.no${rawLink}` : rawLink;

          const dateElement = item.querySelector('p._issue_date_1lwtt_54') || 
                              item.querySelector('p.альтернативный_класс');
          const publicationDate = dateElement
            ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
            : null;
          
          // Обновлённое поле oppdragsgiver: объединяем все элементы с классом _buyer_1lwtt_16
          const buyerElements = item.querySelectorAll('p._buyer_1lwtt_16');
          const buyer = (buyerElements && buyerElements.length > 0)
            ? Array.from(buyerElements).map(el => el.textContent.trim()).join(" | ")
            : null;
          
          // Дополнительные поля: тип объявления (первый чип) и подтип (второй чип, если есть)
          const chipElements = item.querySelectorAll('div._chipline_1gf9m_1 > p');
          let typeAnnouncement = null;
          let announcementSubtype = null;
          if (chipElements && chipElements.length > 0) {
            typeAnnouncement = chipElements[0].textContent.trim();
            if (chipElements.length > 1) {
              announcementSubtype = chipElements[1].textContent.trim();
            }
          }
          
          // Дополнительное поле: location (из aria-label элемента _location_1lwtt_52)
          const locationEl = item.querySelector('p._location_1lwtt_52');
          let locText = null;
          if (locationEl) {
            const ariaLabel = locationEl.getAttribute('aria-label');
            locText = ariaLabel 
              ? ariaLabel.replace("Sted for gjennomføring:", "").trim() 
              : locationEl.textContent.trim();
          }
          
          // Дополнительное поле: estValue (estimert verdi)
          const estValue = item.querySelector('p._est_value_1lwtt_53')?.textContent.trim() || null;
          
          // Дополнительное поле: deadline (если оно присутствует)
          const deadlineEl = item.querySelector('p[aria-label^="Frist"]');
          const deadline = deadlineEl
            ? (deadlineEl.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
            : null;
          
          // Дополнительное поле: eoes – извлекаем информацию из abbr с title, содержащим "Kunngjort i EØS"
          const eoesEl = item.querySelector('abbr[title*="Kunngjort i EØS"]');
          const eoes = eoesEl ? eoesEl.getAttribute('title') : null;

          console.log("Найден тендер:", title, "Дата:", publicationDate);
          return { 
            title, 
            description, 
            link, 
            publicationDate, 
            buyer, 
            typeAnnouncement, 
            announcementSubtype,
            location: locText, 
            estValue,
            deadline,
            eoes
          };
        })
      );
    };

    // Цикл для прохода по страницам, пока есть данные
    while (true) {
      const pageUrl = `${baseUrl}&page=${pageNumber}`;
      console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
        console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
        break;
      }
      
      try {
        await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
      } catch {
        console.log(`На странице ${pageNumber} нужный селектор не найден. Данные, видимо, закончились.`);
        break;
      }
      
      await autoScroll(page);
      const newTenders = await extractTenders();
      console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

      if (newTenders.length === 0) {
        console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
        break;
      }

      tenders.push(...newTenders);
      pageNumber++;
    }

    await browser.close();
    console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

    // Фильтрация по диапазону дат (на случай, если сайт возвращает записи за пределами нужного диапазона)
    const filteredTenders = tenders.filter(tender => {
      if (!tender.publicationDate) return false;
      const parts = tender.publicationDate.split('.');
      if (parts.length !== 3) return false;
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const tenderDate = new Date(formattedDate);
      return tenderDate >= new Date(from) && tenderDate <= new Date(to);
    });

    console.log("Все тендеры после фильтрации:", filteredTenders);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ results: filteredTenders });
  } catch (error) {
    console.error('Ошибка при скрапинге данных:', error);
    res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});


// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to, location } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   // Если регион не передан, используем стандартное значение
//   const loc = location || 'NO020';

//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Формируем базовый URL с выбранным диапазоном дат и регионом
//     const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}&location=${loc}`;
//     const tenders = [];
//     let pageNumber = 1;

//     // Функция автоскроллинга
//     async function autoScroll(page) {
//       await page.evaluate(async () => {
//         await new Promise((resolve) => {
//           let totalHeight = 0;
//           const distance = 100;
//           const timer = setInterval(() => {
//             const scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;
//             if (totalHeight >= scrollHeight) {
//               clearInterval(timer);
//               resolve();
//             }
//           }, 200);
//         });
//       });
//     }

//     // Функция извлечения тендеров со страницы с дополнительными полями
//     const extractTenders = async () => {
//       return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
//         items.map(item => {
//           const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//           const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//           const link = item.querySelector('a')?.getAttribute('href');
//           const dateElement = item.querySelector('p._issue_date_1lwtt_54') || item.querySelector('p.альтернативный_класс');
//           const publicationDate = dateElement
//             ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
          
//           // Обновлённое поле oppdragsgiver: объединяем все элементы с классом _buyer_1lwtt_16
//           const buyerElements = item.querySelectorAll('p._buyer_1lwtt_16');
//           const buyer = (buyerElements && buyerElements.length > 0)
//             ? Array.from(buyerElements).map(el => el.textContent.trim()).join(" | ")
//             : null;
          
//           // Дополнительные поля: тип объявления (первый чип) и подтип (второй чип, если есть)
//           const chipElements = item.querySelectorAll('div._chipline_1gf9m_1 > p');
//           let typeAnnouncement = null;
//           let announcementSubtype = null;
//           if (chipElements && chipElements.length > 0) {
//             typeAnnouncement = chipElements[0].textContent.trim();
//             if (chipElements.length > 1) {
//               announcementSubtype = chipElements[1].textContent.trim();
//             }
//           }
          
//           // Дополнительное поле: location (из aria-label элемента _location_1lwtt_52)
//           const locationEl = item.querySelector('p._location_1lwtt_52');
//           let locText = null;
//           if (locationEl) {
//             const ariaLabel = locationEl.getAttribute('aria-label');
//             locText = ariaLabel ? ariaLabel.replace("Sted for gjennomføring:", "").trim() : locationEl.textContent.trim();
//           }
          
//           // Дополнительное поле: estValue (estimert verdi)
//           const estValue = item.querySelector('p._est_value_1lwtt_53')?.textContent.trim() || null;
          
//           // Дополнительное поле: deadline (если оно присутствует)
//           const deadlineEl = item.querySelector('p[aria-label^="Frist"]');
//           const deadline = deadlineEl
//             ? (deadlineEl.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
          
//           // Дополнительное поле: eoes – извлекаем информацию из abbr с title, содержащим "Kunngjort i EØS"
//           const eoesEl = item.querySelector('abbr[title*="Kunngjort i EØS"]');
//           const eoes = eoesEl ? eoesEl.getAttribute('title') : null;

//           console.log("Найден тендер:", title, "Дата:", publicationDate);
//           return { 
//             title, 
//             description, 
//             link, 
//             publicationDate, 
//             buyer, 
//             typeAnnouncement, 
//             announcementSubtype,
//             location: locText, 
//             estValue,
//             deadline,
//             eoes
//           };
//         })
//       );
//     };

//     // Цикл для прохода по страницам, пока есть данные
//     while (true) {
//       const pageUrl = `${baseUrl}&page=${pageNumber}`;
//       console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
//       await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
//       if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
//         console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
//         break;
//       }
      
//       try {
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
//       } catch {
//         console.log(`На странице ${pageNumber} нужный селектор не найден. Данные, видимо, закончились.`);
//         break;
//       }
      
//       await autoScroll(page);
//       const newTenders = await extractTenders();
//       console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

//       if (newTenders.length === 0) {
//         console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
//         break;
//       }

//       tenders.push(...newTenders);
//       pageNumber++;
//     }

//     await browser.close();
//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по диапазону дат (на случай, если сайт возвращает записи за пределами нужного диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) return false;
//       const parts = tender.publicationDate.split('.');
//       if (parts.length !== 3) return false;
//       const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       const tenderDate = new Date(formattedDate);
//       return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//     });

//     console.log("Все тендеры после фильтрации:", filteredTenders);
//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });



// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to, location } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   // Если регион не передан, используем стандартное значение
//   const loc = location || 'NO020';

//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Формируем базовый URL с выбранным диапазоном дат и регионом
//     const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}&location=${loc}`;
//     const tenders = [];
//     let pageNumber = 1;

//     // Функция автоскроллинга
//     async function autoScroll(page) {
//       await page.evaluate(async () => {
//         await new Promise((resolve) => {
//           let totalHeight = 0;
//           const distance = 100;
//           const timer = setInterval(() => {
//             const scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;
//             if (totalHeight >= scrollHeight) {
//               clearInterval(timer);
//               resolve();
//             }
//           }, 200);
//         });
//       });
//     }

//     // Функция извлечения тендеров со страницы с дополнительными полями
//     const extractTenders = async () => {
//       return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
//         items.map(item => {
//           const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//           const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//           const link = item.querySelector('a')?.getAttribute('href');
//           const dateElement = item.querySelector('p._issue_date_1lwtt_54') || item.querySelector('p.альтернативный_класс');
//           const publicationDate = dateElement
//             ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
          
//           // Дополнительное поле: buyer (Oppdragsgiver)
//           const buyer = item.querySelector('p._buyer_1lwtt_16')?.textContent.trim() || null;
          
//           // Дополнительные поля: тип объявления (первый чип) и подтип (второй чип, если есть)
//           const chipElements = item.querySelectorAll('div._chipline_1gf9m_1 > p');
//           let typeAnnouncement = null;
//           let announcementSubtype = null;
//           if (chipElements && chipElements.length > 0) {
//             typeAnnouncement = chipElements[0].textContent.trim();
//             if (chipElements.length > 1) {
//               announcementSubtype = chipElements[1].textContent.trim();
//             }
//           }
          
//           // Дополнительное поле: location (из aria-label элемента _location_1lwtt_52)
//           const locationEl = item.querySelector('p._location_1lwtt_52');
//           let locText = null;
//           if (locationEl) {
//             const ariaLabel = locationEl.getAttribute('aria-label');
//             locText = ariaLabel ? ariaLabel.replace("Sted for gjennomføring:", "").trim() : locationEl.textContent.trim();
//           }
          
//           // Дополнительное поле: estValue (estimert verdi)
//           const estValue = item.querySelector('p._est_value_1lwtt_53')?.textContent.trim() || null;
          
//           // Дополнительное поле: deadline (если оно присутствует)
//           const deadlineEl = item.querySelector('p[aria-label^="Frist"]');
//           const deadline = deadlineEl
//             ? (deadlineEl.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
          
//           // Дополнительное поле: eoes – извлекаем информацию из abbr с title, содержащим "Kunngjort i EØS"
//           const eoesEl = item.querySelector('abbr[title*="Kunngjort i EØS"]');
//           const eoes = eoesEl ? eoesEl.getAttribute('title') : null;

//           console.log("Найден тендер:", title, "Дата:", publicationDate);
//           return { 
//             title, 
//             description, 
//             link, 
//             publicationDate, 
//             buyer, 
//             typeAnnouncement, 
//             announcementSubtype,
//             location: locText, 
//             estValue,
//             deadline,
//             eoes
//           };
//         })
//       );
//     };

//     // Цикл для прохода по страницам, пока есть данные
//     while (true) {
//       const pageUrl = `${baseUrl}&page=${pageNumber}`;
//       console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
//       await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
//       if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
//         console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
//         break;
//       }
      
//       try {
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
//       } catch {
//         console.log(`На странице ${pageNumber} нужный селектор не найден. Данные, видимо, закончились.`);
//         break;
//       }
      
//       await autoScroll(page);
//       const newTenders = await extractTenders();
//       console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

//       if (newTenders.length === 0) {
//         console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
//         break;
//       }

//       tenders.push(...newTenders);
//       pageNumber++;
//     }

//     await browser.close();
//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по диапазону дат (на случай, если сайт возвращает записи за пределами нужного диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) return false;
//       const parts = tender.publicationDate.split('.');
//       if (parts.length !== 3) return false;
//       const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       const tenderDate = new Date(formattedDate);
//       return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//     });

//     console.log("Все тендеры после фильтрации:", filteredTenders);
//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });



// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to, location } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   // Если регион (location) не передан, используем стандартное значение
//   const loc = location || 'NO020';

//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Формируем базовый URL с выбранным диапазоном дат и регионом
//     const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}&location=${loc}`;
//     const tenders = [];
//     let pageNumber = 1;

//     // Функция автоскроллинга
//     async function autoScroll(page) {
//       await page.evaluate(async () => {
//         await new Promise((resolve) => {
//           let totalHeight = 0;
//           const distance = 100;
//           const timer = setInterval(() => {
//             const scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;
//             if (totalHeight >= scrollHeight) {
//               clearInterval(timer);
//               resolve();
//             }
//           }, 200);
//         });
//       });
//     }

//     // Функция извлечения тендеров со страницы – добавлены дополнительные поля:
//     // buyer (oppdragsgiver), announcementType (состав из chip-элементов),
//     // location (из aria-label элемента с классом _location_1lwtt_52)
//     // и estValue (из элемента с классом _est_value_1lwtt_53).
//     const extractTenders = async () => {
//       return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
//         items.map(item => {
//           const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//           const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//           const link = item.querySelector('a')?.href;
//           const dateElement =
//             item.querySelector('p._issue_date_1lwtt_54') ||
//             item.querySelector('p.альтернативный_класс');
//           const publicationDate = dateElement
//             ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;

//           // Дополнительное поле: oppdragsgiver (buyer)
//           const buyer = item.querySelector('p._buyer_1lwtt_16')?.textContent.trim() || null;
//           // Дополнительное поле: announcementType (объединяем все чип-элементы)
//           const chipElements = item.querySelectorAll('div._chipline_1gf9m_1 > p');
//           const announcementType = chipElements.length > 0
//             ? Array.from(chipElements).map(chip => chip.textContent.trim()).join(', ')
//             : null;
//           // Дополнительное поле: location (из aria-label элемента _location_1lwtt_52)
//           const locationEl = item.querySelector('p._location_1lwtt_52');
//           let locText = null;
//           if (locationEl) {
//             const ariaLabel = locationEl.getAttribute('aria-label');
//             locText = ariaLabel ? ariaLabel.replace("Sted for gjennomføring:", "").trim() : locationEl.textContent.trim();
//           }
//           // Дополнительное поле: оценочная стоимость (estValue)
//           const estValue = item.querySelector('p._est_value_1lwtt_53')?.textContent.trim() || null;

//           console.log("Найден тендер:", title, "Дата:", publicationDate);
//           return { title, description, link, publicationDate, buyer, announcementType, location: locText, estValue };
//         })
//       );
//     };

//     // Цикл для прохода по страницам, пока есть данные
//     while (true) {
//       const pageUrl = `${baseUrl}&page=${pageNumber}`;
//       console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
//       await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
//       // Если запрашиваем не первую страницу, проверяем, что URL содержит нужный номер страницы.
//       if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
//         console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
//         break;
//       }
      
//       try {
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
//       } catch {
//         console.log(`На странице ${pageNumber} нужный селектор не найден. Данные, видимо, закончились.`);
//         break;
//       }
      
//       await autoScroll(page);
//       const newTenders = await extractTenders();
//       console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

//       if (newTenders.length === 0) {
//         console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
//         break;
//       }

//       tenders.push(...newTenders);
//       pageNumber++;
//     }

//     await browser.close();
//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по диапазону дат (на случай, если сайт возвращает записи за пределами нужного диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) return false;
//       const parts = tender.publicationDate.split('.');
//       if (parts.length !== 3) return false;
//       const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       const tenderDate = new Date(formattedDate);
//       return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//     });

//     console.log("Все тендеры после фильтрации:", filteredTenders);
//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });




//РАБОЧИЙ ФАЙЛ С ПАГИНАЦИЕЙ И ПО РЕГИОНУ// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to, location } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   // Если регион (location) не передан, используем стандартное значение
//   const loc = location || 'NO020';

//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Формируем базовый URL с выбранным диапазоном дат и регионом
//     const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}&location=${loc}`;
//     const tenders = [];
//     let pageNumber = 1;

//     // Функция автоскроллинга
//     async function autoScroll(page) {
//       await page.evaluate(async () => {
//         await new Promise((resolve) => {
//           let totalHeight = 0;
//           const distance = 100;
//           const timer = setInterval(() => {
//             const scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;
//             if (totalHeight >= scrollHeight) {
//               clearInterval(timer);
//               resolve();
//             }
//           }, 200);
//         });
//       });
//     }

//     // Функция извлечения тендеров со страницы
//     const extractTenders = async () => {
//       return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
//         items.map(item => {
//           const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//           const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//           const link = item.querySelector('a')?.href;
//           const dateElement =
//             item.querySelector('p._issue_date_1lwtt_54') ||
//             item.querySelector('p.альтернативный_класс');
//           const publicationDate = dateElement
//             ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
//           console.log("Найден тендер:", title, "Дата:", publicationDate);
//           return { title, description, link, publicationDate };
//         })
//       );
//     };

//     // Цикл для прохода по страницам, пока есть данные
//     while (true) {
//       const pageUrl = `${baseUrl}&page=${pageNumber}`;
//       console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
//       await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
//       // Если запрашиваем не первую страницу, проверяем, что URL содержит нужный номер страницы.
//       if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
//         console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
//         break;
//       }
      
//       try {
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
//       } catch {
//   console.log(`На странице ${pageNumber} нужный селектор не найден. Данные, видимо, закончились.`);
//   break;
// }

//       await autoScroll(page);
//       const newTenders = await extractTenders();
//       console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

//       if (newTenders.length === 0) {
//         console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
//         break;
//       }

//       tenders.push(...newTenders);
//       pageNumber++;
//     }

//     await browser.close();
//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по диапазону дат (на случай, если сайт возвращает записи за пределами нужного диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) return false;
//       const parts = tender.publicationDate.split('.');
//       if (parts.length !== 3) return false;
//       const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       const tenderDate = new Date(formattedDate);
//       return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//     });

//     console.log("Все тендеры после фильтрации:", filteredTenders);
//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });




//РАБОЧИЙ КОД С ПАГИНАЦИЕЙ// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to } = req.body;
//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     // Формируем базовый URL без номера страницы
//     const baseUrl = `https://www.doffin.no/search?searchString=45000000&fromDate=${from}&toDate=${to}`;
//     const tenders = [];
//     let pageNumber = 1;

//     // Функция автоскроллинга до конца страницы
//     async function autoScroll(page) {
//       await page.evaluate(async () => {
//         await new Promise(resolve => {
//           let totalHeight = 0;
//           const distance = 100;
//           const timer = setInterval(() => {
//             const scrollHeight = document.body.scrollHeight;
//             window.scrollBy(0, distance);
//             totalHeight += distance;
//             if(totalHeight >= scrollHeight){
//               clearInterval(timer);
//               resolve();
//             }
//           }, 200);
//         });
//       });
//     }

//     // Функция извлечения тендеров со страницы
//     const extractTenders = async () => {
//       return await page.$$eval('ul._result_list_dx2u4_58 > li', items =>
//         items.map(item => {
//           const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//           const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//           const link = item.querySelector('a')?.href;
//           const dateElement =
//             item.querySelector('p._issue_date_1lwtt_54') ||
//             item.querySelector('p.альтернативный_класс');
//           const publicationDate = dateElement
//             ? (dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0]
//             : null;
//           console.log("Найден тендер:", title, "Дата:", publicationDate);
//           return { title, description, link, publicationDate };
//         })
//       );
//     };

//     while (true) {
//       const pageUrl = `${baseUrl}&page=${pageNumber}`;
//       console.log(`Загрузка страницы ${pageNumber}: ${pageUrl}`);
//       await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
//       // Если мы переходим не на страницу 1, проверяем, что URL содержит ожидаемый номер страницы.
//       if (pageNumber > 1 && !page.url().includes(`page=${pageNumber}`)) {
//         console.log(`Ожидаемая страница ${pageNumber} не открылась (текущий URL: ${page.url()}). Завершаем цикл.`);
//         break;
//       }
      
//       // Пытаемся дождаться селектора тендеров, если его нет – прекращаем цикл.
//       try {
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li', { timeout: 15000 });
//       } catch (e) {
//     console.log(`На странице ${pageNumber} нет нужного селектора — возможно, мы достигли конца страниц. Ошибка: ${e.message}`);
//     break;
// }
      
//       await autoScroll(page);
//       const newTenders = await extractTenders();
//       console.log(`Найдено тендеров на странице ${pageNumber}: ${newTenders.length}`);

//       // Если никаких записей не найдено, прерываем цикл.
//       if (newTenders.length === 0) {
//         console.log("На текущей странице данных больше нет, завершаем цикл пагинации.");
//         break;
//       }
      
//       tenders.push(...newTenders);
//       pageNumber++;
//     }

//     await browser.close();
//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по диапазону дат (на случай, если сайт возвращает записи вне выбранного диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) return false;
//       const parts = tender.publicationDate.split('.');
//       if (parts.length !== 3) return false;
//       const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       const tenderDate = new Date(formattedDate);
//       return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//     });
    
//     console.log("Все тендеры после фильтрации:", filteredTenders);
//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });










//рабочий код без пагинации // import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//   const { from, to } = req.body;

//   if (!from || !to) {
//     return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//   }

//   try {
//     // Можно запустить headless: false для отладки; затем перевести в true (или убрать параметр)
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     let pageNumber = 1;
//     const tenders = [];

//     while (true) {
//       // Встраиваем параметры дат в URL
//       const url = `https://www.doffin.no/search?searchString=45000000&page=${pageNumber}&fromDate=${from}&toDate=${to}`;
//       console.log(`Загрузка страницы: ${url}`);

//       try {
//         await page.goto(url, {
//           waitUntil: 'networkidle2',
//           timeout: 60000
//         });

//         // Ждем появления списка тендеров
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li');

//         // Прокручиваем страницу вниз, чтобы подгрузить все записи
//         let previousHeight = 0;
//         while (true) {
//           previousHeight = await page.evaluate(() => document.body.scrollHeight);
//           await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
//           await new Promise(resolve => setTimeout(resolve, 2000));  // ожидание 2 секунды
//           let newHeight = await page.evaluate(() => document.body.scrollHeight);
//           if (newHeight === previousHeight) break;
//         }

//         // Извлекаем все тендеры со страницы
//         const newTenders = await page.$$eval('ul._result_list_dx2u4_58 > li', items => {
//           return items.map(item => {
//             const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//             const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//             const link = item.querySelector('a')?.href;
//             // Если класс изменился для старых тендеров, можно добавить альтернативный селектор
//             const dateElement = item.querySelector('p._issue_date_1lwtt_54') || item.querySelector('p.альтернативный_класс');
//             // Извлекаем дату по регулярному выражению в формате DD.MM.YYYY
//             const publicationDate = dateElement ? dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/)?.[0] : null;

//             console.log("Найден тендер:", title, "Дата:", publicationDate);
//             return { title, description, link, publicationDate };
//           });
//         });

//         if (newTenders.length === 0) {
//           console.log("Нет новых тендеров на странице, завершаем обработку.");
//           break;
//         }
//         tenders.push(...newTenders);
//         pageNumber++;

//         // Проверка наличия кнопки "Следующая страница"
//         const hasNextPage = await page.evaluate(() => {
//           // Обычно на сайте есть кнопка с aria-label или текстом "Neste"
//           const nextButton = document.querySelector('a[aria-label="Neste side"]');
//           return nextButton !== null;
//         });

//         if (!hasNextPage) {
//           console.log("Достигли последней страницы, останавливаем сбор данных.");
//           break;
//         }
//       } catch (error) {
//         console.error(`Ошибка загрузки страницы ${pageNumber}:`, error);
//         break;
//       }
//     }

//     await browser.close();

//     console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//     // Фильтрация по дате (на случай, если сайт вернул записи не в рамках диапазона)
//     const filteredTenders = tenders.filter(tender => {
//       if (!tender.publicationDate) {
//         console.warn("Нет даты публикации у тендера:", tender.title);
//         return false;
//       }

//       const parts = tender.publicationDate.split('.');
//       if (parts.length === 3) {
//         const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//         const tenderDate = new Date(formattedDate);
//         console.log("Преобразованная дата:", formattedDate, "Объект даты:", tenderDate);
//         return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//       }
//       return false;
//     });

//     console.log("Все тендеры ПОСЛЕ фильтрации:", filteredTenders);

//     res.setHeader('Cache-Control', 'no-store');
//     res.status(200).json({ results: filteredTenders });
//   } catch (error) {
//     console.error('Ошибка при скрапинге данных:', error);
//     res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Сервер запущен на http://localhost:${PORT}`);
// });





// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//     const { from, to } = req.body;

//     if (!from || !to) {
//         return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//     }

//     try {
//         const browser = await puppeteer.launch({ headless: false });
//         const page = await browser.newPage();

//         let pageNumber = 1;
//         const tenders = [];

//         while (true) {
//             console.log(`Загрузка страницы: https://www.doffin.no/search?searchString=45000000&page=${pageNumber}`);

//             try {
//                 await page.goto(`https://www.doffin.no/search?searchString=45000000&page=${pageNumber}`, { 
//                     waitUntil: 'networkidle2',
//                     timeout: 60000
//                 });

//                 await page.waitForSelector('ul._result_list_dx2u4_58 > li');
                
//                 // Прокрутка страницы для загрузки всех тендеров
//                 let previousHeight = 0;
//                 while (true) {
//                     previousHeight = await page.evaluate(() => document.body.scrollHeight);
//                     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
//                     await new Promise(resolve => setTimeout(resolve, 2000)); // Заменяем page.waitForTimeout
//                     let newHeight = await page.evaluate(() => document.body.scrollHeight);
//                     if (newHeight === previousHeight) break;
//                 }

//                 const newTenders = await page.$$eval('ul._result_list_dx2u4_58 > li', items => {
//                     return items.map(item => {
//                         const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//                         const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//                         const link = item.querySelector('a')?.href;
//                         const dateElement = item.querySelector('p._issue_date_1lwtt_54') || item.querySelector('p.альтернативный_класс');
//                         const publicationDate = dateElement ? dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/)?.[0] : null;

//                         console.log("Найден тендер:", title, "Дата:", publicationDate);

//                         return { title, description, link, publicationDate };
//                     });
//                 });

//                 if (newTenders.length === 0) {
//                     console.log("Нет новых тендеров, завершаем обработку.");
//                     break; // Если новых записей нет, завершаем цикл
//                 }
//                 tenders.push(...newTenders);
//                 pageNumber++;
//             } catch (error) {
//                 console.error(`Ошибка загрузки страницы ${pageNumber}:`, error);
//                 break;
//             }
//         }

//         await browser.close();

//         console.log("Все извлеченные тендеры ДО фильтрации:", tenders);

//         // Фильтрация по дате
//         const filteredTenders = tenders.filter(tender => {
//             if (!tender.publicationDate) {
//                 console.warn("Нет даты публикации у тендера:", tender.title);
//                 return false;
//             }

//             const parts = tender.publicationDate.split('.');
//             if (parts.length === 3) {
//                 const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//                 const tenderDate = new Date(formattedDate);

//                 console.log("Преобразованная дата:", formattedDate, "Объект даты:", tenderDate);
            
//                 return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//             }

//             return false;
//         });

//         console.log("Все тендеры ПОСЛЕ фильтрации:", filteredTenders);

//         res.setHeader('Cache-Control', 'no-store');
//         res.status(200).json({ results: filteredTenders });

//     } catch (error) {
//         console.error('Ошибка при скрапинге данных:', error);
//         res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Сервер запущен на http://localhost:${PORT}`);
// });





// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// // Маршрут для обработки запросов скрапинга Doffin
// app.post('/api/notices/doffin-scrape', async (req, res) => {
//     try {
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();

//         // Переход на сайт Doffin
//         await page.goto('https://www.doffin.no/search?searchString=45000000', { waitUntil: 'domcontentloaded' });

//         // Ожидание загрузки списка тендеров
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li');

//         // Скрабинг данных
//         const notices = await page.$$eval('ul._result_list_dx2u4_58 > li', (items) => {
//             return items.map((item) => ({
//                 noticeId: item.querySelector('a')?.getAttribute('href')?.split('/').pop(),
//                 title: item.querySelector('h2._title_1lwtt_26')?.textContent.trim(),
//                 description: item.querySelector('p._ingress_1lwtt_33')?.textContent.trim(),
//                 publicationDate: item.querySelector('p._issue_date_1lwtt_54')?.textContent.trim(),
//                 link: item.querySelector('a')?.href,
//             }));
//         });

//         await browser.close();
//         res.json({ results: notices });
//     } catch (error) {
//         console.error('Ошибка скрапинга данных:', error);
//         res.status(500).json({ error: 'Ошибка при обработке данных.' });
//     }
// });

// // Запуск сервера
// app.listen(PORT, () => {
//     console.log(`Сервер запущен на http://localhost:${PORT}`);
// });


// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// app.post('/api/notices/doffin-scrape', async (req, res) => {
//     const { from, to } = req.body;

//     if (!from || !to) {
//         return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//     }

//     try {
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();

//         await page.goto('https://www.doffin.no/search?searchString=45000000', { waitUntil: 'domcontentloaded' });

//         await page.waitForSelector('ul._result_list_dx2u4_58 > li');

//         const tenders = await page.$$eval('ul._result_list_dx2u4_58 > li', items => {
//             return items.map(item => {
//                 const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//                 const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//                 const link = item.querySelector('a')?.href;
//                 const dateElement = item.querySelector('p._issue_date_1lwtt_54');
//                 const publicationDate = dateElement ? dateElement.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/)?.[0] : null;

//                 return { title, description, link, publicationDate };
//             });
//         });

//         await browser.close();

//         // Фильтрация по дате
//         const filteredTenders = tenders.filter(tender => {
//             if (!tender.publicationDate) return false;
//             const tenderDate = new Date(tender.publicationDate.split('.').reverse().join('-'));
//             return tenderDate >= new Date(from) && tenderDate <= new Date(to);
//         });

//         res.json({ results: filteredTenders });
//     } catch (error) {
//         console.error('Ошибка при скрапинге данных:', error);
//         res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Сервер запущен на http://localhost:${PORT}`);
// });


//РАБ КОД// import puppeteer from 'puppeteer';
// import express from 'express';
// import cors from 'cors';

// const app = express();
// const PORT = 4003;

// app.use(cors());
// app.use(express.json());

// // Маршрут для обработки запросов на скрапинг данных с Doffin
// app.post('/api/notices/doffin-scrape', async (req, res) => {
//     const { from, to } = req.body;

//     if (!from || !to) {
//         return res.status(400).json({ error: 'Поля "from" и "to" обязательны для заполнения.' });
//     }

//     try {
//         // Запуск Puppeteer
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();

//         // Переход на сайт Doffin
//         await page.goto('https://www.doffin.no/search?searchString=45000000', { waitUntil: 'domcontentloaded' });

//         // Ждем, пока появится список тендеров
//         await page.waitForSelector('ul._result_list_dx2u4_58 > li');

//         // Извлечение информации о тендерах
//         const tenders = await page.$$eval('ul._result_list_dx2u4_58 > li', items => {
//             return items.map(item => {
//                 const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//                 const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//                 const link = item.querySelector('a')?.href;
//                 return { title, description, link };
//             });
//         });

//         await browser.close();

//         // Фильтрация данных по дате, если требуется (например, по from и to)
//         const filteredTenders = tenders.filter(tender => tender); // Здесь можно добавить фильтрацию по дате

//         res.json({ results: filteredTenders });
//     } catch (error) {
//         console.error('Ошибка при скрапинге данных:', error);
//         res.status(500).json({ error: 'Ошибка при скрапинге данных.' });
//     }
// });

// // Запуск сервера
// app.listen(PORT, () => {
//     console.log(`Сервер запущен на http://localhost:${PORT}`);
// });


//РАБОЧИЙ API//
//  import puppeteer from 'puppeteer';

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();

//   // Открываем страницу с тендерами
//   await page.goto('https://www.doffin.no/search?searchString=45000000');

//   // Ожидаем загрузки списка тендеров
//   await page.waitForSelector('ul._result_list_dx2u4_58 > li');

//   // Извлекаем информацию о тендерах
//   const tenders = await page.$$eval('ul._result_list_dx2u4_58 > li', items => {
//     return items.map(item => {
//       const title = item.querySelector('h2._title_1lwtt_26')?.textContent.trim();
//       const description = item.querySelector('p._ingress_1lwtt_33')?.textContent.trim();
//       const link = item.querySelector('a')?.href;
//       return { title, description, link };
//     });
//   });

//   // Выводим результат
//   console.log(tenders);

//   await browser.close();
// })();
