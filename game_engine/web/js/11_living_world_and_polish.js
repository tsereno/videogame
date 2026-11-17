/**
 * Living World & Sandbox Systems (Tiers 1-7)
 * Skill-driven client runtime powered by aeonward-living-world SKILL.md & client CC-ELM.
 */
(function () {
  'use strict';

  const LW_STATE = {
    lastLw: null,
    seenFxIds: new Set(),
    elevY: 0,
    vy: 0,
    groundedAt: 0,
    jumpBufferUntil: 0,
    gliding: false,
    climbing: false,
    grapple: null,
    buildMode: false,
    buildPiece: 'cozy_hearth',
    photoMode: false,
    photoFilter: 'none',
    photoYaw: 0.4,
    photoPitch: 0.35,
    photoDist: 170,
    gallery: [],
    sparks: [],
    group3D: null,
    activeMountMeshes: {},
    crowdMesh: null,
    crowdAgents: [],
    lastCrowdRoom: '',
    lastDyeApplied: '',
    rtcPeers: {},
    localStream: null,
    lastVoicePoll: 0,
    voiceEnabled: false,
    localAction: null,
    climbTarget: null,
    mountedDragon: false,
    actionsDrawerOpen: false,
    sleepSparkAt: 0,
  };
  window.__LW_STATE__ = LW_STATE;

  function _findDynGrp(id) {
    return (typeof threeDynamicEntities !== 'undefined' && Array.isArray(threeDynamicEntities))
      ? threeDynamicEntities.find(g => g && g.userData && g.userData.entityId === id) : null;
  }

  function _mountForPlayer(eid, mountsMap) {
    if (!mountsMap) return null;
    if (mountsMap[eid]) return { mount: mountsMap[eid], driverId: eid, isPassenger: false };
    for (const [did, m] of Object.entries(mountsMap)) {
      if (m && Array.isArray(m.passengers) && m.passengers.includes(eid)) {
        return { mount: m, driverId: did, isPassenger: true };
      }
    }
    return null;
  }

  try {
    const savedGal = localStorage.getItem('lw_postcards_v1');
    if (savedGal) LW_STATE.gallery = JSON.parse(savedGal) || [];
  } catch (e) {}

  function _lwClient() {
    return (typeof getClientSkillClientCfg === 'function') ? (getClientSkillClientCfg() || {}) : ((window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.client) || {});
  }
  function _lwCfg() {
    return (window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.living_world) || {};
  }
  function _pid() { return (typeof myPlayerId !== 'undefined' && myPlayerId) ? myPlayerId : 'player_1'; }
  function _roomW() { return (typeof current3DData !== 'undefined' && current3DData && current3DData.width) || 1024; }
  function _roomH() { return (typeof current3DData !== 'undefined' && current3DData && current3DData.height) || 768; }
  function _worldX(gx) { return gx - _roomW() * 0.5; }
  function _worldZ(gy) { return gy - _roomH() * 0.5; }
  function _groundY(wx, wz) { return (typeof window.getOpenWorldTerrainHeight === 'function') ? window.getOpenWorldTerrainHeight(wx, wz) : 0; }

  async function lwAction(action, body = {}) {
    try {
      const r = await fetch('/api/living_world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, player_id: _pid(), ...body }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (data.message && typeof appendLog === 'function') appendLog(data.message, action === 'weapon_skill' ? 'log-combat' : 'log-item');
      if (data.player_x !== undefined && data.player_y !== undefined && typeof lastPlayerPos !== 'undefined') {
        lastPlayerPos.x = data.player_x; lastPlayerPos.y = data.player_y;
        if (typeof updateLocal3DEntityPosition === 'function') updateLocal3DEntityPosition(_pid(), data.player_x, data.player_y, data.player_facing || (typeof lastFacing !== 'undefined' ? lastFacing : 'east'));
      }
      if (data.combat_info && data.combat_info.hit) {
        const ci = data.combat_info;
        if (typeof triggerWeaponSwing === 'function') triggerWeaponSwing(_pid(), /bow|staff|scepter/i.test(ci.weapon || ''), 280);
        if (typeof spawnAeonwardFloatingDamage === 'function') spawnAeonwardFloatingDamage(ci.target_x || (lastPlayerPos.x + 60), ci.target_y || lastPlayerPos.y, `-${ci.damage}`, ci.is_crit ? 'crit' : 'hit');
      } else if (typeof window.triggerHandInteraction === 'function' && /craft|build|repair|gather|use|equip|mount|warm/i.test(action)) {
        window.triggerHandInteraction(_pid(), /craft|build|repair/.test(action) ? 'craft' : (/gather|use|equip/.test(action) ? 'take' : 'warm'), 540);
      }
      if (action === 'dismount') {
        LW_STATE.mountedDragon = false;
        if (window.__dragonCtrl && window.__dragonCtrl.dismount) window.__dragonCtrl.dismount();
      }
      if (typeof applyCommonServerDelta === 'function') applyCommonServerDelta(data, { updateRoomOnTransitionOnly: true });
      if (data.scene_3d) {
        if (typeof current3DData !== 'undefined') current3DData = data.scene_3d;
        if (data.scene_3d.living_world) onLivingWorldPayload(data.scene_3d.living_world);
        if (typeof syncRoomEntitiesFromDelta === 'function') syncRoomEntitiesFromDelta(data.scene_3d, true);
        lwRenderWorldOverlays(data.scene_3d);
      }
      if (LW_STATE.panelOpen) renderHubTab();
      return data;
    } catch (e) { console.warn('lwAction error:', e); return null; }
  }
  window.lwAction = lwAction;

  async function lwPing(kind = 'look', label = '') {
    const px = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.x : 512;
    const py = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.y : 384;
    try {
      const r = await fetch('/api/ping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: _pid(), kind, x: px, y: py, label }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.living_world) onLivingWorldPayload(d.living_world);
        if (typeof sfx !== 'undefined' && sfx.playChime && d.ping) sfx.playChime(d.ping.chime || 'ping_look');
        if (typeof appendLog === 'function' && d.ping) appendLog(`📍 Ping: ${d.ping.icon} ${d.ping.label}`, 'log-item');
      }
    } catch (e) {}
  }
  window.lwPing = lwPing;

  // =========================================================================
  // 1. PORTABLE HERO & 1-CLICK INVITE LINK (?join=...)
  // =========================================================================
  window.lwCopyInviteLink = async function lwCopyInviteLink() {
    try {
      const r = await fetch('/api/hero_profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: _pid(), mode: 'export' }),
      });
      const d = r.ok ? await r.json() : { profile: {} };
      const prof = d.profile || {};
      try { localStorage.setItem('lw_portable_hero_v1', JSON.stringify(prof)); } catch (e) {}
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(prof))));
      const baseOrigin = window.__DND_PUBLIC_URL__ || location.origin;
      const url = `${baseOrigin}${location.pathname}?join=${encodeURIComponent(currentRoomId || '')}&hero=${encodeURIComponent(b64)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
      if (typeof appendLog === 'function') appendLog(`🔗 [INVITE LINK COPIED]: Share to drop friends in beside you with Portable Hero intact! ${url.slice(0, 88)}...`, 'log-item');
      lwShowToast('🔗 Invite link & Portable Hero copied!');
    } catch (e) { console.warn(e); }
  };

  window.__lwCheckInviteJoin = function () {
    try {
      const params = new URLSearchParams(location.search);
      const joinRoom = params.get('join');
      const heroParam = params.get('hero');
      let profile = null;
      if (heroParam) {
        profile = JSON.parse(decodeURIComponent(escape(atob(heroParam))));
      } else {
        const saved = localStorage.getItem('lw_portable_hero_v1');
        if (saved && joinRoom) profile = JSON.parse(saved);
      }
      if (!joinRoom && !heroParam) return false;
      sessionStorage.setItem('dnd_chosen_archetype_idx', String((profile && profile.archetype_index) ?? 0));
      fetch('/api/join_squad', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: _pid(), room: joinRoom || undefined, profile }),
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return;
        if (data.scene_3d && typeof update3DScene === 'function') update3DScene(data.scene_3d);
        if (typeof closeCharacterModal === 'function') closeCharacterModal();
        if (typeof appendLog === 'function') appendLog(`✨ [DROP-IN JOIN]: Materialized beside your squad${joinRoom ? ' in ' + joinRoom : ''} with portable hero!`, 'log-player');
        lwShowToast('✨ Dropped in beside squad!');
      }).catch(() => {});
      return true;
    } catch (e) { return false; }
  };

  // =========================================================================
  // 2. VISCERAL HIT-STOP, SPARKS, CHIMES & FORGIVING MOVEMENT TOYS
  // =========================================================================
  window.spawnHitSparks3D = function spawnHitSparks3D(wx, wy, wz, colorHex = 0xffcc44, count = 14) {
    if (typeof THREE === 'undefined' || typeof threeRoomGroup === 'undefined' || !threeRoomGroup) return;
    if (!LW_STATE.sparkGeo) LW_STATE.sparkGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
      const m = new THREE.Mesh(LW_STATE.sparkGeo, mat);
      m.position.set(wx, Math.max(4, wy), wz);
      threeRoomGroup.add(m);
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 65;
      LW_STATE.sparks.push({
        mesh: m, mat, vx: Math.cos(a) * spd, vy: 28 + Math.random() * 52, vz: Math.sin(a) * spd,
        life: 0.42 + Math.random() * 0.25, age: 0,
      });
    }
  };

  function handleFxEvent(ev) {
    if (!ev || (ev.id && LW_STATE.seenFxIds.has(ev.id))) return;
    if (ev.id) {
      LW_STATE.seenFxIds.add(ev.id);
      if (LW_STATE.seenFxIds.size > 200) {
        const first = LW_STATE.seenFxIds.values().next().value;
        LW_STATE.seenFxIds.delete(first);
      }
    }
    const wx = ev.x !== undefined ? _worldX(ev.x) : 0;
    const wz = ev.y !== undefined ? _worldZ(ev.y) : 0;
    const gy = _groundY(wx, wz) + 12;
    if (ev.chime && typeof sfx !== 'undefined' && sfx.playChime) sfx.playChime(ev.chime, { x: wx, y: gy, z: wz });
    if (ev.kind === 'hit_impact') {
      window.__lwHitStopUntil = performance.now() + (ev.is_crit ? 72 : 44);
      if (typeof currentShake !== 'undefined') currentShake = { intensity: ev.is_crit ? 20 : 12, duration: ev.is_crit ? 280 : 170, startTime: performance.now() };
      window.spawnHitSparks3D(wx, gy, wz, ev.is_crit ? 0xffdd55 : 0xff8833, ev.is_crit ? 18 : 10);
    } else if (ev.kind === 'loot_pickup' || ev.kind === 'loot_drop' || ev.kind === 'loot_burst') {
      window.spawnHitSparks3D(wx, gy + 6, wz, ev.color || 0xffd700, 16);
      lwShowToast(`✨ ${ev.rarity ? ev.rarity.toUpperCase() + ': ' : ''}${ev.item || 'Treasure!'}`);
    } else if (ev.kind === 'combo_detonate') {
      window.spawnHitSparks3D(wx, gy + 8, wz, ev.color || 0xff6622, 24);
      if (typeof currentShake !== 'undefined') currentShake = { intensity: 18, duration: 280, startTime: performance.now() };
      lwShowToast(`⚡ ${ev.title || 'TEAM COMBO!'}`);
    } else if (ev.kind === 'revive') {
      window.spawnHitSparks3D(wx, gy + 8, wz, 0x7ee787, 18);
      lwShowToast('❤️‍🔥 Clutch Revive!');
    } else if (ev.kind === 'downed') {
      lwShowToast(`🩹 ${ev.name || 'Ally'} downed — press [E] to revive!`);
    } else if (ev.kind === 'parry' || ev.kind === 'parry_clash') {
      window.__lwHitStopUntil = performance.now() + 85;
      window.spawnHitSparks3D(wx, gy + 12, wz, 0xfff088, 22);
      lwShowToast('🛡️✨ TIMED PARRY — FOE STAGGERED!');
    } else if (ev.kind === 'dodge' || ev.kind === 'dodge_roll') {
      window.spawnHitSparks3D(wx, gy + 4, wz, 0x58a6ff, 12);
    } else if (ev.kind === 'telegraph') {
      window.spawnHitSparks3D(wx, gy + 8, wz, 0xff3b30, 14);
      lwShowToast(`⚠️ ${ev.monster || 'Enemy'} winds up! [Q] Parry / [R] Dodge`);
    } else if (ev.kind === 'bounty_complete') {
      lwShowToast(`📜🏆 Bounty Claimed: ${ev.title}!`);
    } else if (ev.kind === 'breach' || ev.kind === 'collapse' || ev.kind === 'breach_shatter' || ev.kind === 'tower_collapse') {
      if (typeof currentShake !== 'undefined') currentShake = { intensity: 22, duration: 350, startTime: performance.now() };
      window.spawnHitSparks3D(wx, gy + 12, wz, 0xaa8866, 26);
    }
  }

  function triggerJump() {
    const now = performance.now();
    const canJump = LW_STATE.elevY <= 1.0 || (now - LW_STATE.groundedAt) <= 165; // Coyote time 165ms
    if (canJump) {
      const mount = LW_STATE.lastLw && LW_STATE.lastLw.mounts && LW_STATE.lastLw.mounts[_pid()];
      const lab = LW_STATE.lastLw && LW_STATE.lastLw.labyrinth;
      let jMult = (mount && mount.jump_mult) ? mount.jump_mult : 1.0;
      if (lab && lab.curse === 'low_gravity') jMult *= 1.55;
      LW_STATE.vy = 92 * jMult;
      LW_STATE.elevY = Math.max(0.5, LW_STATE.elevY);
      LW_STATE.jumpBufferUntil = 0;
      if (typeof sfx !== 'undefined' && sfx.playChime) sfx.playChime('jump');
    } else {
      LW_STATE.jumpBufferUntil = now + 150; // Input buffer 150ms
    }
  }

  function triggerGrapple() {
    const px = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.x : 512;
    const py = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.y : 384;
    const fStr = (typeof lastFacing !== 'undefined' ? lastFacing : 'east').toLowerCase();
    let dx = (fStr.includes('east') ? 1 : fStr.includes('west') ? -1 : 0);
    let dz = (fStr.includes('south') ? 1 : fStr.includes('north') ? -1 : 0);
    if (!dx && !dz) dx = 1;
    const m = Math.hypot(dx, dz) || 1;
    const tx = px + (dx / m) * 210, ty = py + (dz / m) * 210;
    LW_STATE.grapple = { startX: px, startY: py, endX: tx, endY: ty, t: 0 };
    LW_STATE.elevY = Math.max(LW_STATE.elevY, 18);
    LW_STATE.vy = 26;
    if (typeof sfx !== 'undefined' && sfx.playChime) sfx.playChime('grapple_zip');
    if (typeof doMoveStep === 'function') doMoveStep((tx - px), (ty - py));
    lwShowToast('🪝 Grappling Hook Zip!');
  }

  function _lookupCharAction(q) {
    const cat = (window.__DND_CLIENT_SKILLS__ && Array.isArray(window.__DND_CLIENT_SKILLS__.action_catalog))
      ? window.__DND_CLIENT_SKILLS__.action_catalog : [];
    const raw = String(q || '').trim().toLowerCase();
    if (!raw || !cat.length) return null;
    const norm = raw.replace(/[^a-z0-9\s]/g, ' ').trim();
    const normUs = norm.replace(/\s+/g, '_');
    let found = cat.find(a => a.id === normUs || a.id === norm || String(a.label || '').toLowerCase() === norm);
    if (found) return found;
    found = cat.find(a => (a.aliases || '').split(/\s+/).some(al => al && (al.replace(/_/g, ' ') === norm || ((al.includes('_') || al.length >= 4) && norm.includes(al.replace(/_/g, ' '))))));
    return found || null;
  }

  window.__lwTriggerLocalAction = function (query, pid = null) {
    const act = _lookupCharAction(query);
    if (!act) return null;
    const now = performance.now();
    const wx = (typeof lastPlayerPos !== 'undefined') ? _worldX(lastPlayerPos.x) : 0;
    const wz = (typeof lastPlayerPos !== 'undefined') ? _worldZ(lastPlayerPos.y) : 0;
    const fStr = (typeof lastFacing !== 'undefined' ? lastFacing : 'east').toLowerCase();
    let fx = fStr.includes('east') ? 1 : fStr.includes('west') ? -1 : 0;
    let fz = fStr.includes('south') ? 1 : fStr.includes('north') ? -1 : 0;
    if (!fx && !fz) fx = 1;
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;

    LW_STATE.localAction = {
      id: act.id, posture: act.posture, phys_mode: act.phys_mode, hand_pose: act.hand_pose,
      label: act.label, icon: act.icon, startedAt: now, endsAt: now + (act.duration || 2.5) * 1000,
    };
    LW_STATE.climbTarget = null;
    window.__lwLocalPosture = act.posture;

    const pm = act.phys_mode || '';
    if (pm === 'jump' || pm === 'double_jump' || pm === 'broad_leap' || pm === 'vault' || pm === 'uppercut_hop' || pm === 'backflip' || pm === 'cartwheel' || pm === 'roll') {
      if (pm === 'double_jump') LW_STATE.elevY = Math.max(LW_STATE.elevY, 12);
      triggerJump();
      if (pm === 'broad_leap' || pm === 'vault' || pm === 'roll') {
        if (typeof doMoveStep === 'function') doMoveStep(fx * 96, fz * 96);
      }
    } else if (pm === 'dash' || pm === 'slide' || pm === 'sidestep' || pm === 'lunge_fwd') {
      if (typeof doMoveStep === 'function') doMoveStep(fx * (pm === 'sidestep' ? -64 : 110), fz * (pm === 'sidestep' ? 64 : 110));
      window.spawnHitSparks3D(wx, _groundY(wx, wz) + 4, wz, 0xc8d8e8, 8);
    } else if (pm === 'climb_tree' || pm === 'climb_ladder' || pm === 'perch') {
      const pool = pm === 'climb_ladder' ? (window.__climbableLadders || []) : (window.__climbableTrees || []);
      let best = null, bestD = 99999;
      for (let i = 0; i < pool.length; i++) {
        const t = pool[i];
        const d = Math.hypot(t.x - wx, t.z - wz);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (best) {
        const stopDist = pm === 'climb_ladder' ? 6 : 10;
        const dx = best.x - wx, dz = best.z - wz, dist = Math.hypot(dx, dz) || 1;
        const tx = best.x - (dx / dist) * stopDist, tz = best.z - (dz / dist) * stopDist;
        const nGx = Math.max(24, Math.min(_roomW() - 24, tx + _roomW() * 0.5));
        const nGy = Math.max(24, Math.min(_roomH() - 24, tz + _roomH() * 0.5));
        if (typeof startTacticalMouseMovement === 'function') startTacticalMouseMovement(nGx, nGy);
        else if (typeof doMoveStep === 'function') doMoveStep(nGx - lastPlayerPos.x, nGy - lastPlayerPos.y);
        const topElev = Math.max(32, Math.min(62, (best.topY || 48) - _groundY(best.x, best.z)));
        LW_STATE.climbTarget = { kind: pm, x: nGx - _roomW() * 0.5, z: nGy - _roomH() * 0.5, topElev, perching: pm === 'perch', startedAt: now };
      } else {
        LW_STATE.climbing = true;
      }
    } else if (pm === 'drop_down') {
      LW_STATE.climbing = false; LW_STATE.climbTarget = null;
    } else if (pm === 'hunt_lunge') {
      const victim = (window.__outdoorWildlifeCtrl && window.__outdoorWildlifeCtrl.slayNearest)
        ? window.__outdoorWildlifeCtrl.slayNearest(wx, wz) : null;
      if (victim) {
        const vx = victim.x - wx, vz = victim.z - wz, vd = Math.hypot(vx, vz) || 1;
        if (vd > 24 && typeof doMoveStep === 'function') {
          const step = Math.min(180, vd - 18);
          doMoveStep((vx / vd) * step, (vz / vd) * step);
        }
        window.spawnHitSparks3D(victim.x, _groundY(victim.x, victim.z) + 4, victim.z, 0xff5a36, 16);
      }
      if (typeof triggerWeaponSwing === 'function') triggerWeaponSwing(pid || _pid(), false, 380);
    } else if (act.id === 'build_campfire' || act.id === 'roast_meat' || act.id === 'cook_stew') {
      if (window.__dragonCtrl && window.__dragonCtrl.igniteAt) {
        window.__dragonCtrl.igniteAt(wx + fx * 34, wz + fz * 34, 11, 20);
      }
    } else if (act.id === 'summon_dragon') {
      if (window.__dragonCtrl && window.__dragonCtrl.land) window.__dragonCtrl.land();
    } else if (act.id === 'mount_dragon') {
      LW_STATE.mountedDragon = true;
      if (window.__dragonCtrl && window.__dragonCtrl.mount) window.__dragonCtrl.mount();
    } else if (act.id === 'dragon_fire') {
      if (window.__dragonCtrl && window.__dragonCtrl.breatheFire) window.__dragonCtrl.breatheFire(2.6);
    } else if (pm === 'swing' || pm === 'heavy_cleave' || pm === 'spin_attack' || pm === 'chop') {
      if (typeof triggerWeaponSwing === 'function') triggerWeaponSwing(pid || _pid(), false, 360);
    } else if (pm === 'snap_shot' || pm === 'aim_slow') {
      if (typeof triggerWeaponSwing === 'function') triggerWeaponSwing(pid || _pid(), true, 300);
    } else if (act.id === 'grapple') {
      triggerGrapple();
    }
    return act;
  };

  window.lwRunCharAction = async function lwRunCharAction(actionId) {
    const act = window.__lwTriggerLocalAction(actionId, _pid());
    if (act) lwShowToast(`${act.icon || '✨'} ${act.label}`);
    return lwAction('char_action', { action_id: actionId });
  };

  function _applyPostureKinematics(grp, ch, posture, physMode, ageSec, durSec, nowMs, isLocal, baseScale) {
    const setLimb = (typeof _setLimbPitch === 'function') ? _setLimbPitch : null;
    const t = nowMs * 0.001;
    let yOff = 0, rotX = 0, rotZ = 0, rotYExtra = 0;
    const ud = grp.userData;
    const isMovingEnt = (ud.smoothedSpeed || 0) > 0.4;

    if (posture === 'kneel') {
      yOff = -8.2; rotX = 0.14;
      if (setLimb) {
        setLimb(ud.lLeg, -1.12); setLimb(ud.rLeg, 0.48);
        setLimb(ud.lShin, 1.38); setLimb(ud.rShin, 1.15);
        setLimb(ud.lArm, -0.36); setLimb(ud.rArm, -0.58);
      }
    } else if (posture === 'crouch' || posture === 'sneak') {
      yOff = -7.0; rotX = posture === 'sneak' ? 0.34 : 0.24;
      const walkSwing = isMovingEnt ? Math.sin(t * 9.5) * 0.45 : 0;
      if (setLimb) {
        setLimb(ud.lLeg, -1.02 + walkSwing); setLimb(ud.rLeg, -1.02 - walkSwing);
        setLimb(ud.lShin, 1.32); setLimb(ud.rShin, 1.32);
        setLimb(ud.lArm, -0.55 - walkSwing * 0.5); setLimb(ud.rArm, -0.55 + walkSwing * 0.5);
      }
    } else if (posture === 'crawl') {
      yOff = -9.6; rotX = 1.26;
      const cw = isMovingEnt ? Math.sin(t * 7.5) * 0.55 : Math.sin(t * 2.2) * 0.15;
      if (setLimb) {
        setLimb(ud.lArm, -1.25 + cw); setLimb(ud.rArm, -1.25 - cw);
        setLimb(ud.lLeg, -0.35 - cw); setLimb(ud.rLeg, -0.35 + cw);
      }
    } else if (posture === 'sleep') {
      yOff = -10.5; rotX = -Math.PI * 0.47; rotZ = 0.08;
      if (setLimb) {
        setLimb(ud.lLeg, 0.08); setLimb(ud.rLeg, -0.10);
        setLimb(ud.lArm, -0.35 + Math.sin(t * 1.4) * 0.05); setLimb(ud.rArm, -0.65);
      }
      if (isLocal && (nowMs - (LW_STATE.sleepSparkAt || 0)) > 950) {
        LW_STATE.sleepSparkAt = nowMs;
        window.spawnHitSparks3D(grp.position.x, grp.position.y + 8, grp.position.z, 0x79c0ff, 2);
      }
    } else if (posture === 'sit') {
      yOff = -5.4;
      if (setLimb) {
        setLimb(ud.lLeg, -1.24); setLimb(ud.rLeg, -1.24);
        setLimb(ud.lShin, 1.30); setLimb(ud.rShin, 1.30);
        setLimb(ud.lArm, -0.45); setLimb(ud.rArm, -0.45);
      }
    } else if (posture === 'meditate') {
      yOff = 6.5 + Math.sin(t * 2.4) * 2.2;
      if (setLimb) {
        setLimb(ud.lLeg, -1.20); setLimb(ud.rLeg, -1.20);
        setLimb(ud.lShin, 1.42); setLimb(ud.rShin, 1.42);
        setLimb(ud.lArm, -0.78); setLimb(ud.rArm, -0.78);
        setLimb(ud.lForeArm, -0.55); setLimb(ud.rForeArm, -0.55);
      }
    } else if (posture === 'climb_tree' || posture === 'climb_ladder') {
      const cPh = t * 8.5;
      rotX = 0.08;
      if (setLimb) {
        setLimb(ud.lArm, -2.05 + Math.sin(cPh) * 0.65);
        setLimb(ud.rArm, -2.05 - Math.sin(cPh) * 0.65);
        setLimb(ud.lLeg, -0.75 - Math.sin(cPh) * 0.55);
        setLimb(ud.rLeg, -0.75 + Math.sin(cPh) * 0.55);
        setLimb(ud.lShin, 0.95); setLimb(ud.rShin, 0.95);
      }
    } else if (posture === 'defend' || posture === 'parry') {
      yOff = -2.2; rotX = 0.10;
      if (setLimb) {
        setLimb(ud.lArm, -1.10); setLimb(ud.lForeArm, -0.68);
        setLimb(ud.rArm, -0.52); setLimb(ud.rForeArm, -0.45);
        setLimb(ud.lLeg, -0.35); setLimb(ud.rLeg, 0.28);
      }
    } else if (posture === 'backflip' || posture === 'roll') {
      const p = Math.min(1, ageSec / Math.max(0.55, durSec));
      rotX = (posture === 'backflip' ? -1 : 1) * p * Math.PI * 2;
    } else if (posture === 'cartwheel') {
      const p = Math.min(1, ageSec / Math.max(0.65, durSec));
      rotZ = p * Math.PI * 2;
      if (setLimb) { setLimb(ud.lArm, -2.7); setLimb(ud.rArm, -2.7); }
    } else if (posture === 'spin') {
      rotYExtra = Math.min(1, ageSec / Math.max(0.6, durSec)) * Math.PI * 2.5;
      if (setLimb) { setLimb(ud.lArm, -1.4); setLimb(ud.rArm, -1.4); }
    } else if (posture === 'wave') {
      if (setLimb) {
        setLimb(ud.rArm, -2.35 + Math.sin(t * 11) * 0.35);
        setLimb(ud.rForeArm, -0.45 + Math.cos(t * 11) * 0.35);
      }
    } else if (posture === 'highfive' || posture === 'fistbump' || posture === 'hug') {
      if (posture === 'highfive') yOff = Math.abs(Math.sin(t * 10)) * 5.2;
      if (setLimb) {
        setLimb(ud.rArm, posture === 'highfive' ? -1.85 : (posture === 'fistbump' ? -1.35 : -1.05));
        if (posture === 'hug') setLimb(ud.lArm, -1.05);
      }
    } else if (posture === 'salute') {
      if (setLimb) { setLimb(ud.rArm, -1.45); setLimb(ud.rForeArm, -1.45); }
    } else if (posture === 'bow') {
      rotX = 0.56 * Math.sin(Math.min(1, ageSec / 1.1) * Math.PI * 0.5);
      if (setLimb) { setLimb(ud.lArm, -0.35); setLimb(ud.rArm, -0.35); }
    } else if (posture === 'cheer') {
      yOff = Math.abs(Math.sin(t * 8)) * 4.5;
      if (setLimb) {
        setLimb(ud.lArm, -2.35 + Math.sin(t * 9) * 0.25);
        setLimb(ud.rArm, -2.35 - Math.sin(t * 9) * 0.25);
      }
    } else if (posture === 'clap') {
      const cA = -0.85 + Math.sin(t * 15) * 0.22;
      if (setLimb) { setLimb(ud.lArm, cA); setLimb(ud.rArm, cA); setLimb(ud.lForeArm, -0.7); setLimb(ud.rForeArm, -0.7); }
    } else if (posture === 'dance') {
      yOff = Math.abs(Math.sin(t * 7.5)) * 3.0;
      rotZ = Math.sin(t * 4.2) * 0.14;
      if (setLimb) {
        setLimb(ud.lArm, -1.1 + Math.sin(t * 8.4) * 0.75);
        setLimb(ud.rArm, -1.1 - Math.sin(t * 8.4) * 0.75);
        setLimb(ud.lLeg, Math.sin(t * 7.5) * 0.36);
        setLimb(ud.rLeg, -Math.sin(t * 7.5) * 0.36);
      }
    } else if (posture === 'point') {
      if (setLimb) { setLimb(ud.rArm, -1.48); setLimb(ud.rForeArm, 0.05); }
    } else if (posture === 'shrug') {
      yOff = 0.6;
      if (setLimb) { setLimb(ud.lArm, -0.92); setLimb(ud.rArm, -0.92); setLimb(ud.lForeArm, -0.85); setLimb(ud.rForeArm, -0.85); }
    } else if (posture === 'warm') {
      if (setLimb) { setLimb(ud.lArm, -0.82); setLimb(ud.rArm, -0.82); setLimb(ud.lForeArm, -0.28); setLimb(ud.rForeArm, -0.28); }
    } else if (posture === 'instrument') {
      rotZ = Math.sin(t * 5.2) * 0.09;
      if (setLimb) { setLimb(ud.lArm, -0.78); setLimb(ud.rArm, -0.78 + Math.sin(t * 12) * 0.25); }
    } else if (posture === 'eat') {
      if (setLimb) { setLimb(ud.rArm, -1.05 + Math.sin(t * 7) * 0.25); setLimb(ud.rForeArm, -1.05); }
    } else if (posture === 'fly') {
      rotX = 0.24;
      if (setLimb) { setLimb(ud.lArm, -1.25); setLimb(ud.rArm, -1.25); setLimb(ud.lLeg, 0.28); setLimb(ud.rLeg, 0.28); }
    }
    if (isLocal) {
      ch.position.y = Math.max(-11.0, (LW_STATE.elevY || 0) + yOff);
      window.__lwPostureYOffset = yOff;
    } else {
      ch.position.y = yOff;
    }
    if (physMode === 'sprint' || posture === 'run') {
      rotX = Math.max(rotX, 0.18);
    }
    ch.rotation.x = rotX;
    ch.rotation.z = rotZ;
    if (rotYExtra) ch.rotation.y += rotYExtra;
    if (baseScale) ch.scale.setScalar(baseScale);
  }

  window.__lwTick = function (dtSec, nowMs) {
    // 1. Physics: Gravity, Dragon Aerial Flight, Tree/Ladder Climbing, Mount Speed, 108 Action Postures
    const lab = LW_STATE.lastLw && LW_STATE.lastLw.labyrinth;
    const grav = (lab && lab.curse === 'low_gravity') ? 95 : 225;
    const mountsMap = (LW_STATE.lastLw && LW_STATE.lastLw.mounts) || {};
    const myMountInfo = _mountForPlayer(_pid(), mountsMap);
    const activeMount = mountsMap[_pid()];
    if (activeMount && activeMount.key === 'ash_drake' && window.__dragonCtrl && !LW_STATE.mountedDragon) {
      LW_STATE.mountedDragon = true;
      window.__dragonCtrl.mount();
    }
    const dragonState = (window.__dragonCtrl && window.__dragonCtrl.getState) ? window.__dragonCtrl.getState() : null;
    const ridingSkyDragon = Boolean(LW_STATE.mountedDragon && dragonState && dragonState.ridden);
    window.__mountedSkyDragon = ridingSkyDragon;
    window.__lwRidingSpeed = Boolean(myMountInfo) || ridingSkyDragon;

    const actNow = LW_STATE.localAction && (nowMs < LW_STATE.localAction.endsAt) ? LW_STATE.localAction : null;
    if (LW_STATE.localAction && !actNow) {
      LW_STATE.localAction = null;
      LW_STATE.climbTarget = null;
      window.__lwLocalPosture = null;
      window.__lwPostureYOffset = 0;
    }

    let spdMult = (activeMount && activeMount.speed_mult) ? activeMount.speed_mult : (ridingSkyDragon ? 1.85 : 1.0);
    if (actNow && actNow.phys_mode === 'sprint') spdMult = Math.max(spdMult, 1.58);
    else if (actNow && (actNow.posture === 'crouch' || actNow.posture === 'sneak')) spdMult *= 0.65;
    if (LW_STATE.gliding) spdMult = Math.max(spdMult, 1.55);
    if (lab && lab.curse === 'hyper_tempo') spdMult *= 1.35;
    window.__lwSpeedMult = spdMult;

    const ak = (typeof activeKeys !== 'undefined' && activeKeys) ? activeKeys : null;
    if (ridingSkyDragon) {
      const climbPressed = ak && (ak.has(' ') || ak.has('j'));
      const divePressed = ak && (ak.has('c') || ak.has('x'));
      if (climbPressed) {
        LW_STATE.vy = 92;
      } else if (divePressed) {
        LW_STATE.vy = -88;
      } else if (LW_STATE.elevY > 2) {
        LW_STATE.vy += (-12 - LW_STATE.vy * 0.85) * dtSec;
      }
      LW_STATE.elevY = Math.max(0, Math.min(260, LW_STATE.elevY + LW_STATE.vy * dtSec));
      if (LW_STATE.elevY <= 0.1) LW_STATE.vy = 0;
    } else if (LW_STATE.climbTarget) {
      const ct = LW_STATE.climbTarget;
      const curPx = (typeof lastPlayerPos !== 'undefined') ? _worldX(lastPlayerPos.x) : ct.x;
      const curPz = (typeof lastPlayerPos !== 'undefined') ? _worldZ(lastPlayerPos.y) : ct.z;
      const distLeft = Math.hypot(curPx - ct.x, curPz - ct.z);
      if (distLeft > 36 && (nowMs - (ct.startedAt || 0)) > 4500) {
        LW_STATE.climbTarget = null;
      } else {
        const tgtElev = ct.topElev || 48;
        if (distLeft <= 42 || (nowMs - (ct.startedAt || 0)) > 1100) {
          if (LW_STATE.elevY < tgtElev) LW_STATE.elevY = Math.min(tgtElev, LW_STATE.elevY + 34 * dtSec);
        }
        LW_STATE.vy = 0;
      }
    } else if (LW_STATE.climbing) {
      LW_STATE.elevY = Math.min(72, LW_STATE.elevY + 38 * dtSec);
      LW_STATE.vy = 0;
    } else if (LW_STATE.elevY > 0 || LW_STATE.vy > 0) {
      LW_STATE.vy -= grav * dtSec;
      if (LW_STATE.gliding && LW_STATE.vy < -14) LW_STATE.vy = -14;
      LW_STATE.elevY += LW_STATE.vy * dtSec;
      if (LW_STATE.elevY <= 0) {
        LW_STATE.elevY = 0;
        LW_STATE.vy = 0;
        LW_STATE.gliding = false;
        LW_STATE.groundedAt = nowMs;
        if (LW_STATE.jumpBufferUntil > nowMs) triggerJump();
      }
    } else {
      LW_STATE.groundedAt = nowMs;
    }
    window.__lwLocalElevation = LW_STATE.elevY;

    // Apply local elevation, dragon riding posture & 108 action kinematics
    if (typeof threeDynamicEntities !== 'undefined' && Array.isArray(threeDynamicEntities)) {
      const playersById = {};
      ((typeof current3DData !== 'undefined' && current3DData && current3DData.players) || []).forEach(pl => { if (pl) playersById[pl.id] = pl; });
      const monById = {};
      ((typeof current3DData !== 'undefined' && current3DData && current3DData.monsters) || []).forEach(m => { if (m) monById[m.id] = m; });
      for (const grp of threeDynamicEntities) {
        const ch = grp.userData && (grp.userData.charGrp || grp.userData.charGroup);
        if (!ch) continue;
        const eid = grp.userData.entityId;
        const isLocal = (eid === _pid());
        const pData = playersById[eid];
        if (pData || isLocal) {
          const isDowned = Boolean(pData && pData.is_downed);
          const mInfo = pData ? _mountForPlayer(eid, mountsMap) : null;
          if (isLocal && ridingSkyDragon && !isDowned) {
            grp.userData.isDoingAction = true;
            ch.position.x = 0; ch.position.z = 0;
            ch.position.y = LW_STATE.elevY + 7.4;
            ch.rotation.x = LW_STATE.elevY > 4 ? 0.14 : 0.04;
            ch.rotation.z = 0;
            if (typeof _setLimbPitch === 'function') {
              _setLimbPitch(grp.userData.lLeg, -0.82); _setLimbPitch(grp.userData.rLeg, -0.82);
              if (grp.userData.lShin) _setLimbPitch(grp.userData.lShin, 0.88);
              if (grp.userData.rShin) _setLimbPitch(grp.userData.rShin, 0.88);
              if (!grp.userData.isSwinging && !grp.userData.isInteracting) {
                if (grp.userData.lArm) _setLimbPitch(grp.userData.lArm, -0.62);
                if (grp.userData.rArm) _setLimbPitch(grp.userData.rArm, -0.62);
              }
            }
            if (!grp.userData._reinsHandsApplied && typeof window.poseCharacterHands === 'function') {
              window.poseCharacterHands(grp, 'reins', 'reins');
              grp.userData._reinsHandsApplied = true;
            }
            grp.userData._wasRiding = true;
          } else if (!isDowned && mInfo) {
            const mg = LW_STATE.activeMountMeshes && LW_STATE.activeMountMeshes[mInfo.driverId];
            if (!mInfo.isPassenger && mg) {
              const elevY = isLocal ? LW_STATE.elevY : 0;
              const spd = grp.userData.smoothedSpeed || 0;
              const moving = spd > 0.25;
              const phase = nowMs * 0.012;
              const swing = moving ? Math.sin(phase) * 0.48 : 0;
              const bob = moving ? Math.abs(Math.sin(phase * 2)) * 1.1 : Math.sin(nowMs * 0.0028) * 0.25;
              mg.position.set(grp.position.x, grp.position.y + elevY + bob, grp.position.z);
              mg.rotation.y = ch.rotation.y || 0;
              mg.userData._trotBob = bob;
              const refs = mg.userData && mg.userData.refs;
              if (refs) {
                if (refs.leg_fl) refs.leg_fl.rotation.x = swing;
                if (refs.leg_br) refs.leg_br.rotation.x = swing;
                if (refs.leg_fr) refs.leg_fr.rotation.x = -swing;
                if (refs.leg_bl) refs.leg_bl.rotation.x = -swing;
                if (refs.headPivot) {
                  refs.headPivot.rotation.x = moving ? (Math.sin(phase * 2) * 0.08 + 0.06) : (Math.sin(nowMs * 0.0022) * 0.09);
                  refs.headPivot.rotation.y = moving ? 0 : Math.sin(nowMs * 0.0014) * 0.16;
                }
                if (refs.tailPivot) refs.tailPivot.rotation.y = Math.sin(nowMs * (moving ? 0.012 : 0.004)) * 0.28;
              }
            }
            const saddleY = (mg && mg.userData && mg.userData.saddleY) || (mInfo.mount && mInfo.mount.saddle_y) || 12.2;
            const mountBob = (mg && mg.userData && mg.userData._trotBob) || 0;
            ch.position.y = (saddleY - 9.8) + mountBob + (isLocal ? LW_STATE.elevY : 0);
            if (mInfo.isPassenger && mg) {
              ch.position.x = (mg.position.x - grp.position.x) - Math.sin(mg.rotation.y) * 5.8;
              ch.position.z = (mg.position.z - grp.position.z) - Math.cos(mg.rotation.y) * 5.8;
              ch.rotation.y = mg.rotation.y;
            } else {
              ch.position.x = 0; ch.position.z = 0;
            }
            ch.rotation.x = (grp.userData.smoothedSpeed || 0) > 0.25 ? 0.08 : 0.02;
            if (typeof _setLimbPitch === 'function') {
              _setLimbPitch(grp.userData.lLeg, -0.78); _setLimbPitch(grp.userData.rLeg, -0.78);
              if (grp.userData.lShin) _setLimbPitch(grp.userData.lShin, 0.82);
              if (grp.userData.rShin) _setLimbPitch(grp.userData.rShin, 0.82);
              if (!grp.userData.isSwinging && !grp.userData.isInteracting) {
                if (grp.userData.lArm) _setLimbPitch(grp.userData.lArm, -0.46);
                if (grp.userData.rArm) _setLimbPitch(grp.userData.rArm, -0.46);
                if (grp.userData.lForeArm) _setLimbPitch(grp.userData.lForeArm, -0.48);
                if (grp.userData.rForeArm) _setLimbPitch(grp.userData.rForeArm, -0.48);
              }
            }
            if (!grp.userData._reinsHandsApplied && typeof window.poseCharacterHands === 'function') {
              const defH = grp.userData.defaultHandPoses || {};
              window.poseCharacterHands(grp, defH.left === 'none' ? 'reins' : defH.left, defH.right === 'none' || defH.right === 'draw' ? 'reins' : defH.right);
              grp.userData._reinsHandsApplied = true;
            }
            if (grp.userData.lLeg && (!grp.userData.lLeg.userData || !grp.userData.lLeg.userData.baseQuat)) grp.userData.lLeg.rotation.z = -0.24;
            if (grp.userData.rLeg && (!grp.userData.rLeg.userData || !grp.userData.rLeg.userData.baseQuat)) grp.userData.rLeg.rotation.z = 0.24;
            grp.userData._wasRiding = true;
          } else {
            if (grp.userData._wasRiding) {
              grp.userData._wasRiding = false;
              grp.userData._reinsHandsApplied = false;
              grp.userData.isDoingAction = false;
              ch.position.x = 0; ch.position.z = 0; ch.rotation.x = 0; ch.rotation.z = 0;
              if (grp.userData.lLeg && (!grp.userData.lLeg.userData || !grp.userData.lLeg.userData.baseQuat)) grp.userData.lLeg.rotation.z = 0;
              if (grp.userData.rLeg && (!grp.userData.rLeg.userData || !grp.userData.rLeg.userData.baseQuat)) grp.userData.rLeg.rotation.z = 0;
              if (typeof window.poseCharacterHands === 'function' && grp.userData.defaultHandPoses) {
                window.poseCharacterHands(grp, grp.userData.defaultHandPoses.left, grp.userData.defaultHandPoses.right);
              }
            }
            const srvEm = (pData && pData.emote && pData.emote.posture) ? pData.emote : null;
            const activeAct = isLocal ? (actNow || srvEm) : srvEm;
            if (isDowned) {
              grp.userData.isDoingAction = true;
              ch.position.y = -7; ch.rotation.x = 0.65;
            } else if (activeAct && activeAct.posture) {
              grp.userData.isDoingAction = true;
              const startMs = activeAct.startedAt || ((activeAct.ts || 0) * 1000) || nowMs;
              const ageSec = Math.max(0, (nowMs - startMs) * 0.001);
              const durSec = activeAct.duration || (activeAct.endsAt ? Math.max(0.6, (activeAct.endsAt - startMs) * 0.001) : 2.5);
              _applyPostureKinematics(grp, ch, activeAct.posture, activeAct.phys_mode || '', ageSec, durSec, nowMs, isLocal, grp.userData.baseCharScale);
              if (activeAct.hand_pose && typeof window.poseCharacterHands === 'function') {
                const hp = activeAct.hand_pose === 'none' ? (grp.userData.defaultHandPoses?.right || 'none') : activeAct.hand_pose;
                window.poseCharacterHands(grp, hp, hp);
                grp.userData._emoteHands = true;
              }
            } else {
              if (grp.userData.isDoingAction) {
                grp.userData.isDoingAction = false;
                ch.rotation.x = 0; ch.rotation.z = 0;
              }
              if (isLocal) {
                ch.position.y += LW_STATE.elevY;
                window.__lwPostureYOffset = 0;
              }
              if (grp.userData._emoteHands && typeof window.poseCharacterHands === 'function' && grp.userData.defaultHandPoses) {
                window.poseCharacterHands(grp, grp.userData.defaultHandPoses.left, grp.userData.defaultHandPoses.right);
                grp.userData._emoteHands = false;
              }
            }
          }
        }
        const mData = monById[eid];
        if (mData && mData.is_staggered) {
          ch.rotation.z = Math.sin(nowMs * 0.025) * 0.16;
        } else if (mData) {
          ch.rotation.z = 0;
        }
      }
    }

    // Step 3D sparks
    for (let i = LW_STATE.sparks.length - 1; i >= 0; i--) {
      const sp = LW_STATE.sparks[i];
      sp.age += dtSec;
      if (sp.age >= sp.life) {
        if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
        sp.mat.dispose();
        LW_STATE.sparks.splice(i, 1);
        continue;
      }
      sp.vy -= 140 * dtSec;
      sp.mesh.position.x += sp.vx * dtSec;
      sp.mesh.position.y += sp.vy * dtSec;
      sp.mesh.position.z += sp.vz * dtSec;
      sp.mat.opacity = 1.0 - (sp.age / sp.life);
    }

    // Animate autonomous Living World wildlife (deer, wolves, unmounted peddlers)
    if (Array.isArray(LW_STATE.wildlifeAnim)) {
      for (let wi = 0; wi < LW_STATE.wildlifeAnim.length; wi++) {
        const wa = LW_STATE.wildlifeAnim[wi];
        if (!wa.grp || !wa.grp.parent) continue;
        const t = nowMs * 0.001 + wa.phase;
        const roamA = t * (wa.kind === 'wolf' ? 0.48 : (wa.kind === 'peddler' ? 0.22 : 0.30));
        const isGrazing = (wa.kind === 'deer') && ((t % 6.5) > 3.2);
        const tgtX = wa.homeX + (isGrazing ? wa.offX : Math.cos(roamA) * wa.roamR);
        const tgtZ = wa.homeZ + (isGrazing ? wa.offZ : Math.sin(roamA * 0.85) * wa.roamR * 0.75);
        if (!isGrazing) { wa.offX = tgtX - wa.homeX; wa.offZ = tgtZ - wa.homeZ; }
        const vx = (tgtX - wa.curX) * Math.min(1, dtSec * 1.6);
        const vz = (tgtZ - wa.curZ) * Math.min(1, dtSec * 1.6);
        const stepD = Math.hypot(vx, vz) / Math.max(0.001, dtSec);
        wa.curX += vx; wa.curZ += vz;
        const gy = _groundY(wa.curX, wa.curZ);
        const moving = stepD > 1.2 && !isGrazing;
        const trotPhase = t * (wa.kind === 'wolf' ? 9.2 : 6.8);
        const legAmp = moving ? Math.min(0.62, stepD * 0.028 + 0.26) : 0;
        const swing = Math.sin(trotPhase) * legAmp;
        wa.grp.position.set(wa.curX, gy + (moving ? Math.abs(Math.sin(trotPhase * 2)) * 0.45 : 0), wa.curZ);
        if (stepD > 0.6) {
          const desY = Math.atan2(vx, vz);
          let dy = desY - wa.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          wa.yaw += Math.max(-dtSec * 4.0, Math.min(dtSec * 4.0, dy));
        }
        wa.grp.rotation.y = wa.yaw;
        if (wa.legs && wa.legs.length === 4) {
          wa.legs[0].rotation.x = swing;
          wa.legs[3].rotation.x = swing;
          wa.legs[1].rotation.x = -swing;
          wa.legs[2].rotation.x = -swing;
        }
        if (wa.headPivot) {
          if (isGrazing) {
            wa.headPivot.rotation.x = 0.68 + Math.abs(Math.sin(t * 4.2)) * 0.16;
            wa.headPivot.rotation.y = Math.sin(t * 1.1) * 0.26;
          } else {
            wa.headPivot.rotation.x = (moving ? Math.sin(trotPhase * 2) * 0.08 : Math.sin(t * 1.4) * 0.08);
            wa.headPivot.rotation.y = Math.sin(t * (wa.kind === 'wolf' ? 1.8 : 0.9)) * (moving ? 0.20 : 0.44);
          }
        }
        if (wa.ears && wa.ears.length) {
          const ew = Math.sin(t * 5.2) * 0.10;
          wa.ears.forEach((em, ei) => { em.rotation.z = (ei === 0 ? 0.35 : -0.35) + (ei === 0 ? ew : -ew); });
        }
        if (wa.tailPivot) {
          wa.tailPivot.rotation.y = Math.sin(t * (wa.kind === 'wolf' ? 5.2 : 3.4)) * 0.36;
          wa.tailPivot.rotation.x = -0.35 + Math.cos(t * 2.6) * 0.10;
        }
      }
    }

    // Animate beacon rings, bots, pets & crowd InstancedMesh
    if (LW_STATE.group3D) {
      LW_STATE.group3D.children.forEach(c => {
        if (c.userData && c.userData.spinSpeed) c.rotation.y += c.userData.spinSpeed * dtSec;
        if (c.userData && c.userData.bobAmp) c.position.y = (c.userData.baseY || c.position.y) + Math.sin(nowMs * 0.004) * c.userData.bobAmp;
      });
    }
    stepCrowdInstances(dtSec, nowMs);
  };

  window.__lwHandleKey = function (e) {
    if (e.ctrlKey || e.metaKey) return false;
    const k = e.key.toLowerCase();
    if (k === 'k') { window.lwTogglePhotoMode(); return true; }
    if (LW_STATE.photoMode) {
      if (k === 'escape') { window.lwTogglePhotoMode(); return true; }
      if (e.key === 'ArrowLeft' || k === 'a') { LW_STATE.photoYaw -= 0.08; return true; }
      if (e.key === 'ArrowRight' || k === 'd') { LW_STATE.photoYaw += 0.08; return true; }
      if (e.key === 'ArrowUp' || k === 'w') { LW_STATE.photoDist = Math.max(55, LW_STATE.photoDist - 12); return true; }
      if (e.key === 'ArrowDown' || k === 's') { LW_STATE.photoDist = Math.min(420, LW_STATE.photoDist + 12); return true; }
      if (k === 'c' || k === ' ') { lwSnapPostcard(); return true; }
      return false;
    }
    if (k === 'i') { window.lwOpenPanel('hub'); return true; }
    if (k === 'v') { if (typeof window.lwToggleActionsDrawer === 'function') window.lwToggleActionsDrawer(); return true; }
    if (k === 'b') { window.lwToggleBuildMode(); return true; }
    if (k === 'j') { triggerJump(); return true; }
    if (k === 'g') {
      if (e.shiftKey || LW_STATE.elevY <= 1.0) triggerGrapple();
      else { LW_STATE.gliding = !LW_STATE.gliding; lwShowToast(LW_STATE.gliding ? '🪽 Glider Unfurled!' : '🪽 Glider Folded'); }
      return true;
    }
    if (k === 'c') { LW_STATE.climbing = !LW_STATE.climbing; if (!LW_STATE.climbing && LW_STATE.elevY > 0) LW_STATE.vy = 10; lwShowToast(LW_STATE.climbing ? '🧗 Free-Climb Engaged' : '🧗 Released Grip'); return true; }
    if (k === 'q') { lwAction('parry'); return true; }
    if (k === 'r') { lwAction('dodge'); return true; }
    if (k === 'e') {
      const players = (typeof current3DData !== 'undefined' && current3DData && current3DData.players) || [];
      const downed = players.find(pl => pl.is_downed);
      if (downed) { lwAction('revive', { target_id: downed.id }); return true; }
      if (LW_STATE.buildMode) {
        const px = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.x : 512;
        const py = (typeof lastPlayerPos !== 'undefined') ? lastPlayerPos.y : 384;
        lwAction('build', { piece: LW_STATE.buildPiece, x: px, y: py });
        return true;
      }
      const nodes = (LW_STATE.lastLw && LW_STATE.lastLw.nodes) || [];
      if (nodes.some(n => !(n.claimed_by || []).includes(_pid()))) { lwAction('harvest'); return true; }
      lwAction('weapon_skill', { slot: 'e' });
      return true;
    }
    if (k === '1') { lwAction('weapon_skill', { slot: 'q' }); return true; }
    if (k === '2') { lwAction('weapon_skill', { slot: 'e' }); return true; }
    if (k === '3') { lwAction('weapon_skill', { slot: 'r' }); return true; }
    if (k === 'x') { lwAction('cannon'); return true; }
    if (k === 'p') {
      const kinds = Object.keys(_lwClient().world_pings || { look: 1, ambush: 1, loot: 1, regroup: 1 });
      LW_STATE.pingIdx = ((LW_STATE.pingIdx || 0) + 1) % kinds.length;
      lwPing(kinds[LW_STATE.pingIdx]);
      return true;
    }
    if (k === 'f') {
      if (LW_STATE.mountedDragon && window.__dragonCtrl && window.__dragonCtrl.breatheFire) {
        window.__dragonCtrl.breatheFire(2.6);
      } else {
        lwRunCharAction(e.shiftKey ? 'highfive' : 'wave');
      }
      return true;
    }
    return false;
  };

  // =========================================================================
  // 3. 3D SCENE OVERLAYS: PILLARS, LANDMARKS, COMBO FIELDS, PETS, VEHICLES, CROWDS
  // =========================================================================
  function lwRenderWorldOverlays(scene3d) {
    if (typeof THREE === 'undefined' || typeof threeRoomGroup === 'undefined' || !threeRoomGroup || !scene3d) return;
    const cli = _lwClient();
    const lw = scene3d.living_world || LW_STATE.lastLw || {};
    const rid = scene3d.room_id || currentRoomId || '';
    const W = scene3d.width || 1024, H = scene3d.height || 768;
    const ovKey = JSON.stringify([
      rid, scene3d.items, lw.pings, lw.nodes, lw.notes, lw.ghosts, lw.combo_fields,
      lw.mounts, lw.pets, lw.bazaar_rugs, lw.structures, lw.vehicles, lw.chemistry,
      lw.wildlife, lw.destructibles, lw.tunnels, lw.labyrinth && lw.labyrinth.curse,
      (scene3d.monsters || []).map(m => [m.id, m.is_staggered, m.telegraph_radius, m.windup_until]),
      (scene3d.players || []).map(p => [p.id, p.x, p.y, p.appearance])
    ]);
    if (LW_STATE.group3D && LW_STATE.group3D.parent === threeRoomGroup && LW_STATE.lastOvKey === ovKey) {
      return;
    }
    LW_STATE.lastOvKey = ovKey;
    if (LW_STATE.group3D && LW_STATE.group3D.parent) LW_STATE.group3D.parent.remove(LW_STATE.group3D);
    const root = new THREE.Group();
    root.name = 'livingWorldOverlays';
    LW_STATE.group3D = root;
    threeRoomGroup.add(root);

    // A. Tier 1: Loot Rarity Vertical Light Pillars over items
    (scene3d.items || []).forEach(it => {
      const rar = it.rarity || {};
      const col = rar.color || 0xd0d7de;
      const bh = rar.beam_height || 48;
      const wx = _worldX(it.x), wz = _worldZ(it.y), gy = _groundY(wx, wz);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 6.0, bh, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.set(wx, gy + bh * 0.5, wz);
      beam.userData.spinSpeed = 1.1;
      root.add(beam);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(6, 9, 18),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx, gy + 1.2, wz);
      root.add(ring);
    });

    // B. Tier 1 & 5: Magnetic Horizon Landmarks + Biome Mist Accent
    const lms = cli.magnetic_landmarks || {};
    let lmKey = 'smoking_signal_tower';
    if (rid.includes('thorn') || rid.includes('ash')) lmKey = 'ribcage_arch';
    else if (rid.includes('whisper') || rid.includes('mushroom')) lmKey = 'mushroom_grotto';
    else if (rid.includes('tidal') || rid.includes('sunken')) lmKey = 'sunken_citadel';
    else if (rid.includes('solhaven') || rid.includes('star')) lmKey = 'glowing_shrine';
    const lmDef = lms[lmKey];
    if (lmDef && typeof buildSkillPartMeshes === 'function' && Array.isArray(lmDef.parts)) {
      const lmGrp = new THREE.Group();
      buildSkillPartMeshes(lmGrp, lmDef.parts, { shadows: false });
      const lx = W * 0.42, lz = -H * 0.56;
      lmGrp.position.set(lx, _groundY(lx, lz) - 2, lz);
      lmGrp.scale.setScalar(1.35);
      root.add(lmGrp);
    }

    // C. Tier 2: Non-Verbal World Pings
    (lw.pings || []).forEach(pn => {
      if (pn.room && pn.room !== rid) return;
      const wx = _worldX(pn.x), wz = _worldZ(pn.y), gy = _groundY(wx, wz);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 3.2, 95, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: pn.color || 0x58a6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      pillar.position.set(wx, gy + 48, wz);
      pillar.userData.spinSpeed = 2.0;
      root.add(pillar);
    });

    // D. Tier 3: Shared Crystal Resource Nodes, Map Tables, Chalk Notes & Ghost Echoes
    const _scL = window._sculptHelpers || {};
    const _mkMat = (spec) => (typeof window.createRichObjectMaterial === 'function')
      ? window.createRichObjectMaterial(spec)
      : new THREE.MeshStandardMaterial({ color: spec.color ?? 0x808080, roughness: spec.roughness ?? 0.78, metalness: spec.metalness ?? 0.05 });
    const _tintGeoY = (g, botRgb, topRgb) => {
      if (!g || !g.attributes || !g.attributes.position) return g;
      const cg = g.clone();
      cg.computeBoundingBox();
      const bb = cg.boundingBox, minY = bb ? bb.min.y : 0, spanY = bb ? Math.max(0.5, bb.max.y - minY) : 1;
      const pa = cg.attributes.position, cols = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        const t = Math.max(0, Math.min(1, (pa.getY(i) - minY) / spanY));
        cols[i * 3] = botRgb[0] + (topRgb[0] - botRgb[0]) * t;
        cols[i * 3 + 1] = botRgb[1] + (topRgb[1] - botRgb[1]) * t;
        cols[i * 3 + 2] = botRgb[2] + (topRgb[2] - botRgb[2]) * t;
      }
      cg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return cg;
    };
    const _nodeRockGeo = _scL.rock ? _tintGeoY(_scL.rock(8.5, 4.0, 8.0, 2), [0.68, 0.70, 0.72], [1.04, 1.02, 0.98]) : new THREE.DodecahedronGeometry(6, 0);
    (lw.nodes || []).forEach(nd => {
      const unclaimed = !(nd.claimed_by || []).includes(_pid());
      const wx = _worldX(nd.x), wz = _worldZ(nd.y), gy = _groundY(wx, wz);
      const nGrp = new THREE.Group();
      const baseRock = new THREE.Mesh(_nodeRockGeo, _mkMat({ color: 0x454c56, pbrKind: 'stone', roughness: 0.88, vertexColors: true }));
      baseRock.castShadow = true; baseRock.receiveShadow = true;
      const cryBase = _scL.crystal ? _scL.crystal(unclaimed ? 20 : 12, unclaimed ? 3.4 : 2.2, 6, 5) : new THREE.OctahedronGeometry(unclaimed ? 9 : 5.5, 0);
      const cryGeo = _tintGeoY(cryBase, [0.52, 0.62, 0.58], [1.14, 1.22, 1.12]);
      const crystal = new THREE.Mesh(
        cryGeo,
        _mkMat({
          color: unclaimed ? 0x2fb368 : 0x5c6978, pbrKind: 'crystal',
          emissive: unclaimed ? 0x166838 : 0x000000, emissiveIntensity: 0.55,
          roughness: 0.14, vertexColors: true
        })
      );
      crystal.position.y = 2.0; crystal.castShadow = true;
      nGrp.add(baseRock, crystal);
      nGrp.position.set(wx, gy, wz);
      nGrp.userData = { spinSpeed: unclaimed ? 0.65 : 0.1, bobAmp: unclaimed ? 0.8 : 0, baseY: gy, hoverInfo: { name: nd.name, detail: `${nd.yield} (Press [E] to mine — shared per player)`, tag: 'Resource Node', tagClass: 'tag-item' } };
      root.add(nGrp);
    });
    (lw.notes || []).forEach(nt => {
      const wx = _worldX(nt.x), wz = _worldZ(nt.y), gy = _groundY(wx, wz);
      const slate = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 10), new THREE.MeshBasicMaterial({ color: 0xe3b341, transparent: true, opacity: 0.8 }));
      slate.position.set(wx, gy + 0.6, wz);
      slate.userData.hoverInfo = { name: `Chalk Note (${nt.author})`, detail: `"${nt.text}"`, tag: 'Chalk Note', tagClass: 'tag-item' };
      root.add(slate);
    });
    (lw.ghosts || []).forEach(gh => {
      const wx = _worldX(gh.x), wz = _worldZ(gh.y), gy = _groundY(wx, wz);
      const ghGrp = new THREE.Group();
      const ghMat = new THREE.MeshPhysicalMaterial({ color: 0x8cc2ff, emissive: 0x3b78cc, emissiveIntensity: 0.52, roughness: 0.22, transparent: true, opacity: 0.48, depthWrite: false });
      const robeGeo = _scL.lathe ? _scL.lathe([[7.2, 0], [5.2, 6], [4.0, 13], [4.8, 17], [1.8, 19]], 12, 6, 0.12) : new THREE.ConeGeometry(6.5, 22, 10, 1, true);
      const shroud = new THREE.Mesh(robeGeo, ghMat);
      const cowlGeo = _scL.lathe ? _scL.lathe([[4.2, 18], [3.5, 21.5], [2.4, 24.5], [0.2, 26.2]], 10) : new THREE.SphereGeometry(3.8, 10, 8);
      const head = new THREE.Mesh(cowlGeo, ghMat);
      head.rotation.x = 0.22;
      ghGrp.add(shroud, head);
      ghGrp.position.set(wx, gy + 1.5, wz);
      ghGrp.userData = { bobAmp: 2.0, baseY: gy + 1.5, spinSpeed: 0.55, hoverInfo: { name: `Echo of ${gh.name}`, detail: gh.cause, tag: 'Ghost Echo', tagClass: 'tag-portal' } };
      root.add(ghGrp);
    });

    // E. Tier 4: Monster Danger Telegraphs, Stagger Stars, Sweet-Spot Band Ring & Combo Fields
    const mePl = (scene3d.players || []).find(pl => pl && pl.id === _pid());
    const aliveMons = (scene3d.monsters || []).filter(m => m && m.discovered !== false && (m.hp === undefined || m.hp > 0));
    if (mePl && aliveMons.length && lw.weapon_kit && lw.weapon_kit.optimal_max_px) {
      const nearestM = aliveMons.reduce((best, cur) => (Math.hypot((cur.x + 32) - mePl.x, (cur.y + 32) - mePl.y) < Math.hypot((best.x + 32) - mePl.x, (best.y + 32) - mePl.y) ? cur : best), aliveMons[0]);
      const dToM = Math.hypot((nearestM.x + 32) - mePl.x, (nearestM.y + 32) - mePl.y);
      const oMin = lw.weapon_kit.optimal_min_px || 35, oMax = lw.weapon_kit.optimal_max_px || 120;
      const inSweet = (dToM >= oMin && dToM <= oMax);
      const wx = _worldX(nearestM.x + 32), wz = _worldZ(nearestM.y + 32), gy = _groundY(wx, wz);
      const bandRing = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(12, oMin), oMax, 36),
        new THREE.MeshBasicMaterial({ color: inSweet ? 0x3fb950 : 0xc8a45c, transparent: true, opacity: inSweet ? 0.24 : 0.08, side: THREE.DoubleSide, depthWrite: false })
      );
      bandRing.rotation.x = -Math.PI / 2;
      bandRing.position.set(wx, gy + 0.9, wz);
      root.add(bandRing);
    }
    (scene3d.monsters || []).forEach(m => {
      const wx = _worldX(m.x + 32), wz = _worldZ(m.y + 32), gy = _groundY(wx, wz);
      if (m.telegraph_radius && m.windup_until > (Date.now() * 0.001 - 0.5)) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(Math.max(18, m.telegraph_radius * 0.65), m.telegraph_radius * 0.78, 28),
          new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(wx, gy + 1.8, wz);
        root.add(ring);
        const fill = new THREE.Mesh(
          new THREE.CircleGeometry(m.telegraph_radius * 0.65, 24),
          new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(wx, gy + 1.5, wz);
        root.add(fill);
      }
      if (m.is_staggered) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(11, 1.4, 6, 16),
          new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.set(wx, gy + 44, wz);
        halo.userData.spinSpeed = 4.2;
        root.add(halo);
      }
    });
    (lw.combo_fields || []).forEach(cf => {
      const wx = _worldX(cf.x), wz = _worldZ(cf.y), gy = _groundY(wx, wz);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(cf.radius * 0.55, cf.radius * 0.6, 2.5, 24),
        new THREE.MeshBasicMaterial({ color: cf.color || 0x58a6ff, transparent: true, opacity: 0.32, depthWrite: false })
      );
      disc.position.set(wx, gy + 1.5, wz);
      disc.userData.spinSpeed = 0.9;
      root.add(disc);
    });

    // F. Tier 4 & 5: Mounts & Battle Pets under owners + Bazaar Rugs
    const mountRecipes = cli.mount_recipes || {};
    LW_STATE.activeMountMeshes = {};
    Object.entries(lw.mounts || {}).forEach(([pidKey, mData]) => {
      if (mData && mData.key === 'ash_drake' && window.__dragonCtrl && window.__dragonCtrl.getState && window.__dragonCtrl.getState()) return;
      const pObj = (scene3d.players || []).find(p => p.id === pidKey);
      if (!pObj) return;
      const mRec = mountRecipes[mData.key] || mountRecipes.sand_skink;
      if (mRec && typeof buildSkillPartMeshes === 'function') {
        const mg = new THREE.Group();
        const mRefs = {};
        buildSkillPartMeshes(mg, mRec.parts || [], { shadows: true, outRefs: mRefs });
        mg.userData.refs = mRefs;
        mg.userData.saddleY = mData.saddle_y || (mData.key === 'traveling_peddler' ? 12.2 : 11.0);
        const riderGrp = _findDynGrp(pidKey);
        const riderCh = riderGrp && riderGrp.userData && (riderGrp.userData.charGrp || riderGrp.userData.charGroup);
        if (riderGrp) {
          mg.position.set(riderGrp.position.x, riderGrp.position.y, riderGrp.position.z);
          if (riderCh) mg.rotation.y = riderCh.rotation.y || 0;
        } else {
          const wx = _worldX(pObj.x), wz = _worldZ(pObj.y), gy = _groundY(wx, wz);
          mg.position.set(wx, gy, wz);
        }
        LW_STATE.activeMountMeshes[pidKey] = mg;
        root.add(mg);
      }
    });
    const petRecipes = cli.pet_recipes || {};
    Object.entries(lw.pets || {}).forEach(([pidKey, pet]) => {
      const pObj = (scene3d.players || []).find(p => p.id === pidKey);
      if (!pObj) return;
      const pRec = petRecipes[pet.key] || petRecipes.storm_fox;
      if (pRec && typeof buildSkillPartMeshes === 'function') {
        const pg = new THREE.Group();
        buildSkillPartMeshes(pg, pRec.parts || [], { shadows: true });
        const wx = _worldX(pObj.x - 28), wz = _worldZ(pObj.y + 22), gy = _groundY(wx, wz);
        pg.position.set(wx, gy + 2, wz);
        pg.userData.bobAmp = 1.4;
        pg.userData.baseY = gy + 2;
        root.add(pg);
      }
    });
    (lw.bazaar_rugs || []).forEach(br => {
      const wx = _worldX(br.x), wz = _worldZ(br.y), gy = _groundY(wx, wz);
      const bGrp = new THREE.Group();
      const rugMat = _mkMat({ color: 0x7c3496, pbrKind: 'cloth', roughness: 0.86, sheen: 0.78 });
      const rug = new THREE.Mesh(new THREE.BoxGeometry(44, 1.0, 32), rugMat); rug.receiveShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(46, 0.7, 34), _mkMat({ color: 0xc89a42, pbrKind: 'metal', roughness: 0.42, metalness: 0.75 }));
      const crate = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 7), _mkMat({ color: 0x7a502c, pbrKind: 'wood', roughness: 0.76 }));
      crate.position.set(-15, 3.5, -9); crate.castShadow = true; crate.receiveShadow = true;
      const amphoraGeo = (_scL && _scL.lathe) ? _scL.lathe([[1.6, 0], [3.2, 3.2], [2.8, 6.2], [1.2, 7.8], [1.9, 8.6]], 12) : new THREE.CylinderGeometry(2.5, 2.2, 8, 10);
      const amphora = new THREE.Mesh(amphoraGeo, _mkMat({ color: 0xb87638, pbrKind: 'crystal', roughness: 0.24, metalness: 0.12 }));
      amphora.position.set(14, 0.8, -10); amphora.castShadow = true;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 28, 7), _mkMat({ color: 0x56381e, pbrKind: 'wood', roughness: 0.82 }));
      pole.position.set(-19, 14, -12); pole.castShadow = true;
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), _mkMat({ color: 0xf0be5e, pbrKind: 'flame', emissive: 0xe68824, emissiveIntensity: 0.95 }));
      lantern.position.set(-17, 25, -11);
      bGrp.add(trim, rug, crate, amphora, pole, lantern);
      bGrp.position.set(wx, gy + 0.6, wz);
      bGrp.userData.hoverInfo = { name: `${br.owner}'s Pop-Up Bazaar`, detail: (br.items || []).map(i => `${i.name} (${i.price} GP)`).join(', '), tag: 'Player Bazaar', tagClass: 'tag-item' };
      root.add(bGrp);
    });

    // G. Tier 5-7: Modular Camp Buildings, Multi-Crew Ships/Wagons, Chemistry Props, Wildlife, Destructibles & Tunnels
    const bRecipes = cli.building_recipes || {};
    (lw.structures || []).forEach(st => {
      const br = bRecipes[st.kind] || bRecipes.cozy_hearth;
      if (!br || typeof buildSkillPartMeshes !== 'function') return;
      const sg = new THREE.Group();
      buildSkillPartMeshes(sg, br.parts || [], { shadows: true });
      const wx = _worldX(st.x), wz = _worldZ(st.y), gy = _groundY(wx, wz);
      sg.position.set(wx, gy, wz);
      root.add(sg);
    });
    const vRecipes = cli.vehicle_recipes || {};
    (lw.vehicles || []).forEach(v => {
      const vr = vRecipes[v.key] || vRecipes.galleon_airship;
      if (!vr || typeof buildSkillPartMeshes !== 'function') return;
      const vg = new THREE.Group();
      buildSkillPartMeshes(vg, vr.parts || [], { shadows: true });
      const wx = _worldX(v.x), wz = _worldZ(v.y), gy = _groundY(wx, wz);
      vg.position.set(wx, gy + (v.key === 'galleon_airship' ? 22 : 2), wz);
      vg.scale.setScalar(1.35);
      vg.userData.hoverInfo = { name: v.name, detail: `Crew: ${JSON.stringify(v.crew || {})} — Press [X] to fire cannons!`, tag: 'Multi-Crew Vessel', tagClass: 'tag-portal' };
      root.add(vg);
    });
    const cProps = cli.chemistry_props || {};
    (lw.chemistry || []).forEach(cp => {
      const rec = cProps[cp.kind];
      if (!rec || typeof buildSkillPartMeshes !== 'function') return;
      const cg = new THREE.Group();
      buildSkillPartMeshes(cg, rec.parts || [], { shadows: true });
      const wx = _worldX(cp.x), wz = _worldZ(cp.y), gy = _groundY(wx, wz);
      cg.position.set(wx, gy + 1, wz);
      if (cp.state === 'burning' || cp.state === 'frozen' || cp.state === 'electrified') {
        const aura = new THREE.Mesh(
          new THREE.SphereGeometry(12, 10, 10),
          new THREE.MeshBasicMaterial({ color: cp.state === 'burning' ? 0xff5500 : (cp.state === 'frozen' ? 0x88eeff : 0xffee33), wireframe: true, transparent: true, opacity: 0.65 })
        );
        aura.position.y = 8;
        aura.userData.spinSpeed = 2.5;
        cg.add(aura);
      }
      root.add(cg);
    });
    LW_STATE.wildlifeAnim = [];
    (lw.wildlife || []).forEach((wf, wIdx) => {
      if (wf.ridden_by) return;
      const wx = _worldX(wf.x), wz = _worldZ(wf.y), gy = _groundY(wx, wz);
      let wHash = wIdx * 2654435761;
      const wIdStr = String(wf.id || wf.name || wIdx);
      for (let hi = 0; hi < wIdStr.length; hi++) wHash = ((wHash * 31) ^ wIdStr.charCodeAt(hi)) >>> 0;
      const pedCols = [0xb58238, 0x9c6e38, 0xc29248, 0x8a6442];
      const wolfCols = [0x5d6672, 0x484c54, 0x7c746a, 0x6a6e76];
      const deerCols = [0x8e6945, 0xa2744a, 0x74563c, 0xb2885c, 0x7c7062];
      const col = wf.kind === 'peddler' ? pedCols[wHash % pedCols.length] : (wf.kind === 'wolf' ? wolfCols[wHash % wolfCols.length] : deerCols[wHash % deerCols.length]);
      const wGrp = new THREE.Group();
      const bodyMat = _mkMat({ color: col, pbrKind: 'fur', roughness: 0.78 + (wHash % 4) * 0.03, sheen: 0.68 + (wHash % 3) * 0.06, vertexColors: true });
      const torsoRaw = (_scL && _scL.lathe) ? _scL.lathe([[1.4, -6.6], [3.5, -3.5], [3.3, 1.5], [3.9, 4.5], [1.6, 6.8]], 14) : new THREE.CylinderGeometry(3.5, 3.7, 12, 14);
      const torsoGeo = _tintGeoY(torsoRaw, [0.78, 0.74, 0.70], [1.06, 1.04, 0.98]);
      const torso = new THREE.Mesh(torsoGeo, bodyMat);
      torso.scale.set(0.78, 1.0, 1.05); torso.rotation.x = Math.PI / 2; torso.position.y = 7.4; torso.castShadow = true;
      wGrp.add(torso);

      // Articulated Head/Neck Pivot at shoulders (0, 8.8, 4.4)
      const headPivot = new THREE.Group();
      headPivot.position.set(0, 8.8, 4.4);
      const neck = new THREE.Mesh(_tintGeoY(new THREE.CylinderGeometry(1.45, 2.5, 6.0, 12), [0.85, 0.82, 0.78], [1.05, 1.03, 0.98]), bodyMat);
      neck.position.set(0, 1.2, 0.9); neck.rotation.x = 0.62; neck.castShadow = true;
      const cranium = new THREE.Mesh(_tintGeoY(new THREE.SphereGeometry(1.95, 12, 9), [0.88, 0.84, 0.80], [1.08, 1.05, 1.0]), bodyMat);
      cranium.scale.set(0.84, 0.84, 1.18); cranium.position.set(0, 3.4, 2.8); cranium.castShadow = true;
      const snout = new THREE.Mesh(_tintGeoY(new THREE.CylinderGeometry(0.62, 1.22, 2.8, 10), [0.68, 0.62, 0.58], [0.95, 0.90, 0.86]), bodyMat);
      snout.rotation.x = Math.PI * 0.54; snout.position.set(0, 2.9, 4.8); snout.castShadow = true;
      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), _mkMat({ color: 0x221c18, roughness: 0.35 }));
      noseTip.position.set(0, 2.85, 6.2);
      const earGeo = _tintGeoY(new THREE.SphereGeometry(0.55, 8, 6).scale(0.55, 1.95, 0.38), [0.82, 0.76, 0.72], [0.58, 0.50, 0.46]);
      const ears = [-0.95, 0.95].map(ex => {
        const ear = new THREE.Mesh(earGeo, bodyMat);
        ear.position.set(ex, 4.8, 1.8); ear.rotation.set(-0.22, 0, ex < 0 ? 0.35 : -0.35); headPivot.add(ear);
        return ear;
      });
      headPivot.add(neck, cranium, snout, noseTip);

      // Articulated Tail Pivot at rump (0, 7.6, -6.0)
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 7.6, -6.0);
      if (wf.kind === 'peddler') {
        const blanketMat = _mkMat({ color: 0x823428, pbrKind: 'cloth', roughness: 0.86, sheen: 0.74, vertexColors: true });
        const blanket = new THREE.Mesh(_tintGeoY(new THREE.CylinderGeometry(3.6, 3.8, 6.2, 12, 1, false, -Math.PI * 0.55, Math.PI * 1.10).rotateX(Math.PI * 0.5), [0.76, 0.72, 0.72], [1.04, 1.0, 0.98]), blanketMat);
        blanket.scale.set(1.02, 0.65, 1.0); blanket.position.set(0, 8.2, -0.4); blanket.castShadow = true;
        const goldTrimMat = _mkMat({ color: 0xd4a448, pbrKind: 'metal', roughness: 0.36, metalness: 0.78 });
        const bag = new THREE.Mesh(_tintGeoY(new THREE.CylinderGeometry(2.1, 2.3, 5.2, 10).rotateX(Math.PI * 0.5), [0.74, 0.70, 0.68], [1.02, 0.98, 0.94]), _mkMat({ color: 0x624024, pbrKind: 'leather', roughness: 0.68, vertexColors: true }));
        const bagL = bag, bagR = bag.clone();
        bagL.position.set(-3.8, 7.8, -0.6); bagR.position.set(3.8, 7.8, -0.6);
        wGrp.add(blanket, bagL, bagR);
        const tailM = new THREE.Mesh(_tintGeoY(new THREE.CylinderGeometry(0.32, 0.16, 4.8, 8).translate(0, -2.4, 0), [0.46, 0.42, 0.38], [0.95, 0.90, 0.86]), bodyMat);
        tailPivot.add(tailM);
      } else {
        const tailM = new THREE.Mesh(_tintGeoY(new THREE.SphereGeometry(0.95, 10, 8).scale(0.85, 0.85, 2.85).translate(0, 0, -2.4), [0.74, 0.70, 0.66], [1.06, 1.04, 1.0]), bodyMat);
        tailPivot.add(tailM);
        if (wf.kind === 'deer') {
          const antMat = _mkMat({ color: 0xc2b092, pbrKind: 'wood', roughness: 0.62 });
          [-0.78, 0.78].forEach(ax => {
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 3.8, 8), antMat);
            beam.position.set(ax * 1.4, 5.6, 2.0); beam.rotation.set(-0.28, 0, ax < 0 ? 0.42 : -0.42);
            const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.9, 6), antMat);
            tine.position.set(ax * 1.9, 6.2, 2.6); tine.rotation.set(0.45, 0, ax < 0 ? 0.25 : -0.25);
            headPivot.add(beam, tine);
          });
        }
      }
      wGrp.add(headPivot, tailPivot);

      // Articulated 4 Leg Pivots at shoulder/hip height (y = 6.8)
      const legGeo = _tintGeoY(new THREE.CylinderGeometry(0.88, 0.44, 6.8, 10).translate(0, -3.4, 0), [0.46, 0.42, 0.38], [1.0, 0.98, 0.95]);
      const hoofGeo = new THREE.CylinderGeometry(0.48, 0.54, 0.75, 8).translate(0, -6.45, 0);
      const hoofMat = _mkMat({ color: 0x2a2420, roughness: 0.65 });
      const legs = [[-1.85, 3.8], [1.85, 3.8], [-1.85, -3.8], [1.85, -3.8]].map(([lx, lz]) => {
        const lp = new THREE.Group(); lp.position.set(lx, 6.8, lz);
        const lm = new THREE.Mesh(legGeo, bodyMat); lm.castShadow = true;
        const hm = new THREE.Mesh(hoofGeo, hoofMat);
        lp.add(lm, hm); wGrp.add(lp);
        return lp;
      });
      const wScale = 0.84 + ((wHash >> 3) % 35) * 0.01;
      wGrp.scale.set(wScale, wScale, wScale);
      wGrp.position.set(wx, gy, wz);
      LW_STATE.wildlifeAnim.push({
        grp: wGrp, headPivot, tailPivot, legs, ears, kind: wf.kind,
        homeX: wx, homeZ: wz, curX: wx, curZ: wz, offX: 0, offZ: 0,
        yaw: (wHash % 628) * 0.01, phase: (wHash % 100) * 0.1,
        roamR: wf.kind === 'wolf' ? 38 : (wf.kind === 'peddler' ? 18 : 26),
      });
      if (wf.kind === 'peddler') {
        wGrp.userData.mountKey = 'traveling_peddler';
        wGrp.userData.mountCommand = 'peddler';
        wGrp.userData.hoverInfo = {
          name: wf.name,
          detail: `${wf.kind} (${wf.behavior || 'roam_merchant'}) — Click or type "mount peddler" to ride!`,
          tag: 'Mountable',
          tagClass: 'tag-item',
        };
      } else {
        wGrp.userData.hoverInfo = { name: wf.name, detail: `${wf.kind} (${wf.behavior})`, tag: 'Living Ecology', tagClass: 'tag-item' };
      }
      root.add(wGrp);
    });
    const dRecipes = cli.destructible_recipes || {};
    (lw.destructibles || []).forEach(blk => {
      if (blk.destroyed) return;
      const dr = dRecipes[blk.kind] || dRecipes.destructible_wall;
      if (!dr || typeof buildSkillPartMeshes !== 'function') return;
      const dg = new THREE.Group();
      buildSkillPartMeshes(dg, dr.parts || [], { shadows: true });
      const wx = _worldX(blk.x), wz = _worldZ(blk.y), gy = _groundY(wx, wz);
      dg.position.set(wx, gy, wz);
      dg.userData.hoverInfo = { name: blk.name, detail: `${blk.hp}/${blk.max_hp} Integrity — Type 'breach' to shatter!`, tag: 'Destructible', tagClass: 'tag-portal' };
      root.add(dg);
    });
    (lw.tunnels || []).forEach(tn => {
      const wx = _worldX(tn.x), wz = _worldZ(tn.y), gy = _groundY(wx, wz);
      const tGrp = new THREE.Group();
      const archMat = _mkMat({ color: 0x524840, pbrKind: 'stone', roughness: 0.90 });
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(13, 3.6, 8, 16, Math.PI), archMat);
      mouth.castShadow = true; mouth.receiveShadow = true;
      const darkVoid = new THREE.Mesh(new THREE.CircleGeometry(12, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b0c10, side: THREE.DoubleSide }));
      darkVoid.position.z = -0.8;
      const postGeo = new THREE.CylinderGeometry(2.2, 2.6, 13, 7);
      const postMat = _mkMat({ color: 0x624228, pbrKind: 'wood', roughness: 0.82 });
      [-13, 13].forEach(px => {
        const pm = new THREE.Mesh(postGeo, postMat);
        pm.position.set(px, 6.5, 0); pm.castShadow = true; tGrp.add(pm);
      });
      tGrp.add(mouth, darkVoid);
      tGrp.position.set(wx, gy, wz);
      root.add(tGrp);
    });

    // H. Tier 5 Torchlit Abyss light curse
    if (lw.labyrinth && lw.labyrinth.curse === 'torchlit_abyss') {
      const pMe = (scene3d.players || []).find(pl => pl.id === _pid());
      if (pMe) {
        const torch = new THREE.PointLight(0xff9933, 4.5, 320, 1.4);
        torch.position.set(_worldX(pMe.x), _groundY(_worldX(pMe.x), _worldZ(pMe.y)) + 28, _worldZ(pMe.y));
        root.add(torch);
      }
    }

    // I. Tier 2 Live Dye Sync on existing player meshes (volumetric & GLTF)
    (scene3d.players || []).forEach(pl => {
      if (!pl || !pl.appearance || typeof threeDynamicEntities === 'undefined') return;
      const grp = threeDynamicEntities.find(g => g.userData && g.userData.entityId === pl.id);
      if (!grp) return;
      if (grp.userData.lwMaterials) {
        const lm = grp.userData.lwMaterials;
        if (lm.torsoMat && pl.appearance.primary_color) lm.torsoMat.color.set(pl.appearance.primary_color);
        if (lm.trimMat && pl.appearance.trim_color) lm.trimMat.color.set(pl.appearance.trim_color);
        if (lm.cloakMat && pl.appearance.trim_color) lm.cloakMat.color.set(pl.appearance.trim_color);
      } else if (pl.appearance.trim_color || pl.appearance.primary_color) {
        const ch = grp.userData.charGroup || grp;
        if (!ch.userData._lwCloak) {
          const cm = new THREE.MeshBasicMaterial({ color: pl.appearance.primary_color || '#1f6feb', transparent: true, opacity: 0.72, side: THREE.DoubleSide });
          const cMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 0.8), cm);
          cMesh.position.set(0, 15, -4.5); cMesh.rotation.x = 0.18;
          ch.add(cMesh);
          ch.userData._lwCloak = cm;
        }
        ch.userData._lwCloak.color.set(pl.appearance.primary_color || pl.appearance.trim_color);
        ch.userData._lwCloak.visible = (pl.appearance.cloak !== false);
      }
    });

    // J. Tier 5 & 7 Crowd Audio & InstancedMesh Crowds (capped at max 5 character-sized townspeople)
    const crowd = lw.crowd || { enabled: true, density: 5 };
    const isOut = !(scene3d.time_weather && scene3d.time_weather.is_outdoor === false);
    const crowdCnt = crowd.enabled === false ? 0 : Math.min(5, Math.max(0, Number(crowd.density || 5)));
    if (typeof sfx !== 'undefined' && sfx.setCrowdPresence) sfx.setCrowdPresence(crowdCnt, !isOut);
    rebuildCrowdMesh(root, crowdCnt, W, H, rid);

    // K. Speech Bubbles overlay in Log/Toast + Floating DOM HUD Banner for Event / Rested / Curse / Outpost
    updateLivingStatusStrip(lw);
  }

  function rebuildCrowdMesh(root, density, W, H, rid) {
    const cnt = Math.min(5, Math.max(0, Number(density || 0)));
    if (!cnt) { LW_STATE.crowdMesh = null; LW_STATE.crowdMeshes = null; return; }
    if (LW_STATE.crowdMeshes && LW_STATE.lastCrowdRoom === rid && LW_STATE.crowdAgents.length === cnt) {
      LW_STATE.crowdMeshes.forEach(m => { if (m) root.add(m); });
      return;
    }
    const _g = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
    const _paintPart = (geo, r, g, b, botMul = 0.78) => {
      geo.computeBoundingBox();
      const bb = geo.boundingBox, minY = bb ? bb.min.y : 0, spanY = bb ? Math.max(0.5, bb.max.y - minY) : 1;
      const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        const m = botMul + (1.0 - botMul) * Math.max(0, Math.min(1, (pa.getY(i) - minY) / spanY));
        cols[i * 3] = r * m; cols[i * 3 + 1] = g * m; cols[i * 3 + 2] = b * m;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return geo;
    };
    const _sc = window._sculptHelpers || {};
    const _mkArms = (w = 0.78) => {
      const shL = _paintPart(new THREE.SphereGeometry(w * 1.18, 10, 8), 0.94, 0.92, 0.90, 0.86); shL.translate(-2.55, 12.1, 0);
      const shR = _paintPart(new THREE.SphereGeometry(w * 1.18, 10, 8), 0.94, 0.92, 0.90, 0.86); shR.translate(2.55, 12.1, 0);
      const aL = _paintPart(new THREE.CylinderGeometry(w, w * 0.82, 5.8, 12), 0.92, 0.90, 0.88, 0.84); aL.rotateX(-0.16); aL.rotateZ(0.08); aL.translate(-2.72, 9.6, 0.35);
      const aR = _paintPart(new THREE.CylinderGeometry(w, w * 0.82, 5.8, 12), 0.92, 0.90, 0.88, 0.84); aR.rotateX(0.16); aR.rotateZ(-0.08); aR.translate(2.72, 9.6, -0.35);
      return [shL, shR, aL, aR];
    };
    // Cohort 0: Cloaked Townsfolk / Scholars (smooth 14-seg torso/cloak & felt hat)
    const c0Geo = _g('lw_crowd_c0_v9', () => {
      const torso = _paintPart(new THREE.CylinderGeometry(2.5, 2.1, 6.6, 14), 0.96, 0.94, 0.92, 0.80); torso.scale(1.12, 1.0, 0.68); torso.translate(0, 10.0, 0);
      const cloak = _paintPart(new THREE.CylinderGeometry(2.3, 3.6, 8.2, 12, 1, false, Math.PI * 0.65, Math.PI * 0.70), 0.64, 0.60, 0.68, 0.74); cloak.rotateX(0.12); cloak.translate(0, 8.6, -0.6);
      const brim = _paintPart(new THREE.CylinderGeometry(3.0, 3.2, 0.55, 16), 0.48, 0.44, 0.42, 0.85); brim.translate(0, 16.2, 0);
      const crown = _paintPart(new THREE.CylinderGeometry(1.15, 1.75, 2.2, 14), 0.56, 0.50, 0.48, 0.80); crown.translate(0, 17.4, -0.05);
      const parts = [torso, cloak, ..._mkArms(0.75), brim, crown];
      return _sc.merge ? _sc.merge(parts) : parts[0];
    });
    // Cohort 1: Armored Watchmen / Veterans (smooth pauldrons & helm)
    const c1Geo = _g('lw_crowd_c1_v9', () => {
      const chest = _paintPart(new THREE.CylinderGeometry(2.8, 2.3, 6.8, 14), 0.96, 0.96, 0.98, 0.82); chest.scale(1.20, 1.0, 0.74); chest.translate(0, 10.1, 0);
      const pL = _paintPart(new THREE.SphereGeometry(1.35, 12, 8), 0.86, 0.88, 0.92, 0.78); pL.scale(1.15, 0.75, 0.95); pL.translate(-3.3, 12.6, 0);
      const pR = _paintPart(new THREE.SphereGeometry(1.35, 12, 8), 0.86, 0.88, 0.92, 0.78); pR.scale(1.15, 0.75, 0.95); pR.translate(3.3, 12.6, 0);
      const helm = _paintPart(new THREE.SphereGeometry(1.92, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), 0.90, 0.92, 0.96, 0.82); helm.translate(0, 15.2, 0);
      const helmRim = _paintPart(new THREE.CylinderGeometry(2.25, 2.45, 0.45, 14), 0.78, 0.80, 0.84, 0.85); helmRim.translate(0, 15.6, 0);
      const parts = [chest, pL, pR, ..._mkArms(0.84), helm, helmRim];
      return _sc.merge ? _sc.merge(parts) : parts[0];
    });
    // Cohort 2: Caravan Couriers / Artisans (smooth pack & hood)
    const c2Geo = _g('lw_crowd_c2_v9', () => {
      const vest = _paintPart(new THREE.CylinderGeometry(2.45, 2.15, 6.5, 14), 0.94, 0.90, 0.86, 0.80); vest.scale(1.10, 1.0, 0.70); vest.translate(0, 10.0, 0);
      const pack = _paintPart(new THREE.CylinderGeometry(1.8, 1.9, 4.2, 12), 0.66, 0.58, 0.50, 0.76); pack.scale(1.1, 1.0, 0.72); pack.translate(0, 10.6, -2.1);
      const hood = _paintPart(new THREE.SphereGeometry(1.88, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), 0.78, 0.72, 0.68, 0.78); hood.rotateX(-0.22); hood.translate(0, 15.4, -0.2);
      const parts = [vest, pack, ..._mkArms(0.72), hood];
      return _sc.merge ? _sc.merge(parts) : parts[0];
    });
    const headGeo = _g('lw_crowd_head_v9', () => {
      const h = _paintPart(new THREE.SphereGeometry(1.74, 12, 10), 1.0, 1.0, 1.0, 0.86);
      h.scale(0.92, 1.08, 0.98); h.translate(0, 15.0, 0);
      const _mkCrowdHand = (hx, hy, hz, side) => {
        const palm = _paintPart(new THREE.SphereGeometry(0.45, 8, 6).scale(0.75, 1.15, 0.95), 0.96, 0.94, 0.92, 0.84);
        palm.translate(hx, hy, hz);
        const fingers = _paintPart(new THREE.CylinderGeometry(0.28, 0.20, 0.70, 8), 0.92, 0.88, 0.86, 0.80);
        fingers.rotateZ(-side * 0.55); fingers.translate(hx - side * 0.16, hy - 0.60, hz);
        const thumb = _paintPart(new THREE.CylinderGeometry(0.15, 0.12, 0.50, 6), 0.94, 0.90, 0.88, 0.82);
        thumb.rotateX(0.45); thumb.rotateZ(-side * 0.45); thumb.translate(hx - side * 0.18, hy - 0.22, hz + 0.40);
        return [palm, fingers, thumb];
      };
      const parts = [h, ..._mkCrowdHand(-2.55, 6.72, 0.80, -1), ..._mkCrowdHand(2.55, 6.72, -0.80, 1)];
      return _sc.merge ? _sc.merge(parts) : h;
    });
    const bootGeo = _g('lw_crowd_boots_v8', () => {
      const legL = _paintPart(new THREE.CylinderGeometry(1.05, 0.80, 7.2, 12), 0.94, 0.90, 0.86, 0.72); legL.rotateX(0.16); legL.translate(-1.35, 3.6, 0.5);
      const legR = _paintPart(new THREE.CylinderGeometry(1.05, 0.80, 7.2, 12), 0.94, 0.90, 0.86, 0.72); legR.rotateX(-0.16); legR.translate(1.35, 3.6, -0.5);
      const belt = _paintPart(new THREE.CylinderGeometry(2.58, 2.52, 1.35, 14), 0.72, 0.64, 0.58, 0.85); belt.scale(1.16, 1.0, 0.74); belt.translate(0, 7.4, 0);
      const parts = [legL, legR, belt];
      return _sc.merge ? _sc.merge(parts) : parts[0];
    });
    const _mkMat = (spec) => (typeof window.createRichObjectMaterial === 'function')
      ? window.createRichObjectMaterial(spec)
      : new THREE.MeshStandardMaterial({ color: spec.color ?? 0xffffff, roughness: spec.roughness ?? 0.80, vertexColors: true });
    const mats = [
      _mkMat({ color: 0xe6e0d8, pbrKind: 'cloth', roughness: 0.86, sheen: 0.72, vertexColors: true }),
      _mkMat({ color: 0xdce2ea, pbrKind: 'metal', roughness: 0.32, metalness: 0.76, vertexColors: true }),
      _mkMat({ color: 0xe2d8cc, pbrKind: 'leather', roughness: 0.64, vertexColors: true }),
    ];
    const headMat = (typeof THREE.MeshPhysicalMaterial === 'function')
      ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.58, sheen: 0.34, sheenColor: new THREE.Color(0xffccb0), vertexColors: true })
      : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, vertexColors: true });
    const bootMat = _mkMat({ color: 0xd8cfc6, pbrKind: 'leather', roughness: 0.74, vertexColors: true });

    const palettes = [
      [0xc44536, 0x3b82f6, 0x2ea043, 0xd99b26, 0x8b5cf6, 0x06b6d4, 0xec4899, 0x84a93c],
      [0xd8e2ec, 0x6c88a8, 0xe8b43c, 0x4f7ca8, 0xc94a42, 0x94b0b8],
      [0xc86438, 0x3f886c, 0x9c5cb8, 0xd4a448, 0x3a7ca5, 0xb8485c],
    ];
    const skinPalette = [0xeec09c, 0xd8a278, 0xbf865a, 0x8c5a3c, 0x6a422c, 0xe4bca2];
    const bootPalette = [0x443326, 0x6a442c, 0x383f48, 0x5a302c, 0x564c3e, 0x424d3e];

    const seedBase = String(rid || 'plaza').split('').reduce((s, c) => ((s * 31) ^ c.charCodeAt(0)) >>> 0, 19);
    const rebuildAgents = (LW_STATE.lastCrowdRoom !== rid || LW_STATE.crowdAgents.length !== cnt);
    if (rebuildAgents) {
      LW_STATE.lastCrowdRoom = rid;
      LW_STATE.crowdAgents = [];
    }
    const buckets = [[], [], []];
    for (let i = 0; i < cnt; i++) {
      const h = ((i * 2654435761 + seedBase * 131) >>> 0);
      const coh = h % 3;
      const subIdx = buckets[coh].length;
      buckets[coh].push(i);
      if (rebuildAgents) {
        // Ballpark hero character scale (~30-33u height instead of miniature figures)
        const sy = 1.76 + ((h >> 14) % 18) * 0.01;
        const sx = 1.70 + ((h >> 19) % 18) * 0.01;
        LW_STATE.crowdAgents.push({
          angle: (i / cnt) * Math.PI * 2 + (h % 7) * 0.08,
          rad: 185 + ((h >> 3) % 5) * 48,
          speed: (0.030 + ((h >> 6) % 6) * 0.010) * (i % 2 === 0 ? 1 : -1),
          ox: (Math.sin(i * 7.3 + (seedBase % 11)) * 0.22) * W,
          oz: (Math.cos(i * 4.1 + (seedBase % 13)) * 0.22) * H,
          cohort: coh, subIdx, hash: h, sx, sy,
          bobFreq: 0.0062 + ((h >> 22) % 6) * 0.0007,
          bobAmp: (0.65 + ((h >> 25) % 4) * 0.14) * sy,
          swayAmp: 0.025 + ((h >> 27) % 3) * 0.015,
        });
      } else {
        LW_STATE.crowdAgents[i].cohort = coh;
        LW_STATE.crowdAgents[i].subIdx = subIdx;
        LW_STATE.crowdAgents[i].hash = h;
      }
    }

    const cGeos = [c0Geo, c1Geo, c2Geo];
    const tmpCol = new THREE.Color();
    const cohortInsts = cGeos.map((cg, ci) => {
      const n = buckets[ci].length;
      const im = new THREE.InstancedMesh(cg, mats[ci], Math.max(1, n));
      im.count = n;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true; im.receiveShadow = true;
      const pal = palettes[ci];
      for (let bi = 0; bi < n; bi++) {
        const ag = LW_STATE.crowdAgents[buckets[ci][bi]];
        tmpCol.setHex(pal[(ag.hash >> 2) % pal.length]);
        im.setColorAt(bi, tmpCol);
      }
      if (n > 0 && im.instanceColor) im.instanceColor.needsUpdate = true;
      if (n > 0) root.add(im);
      return im;
    });
    const headInst = new THREE.InstancedMesh(headGeo, headMat, cnt);
    const bootInst = new THREE.InstancedMesh(bootGeo, bootMat, cnt);
    [headInst, bootInst].forEach((im, kindIdx) => {
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true; im.receiveShadow = true;
      const pal = kindIdx === 0 ? skinPalette : bootPalette;
      for (let i = 0; i < cnt; i++) {
        const h = LW_STATE.crowdAgents[i].hash;
        tmpCol.setHex(pal[(h >> (kindIdx ? 11 : 5)) % pal.length]);
        im.setColorAt(i, tmpCol);
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      root.add(im);
    });

    LW_STATE.crowdMesh = cohortInsts[0];
    LW_STATE.crowdCohortMeshes = cohortInsts;
    LW_STATE.crowdHeadMesh = headInst;
    LW_STATE.crowdBootMesh = bootInst;
    LW_STATE.crowdMeshes = [...cohortInsts.filter(m => m.count > 0), headInst, bootInst];
    stepCrowdInstances(0.016, performance.now());
  }

  function stepCrowdInstances(dtSec, nowMs) {
    const cohorts = LW_STATE.crowdCohortMeshes;
    const head = LW_STATE.crowdHeadMesh;
    const boot = LW_STATE.crowdBootMesh;
    if (!cohorts || !head || !head.parent) return;
    const dummy = LW_STATE._dummy || (LW_STATE._dummy = new THREE.Object3D());
    const n = LW_STATE.crowdAgents.length;
    for (let i = 0; i < n; i++) {
      const a = LW_STATE.crowdAgents[i];
      a.angle += a.speed * dtSec;
      const wx = a.ox + Math.cos(a.angle) * a.rad;
      const wz = a.oz + Math.sin(a.angle) * a.rad * 0.75;
      const phase = nowMs * (a.bobFreq || 0.008) + i * 1.3;
      const gy = _groundY(wx, wz) + Math.abs(Math.sin(phase)) * (a.bobAmp || 1.3);
      dummy.position.set(wx, gy, wz);
      dummy.rotation.set(0, -a.angle, Math.sin(phase * 0.5) * (a.swayAmp || 0.05));
      dummy.scale.set(a.sx || 1, a.sy || 1, a.sx || 1);
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
      if (boot) boot.setMatrixAt(i, dummy.matrix);
      const ci = a.cohort || 0;
      if (cohorts[ci] && cohorts[ci].count > a.subIdx) cohorts[ci].setMatrixAt(a.subIdx, dummy.matrix);
    }
    head.instanceMatrix.needsUpdate = true;
    if (boot) boot.instanceMatrix.needsUpdate = true;
    cohorts.forEach(cm => { if (cm && cm.count > 0) cm.instanceMatrix.needsUpdate = true; });
  }

  // =========================================================================
  // 4. PHOTO MODE FREE CAM & POSTCARD STUDIO + SPATIAL VOICE + UI HUB
  // =========================================================================
  window.__lwUpdatePhotoCam = function () {
    if (typeof threeCamera === 'undefined' || !threeCamera) return;
    const px = (typeof lastPlayerPos !== 'undefined') ? _worldX(lastPlayerPos.x) : 0;
    const pz = (typeof lastPlayerPos !== 'undefined') ? _worldZ(lastPlayerPos.y) : 0;
    const gy = _groundY(px, pz) + 18 + LW_STATE.elevY;
    const d = LW_STATE.photoDist;
    const cx = px + Math.sin(LW_STATE.photoYaw) * Math.cos(LW_STATE.photoPitch) * d;
    const cy = gy + Math.sin(LW_STATE.photoPitch) * d;
    const cz = pz + Math.cos(LW_STATE.photoYaw) * Math.cos(LW_STATE.photoPitch) * d;
    threeCamera.position.set(cx, cy, cz);
    threeCamera.lookAt(px, gy, pz);
  };

  window.lwTogglePhotoMode = function lwTogglePhotoMode() {
    LW_STATE.photoMode = !LW_STATE.photoMode;
    window.__lwPhotoCam = { active: LW_STATE.photoMode };
    let bar = document.getElementById('lwPhotoBar');
    if (LW_STATE.photoMode) {
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'lwPhotoBar';
        bar.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(13,17,23,0.92);border:1.5px solid #d29922;border-radius:10px;padding:10px 14px;display:flex;gap:8px;align-items:center;color:#f0f6fc;font-size:0.8rem;';
        document.body.appendChild(bar);
      }
      const filters = Object.entries(_lwClient().photo_filters || { none: { label: 'Natural' }, sunset_gold: { label: 'Golden Hour' }, aether_cyan: { label: 'Aether Glow' }, noir: { label: 'Noir' }, vintage_postcard: { label: 'Postcard' } });
      bar.innerHTML = `
        <span>📸 <b>Photo Mode</b> (Arrows=Orbit/Zoom)</span>
        <select id="lwPhotoFilterSel" style="background:#161b22;color:#f0f6fc;border:1px solid #30363d;border-radius:6px;padding:4px;" onchange="window.lwSetPhotoFilter(this.value)">
          ${filters.map(([k, v]) => `<option value="${k}" ${LW_STATE.photoFilter === k ? 'selected' : ''}>${v.label || k}</option>`).join('')}
        </select>
        <input id="lwPhotoCaption" placeholder="Postcard caption..." value="Greetings from ${typeof currentRoomName !== 'undefined' && currentRoomName ? currentRoomName : 'Aeonward'}!" style="background:#161b22;color:#fff;border:1px solid #30363d;border-radius:6px;padding:4px 8px;width:210px;" />
        <button class="btn btn-accent" onclick="lwSnapPostcard()">🖼️ Snap Postcard</button>
        <button class="btn" onclick="lwTogglePhotoMode()">Close [K]</button>
      `;
      bar.style.display = 'flex';
    } else if (bar) {
      bar.style.display = 'none';
      const cv = document.querySelector('#threedPane canvas');
      if (cv) cv.style.filter = '';
    }
  };

  window.lwSetPhotoFilter = function (fkey) {
    LW_STATE.photoFilter = fkey;
    const fDef = (_lwClient().photo_filters || {})[fkey] || {};
    const cv = document.querySelector('#threedPane canvas');
    if (cv) cv.style.filter = fDef.css || '';
  };

  window.lwSnapPostcard = function lwSnapPostcard() {
    const srcCv = document.querySelector('#threedPane canvas');
    if (!srcCv) { lwShowToast('No 3D canvas active'); return; }
    try { if (typeof render3DFrame === 'function') render3DFrame(performance.now()); } catch (e) {}
    const out = document.createElement('canvas');
    out.width = 720; out.height = 460;
    const ctx = out.getContext('2d');
    const fDef = (_lwClient().photo_filters || {})[LW_STATE.photoFilter] || {};
    ctx.fillStyle = '#f5eedc';
    ctx.fillRect(0, 0, out.width, out.height);
    if (fDef.css) ctx.filter = fDef.css;
    ctx.drawImage(srcCv, 16, 16, out.width - 32, out.height - 86);
    ctx.filter = 'none';
    const capEl = document.getElementById('lwPhotoCaption');
    const cap = (capEl && capEl.value) || 'Greetings from Aeonward!';
    ctx.fillStyle = '#241b12';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(cap, 24, out.height - 34);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#70583e';
    ctx.fillText(`STAMP • ${new Date().toLocaleDateString()} • AEONWARD CONTINUUM`, out.width - 335, out.height - 16);
    const dataUrl = out.toDataURL('image/png');
    LW_STATE.gallery.unshift({ ts: Date.now(), caption: cap, url: dataUrl });
    LW_STATE.gallery = LW_STATE.gallery.slice(0, 6);
    try { localStorage.setItem('lw_postcards_v1', JSON.stringify(LW_STATE.gallery)); } catch (e) {}
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `aeonward_postcard_${Date.now()}.png`; a.click();
    lwShowToast('🖼️ Postcard snapped & downloaded!');
  };

  window.lwToggleBuildMode = function lwToggleBuildMode() {
    LW_STATE.buildMode = !LW_STATE.buildMode;
    lwShowToast(LW_STATE.buildMode ? `🏗️ Build Mode ON (${LW_STATE.buildPiece}) — press [E] to place or open [I] -> Build` : '🏗️ Build Mode OFF');
    window.lwOpenPanel('build');
  };

  // WebRTC Proximity Voice (Optional browser native APIs)
  async function toggleProximityVoice() {
    LW_STATE.voiceEnabled = !LW_STATE.voiceEnabled;
    if (!LW_STATE.voiceEnabled) {
      if (LW_STATE.localStream) { LW_STATE.localStream.getTracks().forEach(t => t.stop()); LW_STATE.localStream = null; }
      lwShowToast('🎙️ Proximity Voice OFF');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      LW_STATE.voiceEnabled = false;
      lwShowToast('🎙️ Microphone unavailable — using Spatial Speech Bubbles');
      return;
    }
    try {
      LW_STATE.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      lwShowToast('🎙️ Proximity Voice ON (Spatial Corridor Attenuation Active)');
      pollVoiceSignals();
    } catch (e) {
      LW_STATE.voiceEnabled = false;
      lwShowToast('🎙️ Mic permission declined — Spatial Speech Bubbles ready');
    }
  }
  window.lwToggleVoice = toggleProximityVoice;

  async function pollVoiceSignals() {
    if (!LW_STATE.voiceEnabled) return;
    try {
      const r = await fetch(`/api/voice_signal?player_id=${encodeURIComponent(_pid())}&since=${LW_STATE.lastVoicePoll}`);
      if (r.ok) {
        const d = await r.json();
        LW_STATE.lastVoicePoll = d.server_time || (Date.now() * 0.001);
        for (const s of (d.signals || [])) {
          if (typeof RTCPeerConnection === 'undefined') continue;
          let pc = LW_STATE.rtcPeers[s.from_id];
          if (!pc) {
            pc = new RTCPeerConnection();
            if (LW_STATE.localStream) LW_STATE.localStream.getTracks().forEach(t => pc.addTrack(t, LW_STATE.localStream));
            pc.onicecandidate = (ev) => {
              if (ev.candidate) fetch('/api/voice_signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: _pid(), to_id: s.from_id, type: 'candidate', candidate: ev.candidate }) }).catch(() => {});
            };
            LW_STATE.rtcPeers[s.from_id] = pc;
          }
          if (s.type === 'offer' && s.sdp) {
            await pc.setRemoteDescription(s.sdp);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await fetch('/api/voice_signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: _pid(), to_id: s.from_id, type: 'answer', sdp: ans }) });
          } else if (s.type === 'answer' && s.sdp) {
            await pc.setRemoteDescription(s.sdp);
          } else if (s.type === 'candidate' && s.candidate) {
            await pc.addIceCandidate(s.candidate);
          }
        }
      }
    } catch (e) {}
    if (LW_STATE.voiceEnabled) setTimeout(pollVoiceSignals, 1500);
  }

  // =========================================================================
  // 5. UNIFIED STATUS STRIP, TOAST & TABBED LIVING WORLD HUB MODAL [I]
  // =========================================================================
  function lwShowToast(msg) {
    let t = document.getElementById('lwToastBanner');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lwToastBanner';
      t.style.cssText = 'position:fixed;top:64px;right:18px;z-index:10050;background:rgba(13,17,23,0.92);border:1px solid #d29922;color:#f0f6fc;padding:8px 14px;border-radius:8px;font-size:0.82rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.5);transition:opacity 0.25s;';
      document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.opacity = '1';
    clearTimeout(t._tm);
    t._tm = setTimeout(() => { t.style.opacity = '0'; }, 2800);
  }
  window.lwShowToast = lwShowToast;

  function updateLivingStatusStrip(lw) {
    let strip = document.getElementById('lwStatusStrip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'lwStatusStrip';
      strip.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:900;display:flex;flex-wrap:wrap;gap:6px;pointer-events:none;max-width:58vw;';
      document.body.appendChild(strip);
    }
    const pills = [];
    if (lw.weapon_kit && lw.weapon_kit.skills) {
      const sk = lw.weapon_kit.skills;
      pills.push(`⚔️ ${lw.weapon_kit.family || 'Kit'}: [1] ${sk.q?.name || ''} | [2] ${sk.e?.name || ''} | [3] ${sk.r?.name || ''} | [Q] Parry | [R] Dodge`);
      [['Q', sk.q], ['E', sk.e], ['R', sk.r]].forEach(([k, def], idx) => {
        const el = document.getElementById(`aeonwardHotbarSkill${k}`);
        if (el && def) {
          const nmEl = el.querySelector('.aeonward-hotbar-name');
          if (nmEl) nmEl.innerText = String(def.name || `Skill ${idx + 1}`).split(' ')[0];
          el.title = `${def.name}: ${def.desc || ''} [${idx + 1}]`;
        }
      });
    }
    if (lw.comfort && lw.comfort.tier > 0) pills.push(`🔥 Warmth T${lw.comfort.tier} (${lw.comfort.label})`);
    if (lw.sidekick_scale && lw.sidekick_scale < 0.99) pills.push(`⚖️ Sidekick Scale ${lw.sidekick_scale}x`);
    if (lw.world_event) pills.push(`🚨 ${lw.world_event.name} Stage ${lw.world_event.stage}/3 (${lw.world_event.progress}/${lw.world_event.target})`);
    if (lw.labyrinth && lw.labyrinth.active) pills.push(`🌀 Labyrinth F${lw.labyrinth.floor} (${lw.labyrinth.name})`);
    if (lw.outpost) pills.push(`🏰 ${lw.outpost.name}: ${(lw.outpost.tier_names || [])[lw.outpost.tier] || 'T' + lw.outpost.tier}`);
    if (lw.narrative_harmony && lw.narrative_harmony.climax_prep_pct > 0) pills.push(`🧭 ${lw.narrative_harmony.guild_title}: +${lw.narrative_harmony.climax_prep_pct}% Prep | Goodwill +${lw.narrative_harmony.goodwill || 0}`);
    if ((lw.rivals || []).length) pills.push(`💀 Nemesis: ${lw.rivals[lw.rivals.length - 1].name}`);
    (lw.speech_bubbles || []).forEach(sb => pills.push(`💬 ${sb.name}: "${sb.text}"`));
    strip.innerHTML = `<button onclick="window.lwToggleActionsDrawer && window.lwToggleActionsDrawer()" style="pointer-events:auto;cursor:pointer;background:#1f6feb;border:1px solid #58a6ff;color:#fff;padding:3px 10px;border-radius:12px;font-size:0.74rem;font-weight:700;">🎭 Actions [V]</button>`
      + pills.map(txt => `<span style="background:rgba(13,17,23,0.84);border:1px solid #30363d;color:#e6edf3;padding:3px 8px;border-radius:12px;font-size:0.72rem;">${txt}</span>`).join('');
  }

  window.lwToggleActionsDrawer = function lwToggleActionsDrawer(forceOpen) {
    let dr = document.getElementById('lwActionsDrawer');
    const cat = (window.__DND_CLIENT_SKILLS__ && Array.isArray(window.__DND_CLIENT_SKILLS__.action_catalog))
      ? window.__DND_CLIENT_SKILLS__.action_catalog : [];
    if (!dr) {
      dr = document.createElement('div');
      dr.id = 'lwActionsDrawer';
      dr.style.cssText = 'position:fixed;bottom:52px;left:14px;z-index:9960;width:min(760px,92vw);max-height:62vh;background:rgba(13,17,23,0.95);border:1.5px solid #58a6ff;border-radius:12px;display:none;flex-direction:column;overflow:hidden;color:#e6edf3;box-shadow:0 10px 32px rgba(0,0,0,0.65);';
      dr.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#161b22;border-bottom:1px solid #30363d;">
        <b id="lwActDrawerTitle">🎭 Character Actions & Physics</b>
        <input id="lwActSearch" placeholder="Search 108 actions (kneel, climb tree, dragon...) " style="flex:1;max-width:260px;background:#0d1117;color:#fff;border:1px solid #30363d;border-radius:6px;padding:4px 8px;font-size:0.78rem;"/>
        <button class="btn" onclick="window.lwToggleActionsDrawer(false)">✕</button>
      </div>
      <div id="lwActCats" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;background:#11161f;border-bottom:1px solid #21262d;"></div>
      <div id="lwActGrid" style="padding:10px 12px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;"></div>`;
      document.body.appendChild(dr);
      dr.querySelector('#lwActSearch').addEventListener('input', () => window._renderActionsDrawerGrid && window._renderActionsDrawerGrid());
    }
    const wantOpen = forceOpen !== undefined ? Boolean(forceOpen) : (dr.style.display !== 'flex');
    dr.style.display = wantOpen ? 'flex' : 'none';
    LW_STATE.actionsDrawerOpen = wantOpen;
    if (!wantOpen) return;

    const cats = ['All', ...Array.from(new Set(cat.map(a => a.category)))];
    if (!LW_STATE.actDrawerCat) LW_STATE.actDrawerCat = 'All';
    window._renderActionsDrawerGrid = () => {
      const q = (document.getElementById('lwActSearch')?.value || '').trim().toLowerCase();
      const catsDiv = document.getElementById('lwActCats');
      const gridDiv = document.getElementById('lwActGrid');
      const titleEl = document.getElementById('lwActDrawerTitle');
      if (titleEl) titleEl.innerText = `🎭 ${cat.length} Character Actions & Physics`;
      if (catsDiv) {
        catsDiv.innerHTML = cats.map(c => `<button class="btn ${LW_STATE.actDrawerCat === c ? 'btn-accent' : ''}" style="font-size:0.72rem;padding:3px 8px;" onclick="window.__LW_STATE__.actDrawerCat='${c}';window._renderActionsDrawerGrid();">${c}</button>`).join('');
      }
      if (gridDiv) {
        const list = cat.filter(a => (LW_STATE.actDrawerCat === 'All' || a.category === LW_STATE.actDrawerCat) && (!q || `${a.id} ${a.label} ${a.aliases} ${a.category}`.toLowerCase().includes(q)));
        gridDiv.innerHTML = list.map(a => `<button class="btn" style="text-align:left;font-size:0.75rem;padding:6px 8px;" title="${a.category} • ${a.posture}" onclick="window.lwRunCharAction('${a.id}')">${a.icon} ${a.label}</button>`).join('');
      }
    };
    window._renderActionsDrawerGrid();
  };

  LW_STATE.panelOpen = false;
  LW_STATE.activeTab = 'craft';

  window.lwOpenPanel = function lwOpenPanel(tab = 'craft') {
    if (tab !== 'hub') LW_STATE.activeTab = tab;
    let m = document.getElementById('lwHubModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'lwHubModal';
      m.style.cssText = 'position:fixed;inset:0;z-index:9950;background:rgba(1,4,9,0.78);display:none;align-items:center;justify-content:center;';
      m.innerHTML = `<div style="width:min(900px,94vw);max-height:86vh;background:#0d1117;border:1.5px solid #d29922;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;color:#e6edf3;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#161b22;border-bottom:1px solid #30363d;">
          <b>✨ Living World & Sandbox Hub (CC-ELM + SKILL.md Powered)</b>
          <div style="display:flex;gap:6px;flex-wrap:wrap;" id="lwTabBtns"></div>
          <button class="btn" onclick="document.getElementById('lwHubModal').style.display='none';">✕ Close</button>
        </div>
        <div id="lwHubBody" style="padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;"></div>
      </div>`;
      document.body.appendChild(m);
    }
    const isSameOpen = m.style.display === 'flex' && tab === 'hub';
    m.style.display = isSameOpen ? 'none' : 'flex';
    LW_STATE.panelOpen = (m.style.display === 'flex');
    if (LW_STATE.panelOpen) renderHubTab();
  };

  function renderHubTab() {
    const btns = document.getElementById('lwTabBtns');
    const body = document.getElementById('lwHubBody');
    if (!btns || !body) return;
    const tabs = [['craft', '🎒 Stash & Craft'], ['wardrobe', '🎨 Wardrobe & Kits'], ['social', '🧭 Social & Pastimes'], ['mounts', '🐴 Mounts & Pets'], ['build', '🏗️ Build & Ships'], ['events', '🌋 Events & Rivals']];
    btns.innerHTML = tabs.map(([k, lbl]) => `<button class="btn ${LW_STATE.activeTab === k ? 'btn-accent' : ''}" style="font-size:0.75rem;padding:4px 8px;" onclick="window.lwOpenPanel('${k}')">${lbl}</button>`).join('');

    const lw = LW_STATE.lastLw || {};
    const cfg = _lwCfg(), cli = _lwClient();
    const inv = (typeof getClientInventoryList === 'function') ? getClientInventoryList() : [];
    const btnS = 'display:flex;flex-wrap:wrap;gap:6px;';
    const boxS = 'background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;';

    if (LW_STATE.activeTab === 'craft') {
      const recipes = Object.entries(cfg.crafting_recipes || {});
      body.innerHTML = `
        <div style="${boxS}"><b>📥 Zero-Chore Camp Stash (${(lw.camp_stash || []).length} items)</b> &bull; Vacuum: <b>${lw.auto_vacuum !== false ? 'ON' : 'OFF'}</b>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('stash_deposit')">📥 1-Click Deposit Matching Materials</button>
            <button class="btn" onclick="lwAction('auto_vacuum',{enabled:${lw.auto_vacuum === false}})">🧲 Toggle Auto-Vacuum</button>
          </div>
          <div style="font-size:0.78rem;color:#8b949e;margin-top:6px;">Stash: ${(lw.camp_stash || []).join(', ') || 'Empty'}</div>
        </div>
        <div style="${boxS}"><b>⚒️ Craft Directly From Pack + Camp Stash</b>
          <div style="${btnS}margin-top:8px;">${recipes.map(([rk, rv]) => `<button class="btn" onclick="lwAction('craft',{recipe:'${rk.replace(/'/g, '')}'})" title="${rv.desc || ''}">⚒️ ${rk} (${rv.fallback_gp ?? 15} GP)</button>`).join('')}</div>
        </div>
        <div style="${boxS}"><b>⚖️ Compare & 🎁 Generous Ground-Drop Gift</b>
          <div style="${btnS}margin-top:8px;">${inv.slice(0, 10).map(it => `<button class="btn" onclick="lwAction('compare',{item:'${it.replace(/'/g, '')}'})">⚖️ Compare ${it}</button><button class="btn" onclick="lwAction('gift',{item:'${it.replace(/'/g, '')}'})">🎁 Toss ${it}</button>`).join('') || '<i>Pack empty</i>'}</div>
        </div>`;
    } else if (LW_STATE.activeTab === 'wardrobe') {
      const sils = Object.entries(cli.wardrobe_silhouettes || {});
      const pals = Object.entries(cli.dye_palettes || {});
      const kits = Object.entries(cfg.weapon_skill_kits || {});
      body.innerHTML = `
        <div style="${boxS}"><b>👘 Silhouettes & 3-Channel Custom Dyes</b>
          <div style="${btnS}margin-top:8px;">
            ${sils.map(([k, v]) => `<button class="btn" onclick="lwAction('wardrobe',{silhouette:'${k}'})">🧥 ${v.label || k}</button>`).join('')}
          </div>
          <div style="${btnS}margin-top:8px;">
            ${pals.map(([k, v]) => `<button class="btn" style="border-color:${v.primary};" onclick="lwAction('wardrobe',{palette:'${k}'})"><span style="color:${v.primary};">■</span><span style="color:${v.trim};">■</span> ${v.name || k}</button>`).join('')}
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">Custom Dye: <input type="color" id="lwCol1" value="#1f6feb"/> Primary <input type="color" id="lwCol2" value="#f3ba2f"/> Trim <button class="btn btn-accent" onclick="lwAction('wardrobe',{custom_dyes:{primary:document.getElementById('lwCol1').value,trim:document.getElementById('lwCol2').value}})">Apply Dye</button></div>
        </div>
        <div style="${boxS}"><b>⚔️ Weapon-Driven Identity & Anytime Reinvention (Zero Build Regret)</b>
          <div style="${btnS}margin-top:8px;">
            ${kits.map(([k, v]) => `<button class="btn" onclick="lwAction('equip',{weapon:'${v.family || k}'})">🗡️ Wield ${v.family || k}</button>`).join('')}
          </div>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('reinvent',{style:'storm healer'})">⚡ Respec: Storm Healer</button>
            <button class="btn btn-accent" onclick="lwAction('reinvent',{style:'shadow assassin'})">🗡️ Respec: Shadow Assassin</button>
            <button class="btn btn-accent" onclick="lwAction('reinvent',{style:'aegis vanguard'})">🛡️ Respec: Aegis Vanguard</button>
          </div>
        </div>`;
    } else if (LW_STATE.activeTab === 'social') {
      const emotes = Object.entries(cli.emotes || {});
      const pings = Object.entries(cli.world_pings || {});
      body.innerHTML = `
        <div style="${boxS}"><b>📍 World Pings [P], Emotes [F], High-Five & Cozy Voice</b>
          <div style="${btnS}margin-top:8px;">
            ${pings.map(([k, v]) => `<button class="btn" onclick="lwPing('${k}')">${v.icon} ${v.label}</button>`).join('')}
          </div>
          <div style="${btnS}margin-top:8px;">
            ${emotes.map(([k, v]) => `<button class="btn" onclick="lwAction('emote',{emote:'${k}'})">${v.icon} ${v.label}</button>`).join('')}
          </div>
        </div>
        <div style="${boxS}"><b>🗺️ Cartography, Cozy Pastimes & Proximity Voice</b>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('map_table')">🗺️ Sync Map Table</button>
            <button class="btn" onclick="lwAction('map_pin',{label:'Ruins Cache'})">📌 Pin Location</button>
            <button class="btn" onclick="lwAction('fish')">🎣 Fish Dusk Ripples</button>
            <button class="btn" onclick="lwAction('dice',{query:'15'})">🎲 Roll Tavern Dice</button>
            <button class="btn" onclick="lwAction('riddle',{answer:prompt('Answer riddle (leave blank for clue):')||''})">📜 Decode Riddle</button>
            <button class="btn" onclick="lwAction('note',{text:prompt('Leave chalk note:')||''})">🖍️ Leave Note</button>
            <button class="btn" onclick="lwToggleVoice()">🎙️ Proximity Voice (${LW_STATE.voiceEnabled ? 'ON' : 'OFF'})</button>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;"><input id="lwSayInp" placeholder="Speak in spatial proximity bubble..." style="flex:1;background:#0d1117;color:#fff;border:1px solid #30363d;border-radius:6px;padding:4px 8px;"/><button class="btn" onclick="fetch('/api/voice_signal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({player_id:'${_pid()}',type:'speech_bubble',text:document.getElementById('lwSayInp').value})});lwAction('emote',{emote:'wave'});document.getElementById('lwSayInp').value=''">💬 Speak</button></div>
        </div>`;
    } else if (LW_STATE.activeTab === 'mounts') {
      const mounts = Object.entries(cfg.mounts || {});
      const pets = Object.entries(cfg.battle_pets || {});
      body.innerHTML = `
        <div style="${boxS}"><b>🦎 Acrobatic & Two-Seat Mounts</b>
          <div style="${btnS}margin-top:8px;">
            ${mounts.map(([k, v]) => `<button class="btn btn-accent" onclick="lwAction('mount',{mount:'${k}'})">🐉 ${v.name} (${v.seats}P)</button>`).join('')}
            <button class="btn" onclick="lwAction('mount_passenger')">🙋 Ride 2nd Seat</button>
            <button class="btn" onclick="lwAction('dismount')">🥾 Dismount</button>
          </div>
        </div>
        <div style="${boxS}"><b>🦊 Tameable Battle Pets & 🧶 Bazaars & 📜 Bounties</b>
          <div style="${btnS}margin-top:8px;">
            ${pets.map(([k, v]) => `<button class="btn" onclick="lwAction('tame_pet',{pet:'${k}'})">🦊 Tame ${v.name}</button>`).join('')}
            <button class="btn" onclick="lwAction('name_pet',{name:prompt('Pet Name:')||'Zephyr'})">🏷️ Name Pet</button>
          </div>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('bounty',{bounty:'list'})">📜 Bounty Posters</button>
            ${(cfg.bounties || []).map(b => `<button class="btn" onclick="lwAction('bounty',{bounty:'${b.id}'})" title="${b.desc || ''}">🎯 ${b.target} (${b.reward_gp} GP)</button>`).join('')}
            <button class="btn" onclick="lwAction('bazaar_rug')">🧶 Unroll Bazaar Rug</button>
          </div>
        </div>`;
    } else if (LW_STATE.activeTab === 'build') {
      const pieces = Object.entries(cli.building_recipes || {});
      const vehs = Object.entries(cfg.vehicles || {});
      body.innerHTML = `
        <div style="${boxS}"><b>🏗️ Modular Camp & Blueprints</b>
          <div style="${btnS}margin-top:8px;">
            ${pieces.map(([k, v]) => `<button class="btn" onclick="lwAction('build',{piece:'${k}'})">🪵 Build ${v.label || k}</button>`).join('')}
          </div>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('save_blueprint',{name:'MyBastion'})">📐 Save Blueprint</button>
            <button class="btn btn-accent" onclick="lwAction('deploy_blueprint',{name:'MyBastion'})">🏰 Deploy Blueprint</button>
            <button class="btn" onclick="lwAction('rest_warmth')">🔥 Rest by Hearth</button>
          </div>
        </div>
        <div style="${boxS}"><b>⛵ Multi-Crew Vessels, Frontier Outpost & Destructibles</b>
          <div style="${btnS}margin-top:8px;">
            ${vehs.map(([k, v]) => `<button class="btn btn-accent" onclick="lwAction('vehicle',{vehicle:'${k}'})">⛵ Launch ${v.name}</button>`).join('')}
            <button class="btn" onclick="lwAction('crew',{station:'helm'})">🛞 Helm</button>
            <button class="btn" onclick="lwAction('crew',{station:'sails'})">🌬️ Sails</button>
            <button class="btn" onclick="lwAction('crew',{station:'cannon'})">💣 Cannon Station</button>
            <button class="btn btn-accent" onclick="lwAction('cannon')">💥 Fire Broadside [X]</button>
          </div>
          <div style="${btnS}margin-top:8px;">
            <button class="btn" onclick="lwAction('outpost',{delta:1})">🏰 Supply Frontier Outpost (+1 Tier)</button>
            <button class="btn" onclick="lwAction('breach')">💥 Breach Wall/Tower</button>
            <button class="btn" onclick="lwAction('dig')">⛏️ Dig Escape Tunnel</button>
            <button class="btn" onclick="lwAction('chemistry',{element:'fire'})">🔥 Ignite Nearby Chemistry</button>
          </div>
        </div>`;
    } else if (LW_STATE.activeTab === 'events') {
      const curses = Object.entries(cfg.labyrinth_curses || {});
      body.innerHTML = `
        <div style="${boxS}"><b>🌋 Dynamic World Events & Giant Scaling Colossus</b>
          <div style="${btnS}margin-top:8px;">
            <button class="btn btn-accent" onclick="lwAction('world_event',{delta:1})">🚨 Advance/Start Caravan Crisis -> Colossus</button>
            <button class="btn" onclick="lwAction('spare')">🕊️ Spare / Non-Lethal Parley</button>
            <button class="btn" onclick="lwAction('reflect')">☕ Breakfast Scene & World Reaction</button>
          </div>
        </div>
        <div style="${boxS}"><b>📖 Environmental Micro-Story, Order-Independent Shards & Guild Prep (${(lw.narrative_harmony && lw.narrative_harmony.climax_prep_pct) || 0}%)</b>
          <div style="font-size:0.8rem;color:#c9d1d9;margin-top:6px;">
            <div><i>Vignette:</i> ${(lw.narrative_harmony && lw.narrative_harmony.vignette) || 'Survey ruins around the flagstones.'}</div>
            <div style="margin-top:4px;color:#79c0ff;">💬 ${(lw.narrative_harmony && lw.narrative_harmony.reaction) || ''}</div>
            <div style="margin-top:4px;color:#8b949e;">Shards: ${((lw.narrative_harmony && lw.narrative_harmony.shards) || []).map(s => s.title).join(' • ') || 'Explore any sector'}</div>
          </div>
        </div>
        <div style="${boxS}"><b>🌀 Shifting Labyrinth Dungeons & Playful Curses</b>
          <div style="${btnS}margin-top:8px;">
            ${curses.map(([k, v]) => `<button class="btn" onclick="lwAction('labyrinth',{curse:'${k}'})">🌀 Delve: ${v.name}</button>`).join('')}
          </div>
        </div>
        <div style="${boxS}"><b>💀 Grudge-Holding Nemesis Rivals & Postcard Gallery (${LW_STATE.gallery.length})</b>
          <div style="font-size:0.8rem;color:#8b949e;margin-top:6px;">
            Rivals: ${(lw.rivals || []).map(r => `${r.name} [${r.scar}]`).join(', ') || 'None yet — falling or fleeing promotes rivals via NeuralWorldModel!'}
          </div>
          <div style="display:flex;gap:8px;overflow-x:auto;margin-top:8px;">
            ${LW_STATE.gallery.map(g => `<img src="${g.url}" title="${g.caption}" style="height:82px;border-radius:6px;border:1px solid #d29922;"/>`).join('') || '<i>Snap a Photo Mode Postcard [K] to save here!</i>'}
          </div>
        </div>`;
    }
  }

  function onLivingWorldPayload(lw) {
    if (!lw) return;
    LW_STATE.lastLw = lw;
    if (Array.isArray(lw.fx_events)) lw.fx_events.forEach(handleFxEvent);
    updateLivingStatusStrip(lw);
    if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
  }

  window.__LW_ON_DELTA__ = function (data) {
    if (!data) return;
    if (data.living_world) onLivingWorldPayload(data.living_world);
    if (data.scene_3d) {
      if (data.scene_3d.living_world) onLivingWorldPayload(data.scene_3d.living_world);
      const now = performance.now();
      const lwForce = Boolean(data.living_world && data.living_world.fx_events && data.living_world.fx_events.length);
      if (lwForce || !LW_STATE._lastOverlayMs || now - LW_STATE._lastOverlayMs > 220) {
        LW_STATE._lastOverlayMs = now;
        lwRenderWorldOverlays(data.scene_3d);
      }
    }
  };

  window.__LW_ON_SCENE_3D__ = function (scene3d) {
    if (!scene3d) return;
    if (scene3d.living_world) onLivingWorldPayload(scene3d.living_world);
    lwRenderWorldOverlays(scene3d);
  };
})();
