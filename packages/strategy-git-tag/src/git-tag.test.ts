import type { FileReader } from "@re-kit/core/file-reader";
import type { FileWriter } from "@re-kit/core/file-writer";
import type { GitTagReader } from "@re-kit/core/git-tag-reader";
import { describe, expect, it } from "vitest";
import { gitTag } from "./git-tag.js";

const stubReader: FileReader = {
  listFiles: async () => [],
  readFile: async () => "",
};

const stubWriter: FileWriter = {
  writeFile: async () => {},
  deleteFile: async () => {},
};

const fakeGit = (tagsByPattern: Record<string, readonly string[]>): GitTagReader => ({
  listTags: async (pattern) => tagsByPattern[pattern] ?? [],
});

describe("gitTag() strategy", () => {
  describe("readVersion", () => {
    it("defaults the tag prefix to '<name>-v' and returns the highest semver", async () => {
      const strategy = gitTag();
      const version = await strategy.readVersion({
        name: "actions",
        path: "actions",
        reader: stubReader,
        git: fakeGit({
          "actions-v*": ["actions-v0.1.0", "actions-v0.2.0", "actions-v0.1.1"],
        }),
      });
      expect(version).toBe("0.2.0");
    });

    it("respects a custom tagPrefix", async () => {
      const strategy = gitTag({ tagPrefix: "release/v" });
      const version = await strategy.readVersion({
        name: "actions",
        path: "actions",
        reader: stubReader,
        git: fakeGit({
          "release/v*": ["release/v1.0.0", "release/v1.2.3"],
        }),
      });
      expect(version).toBe("1.2.3");
    });

    it("returns 0.0.0 when no tags match", async () => {
      const strategy = gitTag();
      const version = await strategy.readVersion({
        name: "actions",
        path: "actions",
        reader: stubReader,
        git: fakeGit({}),
      });
      expect(version).toBe("0.0.0");
    });

    it("ignores tags that look right but aren't valid semver", async () => {
      const strategy = gitTag();
      const version = await strategy.readVersion({
        name: "actions",
        path: "actions",
        reader: stubReader,
        git: fakeGit({
          "actions-v*": ["actions-vbeta", "actions-v0.1.0", "actions-vlatest"],
        }),
      });
      expect(version).toBe("0.1.0");
    });
  });

  describe("writeVersion", () => {
    it("is a no-op (tags are created post-merge)", async () => {
      const strategy = gitTag();
      await expect(
        strategy.writeVersion(
          {
            name: "actions",
            path: "actions",
            reader: stubReader,
            writer: stubWriter,
            git: fakeGit({}),
          },
          "1.2.3",
        ),
      ).resolves.toBeUndefined();
    });
  });
});
