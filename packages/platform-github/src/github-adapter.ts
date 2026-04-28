import type {
  FindMrInput,
  MrBody,
  MrRef,
  OpenMrInput,
  PlatformAdapter,
} from "@release-kit/core/platform-adapter";

export type GitHubAdapterOptions = {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
};

const DEFAULT_BASE_URL = "https://api.github.com";

type PullResponse = {
  readonly number: number;
  readonly html_url: string;
};

export const githubAdapter = (opts: GitHubAdapterOptions): PlatformAdapter => {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = opts.fetch ?? fetch;
  let cachedDefaultBranch: string | undefined;

  const request = async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${opts.token}`,
        "x-github-api-version": "2022-11-28",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GitHub ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res;
  };

  const resolveDefaultBranch = async (): Promise<string> => {
    if (cachedDefaultBranch) return cachedDefaultBranch;
    const res = await request("GET", `/repos/${opts.owner}/${opts.repo}`);
    const data = (await res.json()) as { default_branch?: string };
    if (typeof data.default_branch !== "string") {
      throw new Error(`GitHub: repo ${opts.owner}/${opts.repo} returned no default_branch`);
    }
    cachedDefaultBranch = data.default_branch;
    return cachedDefaultBranch;
  };

  const findOpenReleaseMr = async (input: FindMrInput): Promise<MrRef | null> => {
    const head = `${opts.owner}:${input.branch}`;
    const params = new URLSearchParams({ state: "open", head });
    const res = await request("GET", `/repos/${opts.owner}/${opts.repo}/pulls?${params}`);
    const list = (await res.json()) as readonly PullResponse[];
    const first = list[0];
    return first ? { id: first.number, url: first.html_url } : null;
  };

  const openReleaseMr = async (input: OpenMrInput): Promise<MrRef> => {
    const base = input.base ?? (await resolveDefaultBranch());
    const res = await request("POST", `/repos/${opts.owner}/${opts.repo}/pulls`, {
      title: input.title,
      body: input.body,
      head: input.branch,
      base,
    });
    const pr = (await res.json()) as PullResponse;
    return { id: pr.number, url: pr.html_url };
  };

  const updateReleaseMr = async (ref: MrRef, body: MrBody): Promise<void> => {
    await request("PATCH", `/repos/${opts.owner}/${opts.repo}/pulls/${ref.id}`, {
      title: body.title,
      body: body.body,
    });
  };

  return {
    name: "github",
    findOpenReleaseMr,
    openReleaseMr,
    updateReleaseMr,
  };
};
