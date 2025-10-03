#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read current version from root package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Auto-increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`🚀 Auto-incrementing version: ${currentVersion} → ${newVersion}`);

// Update root package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Update desktop app version
const desktopPackageJsonPath = path.join(__dirname, '..', 'apps', 'desktop', 'package.json');
if (fs.existsSync(desktopPackageJsonPath)) {
  const desktopPackageJson = JSON.parse(fs.readFileSync(desktopPackageJsonPath, 'utf8'));
  desktopPackageJson.version = newVersion;
  fs.writeFileSync(desktopPackageJsonPath, JSON.stringify(desktopPackageJson, null, 2));
  console.log(`📱 Updated desktop app version to ${newVersion}`);
}

// Update studio app version
const studioPackageJsonPath = path.join(__dirname, '..', 'apps', 'studio', 'package.json');
if (fs.existsSync(studioPackageJsonPath)) {
  const studioPackageJson = JSON.parse(fs.readFileSync(studioPackageJsonPath, 'utf8'));
  studioPackageJson.version = newVersion;
  fs.writeFileSync(studioPackageJsonPath, JSON.stringify(studioPackageJson, null, 2));
  console.log(`🎨 Updated studio app version to ${newVersion}`);
}

// Update core app version
const corePackageJsonPath = path.join(__dirname, '..', 'apps', 'core', 'package.json');
if (fs.existsSync(corePackageJsonPath)) {
  const corePackageJson = JSON.parse(fs.readFileSync(corePackageJsonPath, 'utf8'));
  corePackageJson.version = newVersion;
  fs.writeFileSync(corePackageJsonPath, JSON.stringify(corePackageJson, null, 2));
  console.log(`⚡ Updated core app version to ${newVersion}`);
}

// Update web app version
const webPackageJsonPath = path.join(__dirname, '..', 'apps', 'web', 'package.json');
if (fs.existsSync(webPackageJsonPath)) {
  const webPackageJson = JSON.parse(fs.readFileSync(webPackageJsonPath, 'utf8'));
  webPackageJson.version = newVersion;
  fs.writeFileSync(webPackageJsonPath, JSON.stringify(webPackageJson, null, 2));
  console.log(`🌐 Updated web app version to ${newVersion}`);
}

// Create changeset
console.log('📝 Creating changeset...');
try {
  execSync('yarn changeset add --empty', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Changeset creation failed, continuing with release...');
}

// Commit and tag
console.log('💾 Committing changes...');
execSync('git add .', { stdio: 'inherit' });
execSync(`git commit -m "chore: auto-increment version to ${newVersion}"`, { stdio: 'inherit' });
execSync(`git tag v${newVersion}`, { stdio: 'inherit' });

console.log('🚀 Pushing to GitHub...');
execSync('git push origin main --follow-tags', { stdio: 'inherit' });

console.log(`✅ Successfully released version ${newVersion}!`);
console.log(`🎉 GitHub Actions will now build and publish the release.`);
