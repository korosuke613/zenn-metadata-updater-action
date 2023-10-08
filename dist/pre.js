import core from "@actions/core";

/**
 * 
 * @param {import("@actions/core")} core 
 */
export async function pre(core) {
  core.exportVariable("TZ", "Asia/Tokyo");
}

pre(core).catch((error) => {
  /* c8 ignore next 3 */
  console.error(error);
  core.setFailed(error.message);
});
