import * as Buffer from "buffer";
import { readFileSync, writeFileSync } from "fs";
import { debug, info } from "@actions/core";
import { exec } from "@actions/exec";
import { getOctokit } from "@actions/github";
import {
  NotEnoughPropertyError,
  Updater,
  ZennMetadata,
} from "zenn-metadata-updater";

export async function getChangedFiles(githubSha: string): Promise<string[]> {
  let changedFiles: string[] = [];
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        changedFiles = data.toString().split("\n");
      },
      stderr: (data: Buffer) => {
        throw new Error(data.toString());
      },
    },
  };
  await exec(
    "git",
    ["log", "-m", "-1", "--name-only", "--pretty=format:", githubSha],
    options,
  );
  return changedFiles.filter((path) => path !== "");
}

export function getMarkdowns(changedFiles: string[]): string[] {
  return changedFiles.filter((filePath) => filePath.endsWith(".md"));
}

export async function updateZennMetadata(
  updater: Updater,
  updateParams: Partial<ZennMetadata>,
) {
  const metadata = updater.get();
  debug(`now metadata: ${JSON.stringify(metadata, null, 2)}`);
  debug(`input metadata: ${JSON.stringify(updateParams, null, 2)}`);
  for (const [key, value] of Object.entries(updateParams)) {
    if (value === "" || value === undefined) continue;
    metadata[key] = value;
  }
  debug(`updated metadata: ${JSON.stringify(metadata, null, 2)}`);

  return metadata;
}

export async function validateMetadata(markdown: Buffer) {
  const updater = new Updater();
  await updater.load(markdown);
  updater.validateProperty();
}

export async function updateMarkdown(
  markdown: Buffer,
  updateParams: Partial<ZennMetadata>,
): Promise<Buffer> {
  const updater = new Updater();
  await updater.load(markdown);
  const updatedZennMetadata = await updateZennMetadata(updater, updateParams);
  await updater.updateProperty(updatedZennMetadata);
  return updater.getUpdatedContent() as Buffer;
}

export async function saveUpdatedMarkdown(
  zennMetaData: Partial<ZennMetadata>,
  changedMarkdowns: string[],
  postPath = "",
) {
  const savedPaths = new Array<string>();
  for (const markdownPath of changedMarkdowns) {
    const markdown = readFileSync(markdownPath);
    info(`read ${markdownPath}`);
    try {
      const updatedMarkdown = await updateMarkdown(markdown, zennMetaData);
      const savePath = markdownPath + postPath;
      writeFileSync(savePath, updatedMarkdown);
      savedPaths.push(savePath);
      info(`saved ${savePath}`);
    } catch (e) {
      if (e instanceof NotEnoughPropertyError) {
        info("this markdown is not Zenn article. Skipped.");
        continue;
      }
      throw e;
    }
  }
  return savedPaths;
}

async function execByThrowError(commandLine: string, args?: string[]) {
  let result = "";

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        result = data.toString();
      },
      stderr: (data: Buffer) => {
        result = data.toString();
      },
    },
  };
  const exitCode = await exec(commandLine, args, options);
  debug(result);
  if (exitCode !== 0) {
    throw new Error(result);
  }
  return result;
}

function getCommitMessage(filePath: string) {
  return `chore: update metadata ${filePath} by zenn-metadata-updater`;
}

export async function isChangedFile(filePath: string) {
  const result = await execByThrowError("git", [
    "status",
    filePath,
    "--porcelain",
  ]);
  return result === "";
}

export async function pushChange(
  filePath: string,
  originalBranchSha: string,
  isForcePush: boolean,
) {
  const fileName = filePath.replace(".", "_");
  const branchName = `zenn-metadata-updater/${fileName}`;
  let forceFlag: "" | "-f" = "";
  if (isForcePush) {
    forceFlag = "-f";
  }

  await execByThrowError("git", ["switch", "-c", branchName]);
  await execByThrowError("git", ["add", filePath]);
  await execByThrowError("git", [
    "-c",
    "user.email='41898282+github-actions[bot]@users.noreply.github.com'",
    "-c",
    "user.name='github-actions[bot]'",
    "commit",
    "-m",
    getCommitMessage(filePath),
  ]);
  await execByThrowError("git", ["push", forceFlag, "origin", branchName]);
  await execByThrowError("git", ["checkout", originalBranchSha]);

  return branchName;
}

export async function createPullRequest(
  octokit: ReturnType<typeof getOctokit>,
  githubRepo: { owner: string; repo: string },
  savedPath: string,
  workflowBranch: string,
  branchName: string,
) {
  try {
    await octokit.rest.pulls.create({
      ...githubRepo,
      title: getCommitMessage(savedPath),
      head: branchName,
      base: workflowBranch,
    });
  } catch (e: any) {
    const errorMessage: string = e.errors[0].message;
    if (errorMessage?.startsWith("A pull request already exists for")) {
      info(`skip because ${errorMessage}`);
      return;
    }

    throw e;
  }
}
