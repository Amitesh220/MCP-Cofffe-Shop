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

// Build authenticated clone URL using GITHUB_TOKEN
function getAuthenticatedUrl(url) {
  if (!url) return url;
  if (GITHUB_TOKEN && GITHUB_TOKEN !== 'your-github-personal-access-token') {
    return url.replace('https://', `https://${GITHUB_TOKEN}@`);
  }
  return url;
}

// ── Configure Git Identity ──────────────────────────────────
// Fixes "Author identity unknown" error inside Docker containers
async function configureGitIdentity(git) {
  console.log('🔧 [GIT] Configuring git identity...');
  try {
    await git.addConfig('user.name', 'AI DevOps Agent', false, 'global');
    await git.addConfig('user.email', 'agent@ai-devops.local', false, 'global');
    console.log('✅ [GIT] Git identity configured: AI DevOps Agent <agent@ai-devops.local>');
  } catch (err) {
    console.error(`⚠️  [GIT] Failed to set git identity via simple-git, using raw command: ${err.message}`);
    // Fallback: use raw git commands
    try {
      await git.raw(['config', '--global', 'user.name', 'AI DevOps Agent']);
      await git.raw(['config', '--global', 'user.email', 'agent@ai-devops.local']);
      console.log('✅ [GIT] Git identity configured via raw commands');
    } catch (rawErr) {
      console.error(`❌ [GIT] Could not configure git identity: ${rawErr.message}`);
      throw new Error(`Git identity configuration failed: ${rawErr.message}`);
    }
  }
}

// ── Configure Safe Directory ────────────────────────────────
// Fixes "dubious ownership" errors when running inside Docker
async function configureSafeDirectory(git, repoDir) {
  console.log(`🔧 [GIT] Adding safe.directory: ${repoDir}`);
  try {
    await git.raw(['config', '--global', '--add', 'safe.directory', repoDir]);
    // Also add the default workspace path for Docker
    await git.raw(['config', '--global', '--add', 'safe.directory', '/app/workspace/repo']);
    console.log('✅ [GIT] Safe directory configured');
  } catch (err) {
    console.warn(`⚠️  [GIT] Could not set safe.directory: ${err.message}`);
    // Non-fatal — continue execution
  }
}

// ── Clone or Pull ───────────────────────────────────────────
async function ensureRepo() {
  const repoDir = WORKSPACE;

  console.log('📂 [GIT] === Repository Setup ===');
  console.log(`   Workspace: ${repoDir}`);
  console.log(`   REPO_URL:  ${REPO_URL ? REPO_URL.replace(/\/\/[^@]+@/, '//<token>@') : '(not set)'}`);
  console.log(`   TOKEN:     ${GITHUB_TOKEN ? '***configured***' : '(not set)'}`);

  if (!REPO_URL || REPO_URL === 'https://github.com/your-username/MCP-Coffee-Shop.git') {
    console.log('⚠️  [GIT] No REPO_URL configured, using local mode');
    // Create workspace with a basic structure for local mode
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    // Initialize git if not already
    const git = simpleGit(repoDir);

    // Configure identity and safe directory before any git operations
    await configureGitIdentity(git);
    await configureSafeDirectory(git, repoDir);

    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
      await git.init();
      console.log('📁 [GIT] Initialized local git repo');
    }
    return { git, repoDir, localMode: true };
  }

  // Remote mode — configure git first
  const tempGit = simpleGit();
  await configureGitIdentity(tempGit);
  await configureSafeDirectory(tempGit, repoDir);

  if (fs.existsSync(path.join(repoDir, '.git'))) {
    console.log('📂 [GIT] Repository exists, pulling latest changes...');
    const git = simpleGit(repoDir);

    // Ensure remote uses authenticated URL
    try {
      const authUrl = getAuthenticatedUrl(REPO_URL);
      await git.remote(['set-url', 'origin', authUrl]);
      console.log('🔗 [GIT] Remote URL updated with authentication token');
    } catch (err) {
      console.warn(`⚠️  [GIT] Could not update remote URL: ${err.message}`);
    }

    await git.pull('origin', 'main').catch(() => {
      console.log('⚠️  [GIT] Pull failed, continuing with local state');
    });
    console.log('✅ [GIT] Repository ready (pulled)');
    return { git, repoDir, localMode: false };
  } else {
    console.log(`📥 [GIT] Cloning repository...`);
    fs.mkdirSync(repoDir, { recursive: true });
    const authUrl = getAuthenticatedUrl(REPO_URL);
    const git = simpleGit();
    await git.clone(authUrl, repoDir);
    console.log('✅ [GIT] Repository cloned successfully');
    const repoGit = simpleGit(repoDir);
    // Re-configure identity inside the newly cloned repo
    await configureGitIdentity(repoGit);
    return { git: repoGit, repoDir, localMode: false };
  }
}

