export async function uploadBase64ToImgur(base64) {
  const clientId = import.meta.env.VITE_IMGUR_CLIENT_ID;
  if (!clientId) throw new Error("VITE_IMGUR_CLIENT_ID не задан в .env!");

  // Универсально: поддержка и { image: ... }, и { base64: ... }, и data:image/...
  let rawImage = base64;
  // Если это объект с image/base64 (например, пришло из другого слоя)
  if (typeof base64 === "object" && base64 !== null) {
    rawImage = base64.image || base64.base64;
  }
  if (!rawImage) throw new Error("No image provided");

  // Удаляем префикс data:image/png;base64, если есть
  const base64Data = rawImage.startsWith("data:image/")
    ? rawImage.split(",")[1]
    : rawImage;

  if (!base64Data) throw new Error("No image provided");

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