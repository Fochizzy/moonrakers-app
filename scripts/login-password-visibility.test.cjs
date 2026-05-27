const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const loginSource = fs.readFileSync(
  path.join(projectRoot, "app", "login.tsx"),
  "utf8",
);

if (!loginSource.includes('const [passwordVisible, setPasswordVisible] = useState(false);')) {
  throw new Error("Expected login screen to track password visibility state.");
}

if (!loginSource.includes("secureTextEntry={!passwordVisible}")) {
  throw new Error("Expected login password input to toggle secureTextEntry.");
}

if (!loginSource.includes('accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}')) {
  throw new Error("Expected login password toggle to expose accessible show/hide labels.");
}

if (!/<Ionicons[\s\S]*name=\{passwordVisible \? "eye-off" : "eye"\}/.test(loginSource)) {
  throw new Error("Expected login password field to render an eye toggle icon.");
}

if (!loginSource.includes("styles.passwordToggle")) {
  throw new Error("Expected login screen to style a password toggle button.");
}

console.log("login-password-visibility.test.cjs passed");