// ── Create Branch ───────────────────────────────────────────
async function createBranch(git, name) {
  console.log(`🌿 [GIT] Creating branch: ${name}`);
  try {
    await git.checkoutLocalBranch(name);
    console.log(`✅ [GIT] Branch "${name}" created and checked out`);
  } catch (err) {
    console.error(`❌ [GIT] Failed to create branch "${name}": ${err.message}`);
    throw new Error(`Branch creation failed: ${err.message}`);
  }
}

// ── Commit & Push ───────────────────────────────────────────
async function commitAndPush(git, message, branch, localMode) {
  console.log(`💾 [GIT] === Commit & Push ===`);
  console.log(`   Message: ${message.split('\n')[0]}`);
  console.log(`   Branch:  ${branch}`);
  console.log(`   Mode:    ${localMode ? 'LOCAL' : 'REMOTE'}`);

  try {
    // Stage all changes
    console.log('📋 [GIT] Staging all changes (git add .)...');
    await git.add('.');

    // Verify there are changes to commit
    const status = await git.status();
    if (status.staged.length === 0 && status.created.length === 0 && status.modified.length === 0) {
      console.log('⚠️  [GIT] No changes to commit');
      return;
    }
    console.log(`   Staged: ${status.staged.length} files, Created: ${status.created.length}, Modified: ${status.modified.length}`);

    // Commit
    console.log('📝 [GIT] Committing changes...');
    const commitResult = await git.commit(message);
    console.log(`✅ [GIT] Committed: ${commitResult.commit || 'success'}`);

    // Push (only in remote mode)
    if (!localMode) {
      console.log(`📤 [GIT] Pushing branch "${branch}" to origin...`);
      await git.push('origin', branch, ['--set-upstream']);
      console.log(`✅ [GIT] Push successful`);
    } else {
      console.log('📝 [GIT] Local mode — skipping push');
    }
  } catch (err) {
    console.error(`❌ [GIT] Commit/Push failed: ${err.message}`);
    throw new Error(`Git commit/push failed: ${err.message}`);
  }
}

// ── Create PR ───────────────────────────────────────────────
async function createPullRequest(branch, title, body) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your-github-personal-access-token') {
    console.log('⚠️  [GIT] No GitHub token, skipping PR creation');
    return { number: 0, url: 'local-mode', localMode: true };
  }

  const { owner, repo } = parseRepoUrl(REPO_URL);
  if (!owner || !repo) {
    console.error('❌ [GIT] Could not parse owner/repo from REPO_URL');
    return { number: 0, url: 'parse-error', localMode: true };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log(`📋 [GIT] Creating PR: "${title}"`);
  console.log(`   Repo:   ${owner}/${repo}`);
  console.log(`   Branch: ${branch} → main`);

  try {
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
  } catch (err) {
    console.error(`❌ [GIT] PR creation failed: ${err.message}`);
    throw new Error(`PR creation failed: ${err.message}`);
  }
}

// ── Merge PR ────────────────────────────────────────────────
async function mergePullRequest(prNumber) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your-github-personal-access-token') {
    console.log('⚠️  [GIT] No GitHub token, skipping PR merge');
    return;
  }

  const { owner, repo } = parseRepoUrl(REPO_URL);
  if (!owner || !repo) {
    console.error('❌ [GIT] Could not parse owner/repo for PR merge');
    return;
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  console.log(`🔀 [GIT] Merging PR #${prNumber}...`);
  try {
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash'
    });
    console.log(`✅ [GIT] PR #${prNumber} merged`);
  } catch (err) {
    console.error(`❌ [GIT] PR merge failed: ${err.message}`);
    throw new Error(`PR merge failed: ${err.message}`);
  }
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
