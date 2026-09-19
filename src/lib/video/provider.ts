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

export function getVideoProvider(): VideoProvider {
  const provider = process.env.VIDEO_PROVIDER ?? "mock";
  if (provider === "mock") return new MockVideoProvider();
  throw new Error(`VIDEO_PROVIDER '${provider}' henüz yapılandırılmadı.`);
}
