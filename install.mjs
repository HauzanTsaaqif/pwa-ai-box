import { execSync } from "child_process";

console.log("Starting npm install...");
try {
  execSync(
    `"C:\\Program Files\\nodejs\\node.exe" "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" install --no-audit --no-fund`,
    {
      cwd: "D:\\project_kecil\\ai-box\\pwa-aibox",
      stdio: "inherit",
      timeout: 120000,
    }
  );
  console.log("\n✅ npm install completed successfully!");
} catch (err) {
  console.error("\n❌ npm install failed:", err.message);
  process.exit(1);
}
