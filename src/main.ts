import { getInput, debug, setFailed, info } from "@actions/core";
import { ZennMetadata } from "zenn-metadata-updater";
import {
  createPullRequest,
  getChangedFiles,
  getMarkdowns,
  pushChange,
  saveUpdatedMarkdown,
} from "./functions";
import { context, getOctokit } from "@actions/github";

const toBoolean = (value: string) => {
  if (value === "true") return true;
  else if (value === "false") return false;
  return undefined;
};

type Params = {
  dryRun: boolean;
  zennMetadata: Partial<ZennMetadata>;
  githubToken: string;
  commitSha: string;
  isForcePush: boolean;
};

function getParams() {
  const inputCommitSha = getInput("commit-sha");
  const title = getInput("title");
  const emoji = getInput("emoji");
  const type = getInput("type");
  const published = getInput("published");
  const githubToken = getInput("github-token");

  const dryRun = toBoolean(getInput("dry-run"));
  if (!dryRun) {
    throw new Error("dryRun is invalid");
  }

  const commitSha =
    inputCommitSha === "" ? process.env.GITHUB_SHA : inputCommitSha;
  if (!commitSha) {
    throw new Error("commit-sha is invalid");
  }

  const isForcePush = toBoolean(getInput("force-push"));
  if (!isForcePush) {
    throw new Error("force-push is invalid");
  }

  const zennMetadata: Partial<ZennMetadata> = {
    title: title === "" ? undefined : title,
    emoji: emoji === "" ? undefined : emoji,
    type: type === "" ? undefined : (type as "idea" | "tech"),
    published: toBoolean(published),
  };

  const params: Readonly<Params> = {
    dryRun,
    zennMetadata,
    githubToken,
    commitSha,
    isForcePush,
  };
  return params;
}

async function run(): Promise<void> {
  try {
    const params = getParams();

    // 変更されたマークダウンの取得とパラメータのアップデート
    const changedFiles = await getChangedFiles(params.commitSha);
    debug(`changedFiles: ${changedFiles.toString()}`);
    const changedMarkdowns = await getMarkdowns(changedFiles);
    if (changedMarkdowns.length === 0) {
      info("Markdown files is no changed.");
      return;
    }
    info(`changedMarkdown: ${changedMarkdowns.toString()}`);

    // マークダウンの保存とプッシュとプルリクエスト作成
    const savedPaths = await saveUpdatedMarkdown(
      params.zennMetadata,
      changedMarkdowns
    );

    // dry-run = true の場合はプッシュ、プルリクエストの作成をスキップする
    if (params.dryRun) {
      info("dry-run is true. skip after process.");
      return;
    }

    // 変更されたファイルごとにプッシュし、プルリクエストを作成する
    for (const savedPath of savedPaths) {
      const branchName = await pushChange(
        savedPath,
        params.commitSha,
        params.isForcePush
      );
      const workflowBranch = process.env.GITHUB_HEAD_REF;
      if (!workflowBranch) {
        throw new Error("GITHUB_HEAD_REF is undefined");
      }
      const octokit = getOctokit(params.githubToken);
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
