const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

run("Hubs tab exposes the Profile Management tile through shared hub metadata", () => {
  const hubsSource = read("utils/appHubs.ts");

  expectIncludes(hubsSource, 'key: "profile-management"', "profile management key");
  expectIncludes(hubsSource, 'title: "Profile Management"', "profile management title");
  expectIncludes(hubsSource, 'description: "Profile Picture"', "profile management description");
  expectIncludes(hubsSource, "route: APP_ROUTES.roster", "profile management route");
  expectIncludes(hubsSource, 'iconKey: "billBendo"', "profile management icon");
  expectIncludes(
    hubsSource,
    'layout: "graphic-horizontal"',
    "profile management horizontal layout"
  );
  expectIncludes(hubsSource, "fullWidth: true", "profile management wide layout");
});

if (process.exitCode > 0) {
  throw new Error("home-profile-management-hub.test.cjs failed");
}

console.log("home-profile-management-hub.test.cjs passed");
