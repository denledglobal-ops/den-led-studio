export type VideoJobStatus = "queued" | "rendering" | "ready" | "failed";

export type VideoGenerationRequest = {
  projectId: string;
  prompt: string;
  width: number;
  height: number;
  durationSeconds: number;
};

export type VideoGenerationResult = {
  provider: string;
  jobId: string;
  status: VideoJobStatus;
  outputUrl?: string;
  error?: string;
};

export interface VideoProvider {
  create(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  get(jobId: string): Promise<VideoGenerationResult>;
}

class MockVideoProvider implements VideoProvider {
  async create(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    return { provider: "mock", jobId: `mock-${request.projectId}`, status: "rendering" };
  }
  async get(jobId: string): Promise<VideoGenerationResult> {
    return { provider: "mock", jobId, status: "rendering" };
  }
}

type RunwayTask = {
  id: string;
  status?: string;
  output?: string[];
  failure?: string;
  failureCode?: string;
};

function runwayStatus(status?: string): VideoJobStatus {
  if (status === "SUCCEEDED") return "ready";
  if (status === "FAILED" || status === "CANCELED") return "failed";
  if (status === "PENDING" || status === "THROTTLED") return "queued";
  return "rendering";
}

class RunwayVideoProvider implements VideoProvider {
  private readonly baseUrl = "https://api.dev.runwayml.com/v1";
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) throw new Error("RUNWAY_API_KEY yapılandırılmamış.");
    this.apiKey = apiKey;
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        Array.isArray(data?.issues) ? data.issues.map((issue: { message?: string; path?: string[] }) =>
          `${issue.path?.join(".") ?? "body"}: ${issue.message ?? "geçersiz değer"}`).join("; ") :
        Array.isArray(data?.error?.issues) ? data.error.issues.map((issue: { message?: string; path?: string[] }) =>
          `${issue.path?.join(".") ?? "body"}: ${issue.message ?? "geçersiz değer"}`).join("; ") :
        typeof data?.error === "string" ? data.error :
        typeof data?.message === "string" ? data.message :
        JSON.stringify(data);
      throw new Error(`Runway API hatası (${response.status}): ${detail}`);
    }
    return data;
  }

  async create(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Gen-4.5 text-to-video currently outputs standard landscape/portrait sizes.
    // DEN LED's exact pixel dimensions are retained on the project for the later fit/crop stage.
    const landscape = request.width >= request.height;
    const ratio = landscape ? "1280:720" : "720:1280";
    const duration = Math.max(2, Math.min(10, request.durationSeconds));

    const data = await this.request("/image_to_video", {
      method: "POST",
      body: JSON.stringify({
        model: "gen4.5",
        promptImage: null,
        promptText: request.prompt,
        ratio,
        duration,
      }),
    }) as RunwayTask;

    if (!data.id) throw new Error("Runway görev kimliği döndürmedi.");
    return { provider: "runway", jobId: data.id, status: "queued" };
  }

  async get(jobId: string): Promise<VideoGenerationResult> {
    const data = await this.request(`/tasks/${encodeURIComponent(jobId)}`) as RunwayTask;
    const status = runwayStatus(data.status);
    return {
      provider: "runway",
      jobId,
      status,
      outputUrl: status === "ready" ? data.output?.[0] : undefined,
      error: status === "failed" ? (data.failure ?? data.failureCode ?? "Runway üretimi başarısız.") : undefined,
    };
  }
}

export function getVideoProvider(): VideoProvider {
  const provider = process.env.VIDEO_PROVIDER ?? "mock";
  if (provider === "mock") return new MockVideoProvider();
  if (provider === "runway") return new RunwayVideoProvider();
  throw new Error(`VIDEO_PROVIDER '${provider}' henüz yapılandırılmadı.`);
}
