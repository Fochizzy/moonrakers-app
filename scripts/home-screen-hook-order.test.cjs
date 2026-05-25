const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const targets = [
  {
    file: path.resolve(projectRoot, "app", "index.tsx"),
    componentName: "HomeScreen",
    label: "HomeScreen",
  },
  {
    file: path.resolve(projectRoot, "components", "GameReplay.tsx"),
    componentName: "GameReplay",
    label: "GameReplay",
  },
];

const hookNames = new Set([
  "useState",
  "useEffect",
  "useMemo",
  "useRef",
  "useCallback",
  "useLayoutEffect",
  "useReducer",
  "useImperativeHandle",
  "useDebugValue",
  "useDeferredValue",
  "useTransition",
  "useId",
  "useSyncExternalStore",
]);

function getCallName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function containsHookCall(node) {
  let found = false;

  function visit(current) {
    if (found) return;

    if (ts.isFunctionLike(current) && current !== node) {
      return;
    }

    if (ts.isCallExpression(current)) {
      const callName = getCallName(current.expression);
      if (callName && hookNames.has(callName)) {
        found = true;
        return;
      }
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function containsReturn(node) {
  let found = false;

  function visit(current) {
    if (found) return;

    if (ts.isFunctionLike(current) && current !== node) {
      return;
    }

    if (ts.isReturnStatement(current)) {
      found = true;
      return;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function getComponentBody(sourceFile, componentName) {
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === componentName &&
      statement.body
    ) {
      return statement.body;
    }
  }

  throw new Error(`Expected ${componentName} function in ${sourceFile.fileName}`);
}

const violations = targets.flatMap(({ file, componentName, label }) => {
  const sourceText = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const componentBody = getComponentBody(sourceFile, componentName);
  const topLevelStatements = componentBody.statements;
  const laterHookIndexes = topLevelStatements
    .map((statement, index) => (containsHookCall(statement) ? index : -1))
    .filter((index) => index >= 0);

  return topLevelStatements.flatMap((statement, index) => {
    if (!ts.isIfStatement(statement)) return [];

    const returnsEarly =
      containsReturn(statement.thenStatement) ||
      (statement.elseStatement ? containsReturn(statement.elseStatement) : false);
    if (!returnsEarly) return [];

    const laterHookIndex = laterHookIndexes.find((hookIndex) => hookIndex > index);
    if (laterHookIndex === undefined) return [];

    const ifLine =
      sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
    const hookLine =
      sourceFile.getLineAndCharacterOfPosition(
        topLevelStatements[laterHookIndex].getStart(sourceFile)
      ).line + 1;

    return [{ label, ifLine, hookLine }];
  });
});

assert.deepEqual(
  violations,
  [],
  `Components still have a top-level conditional return before a later hook: ${violations
    .map(({ label, ifLine, hookLine }) => `${label} if@${ifLine} -> hook@${hookLine}`)
    .join(", ")}`
);

console.log("PASS critical component hook order is stable");
