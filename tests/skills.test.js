'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Skills = require('../js/skills.js');
const data = require('../data/videos.json');

const { steps, videos } = data;
const ids = (step, depth) =>
  videos.filter((v) => v.step === step && v.depth === depth).map((v) => v.id);
const core = (step) => ids(step, 'core');
const allCore = () => videos.filter((v) => v.depth === 'core').map((v) => v.id);
const run = (watched) => {
  const skills = Skills.computeSkills(steps, videos, new Set(watched));
  return { skills, states: skills.map((s) => s.state), level: Skills.levelOf(skills) };
};

test('nothing watched: only skill 1 is unlocked, level 0', () => {
  const r = run([]);
  assert.deepEqual(r.states, ['unlocked', 'locked', 'locked', 'locked', 'locked']);
  assert.equal(r.level, 0);
});

test('skill 1 core videos watched: skill 1 mastered, 2 and 3 unlocked, level 1', () => {
  const r = run(core(1));
  assert.deepEqual(r.states, ['mastered', 'unlocked', 'unlocked', 'locked', 'locked']);
  assert.equal(r.level, 1);
});

test('one core video of skill 2 watched: skill 2 is in progress', () => {
  const r = run([...core(1), core(2)[0]]);
  assert.equal(r.states[0], 'mastered');
  assert.equal(r.states[1], 'progress');
});

test('skill 4 needs BOTH 2 and 3: still locked when only 1 and 2 are mastered', () => {
  const r = run([...core(1), ...core(2)]);
  assert.equal(r.states[1], 'mastered');
  assert.notEqual(r.states[2], 'mastered');
  assert.equal(r.states[3], 'locked');
});

test('bonus (deep) videos do not count toward mastery', () => {
  const deep = ids(1, 'deep');
  assert.ok(deep.length > 0, 'skill 1 should have a deep video');
  const r = run(deep);
  assert.notEqual(r.states[0], 'mastered');
  assert.equal(r.level, 0);
});

test('all core videos watched: everything mastered, level 5', () => {
  const r = run(allCore());
  assert.deepEqual(r.states, ['mastered', 'mastered', 'mastered', 'mastered', 'mastered']);
  assert.equal(r.level, 5);
});

test('soft lock (current behaviour): watching all core of skill 5 alone masters it even though 4 is not', () => {
  const r = run(core(5));
  assert.equal(r.states[4], 'mastered');
  assert.equal(r.states[3], 'locked');
});

test('depthMap gives {1:1,2:2,3:2,4:3,5:4}', () => {
  assert.deepEqual(Skills.depthMap(steps), { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 });
});

test('levelName maps levels to names', () => {
  assert.equal(Skills.levelName(0), 'Novice');
  assert.equal(Skills.levelName(5), 'Architect');
});

test('data integrity', () => {
  const stepIds = new Set(steps.map((s) => s.id));
  for (const v of videos) {
    assert.ok(stepIds.has(v.step), `video ${v.id} has unknown step ${v.step}`);
    assert.ok(['core', 'deep'].includes(v.depth), `video ${v.id} has bad depth ${v.depth}`);
    assert.ok(['foundation', 'general', 'claude-code'].includes(v.type), `video ${v.id} has bad type ${v.type}`);
  }
  for (const s of steps) {
    for (const r of s.requires || []) assert.ok(stepIds.has(r), `step ${s.id} requires unknown ${r}`);
  }
  assert.equal(new Set(videos.map((v) => v.id)).size, videos.length, 'video ids must be unique');
});
