import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeekStartKey, getWeeklyQuestionTotal } from './weeklyGoal.js';

test('Istanbul week begins Monday at local midnight', () => {
  assert.equal(getWeekStartKey('2026-11-15T20:59:59Z'), '2026-11-09');
  assert.equal(getWeekStartKey('2026-11-15T21:00:00Z'), '2026-11-16');
});

test('weekly progress excludes earlier weeks and preserves the target period', () => {
  const logs = [
    { created_at: '2026-11-15T20:59:59Z', questions_solved: 40 },
    { created_at: '2026-11-15T21:00:00Z', questions_solved: 12 },
    { created_at: '2026-11-16T10:00:00Z', questions_solved: '8' },
    { created_at: 'invalid', questions_solved: 99 },
  ];
  assert.equal(getWeeklyQuestionTotal(logs, '2026-11-16T12:00:00Z'), 20);
  assert.equal(getWeeklyQuestionTotal(logs, '2026-11-23T12:00:00Z'), 0);
});
