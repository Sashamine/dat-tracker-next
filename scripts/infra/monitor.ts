#!/usr/bin/env node
/**
 * Deterministic infra monitor.
 * Emits either OK... or ALERT... lines based on repo + infra/STATUS.json.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type Mode = 'running' | 'blocked' | 'idle' | 'done';

type Status = {
  schemaVersion: string;
  mode: Mode;
  task: string;
  detail: string;
  blockedReason: string | null;
  neededDecision: string | null;
  defaultAction: string | null;
  lastProgressAt: string | null;
  updatedAt: string | null;
};

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

function ageMinutes(isoOrNull: string | null, nowMs: number): number | null {
  if (!isoOrNull) return null;
  const t = Date.parse(isoOrNull);
  if (!Number.isFinite(t)) return null;
  return Math.floor((nowMs - t) / 60000);
}

function ageMinutesFromEpochSeconds(sec: number, nowMs: number): number {
  return Math.floor((nowMs - sec * 1000) / 60000);
}

function main() {
  const repoRoot = process.cwd();
  const statusPath = path.join(repoRoot, 'infra', 'STATUS.json');
  const st = JSON.parse(fs.readFileSync(statusPath, 'utf8')) as Status;

  const nowMs = Date.now();

  const lastCommitEpoch = Number(sh("git log -1 --pretty=format:%ct"));
  const lastCommitAgeMin = ageMinutesFromEpochSeconds(lastCommitEpoch, nowMs);
  // Meaningful progress (goal-aware)
  let meaningfulCommitAgeMin: number | null = null;
  try {
    const mc = sh('node scripts/infra/meaningful-commit.mjs');
    const mcEpoch = Number(sh(`git log -1 --pretty=format:%ct ${mc}`));
    meaningfulCommitAgeMin = ageMinutesFromEpochSeconds(mcEpoch, nowMs);
  } catch {
    meaningfulCommitAgeMin = null;
  }

  const dirtyCount = Number(sh('git status --porcelain | wc -l'));

  const progressAgeMin = ageMinutes(st.lastProgressAt, nowMs);
  const updatedAgeMin = ageMinutes(st.updatedAt, nowMs);

  // thresholds (minutes)
  const DIRTY_SOFT_MIN = 15;
  const STALE_MIN = 30;
  const VERY_STALE_MIN = 60;

  const alerts: string[] = [];

  if (st.mode === 'running') {
    const progAge = (progressAgeMin ?? VERY_STALE_MIN);
    const mcAge = (meaningfulCommitAgeMin ?? lastCommitAgeMin);
    if (progAge >= STALE_MIN && mcAge >= STALE_MIN) {
      alerts.push(`running-but-stale>=${STALE_MIN}m`);
    }

    // Uncommitted work is fragile: warn earlier when dirty.
    if (dirtyCount > 0 && lastCommitAgeMin >= DIRTY_SOFT_MIN) {
      alerts.push(`dirty-tree>=${DIRTY_SOFT_MIN}m`);
    }

    if (dirtyCount > 0 && lastCommitAgeMin >= STALE_MIN) {
      alerts.push(`dirty-tree>=${STALE_MIN}m`);
    }

    if ((updatedAgeMin ?? VERY_STALE_MIN) >= VERY_STALE_MIN && lastCommitAgeMin >= VERY_STALE_MIN) {
      alerts.push(`possible-hidden-block>=${VERY_STALE_MIN}m`);
    }
  }

  const head = sh("git log -1 --pretty=format:'%h %s'");

  const base = `mode=${st.mode} | detail=${st.detail || '(none)'} | meaningfulCommitAgeMin=${meaningfulCommitAgeMin ?? 'na'} | commitAgeMin=${lastCommitAgeMin} | progressAgeMin=${progressAgeMin ?? 'na'} | dirty=${dirtyCount} | head=${head}`;

  if (alerts.length) {
    console.log(`ALERT ${alerts.join(',')} | ${base}`);
  } else {
    console.log(`OK | ${base}`);
  }
}

main();
