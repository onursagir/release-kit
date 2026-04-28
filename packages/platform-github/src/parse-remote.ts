export type GitHubRepoCoords = {
  readonly owner: string;
  readonly repo: string;
};

const SCP_LIKE = /^[^@/\s]+@([^:]+):(.+)$/;

const stripGit = (s: string): string => (s.endsWith(".git") ? s.slice(0, -4) : s);

const split = (path: string): GitHubRepoCoords => {
  const parts = stripGit(path).replace(/^\/+/, "").split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Cannot parse owner/repo from path: ${path}`);
  }
  return { owner: parts[0], repo: parts[1] };
};

export const parseGitHubRemote = (remoteUrl: string): GitHubRepoCoords => {
  const scp = SCP_LIKE.exec(remoteUrl);
  if (scp) {
    const path = scp[2];
    if (!path) throw new Error(`Cannot parse path from remote URL: ${remoteUrl}`);
    return split(path);
  }
  try {
    const url = new URL(remoteUrl);
    return split(url.pathname);
  } catch {
    throw new Error(`Cannot parse remote URL: ${remoteUrl}`);
  }
};
