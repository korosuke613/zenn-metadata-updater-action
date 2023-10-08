import { exportVariable, setFailed } from "@actions/core";

try {
  exportVariable("TZ", "Asia/Tokyo");
} catch (e: unknown) {
  /* c8 ignore next 3 */
  console.error(e);
  if (e instanceof Error) {
    setFailed(e.message);
  } else {
    setFailed("unknown error");
  }
}
