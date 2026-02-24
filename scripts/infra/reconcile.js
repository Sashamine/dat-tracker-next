#!/usr/bin/env node
/**
 * Deterministic reconcile loop for repo micro-tasks.
 * - takes first TODO task
 * - applies deterministic transformation
 * - commits with provided message
 * - on failure, records to infra/dlq.json and marks task blocked
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { handleTask } from './tasks.js';

const repoRoot = process.cwd();
const qPath = path.join(repoRoot, 'infra', 'work-queue.json');
const dlqPath = path.join(repoRoot, 'infra', 'dlq.json');

const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function saveJson(p, j) {
  await fs.writeFile(p, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

async function applyTask(task) {
  const r = await handleTask(task.id, repoRoot);
  return r.changed;
}

async function main() {
  // Mark active so auditor doesn't tug-of-war while reconciling
  try { sh("node -e \"require('child_process').execSync('npx -y tsx scripts/infra/status.ts set running --detail \\\"reconciling\\\"', {stdio:'ignore'})\""); } catch {}

  const goal = await loadJson(path.join(repoRoot, 'infra', 'GOAL.json'));
  const bookkeeping = new Set(goal.bookkeepingPaths || []);

  const q = await loadJson(qPath);
  const dlq = await loadJson(dlqPath);

  const todos = q.queue.filter((t) => t.status === 'todo');
  if (!todos.length) {
    console.log('noop: no todo tasks');
    return;
  }

  for (const task of todos) {
    try {
    let changed;
    try {
      changed = await applyTask(task);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.startsWith('unknown_task:')) {
        task.status = 'blocked';
        task.blockedAt = new Date().toISOString();
        task.error = msg;
        dlq.items.push({ id: task.id, at: new Date().toISOString(), error: msg });
        await saveJson(qPath, q);
        await saveJson(dlqPath, dlq);
        console.log(`blocked: ${task.id} (${msg})`);
        continue;
      }
      throw e;
    }
    if (!changed) {
      task.status = 'done';
      task.doneAt = new Date().toISOString();
      await saveJson(qPath, q);
      console.log(`noop: task already applied -> ${task.id}`);
      return;
    }

    // Ensure only allowed paths changed.
    const files = sh('git status --porcelain').split('\n').filter(Boolean).map(l => l.trim().replace(/^[?MADRCU! ]+\s+/, ''));
    const outside = files.filter(f => !task.allowedPaths.some(p => f.startsWith(p)) && !f.startsWith('infra/STATUS.json') && !bookkeeping.has(f) && !f.startsWith('infra/') && f !== 'scripts/infra/reconcile.js');
    if (outside.length) throw new Error(`changed_outside_allowed:${outside.join(',')}`);

    sh('git add scripts/state/verify-company-states.ts');
    sh(`git commit -m "${task.commitMessage.replace(/\"/g,'')}"`);

    task.status = 'done';
    task.doneAt = new Date().toISOString();
    await saveJson(qPath, q);
    console.log(`ok: ${task.id}`);
    return;
  } catch (e) {
    task.status = 'blocked';
    task.blockedAt = new Date().toISOString();
    task.error = String(e?.message || e);
    dlq.items.push({ id: task.id, at: new Date().toISOString(), error: task.error });
    await saveJson(qPath, q);
    await saveJson(dlqPath, dlq);
    console.log(`blocked: ${task.id} (${task.error})`);
    continue;
  }
  }

  // If we got here, we only hit blocked unknown tasks.
  return;
}

main();