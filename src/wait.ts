import { exec } from "@actions/exec";
import {
  NotEnoughPropertyError,
  Updater,
  ZennMetadata,
} from "zenn-metadata-updater";
import { debug, info } from "@actions/core";
import { readFileSync, writeFileSync } from "fs";
import { SimpleGit } from "simple-git";

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
    options
  );
  return changedFiles.filter((path) => path !== "");
}

export async function getMarkdowns(changedFiles: string[]): Promise<string[]> {
  return changedFiles.filter((filePath) => {
    console.log(`isMarkdown: ${filePath}, ${filePath.endsWith(".md")}`);
    return filePath.endsWith(".md");
  });
}

export async function updateZennMetadata(
  updater: Updater,
  updateParams: Partial<ZennMetadata>
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

export async function updateMarkdown(
  markdown: Buffer,
  updateParams: Partial<ZennMetadata>
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
  postPath: string = ""
) {
  for (const markdownPath of changedMarkdowns) {
    const markdown = readFileSync(markdownPath);
    info(`read ${markdownPath}`);
    try {
      const updatedMarkdown = await updateMarkdown(markdown, zennMetaData);
      const savePath = markdownPath + postPath;
      writeFileSync(savePath, updatedMarkdown);
      info(`saved ${savePath}`);
    } catch (e) {
      if (e instanceof NotEnoughPropertyError) {
        info("this markdown is not Zenn article. Skipped.");
        continue;
      }
      throw e;
    }
  }
}

// export async function createPullRequest(git: SimpleGit, filePath: string) {
//   const branchName = `zenn-metadata-updater/${filePath}`;
//   await git.checkoutLocalBranch(branchName);
//   const statusResponse = await git.status();
//   debug(statusResponse.modified.toString());
//   const addResponse = await git.add(filePath);
//   debug(addResponse);
//   const commitResponse = await git.commit(
//     `chore: update metadata ${filePath} by zenn-metadata-updater`
//   );
//   debug(JSON.stringify(commitResponse, null, 2));
//   const pushResponse = await git.push("origin", branchName, ["-f"]);
//   debug(JSON.stringify(pushResponse, null, 2));
// }

export async function createPullRequest(filePath: string) {
  let result = "";
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        result = data.toString();
      },
      stderr: (data: Buffer) => {
        throw new Error(data.toString());
      },
    },
  };

  const fileName = filePath.replace(".md", "");
  const branchName = `zenn-metadata-updater/${fileName}`;
  await exec("git", ["switch", "-c", branchName], options);
  debug(result);
  await exec("git", ["add", filePath], options);
  debug(result);
  await exec(
    "git",
    [
      "commit",
      "-m",
      `"chore: update metadata ${filePath} by zenn-metadata-updater"`,
    ],
    options
  );
  debug(result);
  await exec("git", ["add", filePath], options);
  debug(result);
  await exec("git", ["push", "origin", branchName], options);
  debug(result);
}
