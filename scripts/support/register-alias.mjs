// Entry point for `node --import`: installs the "@/" alias resolver before the
// test file's own imports are resolved.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
