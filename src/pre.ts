import * as core from "@actions/core";

export function pre(core: typeof import("@actions/core")) {
  core.exportVariable("TZ", "Asia/Tokyo");
}

try {
  pre(core);
} catch (e: unknown) {
  /* c8 ignore next 3 */
  console.error(e);
  if (e instanceof Error) {
    core.setFailed(e.message);
  } else {
    core.setFailed("unknown error");
  }
}
