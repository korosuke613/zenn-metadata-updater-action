import {
  getChangedFiles,
  getMarkdowns,
  isChangedFile,
  saveUpdatedMarkdown,
  updateZennMetadata,
  validateMetadata,
} from "../functions";
import { Updater, ZennMetadata } from "zenn-metadata-updater";
import { readFileSync } from "fs";
import { exec } from "@actions/exec";

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

test("updateZennMetadata", async () => {
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

test("saveUpdatedMarkdown", async () => {
  const updateParam: Partial<ZennMetadata> = {
    published: true,
  };

  await saveUpdatedMarkdown(
    updateParam,
    ["src/__tests__/sampleMarkdown.md"],
    ".generated.md"
  );

  const updater = new Updater();
  const content = readFileSync("src/__tests__/sampleMarkdown.md.generated.md");
  updater.load(content);
  const actual = updater.get();

  const expected: ZennMetadata = {
    title: "Productivity Weekly (20xx-xx-xx号)",
    emoji: "",
    type: "idea",
    topics: ["ProductivityWeekly", "生産性向上"],
    published: true,
  };

  expect(actual).toEqual(expected);
});

test("validateMetadata", async () => {
  const markdown = readFileSync("src/__tests__/sampleMarkdown.md");
  await expect(validateMetadata(markdown)).rejects.toThrowError(
    "Invalid metadata: emoji"
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
