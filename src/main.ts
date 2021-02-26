import { getInput, debug, setOutput, setFailed, info } from "@actions/core";
import { NotEnoughPropertyError, ZennMetadata } from "zenn-metadata-updater";
import {
  createPullRequest,
  getChangedFiles,
  getMarkdowns,
  saveUpdatedMarkdown,
  updateMarkdown,
} from "./wait";
import { readFileSync } from "fs";
import { exec } from "@actions/exec";
import simpleGit from "simple-git";

async function run(): Promise<void> {
  try {
    const dryRun: string = getInput("dry-run");
    const inputCommitSha = getInput("commit-sha");
    const title = getInput("title");
    const emoji = getInput("emoji");
    const type = getInput("type");
    const published = getInput("published");

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

    await saveUpdatedMarkdown(zennMetaData, changedMarkdowns);

    const git = simpleGit({
      config: ["user.name='Some One'", "user.email='some@one.com'"],
    });

    await createPullRequest(git, changedMarkdowns[0]);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
