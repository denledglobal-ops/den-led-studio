export function getIyzicoConfig() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://api.iyzipay.com";

  if (!apiKey || !secretKey) {
    throw new Error("Iyzico credentials are not configured");
  }

  return { apiKey, secretKey, baseUrl };
}
