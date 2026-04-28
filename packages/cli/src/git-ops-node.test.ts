import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nodeGitOps } from "./git-ops-node.js";

const exec = promisify(execFile);

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await exec("git", args as string[], { cwd });
  return stdout;
};

describe("nodeGitOps (integration)", () => {
  let upstream = "";
  let work = "";

  beforeEach(async () => {
    upstream = await mkdtemp(join(tmpdir(), "rk-upstream-"));
    work = await mkdtemp(join(tmpdir(), "rk-work-"));

    await git(upstream, ["init", "--bare", "-b", "main"]);

    await git(work, ["init", "-b", "main"]);
    await git(work, ["config", "user.name", "Test"]);
    await git(work, ["config", "user.email", "test@example.com"]);
    await git(work, ["remote", "add", "origin", upstream]);
    await writeFile(join(work, "README.md"), "hello\n");
    await git(work, ["add", "."]);
    await git(work, ["commit", "-m", "initial"]);
    await git(work, ["push", "-u", "origin", "main"]);
  });

  afterEach(async () => {
    await rm(upstream, { recursive: true, force: true });
    await rm(work, { recursive: true, force: true });
  });

  it("reports the current branch and HEAD ref", async () => {
    const ops = nodeGitOps({ cwd: work });
    expect(await ops.currentBranch()).toBe("main");
    const sha = await ops.headRef();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("creates or resets a branch from a known ref", async () => {
    const ops = nodeGitOps({ cwd: work });
    const baseSha = await ops.headRef();
    await ops.createOrResetBranch("release/api", baseSha);
    expect(await ops.currentBranch()).toBe("release/api");
    expect(await ops.headRef()).toBe(baseSha);
  });

  it("hasStagedChanges flips with addAll, then commit clears it", async () => {
    const ops = nodeGitOps({ cwd: work });
    expect(await ops.hasStagedChanges()).toBe(false);
    await writeFile(join(work, "new.txt"), "x\n");
    await ops.addAll();
    expect(await ops.hasStagedChanges()).toBe(true);
    await ops.commit("test commit", { name: "Bot", email: "bot@example.com" });
    expect(await ops.hasStagedChanges()).toBe(false);
  });

  it("uses the supplied author for commits", async () => {
    const ops = nodeGitOps({ cwd: work });
    await writeFile(join(work, "f.txt"), "a\n");
    await ops.addAll();
    await ops.commit("authored", { name: "Release Bot", email: "bot@release-kit" });
    const log = await git(work, ["log", "-1", "--pretty=%an <%ae>"]);
    expect(log.trim()).toBe("Release Bot <bot@release-kit>");
  });

  it("pushes a new branch to origin", async () => {
    const ops = nodeGitOps({ cwd: work });
    const baseSha = await ops.headRef();
    await ops.createOrResetBranch("release/api", baseSha);
    await writeFile(join(work, "v.txt"), "1\n");
    await ops.addAll();
    await ops.commit("bump", { name: "Bot", email: "b@x" });
    await ops.push("release/api");
    const refs = await git(upstream, ["branch", "--list"]);
    expect(refs).toContain("release/api");
  });

  it("force-pushes when force is set, replacing the remote branch tip", async () => {
    const ops = nodeGitOps({ cwd: work });
    const baseSha = await ops.headRef();
    await ops.createOrResetBranch("release/api", baseSha);
    await writeFile(join(work, "v.txt"), "1\n");
    await ops.addAll();
    await ops.commit("first", { name: "Bot", email: "b@x" });
    await ops.push("release/api");

    await ops.createOrResetBranch("release/api", baseSha);
    await writeFile(join(work, "v.txt"), "2\n");
    await ops.addAll();
    await ops.commit("rewritten", { name: "Bot", email: "b@x" });
    await ops.push("release/api", { force: true });

    const tip = await git(upstream, ["log", "-1", "--pretty=%s", "release/api"]);
    expect(tip.trim()).toBe("rewritten");
  });
});
