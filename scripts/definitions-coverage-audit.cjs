const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const definitionCatalogPath = path.join(projectRoot, "utils", "definitionCatalog.ts");
const definitionTargetsPath = path.join(projectRoot, "utils", "definitionTargets.ts");

const definitionCatalog = fs.readFileSync(definitionCatalogPath, "utf8");
const definitionTargets = fs.readFileSync(definitionTargetsPath, "utf8");

const surfacePaths = [
  "app/analytics.tsx",
  "app/index.tsx",
  "app/insights.tsx",
  "app/player-cards.tsx",
  "components/player/MoonrakersIntelSection.tsx",
];

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[+]/g, " plus ")
    .replace(/[\/]/g, " / ")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuotedValues(source, matcher) {
  return Array.from(source.matchAll(matcher), (match) => match[1]).filter(Boolean);
}

function extractCatalogTerms(source) {
  const titles = extractQuotedValues(source, /title:\s*"([^"]+)"/g);
  const bodies = extractQuotedValues(source, /body:\s*"([^"]+)"/g);
  const bodyTerms = bodies.flatMap((body) => {
    return Array.from(body.matchAll(/\b[A-Z][A-Za-z0-9+/ -]{2,}\b/g), (match) => match[0]);
  });

  return Array.from(new Set([...titles, ...bodyTerms])).filter((term) => normalize(term));
}

function extractAliasTerms(source) {
  const aliasBlocks = [
    /const DEFINITION_CATEGORY_LABEL_ALIASES: Record<string, string> = \{([\s\S]*?)\n\};/,
    /const DEFINITION_LABEL_ALIASES: Record<string, string> = \{([\s\S]*?)\n\};/,
  ];

  return Array.from(
    new Set(
      aliasBlocks.flatMap((blockMatcher) => {
        const block = source.match(blockMatcher)?.[1] ?? "";
        return extractQuotedValues(block, /"([^"]+)"\s*:/g);
      }),
    ),
  ).filter((term) => normalize(term));
}

function collectSurfaceFindings(surfaceSource, glossaryTerms) {
  const lowerSource = surfaceSource.toLowerCase();
  return glossaryTerms.filter((term) => lowerSource.includes(term.toLowerCase()));
}

const glossaryTerms = extractCatalogTerms(definitionCatalog);
const resolverTerms = new Set(extractAliasTerms(definitionTargets).map(normalize));
const glossaryComponentMatcher =
  /DefinitionRichText|DefinitionTermText|DefinitionsJumpLink|buildDefinitionsRoute|HubTileCard|HeroCard|SectionCard/;

const findings = surfacePaths.map((relativePath) => {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const surfacedTerms = collectSurfaceFindings(source, glossaryTerms);
  const surfacedTermsMissingAlias = surfacedTerms.filter(
    (term) => !resolverTerms.has(normalize(term)),
  );

  return {
    relativePath,
    usesGlossaryComponent: glossaryComponentMatcher.test(source),
    surfacedTerms,
    surfacedTermsMissingAlias,
  };
});

const missingGlossaryWiring = findings.filter((entry) => !entry.usesGlossaryComponent);

console.log("Definitions coverage audit");
console.log("");
console.log(`Catalog terms scanned: ${glossaryTerms.length}`);
console.log(`Resolver aliases scanned: ${resolverTerms.size}`);
console.log("");

for (const entry of findings) {
  console.log(`- ${entry.relativePath}`);
  console.log(`  glossary-aware surface: ${entry.usesGlossaryComponent ? "yes" : "no"}`);
  console.log(
    `  surfaced glossary terms: ${
      entry.surfacedTerms.length ? entry.surfacedTerms.slice(0, 12).join(", ") : "none"
    }`,
  );
  console.log(
    `  surfaced terms without explicit definitionTargets alias: ${
      entry.surfacedTermsMissingAlias.length
        ? entry.surfacedTermsMissingAlias.slice(0, 8).join(", ")
        : "none"
    }`,
  );
}

if (missingGlossaryWiring.length > 0) {
  console.log("");
  console.log("Surfaces missing glossary-aware wiring:");
  for (const entry of missingGlossaryWiring) {
    console.log(`- ${entry.relativePath}`);
  }
  process.exitCode = 1;
} else {
  console.log("");
  console.log("All scanned surfaces include glossary-aware wiring.");
}
