import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

console.log('🚀 [1/4] Building production bundle...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

console.log('📄 [2/4] Preparing GitHub Pages assets (.nojekyll, 404.html)...');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
const noJekyllPath = path.join(distDir, '.nojekyll');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
}
if (!fs.existsSync(noJekyllPath)) {
  fs.writeFileSync(noJekyllPath, '');
}

console.log('🌿 [3/4] Initializing gh-pages commit...');
const gitDir = path.join(distDir, '.git');
if (fs.existsSync(gitDir)) {
  fs.rmSync(gitDir, { recursive: true, force: true });
}

execSync('git init', { stdio: 'inherit', cwd: distDir });
execSync('git checkout -B gh-pages', { stdio: 'inherit', cwd: distDir });
execSync('git add -A', { stdio: 'inherit', cwd: distDir });
execSync('git commit -m "Deploy Red Outpost to GitHub Pages [skip ci]"', { stdio: 'inherit', cwd: distDir });

console.log('📡 [4/4] Pushing to origin gh-pages...');
execSync('git remote add origin https://github.com/maverickmaruf/redpost.git', { stdio: 'inherit', cwd: distDir });
execSync('git push -f origin gh-pages', { stdio: 'inherit', cwd: distDir });

// Clean up .git in dist
fs.rmSync(gitDir, { recursive: true, force: true });

console.log('\n🎉 Successfully deployed to gh-pages branch!');
console.log('🌐 Live URL: https://maverickmaruf.github.io/redpost/\n');
