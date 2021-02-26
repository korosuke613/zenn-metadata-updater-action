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

async function run(): Promise<void> {
  try {
    const dryRun: string = getInput("dry-run");
    const inputCommitSha = getInput("commit-sha");
    const title = getInput("title");
    const emoji = getInput("emoji");
    const type = getInput("type");
    const published = getInput("published");
    const isForcePush = Boolean(getInput("force-push"));
    const githubToken = getInput("github-token");

    const zennMetaData: Partial<ZennMetadata> = {
      title: title === "" ? undefined : title,
      emoji: emoji === "" ? undefined : emoji,
      type: type === "" ? undefined : (type as "idea" | "tech"),
      published: published === "" ? undefined : Boolean(published),
    };

    const commitSha = inputCommitSha === "" ? "." : inputCommitSha;

    debug(`dry-run: ${dryRun}`); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    debug(`COMMIT_SHA: ${commitSha}`); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true

    if (commitSha === undefined || commitSha === "") {
      throw new Error("GITHUB_SHA is undefined or null");
    }

    const changedFiles = await getChangedFiles(commitSha);
    debug(`changedFiles: ${changedFiles.toString()}`);
    const changedMarkdowns = await getMarkdowns(changedFiles);
    if (changedMarkdowns.length === 0) {
      info("Markdown files is no changed.");
      return;
    }
    info(`changedMarkdown: ${changedMarkdowns.toString()}`);

    const savedPaths = await saveUpdatedMarkdown(
      zennMetaData,
      changedMarkdowns
    );

    const workflowBaseRef = process.env.GITHUB_BASE_REF;
    if (!workflowBaseRef) {
      throw new Error("GITHUB_BASE_REF is undefined");
    }

    for (const savedPath of savedPaths) {
      const branchName = await pushChange(
        savedPath,
        workflowBaseRef,
        isForcePush
      );

      const workflowBranch = process.env.GITHUB_HEAD_REF;
      if (!workflowBranch) {
        throw new Error("GITHUB_HEAD_REF is undefined");
      }

      const octokit = getOctokit(githubToken);

      await createPullRequest(
        octokit,
        context.repo,
        workflowBranch,
        branchName
      );
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
