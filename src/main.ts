import { getInput, debug, setFailed, info } from "@actions/core";
import { ZennMetadata } from "zenn-metadata-updater";
import {
  createPullRequest,
  getChangedFiles,
  getMarkdowns,
  pushChange,
  saveUpdatedMarkdown,
} from "./wait";
import { context, getOctokit } from "@actions/github";

const toBoolean = (value: string) => {
  if (value === "true") return true;
  else if (value === "false") return false;
  return undefined;
};

async function run(): Promise<void> {
  try {
    const dryRun = toBoolean(getInput("dry-run"));
    const inputCommitSha = getInput("commit-sha");
    const title = getInput("title");
    const emoji = getInput("emoji");
    const type = getInput("type");
    const published = getInput("published");
    const githubToken = getInput("github-token");

    const commitSha =
      inputCommitSha === "" ? process.env.GITHUB_SHA : inputCommitSha;
    if (!commitSha) {
      throw new Error("commit-sha is invalid");
    }

    const changedFiles = await getChangedFiles(commitSha);
    debug(`changedFiles: ${changedFiles.toString()}`);
    const changedMarkdowns = await getMarkdowns(changedFiles);
    if (changedMarkdowns.length === 0) {
      info("Markdown files is no changed.");
      return;
    }
    info(`changedMarkdown: ${changedMarkdowns.toString()}`);

    debug(String(dryRun));
    if (dryRun) {
      info("dry-run is true. skip after process.");
      return;
    }
    const zennMetaData: Partial<ZennMetadata> = {
      title: title === "" ? undefined : title,
      emoji: emoji === "" ? undefined : emoji,
      type: type === "" ? undefined : (type as "idea" | "tech"),
      published: toBoolean(published),
    };
    const savedPaths = await saveUpdatedMarkdown(
      zennMetaData,
      changedMarkdowns
    );

    const isForcePush = toBoolean(getInput("force-push"));
    if (!isForcePush) {
      throw new Error("force-push is invalid");
    }

    for (const savedPath of savedPaths) {
      const branchName = await pushChange(savedPath, commitSha, isForcePush);
      const workflowBranch = process.env.GITHUB_HEAD_REF;
      if (!workflowBranch) {
        throw new Error("GITHUB_HEAD_REF is undefined");
      }
      const octokit = getOctokit(githubToken);
      await createPullRequest(
        octokit,
        context.repo,
        savedPath,
        workflowBranch,
        branchName
      );
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
