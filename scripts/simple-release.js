#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting simple auto-release...');

// Read current version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`📈 Version: ${currentVersion} → ${newVersion}`);

// Update all package.json files
const apps = ['desktop', 'studio', 'core', 'web'];
const rootPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
rootPackage.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(rootPackage, null, 2));

apps.forEach(app => {
  const appPath = path.join(__dirname, '..', 'apps', app, 'package.json');
  if (fs.existsSync(appPath)) {
    const appPackage = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    appPackage.version = newVersion;
    fs.writeFileSync(appPath, JSON.stringify(appPackage, null, 2));
    console.log(`✅ Updated ${app} to v${newVersion}`);
  }
});

// Commit and push
console.log('💾 Committing changes...');
execSync('git add .', { stdio: 'inherit' });
execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
execSync('git push origin main --follow-tags', { stdio: 'inherit' });

console.log(`🎉 Successfully released v${newVersion}!`);
console.log('🔄 GitHub Actions will now build and publish the release.');
