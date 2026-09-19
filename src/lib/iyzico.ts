import crypto from "crypto";
const BASE="https://api.iyzipay.com";
function auth(uri:string,body:string){
 const apiKey=process.env.IYZICO_API_KEY; const secret=process.env.IYZICO_SECRET_KEY;
 if(!apiKey||!secret) throw new Error("iyzico yapılandırılmadı.");
 const random=Date.now().toString()+crypto.randomBytes(8).toString("hex");
 const signature=crypto.createHmac("sha256",secret).update(random+uri+body).digest("hex");
 return {Authorization:`IYZWSv2 ${Buffer.from(`apiKey:${apiKey}&randomKey:${random}&signature:${signature}`).toString("base64")}`,"x-iyzi-rnd":random};
}
export async function iyzicoPost(uri:string,payload:Record<string,unknown>){
 const body=JSON.stringify(payload); const res=await fetch(BASE+uri,{method:"POST",headers:{"content-type":"application/json",...auth(uri,body)},body,cache:"no-store"});
 const data=await res.json(); if(!res.ok||data.status==="failure") throw new Error(data.errorMessage||"iyzico isteği başarısız."); return data;
}