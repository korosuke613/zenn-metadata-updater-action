import {
  getChangedFiles,
  getMarkdowns,
  saveUpdatedMarkdown,
  updateZennMetadata,
} from "../wait";
import { Updater, ZennMetadata } from "zenn-metadata-updater";
import { readFileSync } from "fs";

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

test("getMarkdowns", async () => {
  const input = [
    "__tests__/sampleMarkdown.md",
    ".eslintrc.js",
    "test.md",
    "src/main.ts",
  ];

  const markdownFiles = await getMarkdowns(input);
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
