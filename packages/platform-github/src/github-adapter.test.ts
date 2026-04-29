import { describe, expect, it } from "vitest";
import { githubAdapter } from "./github-adapter.js";

type FetchCall = {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
};

type StubResponse = {
  readonly status?: number;
  readonly statusText?: string;
  readonly json?: unknown;
  readonly text?: string;
};

const stubFetch = (responses: readonly StubResponse[]) => {
  const calls: FetchCall[] = [];
  let i = 0;
  const fn: typeof fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const headers = Object.fromEntries(
      Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [
        k.toLowerCase(),
        v,
      ]),
    );
    const bodyRaw = init?.body;
    const body = typeof bodyRaw === "string" ? (JSON.parse(bodyRaw) as unknown) : bodyRaw;
    calls.push({ url, method, headers, body });

    const r = responses[i++] ?? { status: 200, json: {} };
    const status = r.status ?? 200;
    const ok = status >= 200 && status < 300;
    return Promise.resolve({
      ok,
      status,
      statusText: r.statusText ?? "OK",
      json: () => Promise.resolve(r.json),
      text: () => Promise.resolve(r.text ?? JSON.stringify(r.json ?? "")),
    } as Response);
  };
  return { fn, calls };
};

const baseOpts = {
  token: "ghp_test",
  owner: "acme",
  repo: "release-kit",
};

describe("githubAdapter", () => {
  it("exposes the github name and the required methods", () => {
    const adapter = githubAdapter({ ...baseOpts, fetch: stubFetch([]).fn });
    expect(adapter.name).toBe("github");
    expect(typeof adapter.findOpenReleaseMr).toBe("function");
    expect(typeof adapter.openReleaseMr).toBe("function");
    expect(typeof adapter.updateReleaseMr).toBe("function");
  });

  it("finds an open PR by head branch and returns its number+url", async () => {
    const fetch = stubFetch([
      { json: [{ number: 42, html_url: "https://github.com/acme/release-kit/pull/42" }] },
    ]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });
    const ref = await adapter.findOpenReleaseMr({
      scope: { kind: "release", package: "api" },
      branch: "release/api",
    });
    expect(ref).toEqual({ id: 42, url: "https://github.com/acme/release-kit/pull/42" });
    expect(fetch.calls[0]?.url).toBe(
      "https://api.github.com/repos/acme/release-kit/pulls?state=open&head=acme%3Arelease%2Fapi",
    );
    expect(fetch.calls[0]?.headers.authorization).toBe("Bearer ghp_test");
  });

  it("returns null when GitHub returns an empty list of PRs", async () => {
    const fetch = stubFetch([{ json: [] }]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });
    const ref = await adapter.findOpenReleaseMr({
      scope: { kind: "release", package: "api" },
      branch: "release/api",
    });
    expect(ref).toBeNull();
  });

  it("opens a PR with title, body, head, and explicit base", async () => {
    const fetch = stubFetch([
      { status: 201, json: { number: 7, html_url: "https://github.com/acme/release-kit/pull/7" } },
    ]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });
    const ref = await adapter.openReleaseMr({
      scope: { kind: "release", package: "api" },
      branch: "release/api",
      base: "main",
      title: "Release: api@1.1.0",
      body: "## Release\n\n…",
    });
    expect(ref).toEqual({ id: 7, url: "https://github.com/acme/release-kit/pull/7" });
    expect(fetch.calls[0]?.method).toBe("POST");
    expect(fetch.calls[0]?.url).toBe("https://api.github.com/repos/acme/release-kit/pulls");
    expect(fetch.calls[0]?.body).toEqual({
      title: "Release: api@1.1.0",
      body: "## Release\n\n…",
      head: "release/api",
      base: "main",
    });
  });

  it("resolves and caches the default branch when base is omitted", async () => {
    const fetch = stubFetch([
      { json: { default_branch: "trunk" } },
      { status: 201, json: { number: 1, html_url: "u1" } },
      { status: 201, json: { number: 2, html_url: "u2" } },
    ]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });

    await adapter.openReleaseMr({
      scope: { kind: "release", package: "api" },
      branch: "release/api",
      title: "t",
      body: "b",
    });
    await adapter.openReleaseMr({
      scope: { kind: "release", package: "web" },
      branch: "release/web",
      title: "t",
      body: "b",
    });

    expect(fetch.calls.filter((c) => c.url.endsWith("/repos/acme/release-kit"))).toHaveLength(1);
    const repoCall = fetch.calls[0];
    expect(repoCall?.url).toBe("https://api.github.com/repos/acme/release-kit");
    expect(fetch.calls[1]?.body).toMatchObject({ base: "trunk" });
    expect(fetch.calls[2]?.body).toMatchObject({ base: "trunk" });
  });

  it("PATCHes title and body on update", async () => {
    const fetch = stubFetch([{ json: {} }]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });
    await adapter.updateReleaseMr(
      { id: 99, url: "https://github.com/acme/release-kit/pull/99" },
      { title: "Release: api@1.2.0", body: "updated body" },
    );
    expect(fetch.calls[0]?.method).toBe("PATCH");
    expect(fetch.calls[0]?.url).toBe("https://api.github.com/repos/acme/release-kit/pulls/99");
    expect(fetch.calls[0]?.body).toEqual({
      title: "Release: api@1.2.0",
      body: "updated body",
    });
  });

  it("throws a clear error including status when GitHub returns non-2xx", async () => {
    const fetch = stubFetch([
      { status: 422, statusText: "Unprocessable", text: '{"message":"bad"}' },
    ]);
    const adapter = githubAdapter({ ...baseOpts, fetch: fetch.fn });
    await expect(
      adapter.openReleaseMr({
        scope: { kind: "release", package: "api" },
        branch: "release/api",
        base: "main",
        title: "t",
        body: "b",
      }),
    ).rejects.toThrow(/422 Unprocessable/);
  });

  it("targets a custom baseUrl when supplied (GHE)", async () => {
    const fetch = stubFetch([{ json: [] }]);
    const adapter = githubAdapter({
      ...baseOpts,
      baseUrl: "https://ghe.internal/api/v3",
      fetch: fetch.fn,
    });
    await adapter.findOpenReleaseMr({
      scope: { kind: "release", package: "api" },
      branch: "release/api",
    });
    expect(fetch.calls[0]?.url.startsWith("https://ghe.internal/api/v3/")).toBe(true);
  });
});
