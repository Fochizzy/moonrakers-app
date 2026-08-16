import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const nextBuildPath = path.join(process.cwd(), ".next");

if (existsSync(nextBuildPath)) {
  rmSync(nextBuildPath, { force: true, recursive: true });
}
