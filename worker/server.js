import express from "express";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";

const app = express();
app.use(express.json({ limit: "1mb" }));

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

function auth(req, res, next) {
  const expected = process.env.WORKER_SECRET;
  if (!expected || req.get("authorization") !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function even(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 64 || parsed > 8192) return null;
  const n = Math.floor(parsed);
  return n % 2 === 0 ? n : n - 1;
}

function safeInputUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function ffmpeg(input, output, width, height, fit) {
  const filter = fit === "cover"
    ? `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
    : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y","-i",input,"-vf",filter,"-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-movflags","+faststart","-c:a","aac","-b:a","128k",output], { stdio:["ignore","ignore","pipe"] });
    let stderr="";
    child.stderr.on("data", d => { stderr += d.toString().slice(-4000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-1200)}`)));
  });
}

function ffmpegVersion() {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"], { stdio:["ignore","pipe","ignore"] });
    let stdout = "";
    const timer = setTimeout(() => { child.kill(); resolve(null); }, 3000);
    child.stdout.on("data", d => { stdout += d.toString(); });
    child.on("error", () => { clearTimeout(timer); resolve(null); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return resolve(null);
      resolve(stdout.split("\n")[0] || "ffmpeg");
    });
  });
}

app.get("/health", async (_req,res) => {
  const version = await ffmpegVersion();
  if (!version) return res.status(503).json({ ok:false, service:"den-led-video-worker", ffmpeg:false });
  res.json({ ok:true, service:"den-led-video-worker", ffmpeg:true, version });
});

app.post("/transcode", auth, async (req,res) => {
  const { inputUrl, width: rawWidth, height: rawHeight, organizationId, projectId, fit = "contain" } = req.body ?? {};
  if (!inputUrl || !organizationId || !projectId) return res.status(400).json({ error:"inputUrl, organizationId and projectId are required" });
  const sourceUrl = safeInputUrl(inputUrl);
  if (!sourceUrl) return res.status(400).json({ error:"A valid HTTPS inputUrl is required" });
  const width=even(rawWidth), height=even(rawHeight);
  if (!width || !height) return res.status(400).json({ error:"Invalid dimensions (64-8192 required)" });
  const dir=await mkdtemp(join(tmpdir(),"den-led-"));
  const input=join(dir,"input.mp4"), output=join(dir,"output.mp4");
  try {
    const source=await fetch(sourceUrl, { redirect: "error" });
    if (!source.ok || !source.body) throw new Error(`Input download failed: ${source.status}`);
    await pipeline(Readable.fromWeb(source.body), createWriteStream(input));
    await ffmpeg(input,output,width,height,fit === "cover" ? "cover" : "contain");
    const supabase=createClient(required("SUPABASE_URL"),required("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
    const path=`${organizationId}/processed/${projectId}-${width}x${height}-${randomUUID()}.mp4`;
    const chunks=[]; for await (const chunk of createReadStream(output)) chunks.push(chunk);
    const { error }=await supabase.storage.from("project-videos").upload(path,Buffer.concat(chunks),{contentType:"video/mp4",upsert:false});
    if (error) throw error;
    const { data }=supabase.storage.from("project-videos").getPublicUrl(path);
    res.json({ ok:true, outputUrl:data.publicUrl, width, height, fit:fit === "cover" ? "cover" : "contain" });
  } catch (error) {
    res.status(500).json({ error:error instanceof Error ? error.message : "Transcode failed" });
  } finally { await rm(dir,{recursive:true,force:true}); }
});

app.listen(process.env.PORT || 3000,"0.0.0.0",()=>console.log("DEN LED video worker ready"));
