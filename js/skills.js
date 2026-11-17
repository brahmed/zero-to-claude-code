(function () {
  'use strict';

  var LEVELS = ['Novice', 'Apprentice', 'Builder', 'Engineer', 'Expert', 'Architect'];

  // Pure skill-tree logic: no DOM, no storage.
  // state: mastered | locked | progress | unlocked
  function computeSkills(steps, videos, watched) {
    var out = steps.map(function (st) {
      var core = videos.filter(function (v) { return v.step === st.id && v.depth === 'core'; });
      var bonus = videos.filter(function (v) { return v.step === st.id && v.depth !== 'core'; });
      var done = core.filter(function (v) { return watched.has(v.id); }).length;
      return {
        id: st.id, done: done, total: core.length, bonus: bonus.length,
        minutes: core.reduce(function (s, v) { return s + v.minutes; }, 0),
        mastered: core.length > 0 && done === core.length
      };
    });
    var byId = {};
    out.forEach(function (s) { byId[s.id] = s; });
    out.forEach(function (s, i) {
      var reqs = steps[i].requires || [];
      var locked = reqs.some(function (r) { return !byId[r] || !byId[r].mastered; });
      s.state = s.mastered ? 'mastered' : locked ? 'locked' : s.done > 0 ? 'progress' : 'unlocked';
    });
    return out;
  }
  function levelOf(skills) {
    return skills.filter(function (s) { return s.state === 'mastered'; }).length;
  }
  function depthMap(steps) {
    var byId = {}, memo = {};
    steps.forEach(function (s) { byId[s.id] = s; });
    function d(id) {
      if (memo[id]) return memo[id];
      memo[id] = 1; // guards against cycles
      var reqs = (byId[id] && byId[id].requires) || [];
      var m = 0;
      reqs.forEach(function (r) { m = Math.max(m, d(r)); });
      return (memo[id] = 1 + m);
    }
    steps.forEach(function (s) { d(s.id); });
    return memo;
  }

  function levelName(n) {
    return LEVELS[Math.max(0, Math.min(n, LEVELS.length - 1))];
  }

  var Skills = {
    LEVELS: LEVELS,
    computeSkills: computeSkills,
    levelOf: levelOf,
    levelName: levelName,
    depthMap: depthMap
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Skills; else window.Skills = Skills;
})();
