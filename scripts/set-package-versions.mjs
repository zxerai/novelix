import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const [version, ...rest] = argv;
  if (!version) {
    throw new Error("Usage: node scripts/set-package-versions.mjs <version> [--root <path>]");
  }

  let root = process.cwd();
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--root") {
      root = rest[i + 1];
      i += 1;
    }
  }

  return { version, root: resolve(root) };
}

async function loadWorkspacePackages(root) {
  const packagesDir = join(root, "packages");
  const entries = await readdir(packagesDir);
  const packages = [];

  for (const entry of entries) {
    try {
      const dir = join(packagesDir, entry);
      const packageJsonPath = join(dir, "package.json");
      const pkg = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      packages.push({ dir, packageJsonPath, pkg });
    } catch {
      // ignore non-package directories
    }
  }

  return packages;
}

function rewriteDependencyVersions(pkg, workspacePackageNames, version) {
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const name of Object.keys(deps)) {
      if (workspacePackageNames.has(name)) {
        deps[name] = version;
      }
    }
  }
}

async function main() {
  const { version, root } = parseArgs(process.argv.slice(2));
  const workspacePackages = await loadWorkspacePackages(root);
  const workspacePackageNames = new Set(workspacePackages.map(({ pkg }) => pkg.name));

  const rootPackageJsonPath = join(root, "package.json");
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf-8"));
  rootPackageJson.version = version;
  await writeFile(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`, "utf-8");

  for (const workspacePackage of workspacePackages) {
    workspacePackage.pkg.version = version;
    rewriteDependencyVersions(workspacePackage.pkg, workspacePackageNames, version);
    await writeFile(
      workspacePackage.packageJsonPath,
      `${JSON.stringify(workspacePackage.pkg, null, 2)}\n`,
      "utf-8",
    );
  }
}

await main();
