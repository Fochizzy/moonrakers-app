import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const nextServerDir = path.join(projectRoot, ".next", "server");
const nextChunksDir = path.join(nextServerDir, "chunks");
const standaloneServerDir = path.join(
  projectRoot,
  ".next",
  "standalone",
  "apps",
  "dashboard",
  ".next",
  "server",
);
const standaloneChunksDir = path.join(standaloneServerDir, "chunks");

const middlewareArtifacts = [
  "middleware.js",
  "middleware.js.map",
  "middleware.js.nft.json",
];

if (!existsSync(nextServerDir) || !existsSync(standaloneServerDir)) {
  process.exit(0);
}

mkdirSync(standaloneServerDir, { recursive: true });

if (existsSync(nextChunksDir) && !existsSync(standaloneChunksDir)) {
  cpSync(nextChunksDir, standaloneChunksDir, {
    force: false,
    recursive: true,
  });
}

for (const artifact of middlewareArtifacts) {
  const sourcePath = path.join(nextServerDir, artifact);
  const destinationPath = path.join(standaloneServerDir, artifact);

  if (existsSync(sourcePath) && !existsSync(destinationPath)) {
    copyFileSync(sourcePath, destinationPath);
  }
}
