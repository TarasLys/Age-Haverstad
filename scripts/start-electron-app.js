

// /* eslint-env node */
// import { spawn } from "child_process";
// import path from "path";
// import { fileURLToPath } from "url";

// // Получаем __filename и __dirname для ES-модуля
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Запуск netlify dev
// const netlify = spawn("npx", ["netlify", "dev"], {
//   cwd: process.cwd(),
//   stdio: "inherit",
//   shell: true,
// });

// // Запуск doffinScraper.js
// const scraper = spawn("node", [path.join("server", "doffinScraper.js")], {
//   cwd: process.cwd(),
//   stdio: "inherit",
//   shell: true,
// });

// // Запуск Electron после небольшой задержки (чтобы dev-серверы успели стартовать)
// setTimeout(() => {
//   const electron = spawn("npx", ["electron", "."], {
//     cwd: process.cwd(),
//     stdio: "inherit",
//     shell: true,
//   });

//   electron.on("close", (code) => {
//     // При завершении Electron — убиваем остальные процессы
//     netlify.kill();
//     scraper.kill();
//     process.exit(code);
//   });
// }, 3000); // 3 секунды задержки, можно увеличить если нужно

// // Если основной процесс завершается — убиваем дочерние
// process.on("SIGINT", () => {
//   netlify.kill();
//   scraper.kill();
//   process.exit();
// });