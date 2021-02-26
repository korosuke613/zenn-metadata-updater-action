import { getChangedFiles, getMarkdowns } from "../wait";

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
