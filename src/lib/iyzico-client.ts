import crypto from "crypto";
import { getIyzicoConfig } from "./iyzico-config";

export async function iyzicoPost(path: string, payload: Record<string, unknown>) {
  const { apiKey, secretKey, baseUrl } = getIyzicoConfig();
  const body = JSON.stringify(payload);
  const randomKey = `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
  const signature = crypto.createHmac("sha256", secretKey)
    .update(randomKey + path + body)
    .digest("hex");
  const authorization = "IYZWSv2 " + Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
  ).toString("base64");

  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization, "x-iyzi-rnd": randomKey },
    body,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || data.status === "failure") throw new Error(data.errorMessage || "iyzico request failed");
  return data;
}
