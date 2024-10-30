import { readFileSync } from "node:fs";
import { exec } from "@actions/exec";
import { Updater, type ZennMetadata } from "zenn-metadata-updater";
import {
  generatePublishedAt,
  getChangedFiles,
  getMarkdowns,
  isChangedFile,
  saveUpdatedMarkdown,
  updateZennMetadata,
  validateMetadata,
} from "../functions";

// This test fail on CI.
// test("getFiles", async () => {
//   const markdownChangedCommitSha = "f6bcfb9a62bad3b7963b975d7452ddde0ac86db3";
//   const changedFiles = await getChangedFiles(markdownChangedCommitSha);
//   const expected = ["__tests__/sampleMarkdown.md"];
//   expect(changedFiles).toEqual(expected);
// });

test("getFiles", async () => {
  const markdownChangedCommitSha = ".";
  await getChangedFiles(markdownChangedCommitSha);
});

test("getMarkdowns", () => {
  const input = [
    "__tests__/sampleMarkdown.md",
    ".eslintrc.js",
    "test.md",
    "src/main.ts",
  ];

  const markdownFiles = getMarkdowns(input);
  const expected = ["__tests__/sampleMarkdown.md", "test.md"];

  expect(markdownFiles).toEqual(expected);
});

describe("updateZennMetadata", () => {
  test("正常系", async () => {
    const updateParam: Partial<ZennMetadata> = {
      published: true,
    };

    const updater = new Updater();
    updater.load(`---
title: "Productivity Weekly (20xx-xx-xx号)"
emoji: ""
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["ProductivityWeekly", "生産性向上"]
published: false 
---`);
    const actual = await updateZennMetadata(updater, updateParam);

    const expected: ZennMetadata = {
      title: "Productivity Weekly (20xx-xx-xx号)",
      emoji: "",
      type: "idea",
      topics: ["ProductivityWeekly", "生産性向上"],
      published: true,
    };

    expect(actual).toEqual(expected);
  });

  test("published_at 設定済みの場合は published_at を更新しない", async () => {
    const updateParam: Partial<ZennMetadata> = {
      published_at: "2021-01-01 00:00",
    };

    const updater = new Updater();
    updater.load(`---
title: "Productivity Weekly (20xx-xx-xx号)"
emoji: ""
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["ProductivityWeekly", "生産性向上"]
published: true 
published_at: "2020-01-01 00:00"
---`);

    const actual = await updateZennMetadata(updater, updateParam);
    const expected: Partial<ZennMetadata> = {
      title: "Productivity Weekly (20xx-xx-xx号)",
      emoji: "",
      type: "idea",
      topics: ["ProductivityWeekly", "生産性向上"],
      published: true,
      published_at: "2020-01-01 00:00",
    };

    expect(actual).toEqual(expected);
  });

  test("published: true かつ published_at 未設定の場合は published_at を更新する", async () => {
    const updateParam: Partial<ZennMetadata> = {
      published: true,
      published_at: "2021-01-01 00:00",
    };

    const updater = new Updater();
    updater.load(`---
title: "Productivity Weekly (20xx-xx-xx号)"
emoji: ""
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["ProductivityWeekly", "生産性向上"]
published: false
---`);

    const actual = await updateZennMetadata(updater, updateParam);
    const expected: Partial<ZennMetadata> = {
      title: "Productivity Weekly (20xx-xx-xx号)",
      emoji: "",
      type: "idea",
      topics: ["ProductivityWeekly", "生産性向上"],
      published: true,
      published_at: "2021-01-01 00:00",
    };

    expect(actual).toEqual(expected);
  });

  test("published: true が設定されている場合は published_at を設定しない", async () => {
    const updateParam: Partial<ZennMetadata> = {
      published_at: "2023-12-27 10:00",
    };

    const updater = new Updater();
    updater.load(`---
title: "Productivity Weekly (20xx-xx-xxtrue号)"
emoji: ""
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["ProductivityWeekly", "生産性向上"]
published: true
---`);

    const actual = await updateZennMetadata(updater, updateParam);
    const expected: Partial<ZennMetadata> = {
      title: "Productivity Weekly (20xx-xx-xxtrue号)",
      emoji: "",
      type: "idea",
      topics: ["ProductivityWeekly", "生産性向上"],
      published: true,
    };

    expect(actual).toEqual(expected);
  });
});

test("saveUpdatedMarkdown", async () => {
  const updateParam: Partial<ZennMetadata> = {
    published: true,
  };

  await saveUpdatedMarkdown(
    updateParam,
    ["articles/sampleMarkdown.md"],
    ".generated.md",
  );

  const updater = new Updater();
  const content = readFileSync("articles/sampleMarkdown.md.generated.md");
  updater.load(content);
  const actual = updater.get();

  const expected: ZennMetadata = {
    title: "Productivity Weekly (20xx-xx-xx号)",
    emoji: "🥳",
    type: "idea",
    topics: ["ProductivityWeekly", "生産性向上"],
    published: true,
  };

  expect(actual).toEqual(expected);
});

test("validateMetadata", async () => {
  const markdown = readFileSync("src/__tests__/invalidMarkdown.md");
  await expect(validateMetadata(markdown)).rejects.toThrowError(
    "Invalid metadata: emoji",
  );
});

describe("isWorkingTreeClean", () => {
  const testIf = (condition: boolean) => (condition ? test : test.skip);
  const onGitHubActions = process.env.CI === "true";

  testIf(onGitHubActions)("Working tree is clean", async () => {
    const actual = await isChangedFile("README.md");
    expect(actual).toEqual(true);
  });

  testIf(onGitHubActions)("Working tree is dirty", async () => {
    await exec("touch", [".dirty"]);
    const actual = await isChangedFile(".dirty");
    expect(actual).toEqual(false);
    await exec("rm", ["-f", "./.dirty"]);
  });
});

describe("generatePublishedAt", () => {
  test("business day", () => {
    const actual = generatePublishedAt(
      "next_business_day_09",
      new Date("2021-01-01T00:00:00"),
    );
    expect(actual).toEqual("2021-01-04 09:00");
  });
  test("day", () => {
    const actual = generatePublishedAt(
      "next_day_12",
      new Date("2021-01-01T00:00:00"),
    );
    expect(actual).toEqual("2021-01-02 12:00");
  });
});

// test("createPullRequest", async () => {
//   const octokit = new Octokit({
//     auth: "GITHUB_TOKEN",
//     baseUrl: "https://api.github.com",
//   });
//   await createPullRequest(
//     octokit,
//     { owner: "korosuke613", repo: "zenn-metadata-updater-action" },
//     "main",
//     "zenn-metadata-updater/src/__tests__/sampleMarkdown_md"
//   );
//   console.log("finish");
// });
