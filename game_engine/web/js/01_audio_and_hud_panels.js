    class SoundFX {
      constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicGain = null;
        this.waterGain = null;
        this.waterFilter = null;
        this.waterPanner = null;
        this.waterNode = null;
        this.waterSources = [];
        this.activeMidiTimer = null;
        this.currentMidiTrack = 'exploration';
        this.midiStep = 0;
        this.bpm = 100;
        this.listenerPos = { x: 0, y: 0, z: 0 };
      }
      init() {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            this.ctx = new AC();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Water procedural loop
            this.setupWaterSound();
            // Start background MIDI generator
            this.startMidiMusic();
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }
      setMuted(muted) {
        this.isMuted = muted;
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime, 0.05);
        }
      }
      toggleMute() {
        this.init();
        this.setMuted(!this.isMuted);
        return !this.isMuted;
      }
      // 3D Spatial Audio Node Helper using PannerNode or StereoPanner
      createPanner(x, y, z) {
        if (!this.ctx) return null;
        if (this.ctx.createPanner) {
          const panner = this.ctx.createPanner();
          panner.panningModel = 'HRTF';
          panner.distanceModel = 'inverse';
          panner.refDistance = 120;
          panner.maxDistance = 1800;
          panner.rolloffFactor = 1.2;
          panner.coneInnerAngle = 360;
          if (panner.positionX) {
            panner.positionX.setValueAtTime(x, this.ctx.currentTime);
            panner.positionY.setValueAtTime(y, this.ctx.currentTime);
            panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
          } else {
            panner.setPosition(x, y, z);
          }
          return panner;
        } else if (this.ctx.createStereoPanner) {
          const pan = Math.max(-1, Math.min(1, (x - this.listenerPos.x) / 400));
          const p = this.ctx.createStereoPanner();
          p.pan.setValueAtTime(pan, this.ctx.currentTime);
          return p;
        }
        return null;
      }
      updateListener(px, py, pz, forwardX=0, forwardY=0, forwardZ=-1, upX=0, upY=1, upZ=0) {
        this.listenerPos = { x: px, y: py, z: pz };
        if (!this.ctx || !this.ctx.listener) return;
        const l = this.ctx.listener;
        const t = this.ctx.currentTime;
        if (l.positionX) {
          l.positionX.setTargetAtTime(px, t, 0.04);
          l.positionY.setTargetAtTime(py, t, 0.04);
          l.positionZ.setTargetAtTime(pz, t, 0.04);
          l.forwardX.setTargetAtTime(forwardX, t, 0.04);
          l.forwardY.setTargetAtTime(forwardY, t, 0.04);
          l.forwardZ.setTargetAtTime(forwardZ, t, 0.04);
          l.upX.setTargetAtTime(upX, t, 0.04);
          l.upY.setTargetAtTime(upY, t, 0.04);
          l.upZ.setTargetAtTime(upZ, t, 0.04);
        } else if (l.setPosition) {
          l.setPosition(px, py, pz);
          l.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
        }
      }
      // Core synthesis tone with optional 3D position
      tone(freq, endFreq, dur, type='triangle', vol=0.25, delay=0, pos3D=null) {
        this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(Math.max(20, freq), t);
        if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        let finalNode = g;
        if (pos3D) {
          const panner = this.createPanner(pos3D.x || 0, pos3D.y || 0, pos3D.z || 0);
          if (panner) {
            g.connect(panner);
            finalNode = panner;
          }
        }
        o.connect(g);
        finalNode.connect(this.masterGain || this.ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.03);
      }
      noise(dur, filterFreq=800, vol=0.15, delay=0, pos3D=null) {
        this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const bufLen = Math.floor(this.ctx.sampleRate * Math.min(dur, 2.0));
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufLen));
        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const flt = this.ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(filterFreq, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        src.connect(flt);
        flt.connect(g);

        let finalNode = g;
        if (pos3D) {
          const panner = this.createPanner(pos3D.x || 0, pos3D.y || 0, pos3D.z || 0);
          if (panner) {
            g.connect(panner);
            finalNode = panner;
          }
        }
        finalNode.connect(this.masterGain || this.ctx.destination);
        src.start(t);
        src.stop(t + dur + 0.05);
      }

      // Procedural Rushing Water Continuous Stream (Pink/White noise with resonant water filters & LFO ripples)
      setupWaterSound() {
        if (!this.ctx || this.waterNode) return;
        try {
          const bufSize = 2 * this.ctx.sampleRate;
          const noiseBuffer = this.ctx.createBuffer(2, bufSize, this.ctx.sampleRate);
          for (let ch = 0; ch < 2; ch++) {
            const out = noiseBuffer.getChannelData(ch);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufSize; i++) {
              const white = Math.random() * 2 - 1;
              // Pink noise approximation for rushing river torrent
              b0 = 0.99886 * b0 + white * 0.0555179;
              b1 = 0.99332 * b1 + white * 0.0750759;
              b2 = 0.96900 * b2 + white * 0.1538520;
              b3 = 0.86650 * b3 + white * 0.3104856;
              b4 = 0.55000 * b4 + white * 0.5329522;
              b5 = -0.7616 * b5 - white * 0.0168980;
              out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
              b6 = white * 0.115926;
            }
          }
          this.waterNode = this.ctx.createBufferSource();
          this.waterNode.buffer = noiseBuffer;
          this.waterNode.loop = true;

          // Bandpass filter to capture aquatic gurgling and turbulent water flow
          this.waterFilter = this.ctx.createBiquadFilter();
          this.waterFilter.type = 'bandpass';
          this.waterFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
          this.waterFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

          // Water volume control and spatial panner
          this.waterGain = this.ctx.createGain();
          this.waterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

          // LFO for rushing water ebb & surge modulation
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.setValueAtTime(0.35, this.ctx.currentTime);
          lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(this.waterFilter.frequency);
          lfo.start();

          if (this.ctx.createPanner) {
            this.waterPanner = this.ctx.createPanner();
            this.waterPanner.panningModel = 'HRTF';
            this.waterPanner.distanceModel = 'inverse';
            this.waterPanner.refDistance = 150;
            this.waterPanner.maxDistance = 1600;
            this.waterPanner.rolloffFactor = 1.4;
          }

          this.waterNode.connect(this.waterFilter);
          this.waterFilter.connect(this.waterGain);
          if (this.waterPanner) {
            this.waterGain.connect(this.waterPanner);
            this.waterPanner.connect(this.masterGain || this.ctx.destination);
          } else {
            this.waterGain.connect(this.masterGain || this.ctx.destination);
          }
          this.waterNode.start();
        } catch (e) {
          console.warn('Procedural water audio init skipped:', e);
        }
      }

      setWaterPresence(hasWater, waterCoords=null) {
        if (!this.ctx || !this.waterGain) return;
        const t = this.ctx.currentTime;
        if (!hasWater) {
          this.waterGain.gain.setTargetAtTime(0.0001, t, 0.3);
          return;
        }
        // Compute distance and orientation from player/listener to stream center
        let dist = 100;
        let wx = 0, wy = 0, wz = 0;
        if (waterCoords) {
          wx = waterCoords.x || 0;
          wy = waterCoords.y || 0;
          wz = waterCoords.z || 0;
          dist = Math.hypot(this.listenerPos.x - wx, this.listenerPos.y - wy, this.listenerPos.z - wz);
        }
        if (this.waterPanner) {
          if (this.waterPanner.positionX) {
            this.waterPanner.positionX.setTargetAtTime(wx, t, 0.1);
            this.waterPanner.positionY.setTargetAtTime(wy, t, 0.1);
            this.waterPanner.positionZ.setTargetAtTime(wz, t, 0.1);
          } else {
            this.waterPanner.setPosition(wx, wy, wz);
          }
        }
        // Attenuate water volume based on proximity
        const maxHearDist = 900.0;
        const normDist = Math.max(0, Math.min(1, dist / maxHearDist));
        const targetVol = (1.0 - normDist) * 0.42;
        this.waterGain.gain.setTargetAtTime(targetVol, t, 0.15);
      }

      // Background Procedural MIDI Music Synthesizer (Aeonward Continuum OST)
      startMidiMusic() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain || this.ctx.destination);
        this.scheduleNextMidiNote();
      }

      setMidiTrack(mode) {
        if (this.currentMidiTrack === mode) return;
        this.currentMidiTrack = mode;
        const tracks = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().music_tracks) || {};
        this.bpm = (tracks[mode] && tracks[mode].bpm) || ((mode === 'combat') ? 132 : (mode === 'victory') ? 116 : 92);
      }

      _midiTone(type, freq, when, dur, gain) {
        const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, when);
        g.gain.setValueAtTime(gain, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.connect(g); g.connect(this.musicGain);
        osc.start(when); osc.stop(when + dur + 0.05);
      }

      scheduleNextMidiNote() {
        if (!this.musicPlaying || !this.ctx) return;
        const spb = 60.0 / this.bpm;
        const step = this.midiStep++;
        const mode = this.currentMidiTrack || 'exploration';
        const tracks = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().music_tracks) || {};
        const tr = tracks[mode] || tracks.exploration || { bpm: 92, roots: [220, 196, 174.61, 164.81], lead_ratios: [1, 1.189, 1.498, 2.0], bass_steps: [0, 8], chord_mod: 4, plucks: [0, 3, 6, 8, 10, 13], third: 1.189 };
        this.bpm = tr.bpm || this.bpm;
        const roots = tr.roots || [220];
        const barDiv = (mode === 'victory') ? 8 : 16;
        const bar = Math.floor(step / barDiv) % roots.length;
        const barStep = step % barDiv;
        const r = roots[bar];
        const ratios = tr.lead_ratios || [1, 1.5, 2];

        if (!this.isMuted) {
          const now = this.ctx.currentTime, dur = spb * 0.75;
          const playBass = tr.bass_steps ? tr.bass_steps.includes(barStep) : (tr.bass_mod && ((mode === 'victory' ? step : barStep) % tr.bass_mod === 0));
          if (playBass) this._midiTone('triangle', r / 2, now, dur * 1.2, 0.12);
          if (tr.chord_mod && ((mode === 'victory' ? step : barStep) % tr.chord_mod === 0)) {
            [r, r * (tr.third || 1.189), r * 1.498].forEach(f => this._midiTone('sine', f, now, spb * 1.8, 0.04));
          }
          const doLead = tr.plucks ? tr.plucks.includes(barStep) : (mode === 'combat' ? (barStep % 3 === 0 || barStep === 14) : true);
          if (doLead) {
            const mult = mode === 'combat' ? 2 : mode === 'victory' ? 3 : 5;
            this._midiTone(mode === 'combat' ? 'sawtooth' : 'triangle', r * ratios[(step * mult) % ratios.length], now, dur, mode === 'combat' ? 0.08 : 0.07);
          }
        }
        this.activeMidiTimer = setTimeout(() => this.scheduleNextMidiNote(), spb * 500);
      }

      _playSfx(name, pos3D=null, track=null) {
        if (track) this.setMidiTrack(track);
        const seq = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().sound_presets && getClientSkillClientCfg().sound_presets[name]) || null;
        if (!Array.isArray(seq)) return;
        for (const s of seq) {
          if (s[0] === 'n') this.noise(s[1], s[2], s[3], s[4] || 0, pos3D);
          else this.tone(name === 'step' ? s[1] + Math.random() * 20 : s[1], s[2] || null, s[3], s[4] || 'triangle', s[5] || 0.25, s[6] || 0, pos3D);
        }
      }
      playStep(p=null) { this._playSfx('step', p); }
      playDoor(p=null) { this._playSfx('door', p); }
      playHit(p=null, isCrit=false) { this._playSfx(isCrit ? 'crit' : 'hit', p); }
      playAttack(p=null) { this._playSfx('attack', p); }
      playMiss(p=null) { this._playSfx('miss', p); }
      playBowShot(p=null) { this._playSfx('bow_shot', p); }
      playSpellCast(p=null) { this._playSfx('spell_cast', p); }
      playHeal(p=null) { this._playSfx('heal', p); }
      playPickup(p=null) { this._playSfx('pickup', p); }
      playRest(p=null) { this._playSfx('rest', p); }
      playLevelUp(p=null) { this._playSfx('level_up', p); }
      playDeath() { this._playSfx('death', null, 'exploration'); }
      playRespawn() { this._playSfx('respawn'); }
      playSaveAction(action='save') { this._playSfx(`save_${action === 'load' || action === 'save' ? action : 'delete'}`); }
      playSelectHero() { this._playSfx('select_hero'); }
      playVictory() { this._playSfx('victory', null, 'victory'); }
      playChime(name, pos3D=null) { this._playSfx(name, pos3D); }
      setCrowdPresence(density=0, muffled=false) {
        if (!this.ctx || !this.masterGain || this.muted) {
          if (this._crowdGain) this._crowdGain.gain.setTargetAtTime(0.0001, (this.ctx && this.ctx.currentTime) || 0, 0.15);
          return;
        }
        const now = this.ctx.currentTime;
        if (!this._crowdGain) {
          const len = this.ctx.sampleRate * 2;
          const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const ch = buf.getChannelData(0);
          let last = 0;
          for (let i = 0; i < len; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; ch[i] = last * 3.2; }
          const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = muffled ? 280 : 1050;
          const g = this.ctx.createGain(); g.gain.value = 0.0001;
          src.connect(lp); lp.connect(g); g.connect(this.masterGain); src.start(now);
          this._crowdFilter = lp; this._crowdGain = g;
        }
        const targetGain = density > 8 ? Math.min(0.06, 0.008 + (density / 100) * 0.035) * (muffled ? 0.45 : 1.0) : 0.0001;
        this._crowdFilter.frequency.setTargetAtTime(muffled ? 280 : 1050, now, 0.25);
        this._crowdGain.gain.setTargetAtTime(targetGain, now, 0.25);
      }
    }
    const sfx = new SoundFX();
    function toggleAudioMute() {
      const active = sfx.toggleMute();
      const b = document.getElementById('btnMuteAudio');
      if (b) {
        b.innerText = active ? '🔊 Audio: ON' : '🔇 Audio: OFF';
        b.style.borderColor = active ? '#58a6ff' : '#f85149';
        b.style.color = active ? '#58a6ff' : '#f85149';
      }
    }
    // Global user click unlocks Web Audio immediately
    window.addEventListener('click', () => sfx.init(), { once: true });
    window.addEventListener('keydown', () => sfx.init(), { once: true });
    const logArea = document.getElementById('logArea'), cmdInput = document.getElementById('commandInput'), invBadge = document.getElementById('invBadge');

    let showGrid = false;
    function toggleGrid() {
      showGrid = !showGrid;
      const btn = document.getElementById('btnToggleGrid');
      if (btn) {
        btn.innerText = showGrid ? '📐 Grid: ON' : '📐 Grid: OFF';
        btn.classList.toggle('active', showGrid);
      }
      if (typeof threeRoomGroup !== 'undefined' && threeRoomGroup) {
        threeRoomGroup.traverse(c => {
          if (c.userData && c.userData.isGridOverlay) {
            c.visible = showGrid;
          }
        });
      }
    }

    let showPerfHUD = false;
    function togglePerfHUD() {
      showPerfHUD = !showPerfHUD;
      const btn = document.getElementById('btnTogglePerfHUD');
      const hud = document.getElementById('perfHudOverlay');
      if (btn) {
        btn.classList.toggle('active', showPerfHUD);
        btn.innerText = showPerfHUD ? '📊 Perf HUD: ON' : '📊 Perf HUD';
      }
      if (hud) {
        hud.style.display = showPerfHUD ? 'block' : 'none';
      }
    }

    // Per-Browser-Tab Session Identity so each tab controls its own distinct character
    let myPlayerId = sessionStorage.getItem('dnd_session_player_id');
    if (!myPlayerId) { myPlayerId = 'hero_' + Math.random().toString(36).substring(2, 9); sessionStorage.setItem('dnd_session_player_id', myPlayerId); }

    const _dndCfg = window.__DND_CONFIG__ || {};
    let inspectableObjects = _dndCfg.initialObjects || {}, currentShake = { intensity: 0, duration: 0 }, lastPlayerPos = { x: 140, y: 390 }, lastFacing = 'east', currentRoomId = '', currentRoomName = _dndCfg.roomName || '', lastSyncTurn = -1, lastGamepadMoveTime = 0;
    let cachedPartyStats = {}, viewingPlayerId = myPlayerId;
    const cachedProcTex = {};

    // Global movement and multiplayer gamepad state
    let isMoving = false;
    let moveDebounceTimer = null;
    const activeKeys = new Set();
    const activeGamepadKeys = new Set();
    let baseGamepadId = parseInt(sessionStorage.getItem('dnd_base_gp_id') || '0', 10);
    if (!baseGamepadId) {
      baseGamepadId = (Math.random() * 1e8 | 0) * 10;
      sessionStorage.setItem('dnd_base_gp_id', String(baseGamepadId));
    }
    const localGamepadPlayers = {}; // { slot: { id, x, y, z, dirty, lastSent } }
    const prevGamepadState = {};    // { "slot:btnIndex": boolean }
    let gamepadConnected = false;

    let cachedTakeableItems = [];
    let takeDropdownFetchTimer = null;
    let tacticalMoveInterval = null;
    let activeTacticalPath = [];
    let activeTacticalTargetPortal = null;

    // =========================================================================
    // CLIENT-SIDE CC-ELM SEMANTIC MODEL & SKILLS RUNTIME
    // =========================================================================
    window.__DND_CLIENT_SKILLS__ = window.__DND_CLIENT_SKILLS__ || {};
    let _ccElmClient = null;
    const _ccElmTextCache = new Map();
    const _ccElmBankCache = new Map();

    function _decodeB64F32(b64) {
      if (!b64) return null;
      const bin = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new Float32Array(u8.buffer, 0, u8.byteLength >> 2);
    }

    function initClientCCELM(payload) {
      if (!payload || !payload.available || !payload.vocab_tokens || !payload.W_anc_b64) return false;
      const vocab = payload.vocab_tokens;
      const dAnc = payload.anchor_dim | 0;
      const vSize = payload.vocab_size | 0;
      const wAnc = _decodeB64F32(payload.W_anc_b64);
      const idf = _decodeB64F32(payload.token_idf_b64) || new Float32Array(vSize).fill(1.0);
      const tmp = new Map();
      for (let cid = 0; cid < vocab.length; cid++) {
        const tok = vocab[cid];
        if (!tok) continue;
        const c0 = tok[0];
        let byLen = tmp.get(c0);
        if (!byLen) { byLen = new Map(); tmp.set(c0, byLen); }
        let bucket = byLen.get(tok.length);
        if (!bucket) { bucket = new Map(); byLen.set(tok.length, bucket); }
        if (!bucket.has(tok)) bucket.set(tok, cid);
      }
      const prefixBuckets = new Map();
      for (const [c0, byLen] of tmp.entries()) {
        const sortedLens = Array.from(byLen.keys()).sort((a, b) => b - a);
        prefixBuckets.set(c0, sortedLens.map(tlen => [tlen, byLen.get(tlen)]));
      }
      _ccElmClient = { vocab, vSize, dAnc, wAnc, idf, prefixBuckets };
      _ccElmTextCache.clear();
      _ccElmBankCache.clear();
      return true;
    }

    function ccElmEncodeText(text) {
      if (!_ccElmClient || !_ccElmClient.vocab || !_ccElmClient.vocab.length) return [0];
      const bucketsMap = _ccElmClient.prefixBuckets;
      const ids = [];
      let i = 0;
      const n = text ? text.length : 0;
      while (i < n) {
        const buckets = bucketsMap.get(text[i]);
        let matched = false;
        if (buckets) {
          for (let b = 0; b < buckets.length; b++) {
            const tlen = buckets[b][0];
            if (i + tlen <= n) {
              const cid = buckets[b][1].get(text.slice(i, i + tlen));
              if (cid !== undefined) { ids.push(cid); i += tlen; matched = true; break; }
            }
          }
        }
        if (!matched) { ids.push(0); i += 1; }
      }
      return ids.length ? ids : [0];
    }

    function ccElmComputePromptAnchor(ids) {
      if (!_ccElmClient) return null;
      const { dAnc, vSize, wAnc, idf } = _ccElmClient;
      const anc = new Float32Array(dAnc);
      let wSum = 0.0;
      const maxRow = Math.min(vSize, (wAnc.length / dAnc) | 0) - 1;
      for (let k = 0; k < ids.length; k++) {
        let idx = ids[k] | 0;
        if (idx < 0) idx = 0; else if (idx > maxRow) idx = maxRow;
        const w = (idf && idx < idf.length) ? idf[idx] : 1.0;
        wSum += w;
        const off = idx * dAnc;
        for (let j = 0; j < dAnc; j++) anc[j] += wAnc[off + j] * w;
      }
      const invW = 1.0 / (wSum + 1e-7);
      let sq = 0.0;
      for (let j = 0; j < dAnc; j++) { anc[j] *= invW; sq += anc[j] * anc[j]; }
      const invNorm = 1.0 / (Math.sqrt(sq) + 1e-7);
      for (let j = 0; j < dAnc; j++) anc[j] *= invNorm;
      return anc;
    }

    function _ccElmTextFeats(text) {
      const s = text || '';
      const hit = _ccElmTextCache.get(s);
      if (hit) return hit;
      const m = s.toLowerCase().match(/[a-z0-9]+/g);
      const words = new Set(m || []);
      const anc = _ccElmClient ? ccElmComputePromptAnchor(ccElmEncodeText(s)) : null;
      if (_ccElmTextCache.size > 4096) _ccElmTextCache.clear();
      const val = { words, anc };
      _ccElmTextCache.set(s, val);
      return val;
    }

    function ccElmEvaluateDecision(query, criteriaObj, temperature = 0.25) {
      const opts = Object.keys(criteriaObj || {});
      if (!opts.length) return { choice: null, confidence: 0.0, distribution: {} };
      const cacheKey = opts.map(o => `${o}\x00${String(criteriaObj[o] ?? o).trim()}`).join('\x01');
      let bank = _ccElmBankCache.get(cacheKey);
      if (!bank) {
        if (_ccElmBankCache.size > 1024) _ccElmBankCache.clear();
        bank = opts.map(o => ({ opt: o, feats: _ccElmTextFeats(String(criteriaObj[o] ?? o).trim()) }));
        _ccElmBankCache.set(cacheKey, bank);
      }
      const qFeats = _ccElmTextFeats(query || '');
      const dAnc = _ccElmClient ? _ccElmClient.dAnc : 0;
      const invTemp = 1.0 / Math.max(temperature, 0.05);
      const scores = new Float32Array(bank.length);
      let maxScore = -Infinity;
      for (let i = 0; i < bank.length; i++) {
        const cf = bank[i].feats;
        let overlap = 0;
        for (const w of qFeats.words) { if (cf.words.has(w)) overlap++; }
        let s = overlap * 2.5;
        if (qFeats.anc && cf.anc) {
          let dot = 0.0;
          for (let j = 0; j < dAnc; j++) dot += cf.anc[j] * qFeats.anc[j];
          s += dot * 5.0;
        }
        scores[i] = s;
        if (s > maxScore) maxScore = s;
      }
      const probs = new Float32Array(bank.length);
      let sumExp = 0.0;
      for (let i = 0; i < bank.length; i++) {
        const ex = Math.exp((scores[i] - maxScore) * invTemp);
        probs[i] = ex;
        sumExp += ex;
      }
      const distribution = {};
      let bestIdx = 0, bestProb = -1;
      for (let i = 0; i < bank.length; i++) {
        const p = probs[i] / (sumExp || 1.0);
        distribution[bank[i].opt] = p;
        if (p > bestProb) { bestProb = p; bestIdx = i; }
      }
      return { choice: bank[bestIdx].opt, confidence: bestProb, distribution };
    }

    function initClientSkills(bundle) {
      if (!bundle || typeof bundle !== 'object') return;
      window.__DND_CLIENT_SKILLS__ = bundle;
      if (Array.isArray(bundle.story_flags)) window.__DND_STORY_FLAGS__ = new Set(bundle.story_flags);
      const titleEl = document.getElementById('worldMapTitle');
      if (titleEl && bundle.title) titleEl.innerText = `${String(bundle.title).toUpperCase()} — OPEN WORLD ATLAS`;
      if (typeof window.__invalidatePreSkill3DScene === 'function') window.__invalidatePreSkill3DScene();
      if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
    }

    function getClientSkillClientCfg() {
      return (window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.client) || {};
    }

    function facingToVec(facing) {
      const f = String(facing || 'east').toLowerCase();
      let dx = (f.includes('east') ? 1 : 0) - (f.includes('west') ? 1 : 0);
      const dz = (f.includes('south') ? 1 : 0) - (f.includes('north') ? 1 : 0);
      if (!dx && !dz) dx = 1;
      const len = Math.hypot(dx, dz) || 1;
      return [dx / len, dz / len];
    }

    function classifyWithClientCCELM(query, criteriaObj, minConfidence = 0.0, defaultChoice = null) {
      if (!criteriaObj || typeof criteriaObj !== 'object' || !Object.keys(criteriaObj).length) return defaultChoice;
      const ans = ccElmEvaluateDecision(String(query || ''), criteriaObj, 0.25);
      return (ans.choice && ans.confidence >= minConfidence) ? ans.choice : defaultChoice;
    }

    function resolveSkillModelUrl(query, modelRules, defaultUrl = null) {
      if (!modelRules) return defaultUrl;
      const entries = modelRules.entries || {}, criteria = modelRules.criteria || {};
      const key = classifyWithClientCCELM(query, criteria, 0.40, null);
      if (key && entries[key]) return entries[key];
      const qLow = String(query || '').toLowerCase();
      for (const [k, url] of Object.entries(entries)) {
        if (String(criteria[k] || k).toLowerCase().split(/\s+/).some(w => w.length > 2 && qLow.includes(w))) return url;
      }
      return defaultUrl;
    }

    function _mergeSculptGeos(geoms) {
      let totalV = 0;
      const prepped = [];
      for (let i = 0; i < geoms.length; i++) {
        let g = geoms[i];
        if (!g) continue;
        if (g.index) g = g.toNonIndexed();
        if (!g.attributes.normal) g.computeVertexNormals();
        totalV += g.attributes.position.count;
        prepped.push(g);
      }
      const pos = new Float32Array(totalV * 3);
      const norm = new Float32Array(totalV * 3);
      const uv = new Float32Array(totalV * 2);
      const hasCol = prepped.some(g => g.attributes && g.attributes.color);
      const col = hasCol ? new Float32Array(totalV * 3) : null;
      let vo = 0;
      for (let i = 0; i < prepped.length; i++) {
        const g = prepped[i], cnt = g.attributes.position.count;
        pos.set(g.attributes.position.array, vo * 3);
        norm.set(g.attributes.normal.array, vo * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
        if (col) {
          if (g.attributes.color) col.set(g.attributes.color.array, vo * 3);
          else col.fill(1.0, vo * 3, (vo + cnt) * 3);
        }
        vo += cnt;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      out.computeBoundingSphere();
      return out;
    }

    function _buildLatheSculptGeo(profile, segs = 18, flutes = 0, fluteAmp = 0, twist = 0, phiS = 0, phiL = Math.PI * 2) {
      const pts = (profile || [[1, 0], [1, 1]]).map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
      const g = new THREE.LatheGeometry(pts, segs, phiS, phiL);
      if (flutes > 0 && fluteAmp > 0) {
        const pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
          const ang = Math.atan2(z, x);
          const f = 1 + fluteAmp * Math.cos(flutes * ang + twist * y);
          pa.setX(i, x * f); pa.setZ(i, z * f);
        }
        g.computeVertexNormals();
      }
      return g;
    }

    function _buildCrystalGeo(h = 16, r = 3.5, count = 6, seed = 1) {
      const parts = [];
      const mkShard = (sh, sr) => {
        const shaft = sh * 0.68;
        const g = new THREE.LatheGeometry([
          new THREE.Vector2(sr * 0.02, 0), new THREE.Vector2(sr * 0.85, sh * 0.01),
          new THREE.Vector2(sr, shaft * 0.4), new THREE.Vector2(sr * 0.9, shaft),
          new THREE.Vector2(sr * 0.01, sh)
        ], 6).toNonIndexed();
        g.computeVertexNormals();
        return g;
      };
      parts.push(mkShard(h, r));
      for (let i = 1; i < count; i++) {
        const ang = (i / Math.max(1, count - 1)) * Math.PI * 2 + seed * 0.7;
        const scH = h * (0.48 + 0.32 * Math.abs(Math.sin(i * 1.9 + seed)));
        const scR = r * (0.55 + 0.25 * Math.cos(i * 2.3));
        const sg = mkShard(scH, scR);
        sg.rotateX(0.32 + (i % 3) * 0.14);
        sg.rotateY(ang);
        sg.translate(Math.cos(ang) * r * 0.85, r * 0.06, Math.sin(ang) * r * 0.85);
        parts.push(sg);
      }
      return _mergeSculptGeos(parts);
    }

    function _buildFlameGeo(h = 12, r = 5, count = 5) {
      const parts = [];
      const core = _buildLatheSculptGeo([[r * 0.65, 0], [r * 0.72, h * 0.25], [r * 0.35, h * 0.6], [0.02, h]], 9, 5, 0.22, 0.45);
      parts.push(core);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const hi = h * (0.65 + 0.32 * ((i * 7) % 3) * 0.5), ri = r * 0.38;
        const tg = _buildLatheSculptGeo([[ri * 0.8, 0], [ri, hi * 0.32], [ri * 0.55, hi * 0.68], [0.02, hi]], 6, 3, 0.25, 0.6);
        tg.rotateX(0.24); tg.rotateZ(-0.14); tg.rotateY(ang);
        tg.translate(Math.cos(ang) * r * 0.42, 0, Math.sin(ang) * r * 0.42);
        parts.push(tg);
      }
      return _mergeSculptGeos(parts);
    }

    function _buildRockGeo(rx = 12, ry = 10, rz = 12, seed = 1) {
      const g = new THREE.IcosahedronGeometry(1.0, 2).toNonIndexed();
      const pa = g.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        let vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i);
        const ridge = 0.92 + Math.sin(vx * 3.1 + seed) * 0.11 + Math.cos(vz * 3.5 - vy * 1.8) * 0.08;
        vx *= ridge; vy *= ridge; vz *= ridge;
        const cut = vx * 0.55 + vy * 0.75 + vz * 0.35;
        if (cut > 0.68) { const ex = (cut - 0.68) * 0.55; vx -= 0.55 * ex; vy -= 0.75 * ex; vz -= 0.35 * ex; }
        pa.setXYZ(i, vx * rx, (vy < -0.15 ? vy * 0.55 : vy) * ry, vz * rz);
      }
      g.computeVertexNormals();
      return g;
    }

    function _buildGableRoofGeo(w = 60, h = 28, d = 60) {
      const hw = w * 0.56, slopeLen = Math.hypot(hw, h);
      const tilt = Math.atan2(h, hw), overD = d * 1.08;
      const _tint = (geo, r, g, b) => {
        const cnt = geo.attributes.position.count, a = new Float32Array(cnt * 3);
        for (let i = 0; i < cnt; i++) { a[i * 3] = r; a[i * 3 + 1] = g; a[i * 3 + 2] = b; }
        geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
        return geo;
      };
      const pL = _tint(new THREE.BoxGeometry(slopeLen, 2.8, overD), 0.88, 0.86, 0.86);
      pL.rotateZ(tilt); pL.translate(-hw * 0.5, h * 0.5, 0);
      const pR = _tint(new THREE.BoxGeometry(slopeLen, 2.8, overD), 0.88, 0.86, 0.86);
      pR.rotateZ(-tilt); pR.translate(hw * 0.5, h * 0.5, 0);
      const ridge = _tint(new THREE.BoxGeometry(3.4, 3.8, overD + 2), 0.55, 0.52, 0.50);
      ridge.translate(0, h + 0.4, 0);
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-w * 0.5, 0); gableShape.lineTo(0, h); gableShape.lineTo(w * 0.5, 0); gableShape.closePath();
      const gableCore = _tint(new THREE.ExtrudeGeometry(gableShape, { depth: d * 0.96, bevelEnabled: false }), 1.04, 0.98, 0.88);
      gableCore.translate(0, 0, -d * 0.48);
      return _mergeSculptGeos([gableCore, pL, pR, ridge]);
    }

    function _buildBladeGeo(w = 1, h = 14, d = 0.25) {
      const sh = new THREE.Shape();
      const hw = w * 0.5;
      sh.moveTo(-hw * 0.9, 0);
      sh.lineTo(-hw, h * 0.68);
      sh.lineTo(-hw * 0.55, h * 0.88);
      sh.lineTo(0, h);
      sh.lineTo(hw * 0.55, h * 0.88);
      sh.lineTo(hw, h * 0.68);
      sh.lineTo(hw * 0.9, 0);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: d * 0.5, bevelEnabled: true, bevelThickness: d * 0.38, bevelSize: hw * 0.28, bevelSegments: 1, curveSegments: 1 });
      g.translate(0, -h * 0.5, -d * 0.25);
      g.computeVertexNormals();
      return g;
    }

    function _buildHeaterShieldGeo(w = 6, h = 11.5, d = 0.9) {
      const sh = new THREE.Shape(), hw = w * 0.5, hh = h * 0.5;
      sh.moveTo(-hw, hh * 0.82); sh.quadraticCurveTo(0, hh * 1.05, hw, hh * 0.82);
      sh.lineTo(hw * 0.92, -hh * 0.15); sh.quadraticCurveTo(hw * 0.45, -hh * 0.72, 0, -hh);
      sh.quadraticCurveTo(-hw * 0.45, -hh * 0.72, -hw * 0.92, -hh * 0.15); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: d * 0.5, bevelEnabled: true, bevelThickness: d * 0.35, bevelSize: w * 0.06, bevelSegments: 2, curveSegments: 4 });
      g.translate(0, 0, -d * 0.25); g.computeVertexNormals();
      return g;
    }

    function _buildShipHullGeo(w = 48, h = 18, d = 100) {
      const sh = new THREE.Shape(), hw = w * 0.5, hd = d * 0.5;
      sh.moveTo(-hw * 0.72, -hd * 0.94);
      sh.lineTo(hw * 0.72, -hd * 0.94);
      sh.quadraticCurveTo(hw * 1.05, 0, hw * 0.78, hd * 0.52);
      sh.quadraticCurveTo(hw * 0.35, hd * 0.88, 0, hd);
      sh.quadraticCurveTo(-hw * 0.35, hd * 0.88, -hw * 0.78, hd * 0.52);
      sh.quadraticCurveTo(-hw * 1.05, 0, -hw * 0.72, -hd * 0.94);
      const g = new THREE.ExtrudeGeometry(sh, { depth: h * 0.72, bevelEnabled: true, bevelThickness: h * 0.22, bevelSize: hw * 0.12, bevelSegments: 2, curveSegments: 6 });
      g.rotateX(Math.PI / 2);
      g.center(); g.computeVertexNormals();
      return g;
    }

    function _buildSpokedWheelGeo(r = 11, w = 2.6, spokes = 8) {
      const parts = [
        new THREE.TorusGeometry(r - 0.8, 0.9, 8, 20),
        new THREE.CylinderGeometry(2.2, 2.2, w + 0.8, 10).rotateX(Math.PI / 2),
      ];
      const slen = Math.max(1, r - 2.4);
      for (let i = 0; i < spokes; i++) {
        const ang = (i / spokes) * Math.PI * 2;
        const sg = new THREE.CylinderGeometry(0.45, 0.55, slen, 6);
        sg.rotateZ(ang);
        sg.translate(-Math.sin(ang) * (1.2 + slen * 0.5), Math.cos(ang) * (1.2 + slen * 0.5), 0);
        parts.push(sg);
      }
      return _mergeSculptGeos(parts);
    }

    function _buildGrassTuftGeo(r = 10, h = 18) {
      const parts = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + (i % 2) * 0.42;
        const bh = h * (0.65 + (i % 3) * 0.18);
        const bw = Math.max(0.65, r * 0.22);
        const bg = new THREE.BoxGeometry(0.18, bh, bw, 1, 4, 1).toNonIndexed();
        const pa = bg.attributes.position, vc = new Float32Array(pa.count * 3);
        for (let vi = 0; vi < pa.count; vi++) {
          const y0 = pa.getY(vi);
          const t = Math.max(0, Math.min(1, (y0 + bh * 0.5) / Math.max(1, bh)));
          const taper = Math.max(0.06, 1.0 - Math.pow(t, 1.15) * 0.94);
          pa.setXYZ(vi, pa.getX(vi) * taper + t * t * (r * 0.28), y0, pa.getZ(vi) * taper);
          vc[vi * 3] = 0.52 + t * 0.62; vc[vi * 3 + 1] = 0.58 + t * 0.60; vc[vi * 3 + 2] = 0.45 + t * 0.42;
        }
        bg.computeVertexNormals();
        bg.setAttribute('color', new THREE.BufferAttribute(vc, 3));
        bg.translate(0, bh * 0.42, 0);
        bg.rotateZ(0.20 + (i % 2) * 0.14);
        bg.rotateY(ang);
        bg.translate(Math.cos(ang) * r * 0.26, -bh * 0.08, Math.sin(ang) * r * 0.26);
        parts.push(bg);
      }
      return _mergeSculptGeos(parts);
    }

    window._sculptHelpers = {
      merge: _mergeSculptGeos, lathe: _buildLatheSculptGeo, crystal: _buildCrystalGeo,
      flame: _buildFlameGeo, rock: _buildRockGeo, gableRoof: _buildGableRoofGeo,
      blade: _buildBladeGeo, heaterShield: _buildHeaterShieldGeo, hull: _buildShipHullGeo,
      wheel: _buildSpokedWheelGeo, grassTuft: _buildGrassTuftGeo
    };

    const _hslTmp = { h: 0, s: 0, l: 0 };
    function _tonePbrColor(rawCol, isEmissive = false) {
      const c = new THREE.Color(rawCol ?? 0x808080);
      c.getHSL(_hslTmp);
      if (!isEmissive) {
        _hslTmp.l = Math.max(0.11, Math.min(0.80, _hslTmp.l));
        if (_hslTmp.s > 0.78) _hslTmp.s = 0.78 + (_hslTmp.s - 0.78) * 0.35;
      } else {
        _hslTmp.l = Math.max(0.16, Math.min(0.82, _hslTmp.l));
        if (_hslTmp.s > 0.84) _hslTmp.s = 0.84;
      }
      c.setHSL(_hslTmp.h, _hslTmp.s, _hslTmp.l);
      return c;
    }

    function _inferPartPbrKind(p, colObj) {
      if (p.pbrKind) return p.pbrKind;
      const gt = p.type || '';
      const mk = String(p.mat || p.key || '').toLowerCase();
      if (gt === 'flame') return 'flame';
      if (gt === 'gable_roof' || gt === 'roof_of_rect' || p.roof_of_rect) return 'shingle';
      if (gt === 'crystal' || (p.emissive && (p.roughness === undefined || p.roughness < 0.35))) return 'crystal';
      if (gt === 'blade' || (p.metalness !== undefined && p.metalness >= 0.45) || /steel|iron|gold|brass|bronze/.test(mk)) return 'metal';
      if (gt === 'hull' || gt === 'spoked_wheel' || /wood|plank|timber/.test(mk)) return 'wood';
      if (gt === 'rock' || /stone|brick|cobble|rock/.test(mk)) return 'stone';
      if (/leather|hide|bag/.test(mk)) return 'leather';
      if (/cloth|blanket|banner|cloak|sail|rug/.test(mk)) return 'cloth';
      if (/^leg_|tail|fur/.test(mk)) return 'fur';
      colObj.getHSL(_hslTmp);
      if (gt === 'torus' && _hslTmp.s < 0.25 && _hslTmp.l < 0.46) return 'metal';
      if (_hslTmp.s < 0.19) return (p.roughness !== undefined && p.roughness < 0.45) ? 'metal' : 'stone';
      if (_hslTmp.h >= 0.04 && _hslTmp.h <= 0.14) {
        if (_hslTmp.s > 0.62 && _hslTmp.l > 0.46 && (gt === 'torus' || gt === 'box')) return 'metal';
        if (gt === 'lathe' && _hslTmp.l >= 0.38 && _hslTmp.s <= 0.56) return 'fur';
        return (_hslTmp.l < 0.38) ? 'leather' : 'wood';
      }
      if ((p.roughness === undefined || p.roughness >= 0.68) && _hslTmp.s >= 0.25) return 'cloth';
      return 'stone';
    }

    function createRichObjectMaterial(spec = {}) {
      const _gm = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();
      const rawEm = spec.emissive || 0;
      const tonedCol = _tonePbrColor(spec.color ?? 0x808080, Boolean(rawEm));
      const pKind = _inferPartPbrKind(spec, tonedCol);
      const rIn = spec.roughness !== undefined ? spec.roughness : (pKind === 'metal' ? 0.32 : pKind === 'crystal' ? 0.16 : pKind === 'leather' ? 0.64 : pKind === 'cloth' || pKind === 'fur' ? 0.84 : 0.74);
      const mIn = spec.metalness !== undefined ? spec.metalness : (pKind === 'metal' ? 0.84 : pKind === 'crystal' ? 0.14 : 0.05);
      const op = spec.opacity;
      const vCols = Boolean(spec.vertexColors);
      const cacheKey = `rich_obj_${pKind}_${tonedCol.getHexString()}_${Math.round(rIn * 20)}_${Math.round(mIn * 20)}_${rawEm || 0}_${op ?? 1}_${vCols ? 1 : 0}_${spec.side || 0}`;
      return _gm(cacheKey, () => {
        if (pKind === 'flame') {
          return new THREE.MeshStandardMaterial({
            color: tonedCol, emissive: rawEm ? _tonePbrColor(rawEm, true) : tonedCol,
            emissiveIntensity: spec.emissiveIntensity || 1.05, roughness: 0.26, metalness: 0.02,
            ...(op !== undefined ? { transparent: true, opacity: op } : {}),
            ...(vCols ? { vertexColors: true } : {}),
          });
        }
        const maps = (typeof window.getProceduralObjectMaps === 'function') ? window.getProceduralObjectMaps(pKind === 'foliage' ? 'cloth' : pKind) : null;
        const MatCls = (typeof THREE.MeshPhysicalMaterial === 'function') ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
        const params = {
          color: tonedCol,
          roughness: rIn,
          metalness: mIn,
          envMapIntensity: pKind === 'metal' ? 1.55 : pKind === 'crystal' ? 1.85 : 0.58,
        };
        if (maps) {
          params.map = maps.map;
          params.normalMap = maps.normalMap;
          params.normalScale = new THREE.Vector2(pKind === 'cloth' || pKind === 'fur' ? 0.48 : 0.62, pKind === 'cloth' || pKind === 'fur' ? 0.48 : 0.62);
          params.roughnessMap = maps.roughnessMap;
        }
        if (rawEm) {
          params.emissive = _tonePbrColor(rawEm, true);
          params.emissiveIntensity = spec.emissiveIntensity || 0.78;
        }
        if (op !== undefined) { params.transparent = true; params.opacity = op; }
        if (vCols) params.vertexColors = true;
        if (spec.side !== undefined) params.side = spec.side;
        if (MatCls === THREE.MeshPhysicalMaterial) {
          if (pKind === 'crystal') { params.clearcoat = 0.92; params.clearcoatRoughness = 0.08; params.iridescence = 0.52; }
          else if (pKind === 'metal') { params.clearcoat = 0.34; params.clearcoatRoughness = 0.22; }
          else if (pKind === 'cloth' || pKind === 'fur' || pKind === 'foliage') {
            params.sheen = spec.sheen ?? 0.68; params.sheenRoughness = 0.72;
            params.sheenColor = tonedCol.clone().lerp(new THREE.Color(0xefe6d8), 0.45);
          } else if (pKind === 'leather') {
            params.sheen = 0.24; params.clearcoat = 0.14; params.clearcoatRoughness = 0.52;
          }
        }
        return new MatCls(params);
      });
    }
    window.createRichObjectMaterial = createRichObjectMaterial;

    function _getAoSkillGeo(g, gk, _gg) {
      if (!g || !g.attributes || !g.attributes.position) return g;
      if (g.attributes.color) return g;
      return _gg('ao_' + gk, () => {
        const cg = g.clone();
        cg.computeBoundingBox();
        const bb = cg.boundingBox;
        const pa = cg.attributes.position, na = cg.attributes.normal;
        const minY = bb ? bb.min.y : 0, spanY = bb ? Math.max(0.5, bb.max.y - minY) : 1;
        const cols = new Float32Array(pa.count * 3);
        for (let i = 0; i < pa.count; i++) {
          const ty = Math.max(0, Math.min(1, (pa.getY(i) - minY) / spanY));
          const ny = na ? na.getY(i) : 0;
          const v = 0.78 + ty * 0.20 + Math.max(-0.08, ny * 0.08);
          cols[i * 3] = Math.min(1.06, v * 1.01);
          cols[i * 3 + 1] = Math.min(1.05, v);
          cols[i * 3 + 2] = Math.min(1.04, v * 0.98);
        }
        cg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        return cg;
      });
    }

    function buildSkillPartMeshes(targetGrp, parts, opts = {}) {
      if (!targetGrp || !Array.isArray(parts) || !window.THREE) return;
      const { dims = null, mats = {}, defaultMat = null, shadows = true, outRefs = null, unitScale = 1 } = opts;
      const [ow = 32, th = 32, oh = 32] = dims || [];
      const u = unitScale || 1;
      const _gg = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
      const fallbackMat = defaultMat || createRichObjectMaterial({ color: 0x808080, pbrKind: 'stone', vertexColors: true });
      parts.forEach(p => {
        const s = p.fixed || p.size;
        let g = null, gk = '', rScale = null, roofY = null;
        if (p.roof_of_rect) {
          const ridgeAlongZ = ow >= oh;
          const spanW = ridgeAlongZ ? ow : oh, spanD = ridgeAlongZ ? oh : ow;
          const roofH = Math.max(p.min_h || 42, th * (p.rel_h || 0.34));
          gk = `sp_groof_${Math.round(spanW)}_${Math.round(roofH)}_${Math.round(spanD)}`;
          g = _gg(gk, () => _buildGableRoofGeo(spanW, roofH, spanD));
          roofY = Math.max(115, th * 0.78);
          if (!ridgeAlongZ) rScale = [1, 1, 1];
        } else if (p.type === 'box') {
          const sz = s ? [s[0] * u, s[1] * u, s[2] * u] : [ow * (p.rel_size?.[0] ?? 1), th * (p.rel_size?.[1] ?? 1), oh * (p.rel_size?.[2] ?? 1)];
          if (p.min_size) { sz[1] = Math.max(p.min_size[1] || 0, sz[1]); }
          gk = `sp_bbox_${sz[0].toFixed(3)}_${sz[1].toFixed(3)}_${sz[2].toFixed(3)}`;
          const bevelFn = (typeof createBeveledBoxGeo === 'function') ? createBeveledBoxGeo : null;
          const bAmt = Math.min(0.85, Math.min(sz[0], sz[1], sz[2]) * 0.14);
          g = (bevelFn && bAmt > 0.005) ? _gg(gk, () => bevelFn(sz[0], sz[1], sz[2], bAmt)) : _gg(gk, () => new THREE.BoxGeometry(sz[0], sz[1], sz[2]));
        } else if (p.type === 'cylinder') {
          const c = s ? (s.length >= 3 ? [s[0] * u, s[1] * u, s[2] * u, s[3] || 12] : [s[0] * u, s[0] * u, s[1] * u, 12]) : (p.fixed_r_h ? [th * p.fixed_r_h[0], th * p.fixed_r_h[0], p.fixed_r_h[1], 12] : [Math.min(ow, oh) * (p.top_r || 0.4), Math.min(ow, oh) * (p.bot_r || 0.4), th * (p.rel_h || 1), 12]);
          gk = `sp_cyl_${c[0].toFixed(3)}_${c[1].toFixed(3)}_${c[2].toFixed(3)}_${c[3]}`;
          g = _gg(gk, () => new THREE.CylinderGeometry(c[0], c[1], c[2], c[3]));
        } else if (p.type === 'cone') {
          gk = `sp_cone_${(s[0]*u).toFixed(3)}_${(s[1]*u).toFixed(3)}_${s[2]||8}`;
          g = _gg(gk, () => new THREE.ConeGeometry(s[0] * u, s[1] * u, s[2] || 8));
        } else if (p.type === 'sphere') {
          const sr = s ? s[0] * u : Math.min(ow, oh) * (p.radius_min || 0.3);
          const sw = (s && s[1]) || (s ? 12 : 14), sh = (s && s[2]) || (s ? 12 : 14);
          gk = `sp_sph_${sr.toFixed(3)}_${sw}_${sh}`;
          g = _gg(gk, () => new THREE.SphereGeometry(sr, sw, sh));
        } else if (p.type === 'torus') {
          gk = `sp_tor_${(s[0]*u).toFixed(3)}_${(s[1]*u).toFixed(3)}_${s[2]||8}_${s[3]||16}_${s[4]||'full'}`;
          g = _gg(gk, () => new THREE.TorusGeometry(s[0] * u, s[1] * u, s[2] || 8, s[3] || 16, s[4]));
        } else if (p.type === 'octahedron') {
          gk = `sp_oct_${(s[0]*u).toFixed(3)}_${s[1]||0}`;
          g = _gg(gk, () => new THREE.OctahedronGeometry(s[0] * u, s[1] || 0));
        } else if (p.type === 'circle' && THREE.CircleGeometry) {
          gk = `sp_cir_${(s[0]*u).toFixed(3)}_${s[1]||16}`;
          g = _gg(gk, () => new THREE.CircleGeometry(s[0] * u, s[1] || 16));
        } else if (p.type === 'lathe') {
          const prof = (p.profile || [[1, 0], [1, 1]]).map(([r, y]) => [Number((r * u).toFixed(4)), Number((y * u).toFixed(4))]);
          gk = `sp_lathe_${p.segments||18}_${p.flutes||0}_${p.flute_amp||0}_${JSON.stringify(prof)}`;
          g = _gg(gk, () => _buildLatheSculptGeo(prof, p.segments || 18, p.flutes || 0, p.flute_amp || 0, p.twist || 0, p.phi_start || 0, p.phi_length !== undefined ? p.phi_length : Math.PI * 2));
        } else if (p.type === 'crystal') {
          const ch = (s ? s[0] : th * (p.rel_h || 0.8)) * u, cr = (s ? s[1] : Math.min(ow, oh) * 0.18) * u, cc = (s && s[2]) || p.count || 6;
          gk = `sp_crys_${ch.toFixed(3)}_${cr.toFixed(3)}_${cc}`;
          g = _gg(gk, () => _buildCrystalGeo(ch, cr, cc, p.seed || 1));
        } else if (p.type === 'flame') {
          const fh = (s ? s[0] : th * 0.5) * u, fr = (s ? s[1] : Math.min(ow, oh) * 0.25) * u, fc = (s && s[2]) || p.count || 5;
          gk = `sp_flame_${fh.toFixed(3)}_${fr.toFixed(3)}_${fc}`;
          g = _gg(gk, () => _buildFlameGeo(fh, fr, fc));
        } else if (p.type === 'rock') {
          const rx = (s ? s[0] : ow * 0.48) * u, ry = (s ? s[1] : th * 0.45) * u, rz = (s ? s[2] : oh * 0.48) * u;
          gk = `sp_rock_${rx.toFixed(2)}_${ry.toFixed(2)}_${rz.toFixed(2)}_${p.seed||1}`;
          g = _gg(gk, () => _buildRockGeo(rx, ry, rz, p.seed || 1));
        } else if (p.type === 'gable_roof') {
          const gw = (s ? s[0] : ow) * u, gh = (s ? s[1] : th * 0.4) * u, gd = (s ? s[2] : oh) * u;
          gk = `sp_groof_${gw.toFixed(1)}_${gh.toFixed(1)}_${gd.toFixed(1)}`;
          g = _gg(gk, () => _buildGableRoofGeo(gw, gh, gd));
        } else if (p.type === 'blade') {
          const bw = s[0] * u, bh = s[1] * u, bd = s[2] * u;
          gk = `sp_blade_${bw.toFixed(3)}_${bh.toFixed(3)}_${bd.toFixed(3)}`;
          g = _gg(gk, () => _buildBladeGeo(bw, bh, bd));
        } else if (p.type === 'shield_kite') {
          const sw = s[0] * u, sh = s[1] * u, sd = s[2] * u;
          gk = `sp_shk_${sw.toFixed(3)}_${sh.toFixed(3)}_${sd.toFixed(3)}`;
          g = _gg(gk, () => _buildHeaterShieldGeo(sw, sh, sd));
        } else if (p.type === 'hull') {
          const hw = s[0] * u, hh = s[1] * u, hd = s[2] * u;
          gk = `sp_hull_${hw.toFixed(1)}_${hh.toFixed(1)}_${hd.toFixed(1)}`;
          g = _gg(gk, () => _buildShipHullGeo(hw, hh, hd));
        } else if (p.type === 'spoked_wheel') {
          const wr = s[0] * u, ww = s[1] * u, ws = s[2] || 8;
          gk = `sp_wheel_${wr.toFixed(1)}_${ww.toFixed(1)}_${ws}`;
          g = _gg(gk, () => _buildSpokedWheelGeo(wr, ww, ws));
        } else if (p.type === 'grass_tuft') {
          const gr = (s ? s[0] : 12) * u, gh = (s ? s[1] : 18) * u;
          gk = `sp_grass_${gr.toFixed(1)}_${gh.toFixed(1)}`;
          g = _gg(gk, () => _buildGrassTuftGeo(gr, gh));
        }
        if (!g) return;
        const mKey = p.mat ? String(p.mat) : '';
        const providedMat = mats[mKey] || (mKey && Object.entries(mats).find(([k]) => mKey.includes(k))?.[1]) || null;
        const m = providedMat || ((p.color !== undefined || p.emissive !== undefined)
          ? createRichObjectMaterial({ ...p, geomType: p.type, partKey: p.key || mKey, vertexColors: true })
          : fallbackMat);
        const renderGeo = m.vertexColors ? _getAoSkillGeo(g, gk, _gg) : g;
        (p.mirror_x ? [-1, 1] : [1]).forEach((sxSign, xi) => {
          const mesh = new THREE.Mesh(renderGeo, m);
          if (p.pos) mesh.position.set((p.mirror_x ? sxSign * p.pos[0] : p.pos[0]) * u, p.pos[1] * u, p.pos[2] * u);
          else if (roofY !== null) mesh.position.y = roofY;
          else if (p.rel_pos) mesh.position.set(ow * p.rel_pos[0], Math.max(p.min_pos_y || 0, th * p.rel_pos[1]), oh * p.rel_pos[2]);
          else if (p.fixed_pos_y !== undefined) mesh.position.y = p.fixed_pos_y * u;
          if (p.rot && !p.roof_of_rect) mesh.rotation.set(p.rot[0], p.rot[1], p.mirror_x ? sxSign * p.rot[2] : p.rot[2]);
          else if (p.roof_of_rect && ow < oh) mesh.rotation.y = Math.PI * 0.5;
          if (rScale && !p.roof_of_rect) mesh.scale.set(rScale[0], rScale[1], rScale[2]);
          else if (p.scale) mesh.scale.set(p.scale[0], p.scale[1], p.scale[2]);
          if (p.userData) Object.assign(mesh.userData, p.userData);
          const cs = p.castShadow !== undefined ? p.castShadow : shadows;
          const rs = p.receiveShadow !== undefined ? p.receiveShadow : shadows;
          if (cs) mesh.castShadow = true;
          if (rs) mesh.receiveShadow = true;
          let attached = mesh;
          if (p.pivot) {
            const pvGrp = new THREE.Group();
            pvGrp.position.set((p.mirror_x ? sxSign * p.pivot[0] : p.pivot[0]) * u, p.pivot[1] * u, p.pivot[2] * u);
            mesh.position.sub(pvGrp.position);
            pvGrp.add(mesh);
            targetGrp.add(pvGrp);
            attached = pvGrp;
          } else {
            targetGrp.add(mesh);
          }
          if (outRefs && p.key && xi === (p.mirror_x ? 1 : 0)) outRefs[p.key] = attached;
        });
      });
    }

    function getClientInventoryList() {
      if (!invBadge) return [];
      const txt = (invBadge.innerText || '').replace(/^Inv:\s*/i, '').trim();
      if (!txt || txt.toLowerCase() === 'empty' || txt.startsWith('{')) return [];
      return txt.split(',').map(s => s.trim()).filter(Boolean);
    }

    function _computeLocalTakeableItems(reachPx = 140.0) {
      if (!current3DData) return null;
      const px = Number(lastPlayerPos.x || 0), py = Number(lastPlayerPos.y || 0);
      const res = [];
      for (const it of (current3DData.items || [])) {
        const nm = it.raw_name || it.name;
        if (!nm) continue;
        const dist = Math.hypot(px - Number(it.x || 0), py - Number(it.y || 0));
        if (dist <= reachPx) res.push({ name: nm, target: nm, type: 'ground', dist_ft: Math.round((dist / 12.8) * 10) / 10 });
      }
      const exts = (window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.extractable_items) || [];
      const inv = getClientInventoryList();
      const obsList = current3DData.obstacles || [];
      for (const ext of exts) {
        const allowed = ext.allowed_rooms || (ext.room ? [ext.room] : []);
        if (!allowed.includes(currentRoomId)) continue;
        const inm = ext.item_name || '';
        if (inv.includes(inm)) continue;
        if (ext.required_flag) {
          if (window.__DND_STORY_FLAGS__ instanceof Set) {
            if (!window.__DND_STORY_FLAGS__.has(ext.required_flag) && (!ext.required_key_contains || !inv.some(i => i.toLowerCase().includes(String(ext.required_key_contains).toLowerCase())))) continue;
          } else {
            return null;
          }
        }
        if (!ext.required_flag && ext.required_key_contains && !inv.some(i => i.toLowerCase().includes(String(ext.required_key_contains).toLowerCase()))) continue;
        const kws = ext.fixture_keywords || (ext.trigger_words || []).filter(w => w.length > 3);
        let rect = null;
        for (const kw of kws) {
          const hit = obsList.find(o => String((o && o.name) || '').toLowerCase().includes(kw));
          if (hit) { rect = hit.rect || hit; break; }
        }
        let dist = 0.0;
        if (Array.isArray(rect) && rect.length === 4) {
          const cx = Math.max(rect[0], Math.min(px, rect[0] + rect[2]));
          const cy = Math.max(rect[1], Math.min(py, rect[1] + rect[3]));
          dist = Math.hypot(px - cx, py - cy);
        }
        if (dist <= reachPx) res.push({ name: inm, target: inm, type: 'extractable', dist_ft: Math.round((dist / 12.8) * 10) / 10 });
      }
      return res;
    }

    function applyTakeableItems(items) {
      if (!Array.isArray(items)) return;
      cachedTakeableItems = items;
      updateTakeDropdownUI(cachedTakeableItems);
    }

    let isRefreshingTakeDropdown = false;
    function refreshTakeDropdown() {
      if (takeDropdownFetchTimer) clearTimeout(takeDropdownFetchTimer);
      takeDropdownFetchTimer = setTimeout(async () => {
        const localItems = _computeLocalTakeableItems(140.0);
        if (localItems !== null) {
          applyTakeableItems(localItems);
          return;
        }
        if (isRefreshingTakeDropdown) return;
        isRefreshingTakeDropdown = true;
        try {
          const resp = await fetch(`/api/takeable_items?player_id=${encodeURIComponent(myPlayerId)}&reach=140.0`);
          if (resp.ok) {
            const data = await resp.json();
            applyTakeableItems(data.items || []);
          }
        } catch (e) {
        } finally {
          isRefreshingTakeDropdown = false;
        }
      }, 120);
    }

    function updateTakeDropdownUI(items) {
      const sel = document.getElementById('takeSelect');
      if (!sel) return;
      sel.innerHTML = '';
      if (!items || items.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.disabled = true;
        opt.selected = true;
        opt.innerText = '🖐️ Take (None in reach)';
        sel.appendChild(opt);
        sel.style.color = '#8b949e';
      } else {
        const headerOpt = document.createElement('option');
        headerOpt.value = '';
        headerOpt.disabled = true;
        headerOpt.selected = true;
        headerOpt.innerText = `🖐️ Take (${items.length} in reach)...`;
        sel.appendChild(headerOpt);
        sel.style.color = '#7ee787';

        items.forEach(it => {
          const opt = document.createElement('option');
          opt.value = it.target || it.name;
          const distLabel = (it.dist_ft !== undefined && it.dist_ft !== null) ? ` (${it.dist_ft} ft)` : '';
          const icon = it.type === 'ground' ? '📦 ' : '✨ ';
          opt.innerText = `${icon}${it.name}${distLabel}`;
          sel.appendChild(opt);
        });
      }
      if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
    }

    let _lastSelectedActionCmd = '';
    function getValidActionsForCurrentState() {
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const pid = (typeof myPlayerId !== 'undefined') ? myPlayerId : 'player_1';
      const st = (typeof cachedPartyStats !== 'undefined' && cachedPartyStats && cachedPartyStats[pid]) || {};
      const hp = Number(st.current_hp ?? 1), maxHp = Number(st.max_hp ?? Math.max(1, hp));
      const xp = Number(st.xp ?? 0), nextXp = Number(st.next_level_xp ?? (Number(st.level || 1) * 300));
      const hitDice = Number(st.hit_dice_remaining ?? 1);
      if (st.current_hp !== undefined && hp <= 0) {
        return [
          { cmd: '__respawn__', label: '♻️ Respawn / Revive' },
          { cmd: 'stats', label: '📋 Character Sheet (stats)' },
          { cmd: 'look', label: '👁️ Survey Area (look)' },
          { cmd: 'help', label: '❓ Commands Help' },
        ];
      }
      const actions = [];
      const data = (typeof current3DData !== 'undefined' && current3DData) ? current3DData : {};
      const roomId = ((typeof currentRoomId !== 'undefined' && currentRoomId) || skills.start_room || '');
      const aliveMonsters = (data.monsters || []).filter(m => m && m.discovered !== false && (m.hp === undefined || m.hp > 0));
      aliveMonsters.forEach(m => {
        const mName = m.name || m.raw_name || 'Hostile';
        actions.push({ cmd: `attack ${mName}`, label: `⚔️ Attack ${mName} (${m.hp ?? '?'}/${m.max_hp ?? m.hp ?? '?'} HP)` });
      });
      actions.push({ cmd: 'calibrate', label: '🎯 Calibrate Stance (+50 Momentum)' });

      const takeables = (typeof cachedTakeableItems !== 'undefined' && Array.isArray(cachedTakeableItems))
        ? cachedTakeableItems : (_computeLocalTakeableItems(140.0) || []);
      takeables.forEach(it => actions.push({ cmd: `take ${it.target || it.name}`, label: `🖐️ Take ${it.name}` }));

      const seenNpcs = new Set();
      [...(data.npcs || []), ...((typeof inspectableObjects !== 'undefined' && Array.isArray(inspectableObjects)) ? inspectableObjects.filter(o => o && o.type === 'npc') : [])].forEach(n => {
        const nm = n && n.name;
        if (nm && !seenNpcs.has(nm.toLowerCase())) { seenNpcs.add(nm.toLowerCase()); actions.push({ cmd: `talk ${nm}`, label: `💬 Talk to ${nm}` }); }
      });

      const dirIcons = { north: '⬆️', south: '⬇️', west: '⬅️', east: '➡️', up: '🪜', down: '🪜' };
      const roomMeta = (skills.rooms && skills.rooms[roomId]) || {};
      const exits = Object.assign({}, roomMeta.exits || {});
      (data.portals || []).forEach(p => { if (p && p.direction && !exits[p.direction]) exits[p.direction] = p.target || ''; });
      Object.entries(exits).forEach(([dir, dest]) => {
        const dLow = dir.toLowerCase();
        const destName = (skills.rooms && skills.rooms[dest] && skills.rooms[dest].name) || (dest ? dest.replace(/_/g, ' ') : '');
        const dirLabel = dLow === 'up' ? 'Ascend (up)' : (dLow === 'down' ? 'Descend (down)' : `Go ${dir[0].toUpperCase() + dir.slice(1)}`);
        actions.push({ cmd: dir, label: `${dirIcons[dLow] || '🚪'} ${dirLabel}${destName ? ' → ' + destName : ''}` });
      });

      const inv = (typeof getClientInventoryList === 'function') ? getClientInventoryList() : [];
      const roomGateKeys = (skills.gates || []).filter(g => g && g.room === roomId && g.key_item).map(g => String(g.key_item).toLowerCase());
      inv.forEach(item => {
        const itLow = item.toLowerCase();
        const isConsumable = /\b(cell|capacitor|potion|healing|elixir|draught)\b/i.test(itLow);
        const unlocksHere = roomGateKeys.some(k => itLow.includes(k));
        if (isConsumable || unlocksHere) actions.push({ cmd: `use ${item}`, label: `🧪 Use ${item}` });
      });
      inv.forEach(item => actions.push({ cmd: `drop ${item}`, label: `📤 Drop ${item}` }));

      const _lwState = (window.__LW_STATE__ && window.__LW_STATE__.lastLw) || {};
      const _drState = (window.__dragonCtrl && window.__dragonCtrl.getState) ? window.__dragonCtrl.getState() : null;
      if (_drState) {
        if (_drState.ridden) {
          actions.push({ cmd: 'dragon_fire', label: '🔥 Breathe Dragon Fire & Smoke' });
          actions.push({ cmd: 'dismount', label: '🥾 Dismount Sky Dragon' });
        } else {
          if (!_drState.landed) actions.push({ cmd: 'summon_dragon', label: '🐉 Call Sky Dragon to Land' });
          actions.push({ cmd: 'mount_dragon', label: _drState.landed ? '🪽 Mount Landed Sky Dragon' : '🪽 Summon & Mount Sky Dragon' });
        }
      }
      if (_lwState.mounts && _lwState.mounts[pid]) {
        actions.push({ cmd: 'dismount', label: '🥾 Dismount Mount' });
      } else if ((_lwState.wildlife || []).some(w => w && w.kind === 'peddler' && !w.ridden_by)) {
        actions.push({ cmd: 'mount peddler', label: '🐪 Mount Traveling Peddler' });
      }

      if (hitDice > 0) actions.push({ cmd: 'short rest', label: '🏕️ Short Rest (Field Calibrate)' });
      if (aliveMonsters.length === 0) actions.push({ cmd: 'long rest', label: '🛌 Long Rest (Sanctuary)' });
      if (xp >= nextXp) actions.push({ cmd: 'level up', label: '⭐ Ascend Tier (Level Up)' });
      if (skills.dialogue && String(skills.dialogue.command_verbs || '').includes('expand')) {
        actions.push({ cmd: 'expand continuum', label: '🌌 Expand Continuum' });
      }

      const seenObs = new Set();
      [...((typeof inspectableObjects !== 'undefined' && Array.isArray(inspectableObjects)) ? inspectableObjects : []), ...(data.obstacles || [])].slice(0, 12).forEach(o => {
        const nm = o && (o.raw_name || o.name);
        if (nm && !seenObs.has(nm.toLowerCase()) && seenObs.size < 5) {
          seenObs.add(nm.toLowerCase());
          actions.push({ cmd: `examine ${nm}`, label: `🔍 Examine ${nm}` });
        }
      });

      actions.push(
        { cmd: 'look', label: '👁️ Survey Room (look)' },
        { cmd: 'exits', label: '🧭 List Exits' },
        { cmd: 'inventory', label: '🎒 Inventory' },
        { cmd: 'stats', label: '📋 Character Sheet (stats)' },
        { cmd: 'party', label: '👥 Party Status' },
        { cmd: 'quests', label: '📜 Quests' },
        { cmd: 'craft Starfire Oil Flask', label: '⚒️ Craft Starfire Oil Flask (Uses Pack + Stash)' },
        { cmd: 'stash', label: '📥 1-Click Dump Matching Materials to Stash' },
        { cmd: 'bounty list', label: '📜 Tavern Bounty Board' },
        { cmd: 'fish', label: '🎣 Cozy Dusk Fishing' },
        { cmd: 'dice 10', label: '🎲 Tavern Dice' },
        { cmd: 'share map', label: '🗺️ Shared Map Table' },
        { cmd: 'highfive', label: '🙌 Paired High-Five' },
        { cmd: 'spare', label: '🕊️ Spare / Parley Weakened Foe' },
        { cmd: 'reflect', label: '☕ Quiet Campfire Reflection & Lore' },
        { cmd: '__quick_save__', label: '💾 Quick Save' },
        { cmd: 'help', label: '❓ Help' }
      );
      const _seenCmds = new Set(actions.map(a => a.cmd));
      const _catList = (skills && Array.isArray(skills.action_catalog)) ? skills.action_catalog : [];
      _catList.forEach(a => {
        if (a && a.id && !_seenCmds.has(a.id)) {
          actions.push({ cmd: a.id, label: `${a.icon || '✨'} ${a.label}`, group: a.category || 'Character Actions' });
        }
      });
      return actions;
    }

    function refreshActionDropdown() {
      const sel = document.getElementById('actionSelect');
      const btn = document.getElementById('actionExecBtn');
      const actions = getValidActionsForCurrentState();
      const validSet = new Set(actions.map(a => a.cmd));
      if (_lastSelectedActionCmd && !validSet.has(_lastSelectedActionCmd)) _lastSelectedActionCmd = '';
      const activeCmd = _lastSelectedActionCmd || (actions[0] && actions[0].cmd) || 'look';
      if (btn) btn.title = `Run: ${activeCmd}`;
      if (!sel) return actions;
      sel.innerHTML = '';
      const hdr = document.createElement('option');
      hdr.value = ''; hdr.disabled = true; hdr.selected = true;
      hdr.innerText = `⚡ Actions (${actions.length} valid) — ${activeCmd}`;
      sel.appendChild(hdr);
      const groups = {};
      actions.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.cmd; opt.innerText = a.label;
        if (a.group) {
          if (!groups[a.group]) {
            const og = document.createElement('optgroup');
            og.label = a.group;
            groups[a.group] = og;
            sel.appendChild(og);
          }
          groups[a.group].appendChild(opt);
        } else {
          sel.appendChild(opt);
        }
      });
      return actions;
    }

    function _runValidAction(cmd) {
      if (!cmd) return;
      _lastSelectedActionCmd = cmd;
      if (cmd === '__respawn__' && typeof respawnHero === 'function') respawnHero();
      else if (cmd === '__quick_save__' && typeof quickSaveGame === 'function') quickSaveGame();
      else if (typeof sendCommand === 'function') sendCommand(cmd);
    }

    function onActionSelectChange(val) {
      if (!val) return;
      _runValidAction(val);
      const sel = document.getElementById('actionSelect');
      if (sel) sel.selectedIndex = 0;
      refreshActionDropdown();
    }

    function executeSelectedAction() {
      const actions = getValidActionsForCurrentState();
      const validSet = new Set(actions.map(a => a.cmd));
      const cmd = (_lastSelectedActionCmd && validSet.has(_lastSelectedActionCmd)) ? _lastSelectedActionCmd : (actions[0] && actions[0].cmd);
      _runValidAction(cmd);
    }

    function onTakeSelectChange(val) {
      if (!val) return;
      sfx.playPickup();
      sendCommand('take ' + val);
      setTimeout(refreshTakeDropdown, 350);
    }

    function promptTake() {
      if (cachedTakeableItems && cachedTakeableItems.length > 0) {
        // Take closest item within reach
        sendCommand('take ' + (cachedTakeableItems[0].target || cachedTakeableItems[0].name));
        setTimeout(refreshTakeDropdown, 350);
      } else {
        appendLog('No items or salvageable fixtures currently within reach. Move closer to inspectable objects!', 'log-dm');
      }
    }

    function updateCoords(x, y) {
      // Takeable items are returned directly in /api/move and /api/sync payloads
    }
    function appendLog(txt, cls='') { const d = document.createElement('div'); d.className = 'log-entry ' + cls; d.innerText = txt; logArea.appendChild(d); logArea.scrollTop = logArea.scrollHeight; }

    function updateStatsUI(cs, allStatsMap=null) {
      if (allStatsMap) {
        cachedPartyStats = allStatsMap;
      }
      if (cs) {
        const pid = cs.player_id || myPlayerId;
        cachedPartyStats[pid] = Object.assign({}, cachedPartyStats[pid] || {}, cs);
      }

      // Update player selector dropdown
      const sel = document.getElementById('playerStatsSelect');
      if (sel) {
        const keys = Object.keys(cachedPartyStats);
        if (!keys.includes(myPlayerId) && cs) keys.unshift(myPlayerId);
        const curVal = viewingPlayerId || myPlayerId;
        sel.innerHTML = keys.map(pid => {
          const st = cachedPartyStats[pid] || (pid === myPlayerId ? cs : null);
          const pName = st ? st.name : pid;
          const pCls = st ? (st.class || 'Adventurer') : '';
          const isYou = pid === myPlayerId ? ' (YOU)' : '';
          return `<option value="${pid}" ${pid === curVal ? 'selected' : ''}>${pName} [${pCls}]${isYou}</option>`;
        }).join('');
      }

      // Resolve stats for currently selected viewing player
      const activeStats = (viewingPlayerId && cachedPartyStats[viewingPlayerId]) ? cachedPartyStats[viewingPlayerId] : (cs || cachedPartyStats[myPlayerId]);
      if (!activeStats) return;

      const isYou = (!viewingPlayerId || viewingPlayerId === myPlayerId);
      document.getElementById('statCharName').innerText = isYou ? '' : `(Viewing ${activeStats.name})`;
      document.getElementById('statCharClassBadge').innerText = `${activeStats.species || 'Hero'} ${activeStats.class || 'Vanguard'} | ID: ${viewingPlayerId || myPlayerId}`;
      document.getElementById('statHp').innerText = `${activeStats.current_hp} / ${activeStats.max_hp}`;
      document.getElementById('statAc').innerText = `${activeStats.armor_class} Guard`;
      document.getElementById('statLvl').innerText = `Tier ${activeStats.level} (${activeStats.xp || 0} XP)`;
      const mom = Number(activeStats.momentum || 0);
      const combo = Number(activeStats.combo_chain || 0);
      const apexReady = mom >= 100 || ((combo + 1) % 3 === 0);
      document.getElementById('statInsp').innerText = apexReady ? `⚡ APEX READY (${mom}/100)` : `${mom}/100 • Beat ${(combo % 3) + 1}/3`;
      const pipLbl = document.getElementById('aeonwardPipLabel');
      const pipSpell = document.getElementById('aeonwardPipSpell');
      if (pipLbl) pipLbl.innerText = apexReady ? '⚡ APEX' : `${mom}% Mom`;
      if (pipSpell) pipSpell.style.boxShadow = apexReady ? '0 0 12px #ffd700' : '';

      // Update abilities grid if present
      const ab = activeStats.abilities;
      if (ab) {
        const abilityMap = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().ability_dom_map) || {};
        for (const [k, v] of Object.entries(ab)) {
          const elId = abilityMap[k.toUpperCase()] || (`stat${k[0]}${k.slice(1).toLowerCase()}`);
          const el = document.getElementById(elId);
          if (el) el.innerText = `${v.score} (${v.mod >= 0 ? '+' : ''}${v.mod})`;
        }
      }

      // Update Aeonward Party HUD Portraits
      updateAeonwardPartyHUD(activeStats);

      // Check player health and prompt death modal if fallen
      const myStats = cachedPartyStats[myPlayerId] || (cs && cs.player_id === myPlayerId ? cs : null);
      const meEnt = (typeof current3DData !== 'undefined' && current3DData && Array.isArray(current3DData.players)) ? current3DData.players.find(p => p && p.id === myPlayerId) : null;
      const isDownedOnly = Boolean(meEnt && meEnt.is_downed);
      const deathModal = document.getElementById('deathModalOverlay');
      if (myStats && myStats.current_hp <= 0 && !isDownedOnly) {
        if (deathModal && deathModal.style.display !== 'flex') {
          deathModal.style.display = 'flex';
          sfx.playDeath();
          appendLog('💀 You have fallen in battle! Awaiting revival...', 'log-combat');
        }
      } else if (deathModal && myStats && (myStats.current_hp > 0 || isDownedOnly)) {
        deathModal.style.display = 'none';
      }
      if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
    }

