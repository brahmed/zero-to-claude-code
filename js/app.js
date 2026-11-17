(function () {
  'use strict';

  var KEY = 'z2cc:watched';
  var CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TYPES = { foundation: 'Foundation', general: 'General', 'claude-code': 'Claude Code' };
  var STATE_LABEL = { mastered: 'Mastered', progress: 'In progress', unlocked: 'Unlocked', locked: 'Locked' };
  var TIMES = [
    { id: 'le10', label: '≤10 min', test: function (m) { return m <= 10; } },
    { id: 'mid', label: '10–30', test: function (m) { return m > 10 && m <= 30; } },
    { id: 'gt30', label: '30+', test: function (m) { return m > 30; } },
    { id: 'any', label: 'Any', test: function () { return true; } }
  ];
  var SVGNS = 'http://www.w3.org/2000/svg';

  var Skills = window.Skills;
  var LEVELS = Skills.LEVELS;
  var computeSkills = Skills.computeSkills;
  var levelOf = Skills.levelOf;
  var depthMap = Skills.depthMap;

  /* ---------- app ---------- */

  var data = { steps: [], videos: [] };
  var skills = [];
  var watched = loadWatched();
  var selectedId = null;
  var filters = { time: 'any', types: {}, channel: '', hide: false };
  var toastTimer = null;
  var $ = function (id) { return document.getElementById(id); };

  function loadWatched() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
  }
  function saveWatched() {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(watched))); } catch (e) { /* storage unavailable */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtDate(s) {
    var p = String(s || '').split('-');
    var m = parseInt(p[1], 10);
    return p[0] && m >= 1 && m <= 12 ? MONTHS[m - 1] + ' ' + p[0] : '';
  }
  function watchUrl(id) { return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id); }
  function circ(id) { return CIRCLED[id - 1] || String(id); }
  function stepById(id) { return data.steps.filter(function (s) { return s.id === id; })[0]; }
  function skillById(id) { return skills.filter(function (s) { return s.id === id; })[0]; }
  function dependents(id) {
    return data.steps.filter(function (s) { return (s.requires || []).indexOf(id) !== -1; });
  }
  function joinList(arr, word) {
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' ' + word + ' ' + arr[arr.length - 1];
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------- cards ---------- */

  function infoIcon() {
    var s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    svg('circle', { cx: 12, cy: 12, r: 9 }, s);
    svg('path', { d: 'M12 11v5M12 8h.01', 'stroke-linecap': 'round' }, s);
    return s;
  }

  function card(v, showSkill) {
    var c = el('article', 'card');
    c.dataset.id = v.id;

    var thumb = el('a', 'thumb');
    thumb.href = watchUrl(v.id);
    thumb.target = '_blank';
    thumb.rel = 'noopener noreferrer';
    var img = el('img');
    img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/mqdefault.jpg';
    img.alt = 'Thumbnail: ' + v.title;
    img.loading = 'lazy';
    img.width = 320; img.height = 180;
    thumb.appendChild(img);
    thumb.appendChild(el('span', 'dur', v.minutes + ' min'));
    c.appendChild(thumb);

    var body = el('div', 'body');
    if (showSkill) {
      var st = stepById(v.step);
      if (st) body.appendChild(el('p', 'card-eyebrow', 'Skill ' + circ(st.id) + ' · ' + st.title));
    }
    var h = el('h3', 'title');
    var a = el('a', null, v.title);
    a.href = watchUrl(v.id);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    h.appendChild(a);
    body.appendChild(h);
    var date = fmtDate(v.published);
    body.appendChild(el('p', 'byline', v.channel + (date ? ' · ' + date : '')));

    var chips = el('div', 'chips');
    chips.appendChild(el('span', 'tchip t-' + v.type, TYPES[v.type] || v.type));
    if (v.depth === 'deep') chips.appendChild(el('span', 'tchip t-bonus', 'Bonus quest'));
    body.appendChild(chips);

    if (v.why) body.appendChild(el('p', 'why', v.why));
    (v.notes || []).forEach(function (n) {
      var p = el('p', 'note');
      p.appendChild(infoIcon());
      p.appendChild(el('span', null, n));
      body.appendChild(p);
    });
    if (typeof v.rating === 'number' && v.rating >= 1 && v.rating <= 5) {
      var r = Math.round(v.rating);
      var s = el('span', 'stars', '★'.repeat(r) + '☆'.repeat(5 - r));
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', 'Curator rating: ' + v.rating + ' out of 5');
      body.appendChild(s);
    }

    var btn = el('button', 'watch-btn');
    btn.type = 'button';
    btn.addEventListener('click', function () { toggle(v.id); });
    body.appendChild(btn);
    c.appendChild(body);
    syncCard(c);
    return c;
  }

  function syncCard(c) {
    var on = watched.has(c.dataset.id);
    var btn = c.querySelector('.watch-btn');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = '';
    var s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    if (on) svg('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }, s);
    else svg('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }, s);
    btn.appendChild(s);
    btn.appendChild(el('span', null, on ? 'Done' : 'Mark watched'));
  }

  /* ---------- toggle / refresh ---------- */

  function toggle(id) {
    var before = skills;
    if (watched.has(id)) watched.delete(id); else watched.add(id);
    saveWatched();
    skills = computeSkills(data.steps, data.videos, watched);
    document.querySelectorAll('.card').forEach(syncCard);
    renderHeader();
    renderTree();
    renderSelectedHead();
    maybeToast(before, skills);
    if (filters.hide) renderBrowse(); else updateBrowseCount();
  }

  function maybeToast(before, after) {
    after.forEach(function (s, i) {
      if (s.state !== 'mastered' || before[i].state === 'mastered') return;
      var unlocked = data.steps.filter(function (st) {
        var cur = skillById(st.id), prev = before.filter(function (b) { return b.id === st.id; })[0];
        return prev.state === 'locked' && cur.state !== 'locked';
      }).map(function (st) { return st.title; });
      var msg = 'Skill mastered: ' + stepById(s.id).title +
        (unlocked.length ? ' — ' + joinList(unlocked, 'and') + ' unlocked!' : '!');
      showToast(msg);
    });
  }
  function showToast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4000);
  }

  /* ---------- header ---------- */

  function renderHeader() {
    var totalCore = skills.reduce(function (n, s) { return n + s.total; }, 0);
    var doneCore = skills.reduce(function (n, s) { return n + s.done; }, 0);
    var lvl = levelOf(skills);
    $('eyebrow').textContent = 'Skill tree · ' + plural(skills.length, 'skill', 'skills') + ' · ' + plural(totalCore, 'quest', 'quests');
    $('level-num').textContent = 'Level ' + lvl;
    $('level-name').textContent = LEVELS[Math.min(lvl, LEVELS.length - 1)];
    $('quests-line').textContent = doneCore + ' / ' + totalCore + ' quests done';
    $('next-line').textContent = lvl >= LEVELS.length - 1 || lvl >= skills.length ? 'Max level' : 'Next: ' + LEVELS[lvl + 1];
    var pct = totalCore ? Math.round(doneCore / totalCore * 100) : 0;
    $('progress-fill').style.width = pct + '%';
    $('progress-bar').setAttribute('aria-valuenow', String(pct));
    var b = $('badge');
    b.textContent = '';
    var s = svg('svg', { viewBox: '0 0 48 52' }, b);
    svg('polygon', { points: '24,2 45,14 45,38 24,50 3,38 3,14', fill: 'var(--accent)' }, s);
    var t = svg('text', { x: 24, y: 33, 'text-anchor': 'middle', fill: '#fff', 'font-size': 22, 'font-weight': 700, 'font-family': 'Space Grotesk, system-ui, sans-serif' }, s);
    t.textContent = String(lvl);
  }

  /* ---------- tree ---------- */

  function nodeIcon(s) {
    var ic = svg('svg', { viewBox: '0 0 34 34', 'class': 'node-icon', 'aria-hidden': 'true' });
    if (s.state === 'mastered') {
      svg('circle', { cx: 17, cy: 17, r: 15, 'class': 'ic-white' }, ic);
      svg('path', { d: 'M10 17.5l5 5 9-10.5', 'class': 'ic-check' }, ic);
    } else if (s.state === 'locked') {
      svg('rect', { x: 9, y: 15, width: 16, height: 12, rx: 3, 'class': 'ic-lock' }, ic);
      svg('path', { d: 'M12.5 15v-3.5a4.5 4.5 0 019 0V15', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 }, ic);
    } else {
      var R = 14, C = 2 * Math.PI * R;
      svg('circle', { cx: 17, cy: 17, r: R, 'class': 'ic-bg' }, ic);
      if (s.state === 'progress' && s.total) {
        svg('circle', {
          cx: 17, cy: 17, r: R, 'class': 'ic-arc', transform: 'rotate(-90 17 17)',
          'stroke-dasharray': (C * s.done / s.total) + ' ' + C
        }, ic);
      }
      var t = svg('text', { x: 17, y: 21, 'text-anchor': 'middle', 'class': 'ic-num' }, ic);
      t.textContent = String(s.id);
    }
    return ic;
  }

  function statusText(s) {
    if (s.state === 'locked') {
      var reqs = (stepById(s.id).requires || []).filter(function (r) { var k = skillById(r); return !k || k.state !== 'mastered'; });
      return 'Locked · needs ' + reqs.map(circ).join(' + ');
    }
    return STATE_LABEL[s.state] + ' · ' + s.done + ' / ' + (s.state === 'mastered' ? s.total + ' quests' : s.total);
  }
  function subText(s) {
    if (s.bonus) return '+' + plural(s.bonus, 'bonus quest', 'bonus quests');
    if (!dependents(s.id).length) return 'Final skill';
    return s.minutes + ' min core';
  }

  function renderTree() {
    var tree = $('tree');
    var hadFocus = tree.contains(document.activeElement) ? document.activeElement.dataset.skill : null;
    tree.textContent = '';
    var W = tree.clientWidth;
    if (!W || !skills.length) return;
    var desktop = window.matchMedia('(min-width: 720px)').matches;
    var H = desktop ? 112 : 96;
    var GAP = desktop ? 56 : 40;
    var depth = depthMap(data.steps);
    var rows = [];
    data.steps.forEach(function (st) { (rows[depth[st.id] - 1] = rows[depth[st.id] - 1] || []).push(st.id); });
    rows = rows.filter(Boolean);
    var maxCols = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
    var NW = Math.min(240, Math.floor(W / maxCols) - (desktop ? 12 : 8));
    var pos = {};
    rows.forEach(function (r, ri) {
      r.forEach(function (id, i) {
        pos[id] = { x: Math.round(W * (i + 0.5) / r.length), y: ri * (H + GAP) };
      });
    });
    var total = rows.length * H + (rows.length - 1) * GAP;
    tree.style.height = total + 'px';

    var sv = svg('svg', { 'class': 'lines', width: W, height: total, 'aria-hidden': 'true' }, tree);
    var defs = svg('defs', {}, sv);
    ['on', 'off'].forEach(function (k) {
      var m = svg('marker', { id: 'arrow-' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs);
      svg('path', { d: 'M0 1l9 4-9 4z', 'class': 'arrow-' + k }, m);
    });
    data.steps.forEach(function (st) {
      (st.requires || []).forEach(function (pid) {
        var p = pos[pid], c = pos[st.id];
        if (!p || !c) return;
        var on = skillById(pid).state === 'mastered';
        var y1 = p.y + H, y2 = c.y, my = y1 + GAP / 2;
        svg('path', {
          d: 'M' + p.x + ' ' + y1 + 'V' + my + 'H' + c.x + 'V' + (y2 - 2),
          'class': 'line ' + (on ? 'on' : 'off'),
          'marker-end': 'url(#arrow-' + (on ? 'on' : 'off') + ')'
        }, sv);
      });
    });

    skills.forEach(function (s) {
      var st = stepById(s.id);
      var b = el('button', 'node ' + s.state);
      b.type = 'button';
      b.dataset.skill = s.id;
      b.style.width = NW + 'px';
      b.style.height = H + 'px';
      b.style.left = (pos[s.id].x - NW / 2) + 'px';
      b.style.top = pos[s.id].y + 'px';
      b.setAttribute('aria-pressed', s.id === selectedId ? 'true' : 'false');
      b.setAttribute('aria-label', 'Skill ' + s.id + ': ' + st.title + '. ' + statusText(s));
      var head = el('span', 'node-head');
      head.appendChild(nodeIcon(s));
      head.appendChild(el('span', 'node-title', st.title));
      b.appendChild(head);
      b.appendChild(el('span', 'node-status', statusText(s)));
      b.appendChild(el('span', 'node-sub', subText(s)));
      b.addEventListener('click', function () {
        selectedId = s.id;
        renderTree();
        renderSelected();
        var again = tree.querySelector('[data-skill="' + s.id + '"]');
        if (again) again.focus();
      });
      tree.appendChild(b);
    });
    if (hadFocus) {
      var f = tree.querySelector('[data-skill="' + hadFocus + '"]');
      if (f) f.focus();
    }
  }

  /* ---------- selected skill ---------- */

  function renderSelectedHead() {
    var s = skillById(selectedId);
    if (!s) return;
    var st = stepById(s.id);
    $('sel-eyebrow').textContent = 'Skill ' + circ(s.id) + ' · ' + STATE_LABEL[s.state];
    $('sel-pill').textContent = s.done + ' / ' + s.total + ' done';
    var help;
    if (s.state === 'locked') {
      var need = (st.requires || []).filter(function (r) { return skillById(r).state !== 'mastered'; }).map(circ);
      help = 'Locked: master ' + joinList(need, 'and') + ' first — you can still watch these.';
    } else if (s.state === 'mastered') {
      help = 'Skill mastered. All ' + plural(s.total, 'quest', 'quests') + ' done.';
    } else {
      var deps = dependents(s.id).map(function (d) { return circ(d.id); });
      help = 'Complete all ' + plural(s.total, 'quest', 'quests') + ' to master it' +
        (deps.length ? ' and unlock ' + joinList(deps, 'and') : '') + '.';
    }
    $('sel-help').textContent = help;
  }

  function renderSelected() {
    var root = $('selected');
    root.textContent = '';
    var st = stepById(selectedId);
    if (!st) return;
    root.appendChild(Object.assign(el('p', 'sel-eyebrow'), { id: 'sel-eyebrow' }));
    var head = el('div', 'sel-head');
    head.appendChild(el('h2', null, st.title));
    head.appendChild(Object.assign(el('span', 'pill'), { id: 'sel-pill' }));
    root.appendChild(head);
    if (st.subtitle) root.appendChild(el('p', 'sel-sub', st.subtitle));
    root.appendChild(Object.assign(el('p', 'sel-help'), { id: 'sel-help' }));
    var vs = data.videos.filter(function (v) { return v.step === st.id; });
    vs.filter(function (v) { return v.depth === 'core'; }).forEach(function (v) { root.appendChild(card(v, false)); });
    var bonus = vs.filter(function (v) { return v.depth !== 'core'; });
    if (bonus.length) {
      root.appendChild(el('h3', 'bonus-h', 'Bonus quests'));
      bonus.forEach(function (v) { root.appendChild(card(v, false)); });
    }
    renderSelectedHead();
  }

  function defaultSelection() {
    var pick = skills.filter(function (s) { return s.state !== 'mastered' && s.state !== 'locked'; })[0];
    return pick ? pick.id : (skills[0] && skills[0].id);
  }

  /* ---------- browse ---------- */

  function chip(label, pressed, onClick) {
    var b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }

  function renderFilters() {
    var ft = $('f-time');
    ft.querySelectorAll('.chip').forEach(function (n) { n.remove(); });
    TIMES.forEach(function (t) {
      ft.appendChild(chip(t.label, filters.time === t.id, function () {
        filters.time = t.id; renderFilters(); renderBrowse();
      }));
    });
    var fy = $('f-type');
    fy.querySelectorAll('.chip').forEach(function (n) { n.remove(); });
    Object.keys(TYPES).forEach(function (k) {
      fy.appendChild(chip(TYPES[k], !!filters.types[k], function () {
        if (filters.types[k]) delete filters.types[k]; else filters.types[k] = true;
        renderFilters(); renderBrowse();
      }));
    });
    $('f-channel').value = filters.channel;
    $('f-hide').checked = filters.hide;
  }

  function initChannels() {
    var sel = $('f-channel');
    var seen = {}, names = [];
    data.videos.forEach(function (v) { if (!seen[v.channel]) { seen[v.channel] = 1; names.push(v.channel); } });
    names.sort(function (a, b) { return a.localeCompare(b); });
    sel.textContent = '';
    var all = el('option', null, 'All YouTubers');
    all.value = '';
    sel.appendChild(all);
    names.forEach(function (n) { var o = el('option', null, n); o.value = n; sel.appendChild(o); });
    sel.addEventListener('change', function () { filters.channel = sel.value; renderBrowse(); });
    $('f-hide').addEventListener('change', function (e) { filters.hide = e.target.checked; renderBrowse(); });
    $('f-clear').addEventListener('click', function () {
      filters = { time: 'any', types: {}, channel: '', hide: false };
      renderFilters(); renderBrowse();
    });
  }

  var browseList = [];
  function matching() {
    var time = TIMES.filter(function (t) { return t.id === filters.time; })[0];
    var anyType = Object.keys(filters.types).length > 0;
    return data.videos.filter(function (v) {
      return time.test(v.minutes) &&
        (!anyType || filters.types[v.type]) &&
        (!filters.channel || v.channel === filters.channel) &&
        !(filters.hide && watched.has(v.id));
    });
  }
  function updateBrowseCount() {
    var mins = browseList.reduce(function (s, v) { return s + v.minutes; }, 0);
    $('browse-count').textContent = plural(browseList.length, 'video', 'videos') + ' · ' + mins + ' min total';
  }
  function renderBrowse() {
    browseList = matching();
    var root = $('browse-list');
    root.textContent = '';
    browseList.forEach(function (v) { root.appendChild(card(v, true)); });
    updateBrowseCount();
    $('browse-empty').hidden = browseList.length !== 0;
  }

  /* ---------- tabs ---------- */

  function initTabs() {
    var tabs = [$('tab-tree'), $('tab-browse')];
    var panels = [$('panel-tree'), $('panel-browse')];
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', j === i ? 'true' : 'false');
        t.tabIndex = j === i ? 0 : -1;
        panels[j].hidden = j !== i;
      });
      if (i === 0) renderTree();
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          select((i + 1) % tabs.length, true);
          e.preventDefault();
        }
      });
    });
  }

  initTabs();
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(renderTree);
  });
  fetch('data/videos.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      data = d;
      skills = computeSkills(data.steps, data.videos, watched);
      selectedId = defaultSelection();
      initChannels();
      renderHeader();
      renderTree();
      renderSelected();
      renderFilters();
      renderBrowse();
    })
    .catch(function () { $('error').hidden = false; });
})();
