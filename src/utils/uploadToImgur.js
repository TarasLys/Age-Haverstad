export async function uploadBase64ToImgur(base64) {
  const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID;
  if (!clientId) throw new Error("VITE_IMGUR_CLIENT_ID не задан в .env!");

  // Удаляем префикс data:image/png;base64, если есть
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: "Client-ID " + clientId,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      image: base64Data,
      type: "base64",
    }),
  });

  const data = await response.json();
  if (data.success && data.data && data.data.link) {
    return data.data.link;
  }
  throw new Error("Ошибка загрузки на imgur: " + (data.data?.error || JSON.stringify(data)));
}