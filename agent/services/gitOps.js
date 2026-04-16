const simpleGit = require('simple-git');
const { Octokit } = require('@octokit/rest');
const path = require('path');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_URL = process.env.REPO_URL;
const WORKSPACE = process.env.WORKSPACE_DIR || '/app/workspace/repo';

// Parse owner/repo from URL
function parseRepoUrl(url) {
  if (!url) return { owner: '', repo: '' };
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  return match ? { owner: match[1], repo: match[2] } : { owner: '', repo: '' };
}

// ── Clone or Pull ───────────────────────────────────────────
async function ensureRepo() {
  const repoDir = WORKSPACE;

  if (!REPO_URL || REPO_URL === 'https://github.com/your-username/MCP-Coffee-Shop.git') {
    console.log('⚠️  [GIT] No REPO_URL configured, using local mode');
    // Create workspace with a basic structure for local mode
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    // Initialize git if not already
    const git = simpleGit(repoDir);
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
      await git.init();
      console.log('📁 [GIT] Initialized local git repo');
    }
    return { git, repoDir, localMode: true };
  }

  if (fs.existsSync(path.join(repoDir, '.git'))) {
    console.log('📂 [GIT] Pulling latest changes...');
    const git = simpleGit(repoDir);
    await git.pull('origin', 'main').catch(() => {
      console.log('⚠️  [GIT] Pull failed, continuing with local state');
    });
    return { git, repoDir, localMode: false };
  } else {
    console.log(`📥 [GIT] Cloning ${REPO_URL}...`);
    fs.mkdirSync(repoDir, { recursive: true });
    const authUrl = GITHUB_TOKEN
      ? REPO_URL.replace('https://', `https://${GITHUB_TOKEN}@`)
      : REPO_URL;
    const git = simpleGit();
    await git.clone(authUrl, repoDir);
    return { git: simpleGit(repoDir), repoDir, localMode: false };
  }
}

// ── Create Branch ───────────────────────────────────────────
async function createBranch(git, name) {
  console.log(`🌿 [GIT] Creating branch: ${name}`);
  await git.checkoutLocalBranch(name);
}

// ── Commit & Push ───────────────────────────────────────────
async function commitAndPush(git, message, branch, localMode) {
  console.log(`💾 [GIT] Committing: ${message}`);
  await git.add('.');
  await git.commit(message);

  if (!localMode) {
    console.log(`📤 [GIT] Pushing branch ${branch}...`);
    await git.push('origin', branch);
  } else {
    console.log('📝 [GIT] Local mode — skipping push');
  }
}

// ── Create PR ───────────────────────────────────────────────
async function createPullRequest(branch, title, body) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your-github-personal-access-token') {
    console.log('⚠️  [GIT] No GitHub token, skipping PR creation');
    return { number: 0, url: 'local-mode', localMode: true };
  }

  const { owner, repo } = parseRepoUrl(REPO_URL);
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log(`📋 [GIT] Creating PR: ${title}`);
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: branch,
    base: 'main'
  });

  console.log(`✅ [GIT] PR #${data.number} created: ${data.html_url}`);
  return { number: data.number, url: data.html_url, localMode: false };
}

// ── Merge PR ────────────────────────────────────────────────
async function mergePullRequest(prNumber) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your-github-personal-access-token') {
    console.log('⚠️  [GIT] No GitHub token, skipping PR merge');
    return;
  }

  const { owner, repo } = parseRepoUrl(REPO_URL);
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log(`🔀 [GIT] Merging PR #${prNumber}...`);
  await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: 'squash'
  });
  console.log(`✅ [GIT] PR #${prNumber} merged`);
}

// ── Switch Back to Main ─────────────────────────────────────
async function switchToMain(git) {
  console.log('🔄 [GIT] Switching back to main...');
  await git.checkout('main').catch(async () => {
    await git.checkout('master').catch(() => {
      console.log('⚠️  [GIT] No main/master branch found');
    });
  });
}

module.exports = {
  ensureRepo,
  createBranch,
  commitAndPush,
  createPullRequest,
  mergePullRequest,
  switchToMain
};
