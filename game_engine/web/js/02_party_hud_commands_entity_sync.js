    function _resolveHeroPortraitEntry(characterClass, characterName) {
      const clientCfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const styles = clientCfg.portrait_styles || {};
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const crit = (skills.visual_classification && skills.visual_classification.character_archetypes) ||
        Object.fromEntries(Object.keys(styles).map(k => [k, `${k} ${(styles[k] && styles[k].label) || ''}`]));
      const key = (typeof classifyWithClientCCELM === 'function')
        ? classifyWithClientCCELM(`${characterClass || ''} ${characterName || ''}`, crit, 0.0, 'fighter') : 'fighter';
      const st = styles[key] || styles.fighter || { label: key ? (key[0].toUpperCase() + key.slice(1)) : 'Fighter', torso: '#dde4ed', trim: '#1f6feb', accent: '#f3ba2f', pauldron: '#dde4ed', headgear: 'helm', weapon: 'sword', skin: '#ffd1a4', eye: '#238636' };
      return { key, st };
    }

    function renderCharacterFaceAvatar(characterClass, characterName) {
      const cls = (characterClass || '').toLowerCase();
      const name = (characterName || '').toLowerCase();
      const key = `face_${cls}_${name}`;
      if (cachedProcTex[key]) return cachedProcTex[key];

      const { st } = _resolveHeroPortraitEntry(characterClass, characterName);
      const canvas = document.createElement('canvas');
      canvas.width = 72; canvas.height = 72;
      const ctx = canvas.getContext('2d');
      const cx = 36, cy = 36;

      const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 34);
      bgGrad.addColorStop(0, '#1c2333');
      bgGrad.addColorStop(0.75, '#0e121a');
      bgGrad.addColorStop(1, '#06080c');
      ctx.fillStyle = bgGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.fill();

      // Torso, trim & belt
      ctx.fillStyle = st.torso; ctx.fillRect(cx - 11, cy + 6, 22, 22);
      ctx.fillStyle = st.trim; ctx.fillRect(cx - 5, cy + 6, 10, 22);
      ctx.fillStyle = '#5a3825'; ctx.fillRect(cx - 12, cy + 24, 24, 4);
      ctx.fillStyle = st.accent; ctx.fillRect(cx - 4, cy + 23, 8, 6);

      // Arms, hands & pauldrons
      ctx.fillStyle = st.torso;
      ctx.fillRect(cx - 17, cy + 8, 6, 16);
      ctx.fillRect(cx + 11, cy + 8, 6, 16);
      ctx.fillStyle = st.skin || '#ffd1a4';
      ctx.fillRect(cx - 17, cy + 24, 5, 5);
      ctx.fillRect(cx + 12, cy + 24, 5, 5);
      ctx.fillStyle = st.pauldron || st.torso;
      ctx.fillRect(cx - 19, cy + 3, 9, 8);
      ctx.fillRect(cx + 10, cy + 3, 9, 8);

      // Weapon silhouette driven by skills
      if (st.weapon === 'staff') {
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(cx + 15, cy - 12, 3, 38);
        ctx.fillStyle = st.accent; ctx.beginPath(); ctx.arc(cx + 16.5, cy - 14, 5, 0, Math.PI * 2); ctx.fill();
      } else if (st.weapon === 'bow') {
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx - 17, cy + 16, 14, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke();
      } else if (st.weapon === 'daggers') {
        ctx.fillStyle = '#dde4ed';
        ctx.fillRect(cx - 20, cy + 10, 2.2, 14); ctx.fillRect(cx + 18, cy + 10, 2.2, 14);
      } else if (st.weapon === 'hammer') {
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(cx + 16, cy + 4, 3, 24);
        ctx.fillStyle = '#dde4ed'; ctx.fillRect(cx + 13, cy + 1, 9, 7);
      } else {
        ctx.fillStyle = '#dde4ed'; ctx.fillRect(cx + 16, cy - 8, 3, 30);
        ctx.fillStyle = st.accent; ctx.fillRect(cx + 13, cy + 18, 9, 2.5);
      }

      // Head, eyes & headgear
      ctx.fillStyle = st.skin || '#ffd1a4';
      ctx.fillRect(cx - 8, cy - 12, 16, 17);
      [-3.5, 3.5].forEach(ox => {
        ctx.fillStyle = '#f0f3f6'; ctx.fillRect(cx + ox - 2, cy - 5, 4, 3);
        ctx.fillStyle = st.eye || '#238636'; ctx.fillRect(cx + ox - 1, cy - 5, 2.5, 3);
        ctx.fillStyle = '#05070a'; ctx.fillRect(cx + ox - 0.5, cy - 4.5, 1.5, 2);
      });
      if (st.headgear === 'hat') {
        ctx.fillStyle = st.torso;
        ctx.beginPath(); ctx.ellipse(cx, cy - 12, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 13); ctx.lineTo(cx, cy - 30); ctx.lineTo(cx + 10, cy - 13); ctx.closePath(); ctx.fill();
      } else if (st.headgear === 'hood') {
        ctx.fillStyle = st.torso;
        ctx.beginPath(); ctx.arc(cx, cy - 10, 11.5, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
      } else if (st.headgear === 'circlet') {
        ctx.fillStyle = st.accent; ctx.fillRect(cx - 8.5, cy - 17, 17, 4);
      } else {
        ctx.fillStyle = '#dde4ed'; ctx.fillRect(cx - 9.5, cy - 20, 19, 10);
        ctx.fillStyle = st.trim; ctx.fillRect(cx - 2, cy - 27, 4, 8);
      }

      ctx.strokeStyle = '#c8a45c'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
      const dataUrl = canvas.toDataURL();
      cachedProcTex[key] = dataUrl;
      return dataUrl;
    }

    function getHeroClassIcon(clsStr, nameStr='') {
      return renderCharacterFaceAvatar(clsStr, nameStr);
    }

    let _lastPartyHudKey = '';
    function updateAeonwardPartyHUD(activeStats) {
      const hud = document.getElementById('aeonwardPartyHud');
      if (!hud) return;
      const keys = Object.keys(cachedPartyStats);
      if (!keys.includes(myPlayerId) && activeStats) keys.unshift(myPlayerId);
      if (keys.length === 0) return;

      const curSelected = viewingPlayerId || myPlayerId;
      let hudKey = curSelected;
      for (let i = 0; i < keys.length; i++) {
        const pid = keys[i];
        const st = cachedPartyStats[pid] || (pid === myPlayerId ? activeStats : null);
        if (st) hudKey += `|${pid}:${st.current_hp}:${st.max_hp}:${st.name || ''}:${st.class || ''}`;
      }
      if (hudKey === _lastPartyHudKey) return;
      _lastPartyHudKey = hudKey;
      hud.innerHTML = keys.map(pid => {
        const st = cachedPartyStats[pid] || (pid === myPlayerId ? activeStats : null);
        if (!st) return '';
        const pName = st.name || pid;
        const pCls = st.class || 'Fighter';
        const faceUrl = getHeroClassIcon(pCls, pName);
        const hp = Math.max(0, parseInt(st.current_hp ?? 10, 10));
        const maxHp = Math.max(1, parseInt(st.max_hp ?? 10, 10));
        const hpPct = Math.min(100, Math.max(0, Math.round((hp / maxHp) * 100)));
        const isSel = (pid === curSelected);
        const isYou = (pid === myPlayerId);

        const displayLabel = _resolveHeroPortraitEntry(pCls, pName).st.label || pCls;

        return `
          <div class="aeonward-portrait-card ${isSel ? 'selected' : ''}" onclick="onSelectStatsPlayer('${pid}')" title="${pName} (${pCls}) ${isYou ? '• You' : ''} | HP: ${hp}/${maxHp}">
            <img class="aeonward-portrait-avatar-img" src="${faceUrl}" alt="${displayLabel}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
            <div class="aeonward-portrait-name">${displayLabel}</div>
            <div class="aeonward-portrait-hp-bar">
              <div class="aeonward-portrait-hp-fill" style="width: ${hpPct}%; background: ${hpPct < 30 ? '#da3633' : 'linear-gradient(90deg, #8b1e1e, #d83434)'};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    let _lastInitiativeKey = '';
    function updateAeonwardInitiativeRibbon(monsters, players) {
      const ribbon = document.getElementById('aeonwardInitiativeRibbon');
      const container = document.getElementById('aeonwardInitiativeTokens');
      if (!ribbon || !container) return;
      const activeMonsters = (monsters || []).filter(m => m.discovered !== false && (m.hp === undefined || m.hp > 0));
      if (!activeMonsters || activeMonsters.length === 0) {
        ribbon.style.display = 'none';
        _lastInitiativeKey = '';
        return;
      }

      // Fast key check to skip DOM churn if initiative participant list hasn't changed
      const currentKey = activeMonsters.map(m => `${m.id}:${m.hp}`).join(';') + '|' + (players || []).map(p => `${p.id}:${p.hp}`).join(';');
      if (currentKey === _lastInitiativeKey && ribbon.style.display === 'flex') return;
      _lastInitiativeKey = currentKey;

      ribbon.style.display = 'flex';
      const tokens = [];

      (players || []).forEach(p => {
        tokens.push({
          id: p.id,
          name: p.name || 'Hero',
          icon: getHeroClassIcon(p.class, p.name),
          type: 'player',
          isYou: p.id === myPlayerId
        });
      });

      activeMonsters.forEach(m => {
        tokens.push({
          id: m.id,
          name: m.name || 'Monster',
          icon: '👹',
          type: 'monster',
          isYou: false
        });
      });

      container.innerHTML = tokens.map((t, idx) => `
        <div class="aeonward-initiative-token ${t.type} ${idx === 0 ? 'active-turn' : ''}" title="${t.name} (${t.type.toUpperCase()})">
          ${t.icon.startsWith('data:') ? `<img src="${t.icon}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : t.icon}
        </div>
      `).join('');
    }

    // Aeonward Circular Mini-Map Renderer
    let _lastMinimapKey = '';
    function updateAeonwardMinimap(data) {
      const canvas = document.getElementById('aeonwardMinimapCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const px = lastPlayerPos.x || 140;
      const py = lastPlayerPos.y || 390;
      const roomName = currentRoomName || (data && data.room_name) || 'Aeonward Continuum';
      const mmKey = `${data && data.room_id ? data.room_id : ''}|${px.toFixed(1)},${py.toFixed(1)}|${lastFacing || ''}|${(data && data.monsters) ? data.monsters.length : 0}|${(data && data.items) ? data.items.length : 0}|${(data && data.players) ? data.players.length : 0}`;
      if (mmKey === _lastMinimapKey) return;
      _lastMinimapKey = mmKey;

      const roomTag = document.getElementById('aeonwardMinimapRoomTag');
      if (roomTag) roomTag.innerText = roomName;

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const roomW = (data && data.width) ? data.width : 1024;
      const roomH = (data && data.height) ? data.height : 768;
      const cx = W / 2, cy = H / 2;
      const scale = 0.12;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 66, 0, Math.PI * 2);
      ctx.clip();

      // Mini-map room outline / bounds
      ctx.fillStyle = '#141822';
      ctx.fillRect(0, 0, W, H);

      const mapOriginX = cx - px * scale;
      const mapOriginY = cy - py * scale;

      // Draw Open World Sector Terrain / Ground
      ctx.fillStyle = '#222938';
      ctx.strokeStyle = '#388bfd';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.0;
      ctx.fillRect(mapOriginX, mapOriginY, roomW * scale, roomH * scale);
      ctx.strokeRect(mapOriginX, mapOriginY, roomW * scale, roomH * scale);
      ctx.setLineDash([]);

      // Draw Obstacles / Scenery
      const obstacles = (data && data.obstacles) ? data.obstacles : [];
      ctx.fillStyle = '#3a4459';
      obstacles.forEach(obs => {
        const r = obs.rect || obs;
        if (Array.isArray(r) && r.length >= 4) {
          ctx.fillRect(mapOriginX + r[0] * scale, mapOriginY + r[1] * scale, r[2] * scale, r[3] * scale);
        }
      });

      // Draw Ground Items / Treasures (Yellow dots)
      ctx.fillStyle = '#ffd700';
      (data.items || []).forEach(it => {
        const ix = mapOriginX + it.x * scale;
        const iy = mapOriginY + it.y * scale;
        ctx.beginPath();
        ctx.arc(ix, iy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Monsters (Red dots with cones of vision)
      (data.monsters || []).forEach(m => {
        if (m.discovered === false || (m.hp !== undefined && m.hp <= 0)) return;
        const mx = mapOriginX + m.x * scale;
        const my = mapOriginY + m.y * scale;

        // Faint red vision cone
        ctx.fillStyle = 'rgba(230, 40, 40, 0.18)';
        ctx.beginPath();
        ctx.moveTo(mx, my);
        const mAng = (m.x > px) ? Math.PI : 0;
        ctx.arc(mx, my, 22, mAng - 0.5, mAng + 0.5);
        ctx.closePath();
        ctx.fill();

        // Monster pip
        ctx.fillStyle = '#e53e3e';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Draw Friendly NPCs (Green/Cyan dots)
      ctx.fillStyle = '#4dabf7';
      (data.npcs || []).forEach(n => {
        const nx = mapOriginX + n.x * scale;
        const ny = mapOriginY + n.y * scale;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Other Party Members (Blue dots)
      ctx.fillStyle = '#3182ce';
      (data.players || []).forEach(p => {
        if (p.id === myPlayerId) return;
        const opx = mapOriginX + p.x * scale;
        const opy = mapOriginY + p.y * scale;
        ctx.beginPath();
        ctx.arc(opx, opy, 3.0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Portals & Fast-Travel Conduits (Cyan luminous arches)
      ctx.fillStyle = '#00f2fe';
      (data.portals || []).forEach(port => {
        const pr = port.rect || [];
        if (Array.isArray(pr) && pr.length >= 4) {
          const pcx = mapOriginX + (pr[0] + pr[2] / 2) * scale;
          const pcy = mapOriginY + (pr[1] + pr[3] / 2) * scale;
          ctx.beginPath();
          ctx.arc(pcx, pcy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Player Position at Center (Bright gold arrow with sight cone)
      ctx.fillStyle = 'rgba(200, 164, 92, 0.22)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const [fvX, fvZ] = (typeof facingToVec === 'function') ? facingToVec(lastFacing) : [1, 0];
      const fAng = Math.atan2(fvZ, fvX);

      ctx.arc(cx, cy, 28, fAng - 0.45, fAng + 0.45);
      ctx.closePath();
      ctx.fill();

      // Center Player Token
      ctx.fillStyle = '#ecd698';
      ctx.strokeStyle = '#2b1d09';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // ==========================================
    // OPEN-WORLD SKYRIM-STYLE COMPASS STRIP RENDERER
    // ==========================================
    let _lastCompassKey = '';
    function updateAeonwardCompassStrip(data) {
      const canvas = document.getElementById('aeonwardCompassCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let yawDeg = 90;
      if (typeof getCameraForwardRightVectors === 'function') {
        const vecs = getCameraForwardRightVectors();
        yawDeg = ((Math.atan2(vecs.fwdX, -vecs.fwdZ) * 180 / Math.PI) % 360 + 360) % 360;
      } else {
        const [fvX, fvZ] = (typeof facingToVec === 'function') ? facingToVec(lastFacing) : [1, 0];
        yawDeg = ((Math.atan2(fvX, -fvZ) * 180 / Math.PI) % 360 + 360) % 360;
      }

      const px0 = lastPlayerPos.x || 140;
      const py0 = lastPlayerPos.y || 390;
      const cKey = `${yawDeg.toFixed(1)}|${px0.toFixed(1)},${py0.toFixed(1)}|${(data && data.room_id) || ''}|${(data && data.monsters) ? data.monsters.length : 0}|${(data && data.items) ? data.items.length : 0}`;
      if (cKey === _lastCompassKey) return;
      _lastCompassKey = cKey;

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bearingLabel = document.getElementById('aeonwardCompassBearingLabel');
      if (bearingLabel) {
        const roundedDeg = Math.round(yawDeg);
        const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(roundedDeg / 45) % 8];
        bearingLabel.innerText = `${String(roundedDeg).padStart(3, '0')}° ${cardinal}`;
      }

      // FOV range of the strip: 180 degrees visible across W (pixelsPerDeg)
      const visibleDeg = 150;
      const pixelsPerDeg = W / visibleDeg;
      const centerStripX = W / 2;

      // Draw baseline graduation ticks and cardinal markers
      const cardinals = [
        { deg: 0, text: 'N', color: '#ff4d4f', major: true },
        { deg: 45, text: 'NE', color: '#c9d1d9', major: false },
        { deg: 90, text: 'E', color: '#ffd700', major: true },
        { deg: 135, text: 'SE', color: '#c9d1d9', major: false },
        { deg: 180, text: 'S', color: '#ffd700', major: true },
        { deg: 225, text: 'SW', color: '#c9d1d9', major: false },
        { deg: 270, text: 'W', color: '#ffd700', major: true },
        { deg: 315, text: 'NW', color: '#c9d1d9', major: false }
      ];

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw 15-degree sub-ticks
      for (let tickDeg = 0; tickDeg < 360; tickDeg += 15) {
        let relDeg = ((tickDeg - yawDeg + 540) % 360) - 180;
        if (Math.abs(relDeg) <= visibleDeg / 2) {
          const tickX = centerStripX + relDeg * pixelsPerDeg;
          const isCard = cardinals.find(c => c.deg === tickDeg);
          if (isCard) {
            ctx.fillStyle = isCard.color;
            ctx.font = isCard.major ? 'bold 12px sans-serif' : '10px sans-serif';
            ctx.fillText(isCard.text, tickX, H * 0.42);
            ctx.strokeStyle = isCard.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tickX, H - 6);
            ctx.lineTo(tickX, H);
            ctx.stroke();
          } else {
            ctx.strokeStyle = 'rgba(200, 164, 92, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tickX, H - 4);
            ctx.lineTo(tickX, H);
            ctx.stroke();
          }
        }
      }

      const px = lastPlayerPos.x || 140;
      const py = lastPlayerPos.y || 390;

      // Helper to compute bearing from player to a world point (dx: East-West, dy: North-South)
      function getBearingToPoint(tx, ty) {
        const dx = tx - px; // Positive = East
        const dy = ty - py; // Positive = South
        let deg = Math.atan2(dx, -dy) * 180 / Math.PI; // 0 = North, 90 = East, 180 = South, -90 = West
        return (deg + 360) % 360;
      }

      // Draw Portal / Passage Markers (Cyan Diamond ◆)
      (data.portals || []).forEach(port => {
        const pr = port.rect || [];
        if (Array.isArray(pr) && pr.length >= 4) {
          const targetX = pr[0] + pr[2] / 2;
          const targetY = pr[1] + pr[3] / 2;
          const bDeg = getBearingToPoint(targetX, targetY);
          let relDeg = ((bDeg - yawDeg + 540) % 360) - 180;
          if (Math.abs(relDeg) <= visibleDeg / 2) {
            const iconX = centerStripX + relDeg * pixelsPerDeg;
            ctx.fillStyle = '#00f2fe';
            ctx.font = '13px sans-serif';
            ctx.fillText('◆', iconX, H * 0.45);
          }
        }
      });

      // Draw Hostile Monsters (Red Skull 💀 or Point ▲)
      (data.monsters || []).forEach(m => {
        if (m.discovered === false || (m.hp !== undefined && m.hp <= 0)) return;
        const bDeg = getBearingToPoint(m.x + 32, m.y + 32);
        let relDeg = ((bDeg - yawDeg + 540) % 360) - 180;
        if (Math.abs(relDeg) <= visibleDeg / 2) {
          const iconX = centerStripX + relDeg * pixelsPerDeg;
          ctx.fillStyle = '#ff4d4f';
          ctx.font = '12px sans-serif';
          ctx.fillText('💀', iconX, H * 0.44);
        }
      });

      // Draw Ground Item / Salvage Relics (Gold Star ★)
      (data.items || []).forEach(it => {
        const bDeg = getBearingToPoint(it.x, it.y);
        let relDeg = ((bDeg - yawDeg + 540) % 360) - 180;
        if (Math.abs(relDeg) <= visibleDeg / 2) {
          const iconX = centerStripX + relDeg * pixelsPerDeg;
          ctx.fillStyle = '#ffd700';
          ctx.font = '12px sans-serif';
          ctx.fillText('★', iconX, H * 0.44);
        }
      });

      // Draw Friendly Concordat Citizens & Envoys (Green Ring ◎)
      (data.npcs || []).forEach(n => {
        const bDeg = getBearingToPoint(n.x, n.y);
        let relDeg = ((bDeg - yawDeg + 540) % 360) - 180;
        if (Math.abs(relDeg) <= visibleDeg / 2) {
          const iconX = centerStripX + relDeg * pixelsPerDeg;
          ctx.fillStyle = '#7ee787';
          ctx.font = '12px sans-serif';
          ctx.fillText('◎', iconX, H * 0.44);
        }
      });
    }

    // Aeonward Floating Combat Numbers (DOM Pool to avoid layout thrashing and allocation churn)
    const floatingDamagePool = [];
    let _projVec = null;

    function spawnAeonwardFloatingDamage(x, y, text, type='hit') {
      const container = document.getElementById('threeCanvasContainer');
      if (!container || !threeCamera) return;
      if (!_projVec && typeof THREE !== 'undefined' && THREE.Vector3) {
        _projVec = new THREE.Vector3();
      }
      if (!_projVec) return;

      let el = floatingDamagePool.pop();
      if (!el) {
        el = document.createElement('div');
        container.appendChild(el);
      }
      el.className = `aeonward-floating-damage ${type}`;
      el.innerText = text;
      el.style.opacity = '1';
      el.style.display = 'block';

      // Project world coord (x, y) to screen
      const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
      const H = (current3DData && current3DData.height) ? current3DData.height : 768;
      _projVec.set(x - W / 2, 28, y - H / 2).project(threeCamera);

      const cW = container.clientWidth || 1024;
      const cH = container.clientHeight || 768;
      const sx = ((_projVec.x + 1) * 0.5) * cW;
      const sy = ((-_projVec.y + 1) * 0.5) * cH;

      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.transform = `translate(-50%, 0px) scale(1)`;

      requestAnimationFrame(() => {
        el.style.transform = `translate(-50%, -40px) scale(1.15)`;
        el.style.opacity = '0';
      });

      setTimeout(() => {
        el.style.display = 'none';
        if (floatingDamagePool.length < 20) floatingDamagePool.push(el);
      }, 750);
    }

    // Aeonward Hotbar Category Filter Pill Handler
    window.setAeonwardHotbarCategory = function(cat) {
      document.querySelectorAll('.aeonward-cat-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('onclick')?.includes(cat));
      });
      const slots = document.querySelectorAll('#aeonwardHotbarSlots .aeonward-hotbar-slot');
      slots.forEach(slot => {
        if (cat === 'all' || slot.getAttribute('data-cat') === cat) {
          slot.style.display = 'flex';
        } else {
          slot.style.display = 'none';
        }
      });
    };

    async function respawnHero() {
      try {
        const resp = await fetch('/api/respawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: myPlayerId })
        });
        if (resp.ok) {
          const data = await resp.json();
          const deathModal = document.getElementById('deathModalOverlay');
          if (deathModal) deathModal.style.display = 'none';
          sfx.playRespawn();
          if (data.player_x !== undefined) {
            lastPlayerPos.x = data.player_x;
            lastPlayerPos.y = data.player_y;
            updateCoords(data.player_x, data.player_y);
          }
          if (data.char_stats) updateStatsUI(data.char_stats, data.all_player_stats);
          if (data.scene_3d) update3DScene(data.scene_3d);
          appendLog('✨ You have been restored by divine grace at camp!', 'log-player');
        }
      } catch (e) {
        console.error('Respawn failed:', e);
      }
    }

    function onSelectStatsPlayer(val) {
      viewingPlayerId = val || myPlayerId;
      updateStatsUI(null);
    }

    function tryResolveCommandWithClientModel(cmdText, activePid) {
      const raw = (cmdText || '').trim();
      const low = raw.toLowerCase();
      if (!raw || /^[1-5]$/.test(low)) return null;
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const clientCfg = skills.client || {};
      const readonlySet = new Set(clientCfg.readonly_intents || ['look', 'inventory', 'question', 'salutation']);

      if (low === 'exits' || /^where\s+can\s+i\s+go/.test(low)) {
        const room = (skills.rooms || {})[currentRoomId];
        if (room) {
          const exStr = Object.entries(room.exits || {}).map(([d, dest]) => `${d} -> ${(skills.rooms[dest] && skills.rooms[dest].name) || dest}`).join(' | ');
          return `[Exits from ${room.name}]: ${exStr || 'none'}`;
        }
      }
      if ((low === 'quests' || low === 'journal') && window.__DND_STORY_FLAGS__ instanceof Set) {
        const qs = Array.from(window.__DND_STORY_FLAGS__).filter(f => f.startsWith('quest:')).map(f => f.slice(6));
        return qs.length ? ('Active Quests: ' + qs.join(', ')) : 'No active quests recorded yet.';
      }
      if (/^(?:party|companions|squad|who(?:\s+is\s+here)?|allies)$/i.test(low)) {
        const allies = Object.values(cachedPartyStats || {}).map(st => `${st.name || 'Hero'} (${st.class || 'Adventurer'}, ${st.current_hp}/${st.max_hp} HP)`);
        const npcsHere = (Array.isArray(inspectableObjects) ? inspectableObjects : []).filter(o => o && o.type === 'npc').map(n => n.name);
        return (allies.length ? `Party: ${allies.join(' | ')}` : 'No party telemetry yet.') + (npcsHere.length ? ` | NPCs: ${npcsHere.join(', ')}` : '');
      }
      if (/^(?:bestiary|lore)(?:\s+.*)?$/i.test(low) && typeof ccElmEvaluateDecision === 'function') {
        const qBest = low.replace(/^(?:bestiary|lore)\s*/i, '').trim();
        const bestEntries = Object.entries(skills.bestiary || {}).filter(([, bv]) => bv && typeof bv === 'object');
        if (!qBest && bestEntries.length) return `Bestiary (${bestEntries.length}): ${bestEntries.slice(0, 10).map(([k, v]) => v.name || k).join(', ')}`;
        if (qBest && bestEntries.length) {
          const bCrit = Object.fromEntries(bestEntries.map(([k, v]) => [k, `${k.replace(/_/g, ' ')} ${v.name || ''} ${v.desc || ''}`]));
          const bAns = ccElmEvaluateDecision(qBest, bCrit, 0.25);
          if (bAns.choice && bAns.confidence >= 0.28) {
            const bv = skills.bestiary[bAns.choice];
            return `[Bestiary] ${bv.name || bAns.choice} (HP ${bv.hp || '?'}, AC ${bv.ac || '?'}): ${bv.desc || 'Recorded creature entry.'}`;
          }
        }
      }
      const routeMatch = low.match(/^(?:how\s+do\s+i\s+(?:get|reach)|which\s+way\s+(?:is|to)|path\s+to|where\s+is)\s+(.+?)[\?\.]*$/);
      if (routeMatch && skills.rooms && Object.keys(skills.rooms).length && typeof ccElmEvaluateDecision === 'function') {
        const rCrit = Object.fromEntries(Object.entries(skills.rooms).map(([rk, rv]) => [rk, `${rk.replace(/_/g, ' ')} ${rv.name || ''} ${rv.desc || ''}`]));
        const rAns = ccElmEvaluateDecision(routeMatch[1].trim(), rCrit, 0.25);
        if (rAns.choice && rAns.confidence >= 0.30) {
          if (rAns.choice === currentRoomId) return `You are already in ${skills.rooms[currentRoomId].name || currentRoomId}.`;
          const q = [[currentRoomId, []]], seen = new Set([currentRoomId]);
          while (q.length) {
            const [cur, path] = q.shift();
            const exits = (skills.rooms[cur] && skills.rooms[cur].exits) || {};
            for (const [dir, nxt] of Object.entries(exits)) {
              const np = [...path, `${dir} (${(skills.rooms[nxt] && skills.rooms[nxt].name) || nxt})`];
              if (nxt === rAns.choice) return `[Route to ${(skills.rooms[nxt] && skills.rooms[nxt].name) || nxt}]: ${np.join(' -> ')}`;
              if (!seen.has(nxt) && skills.rooms[nxt]) { seen.add(nxt); q.push([nxt, np]); }
            }
          }
          return `${skills.rooms[rAns.choice].name || rAns.choice}: ${skills.rooms[rAns.choice].desc || 'Remote sector (use travel command).'}`;
        }
      }

      // State-mutating verbs must always execute authoritatively on the server
      if (/\b(attack|kill|fight|slay|hit|strike|shoot|fire|cast|take|get|grab|pick|loot|salvage|drop|discard|use|equip|drink|eat|open|unlock|close|move|go|walk|run|climb|north|south|east|west|up|down|travel|warp|teleport|goto|rest|sleep|short|long|level|ascend|save|load|delete|rename|calibrate|activate|craft|buy|sell|trade)\b/i.test(low)) {
        return null;
      }

      if (/^(?:help|commands|\?)$/i.test(low) && clientCfg.offline_help) {
        return clientCfg.offline_help;
      }
      const inv = (typeof getClientInventoryList === 'function') ? getClientInventoryList() : [];
      if (/^(?:inv|inventory|i|bag|pack)$/i.test(low)) {
        return 'Carrying: ' + (inv.length ? inv.join(', ') : 'nothing');
      }
      if (/^(?:stats|sheet|character|status|char)$/i.test(low)) {
        const st = cachedPartyStats[activePid] || cachedPartyStats[myPlayerId];
        if (st) return `${st.name || 'Hero'} (${st.class || 'Adventurer'}) — HP: ${st.current_hp}/${st.max_hp} | Guard: ${st.armor_class} | Tier ${st.level || 1} (${st.xp || 0} XP) | Inv: ${inv.join(', ') || 'nothing'}`;
        return null;
      }
      const exMatch = low.match(/^(?:examine|inspect|check|read|study)\s+(.+)$/);
      if (exMatch) {
        const q = exMatch[1].trim();
        const pool = [
          ...(Array.isArray(inspectableObjects) ? inspectableObjects : []),
          ...((current3DData && current3DData.obstacles) || []),
          ...((current3DData && current3DData.monsters) || []),
          ...((current3DData && current3DData.items) || []),
        ];
        const hit = pool.find(o => o && String(o.name || o.raw_name || '').toLowerCase().includes(q));
        if (hit) {
          const nm = hit.name || hit.raw_name || q;
          return `[Examine] ${nm}: ${hit.detail || hit.desc || (hit.hp !== undefined ? `Hostile (${hit.hp}/${hit.max_hp || hit.hp} HP)` : 'Visible within current sector.')}`;
        }
        return null;
      }

      if ((raw.endsWith('?') || /^(?:what\s+is|who\s+is|tell\s+me\s+about)\s+/i.test(low)) && readonlySet.has('question')) {
        const room = (skills.rooms || {})[currentRoomId];
        const candidates = {};
        if (room) candidates.room = [`room sector area ${room.name} exits`, `${room.name}: ${room.desc}`];
        const mons = ((current3DData && current3DData.monsters) || []).map(m => m.name).filter(Boolean);
        if (mons.length) candidates.monsters = [`monsters enemies hostiles foes ${mons.join(' ')}`, `Hostile units present: ${mons.join(', ')}.`];
        const items = ((current3DData && current3DData.items) || []).map(i => i.raw_name || i.name).filter(Boolean);
        if (items.length) candidates.items = [`items loot salvage take ground ${items.join(' ')}`, `Salvageable items in sector: ${items.join(', ')}.`];
        const obs = ((current3DData && current3DData.obstacles) || []).map(o => o.name).filter(Boolean);
        if (obs.length) candidates.obstacles = [`structures obstacles fixtures walls ${obs.join(' ')}`, `Visible structures: ${obs.join(', ')}.`];
        candidates.inventory = ['inventory pack carrying bag gear items', `Carrying: ${inv.join(', ') || 'nothing'}.`];
        for (const [bk, bv] of Object.entries(skills.bestiary || {})) {
          if (bv && typeof bv === 'object') candidates[`bestiary_${bk}`] = [`${bk.replace(/_/g, ' ')} ${bv.name || ''} ${bv.desc || ''}`, `${bv.name || bk} (HP ${bv.hp || '?'}, AC ${bv.ac || '?'}): ${bv.desc || 'Recorded creature entry.'}`];
        }
        const loreList = (skills.dialogue && skills.dialogue.lore) || [];
        for (let i = 0; i < Math.min(loreList.length, 24); i++) candidates[`lore_${i}`] = [loreList[i], loreList[i]];
        if (Object.keys(candidates).length && typeof ccElmEvaluateDecision === 'function') {
          const crit = Object.fromEntries(Object.entries(candidates).map(([k, v]) => [k, v[0]]));
          const ans = ccElmEvaluateDecision(raw, crit, 0.25);
          if (ans.choice && ans.confidence >= 0.28) return `[CC-ELM] ${candidates[ans.choice][1]}`;
        }
        return null;
      }

      const lookExplicit = /^(?:look|l|survey|surroundings|where(?:\s+am\s+i)?|room)$/i.test(low);
      if (lookExplicit && readonlySet.has('look')) {
        const room = (skills.rooms || {})[currentRoomId];
        if (room) {
          const ex = Object.keys(room.exits || {});
          const mons = ((current3DData && current3DData.monsters) || []).map(m => m.name).filter(Boolean);
          const items = ((current3DData && current3DData.items) || []).map(i => i.raw_name || i.name).filter(Boolean);
          return `${room.name}\n${room.desc}\nExits: ${ex.length ? ex.join(', ') : 'none'}${mons.length ? ' | Foes: ' + mons.join(', ') : ''}${items.length ? ' | Items: ' + items.join(', ') : ''}`;
        }
      }

      // Effect-free NPC greeting / conversation (only when no quests/effects/requires are gated)
      const npcs = Array.isArray(inspectableObjects) ? inspectableObjects.filter(o => o && o.type === 'npc') : [];
      if (npcs.length && readonlySet.has('salutation')) {
        const npcPaths = (skills.dialogue && skills.dialogue.npc_paths) || {};
        const namedNpc = npcs.find(n => String(n.name || '').toLowerCase().split(/\s+/).some(w => w.length > 2 && low.includes(w)));
        const candidatesNpc = namedNpc ? [namedNpc] : npcs;
        const _npcPaths = (npc) => {
          const npcId = String(npc.id || npc.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
          return npcPaths[npcId] || Object.entries(npcPaths).find(([k]) => npcId.includes(k) || k.includes(npcId))?.[1];
        };
        if (namedNpc || candidatesNpc.every(n => { const ps = _npcPaths(n); return Array.isArray(ps) && ps.every(p => !p.effects && !p.requires); })) {
          for (const npc of candidatesNpc) {
            const npcName = npc.name || 'NPC';
            const paths = _npcPaths(npc);
            if (Array.isArray(paths) && paths.length && paths.every(p => !p.effects && !p.requires)) {
              const isTalk = /^(?:talk|speak|hello|hi|greetings|hail|ask)\b/i.test(low) || Boolean(namedNpc);
              if (isTalk && typeof ccElmEvaluateDecision === 'function') {
                const crit = Object.fromEntries(paths.map((p, idx) => [String(idx), `${(p.keywords || []).join(' ')} ${p.reply || p.text || ''}`]));
                const ans = ccElmEvaluateDecision(low, crit, 0.25);
                if (ans.choice && (paths.length === 1 || ans.confidence >= 0.40)) {
                  const chosen = paths[parseInt(ans.choice, 10)];
                  return `${npcName}: "${chosen.reply || chosen.text || 'Safe travels, adventurer.'}"`;
                }
              }
            }
          }
        }
      }

      // Phrased read-only commands matched via client CC-ELM intent classifier
      if (skills.intent_criteria && typeof ccElmEvaluateDecision === 'function' && !/^(?:talk|speak|hello|hi|greetings|hail|ask)\b/i.test(low)) {
        const iAns = ccElmEvaluateDecision(low, skills.intent_criteria, 0.25);
        if (iAns.confidence >= 0.45 && readonlySet.has(iAns.choice)) {
          if (iAns.choice === 'inventory') return 'Carrying: ' + (inv.length ? inv.join(', ') : 'nothing');
          if (iAns.choice === 'look' && (skills.rooms || {})[currentRoomId]) {
            const room = skills.rooms[currentRoomId];
            return `${room.name}\n${room.desc}\nExits: ${Object.keys(room.exits || {}).join(', ') || 'none'}`;
          }
        }
      }
      return null;
    }

    function syncRoomEntitiesFromDelta(s3d, skipLocalPlayer = true) {
      if (!s3d) return;
      (s3d.players || s3d.active_room_players || []).forEach(p => {
        const grp = findEntity3DGroup(p.id);
        if (grp) {
          if (p.hp !== undefined) grp.userData.hp = p.hp;
          if (p.max_hp !== undefined) grp.userData.maxHp = p.max_hp;
        }
        if (!skipLocalPlayer || p.id !== myPlayerId) updateLocal3DEntityPosition(p.id, p.x, p.y, p.facing, false, p.is_moving);
      });
      const hasMonstersArr = Boolean(s3d.monsters);
      (s3d.monsters || s3d.active_room_monsters || []).forEach(m => {
        const grp = findEntity3DGroup(m.id);
        if (grp) {
          if (m.hp !== undefined) grp.userData.hp = m.hp;
          if (m.max_hp !== undefined) grp.userData.maxHp = m.max_hp;
        }
        updateLocal3DEntityPosition(m.id, hasMonstersArr ? (m.x + 32) : m.x, hasMonstersArr ? (m.y + 32) : m.y, m.facing, false, m.is_moving);
      });
    }

    window.__applyPublicUrl = function(url) {
      if (!url || typeof url !== 'string') return;
      window.__DND_PUBLIC_URL__ = url;
      const el = document.getElementById('publicUrlLink');
      if (el) {
        el.href = url;
        el.title = `Share public internet link: ${url}`;
        el.style.display = 'inline-block';
      }
    };

    function applyCommonServerDelta(data, opts = {}) {
      if (!data) return;
      if (data.public_url) window.__applyPublicUrl(data.public_url);
      if (Array.isArray(data.story_flags)) window.__DND_STORY_FLAGS__ = new Set(data.story_flags);
      if (data.takeable_items && typeof applyTakeableItems === 'function') applyTakeableItems(data.takeable_items);
      if (data.picked_up && data.picked_up.length) sfx.playPickup();
      if (data.battle_triggered) { sfx.playHit(); currentShake = { intensity: 16, duration: 250, startTime: performance.now() }; }
      if (data.transition) { sfx.playDoor(); }
      if (opts.updateRoomOnTransitionOnly ? (data.transition && data.room_id) : (data.room_id && (data.room_id !== currentRoomId || !currentRoomId))) {
        if (data.room_id) currentRoomId = data.room_id;
        if (data.room_name) currentRoomName = data.room_name;
      } else if (data.room_name && !opts.updateRoomOnTransitionOnly) {
        currentRoomName = data.room_name;
      } else if (data.room_id && !currentRoomId) {
        currentRoomId = data.room_id;
      }
      if (data.inspectable_objects) inspectableObjects = data.inspectable_objects;
      if (data.inventory) invBadge.innerText = 'Inv: ' + (data.inventory.join(', ') || 'empty');
      if (data.char_stats) updateStatsUI(data.char_stats, data.all_player_stats);
      if (data.players) document.getElementById('partyBadge').innerText = `👥 Party: ${data.players.length} Online`;
      if (data.is_won) triggerVictoryCelebration(data);
      if (typeof window.__LW_ON_DELTA__ === 'function') window.__LW_ON_DELTA__(data);
      if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
    }

    async function sendCommand(cmdText, targetPlayerId=null) {
      if (!cmdText.trim()) return;
      const activePid = targetPlayerId || myPlayerId;
      sfx.init(); appendLog('> ' + cmdText, 'log-player');
      const localResponse = tryResolveCommandWithClientModel(cmdText, activePid);
      if (localResponse !== null) {
        appendLog(localResponse, '');
        return;
      }
      const skills = window.__DND_CLIENT_SKILLS__ || {}, cliCfg = skills.client || {};
      const isAtk = (typeof classifyWithClientCCELM === 'function' && skills.intent_criteria)
        ? (classifyWithClientCCELM(cmdText.toLowerCase(), skills.intent_criteria, 0.45, '') === 'attack' || /\b(attack|kill|fight|slay|hit|strike)\b/i.test(cmdText))
        : /\b(attack|kill|fight|slay|hit|strike)\b/i.test(cmdText);
      if (isAtk) sfx.playAttack();
      try {
        const resp = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmdText, player_id: activePid }) });
        const data = await resp.json();
        appendLog(data.response, isAtk ? 'log-combat' : '');

        if (data.player_facing) lastFacing = data.player_facing;
        if (data.combat_info && data.combat_info.reason !== 'no_foes' && data.combat_info.reason !== 'no_weapon') {
          const ci = data.combat_info;
          const hitX = ci.target_x !== undefined ? ci.target_x : (lastPlayerPos.x + 60);
          const hitY = ci.target_y !== undefined ? ci.target_y : lastPlayerPos.y;
          const wSfx = (typeof classifyWithClientCCELM === 'function' && cliCfg.weapon_sfx_criteria && ci.weapon)
            ? classifyWithClientCCELM(ci.weapon, cliCfg.weapon_sfx_criteria, 0.35, 'attack') : ((ci.weapon && /bow/i.test(ci.weapon)) ? 'bow' : 'attack');
          if (wSfx === 'bow') { triggerWeaponSwing(activePid, true, 220); spawnFlyingArrow(lastPlayerPos.x, lastPlayerPos.y, hitX, hitY); }
          else triggerWeaponSwing(activePid, false, 320);

          const pos3D = { x: hitX - 512, y: 14, z: hitY - 384 };
          if (ci.hit) {
            sfx.playHit(pos3D, ci.is_crit);
            currentShake = { intensity: ci.is_crit ? 22 : 14, duration: ci.is_crit ? 350 : 200, startTime: performance.now() };
            spawnAeonwardFloatingDamage(hitX, hitY, ci.damage ? `-${ci.damage}` : 'HIT!', ci.is_crit ? 'crit' : 'hit');
          } else if (ci.reason === 'out_of_range') {
            spawnAeonwardFloatingDamage(hitX, hitY, 'OUT OF RANGE', 'miss');
          } else {
            sfx.playMiss(pos3D);
            spawnAeonwardFloatingDamage(hitX, hitY, 'MISS', 'miss');
          }
        } else if (data.attack_occurred) {
          sfx.playHit();
          currentShake = { intensity: 14, duration: 200, startTime: performance.now() };
        }

        applyCommonServerDelta(data);
        if (data.player_x !== undefined) { lastPlayerPos.x = data.player_x; lastPlayerPos.y = data.player_y; updateCoords(data.player_x, data.player_y); }
        if (data.scene_3d) {
          if (data.transition || !lastBuilt3DRoomId || data.scene_3d.room_id !== lastBuilt3DRoomId || data.battle_triggered || data.is_won) {
            update3DScene(data.scene_3d);
          } else {
            syncRoomEntitiesFromDelta(data.scene_3d, false);
            if (typeof updateAeonwardInitiativeRibbon === 'function') updateAeonwardInitiativeRibbon(data.scene_3d.monsters, data.scene_3d.players);
          }
        }
        refreshTakeDropdown();
      } catch (e) { appendLog('Error: ' + e, 'log-combat'); }
    }

    // Movement Engine: Exact synchronization between keys and player movement
    function getCameraForwardRightVectors() {
      // Returns unit vectors { fwdX, fwdZ, rightX, rightZ } on the horizontal (X, Z) plane
      // based on the active camera mode and current camera rotation/orbit angle.
      if (cameraMode === '2d') {
        return { fwdX: 0, fwdZ: -1, rightX: 1, rightZ: 0 };
      } else if (cameraMode === 'iso') {
        const fwdX = -Math.sin(orbitAzimuth);
        const fwdZ = -Math.cos(orbitAzimuth);
        const rightX = Math.cos(orbitAzimuth);
        const rightZ = -Math.sin(orbitAzimuth);
        return { fwdX, fwdZ, rightX, rightZ };
      } else {
        // 'tp' (3rd Person) or 'fp' (1st Person): use camera's current horizontal look angle
        const yaw = (cameraMode === 'tp') ? tpYawOffset : fpYawOffset;
        const fwdX = Math.sin(yaw);
        const fwdZ = Math.cos(yaw);
        const rightX = -Math.cos(yaw);
        const rightZ = Math.sin(yaw);
        return { fwdX, fwdZ, rightX, rightZ };
      }
    }

    function transformInputToWorldDelta(inRight, inDown, stepLen) {
      // inRight: +1 = Right(D), -1 = Left(A)
      // inDown:  -1 = Up/Forward(W), +1 = Down/Backward(S)
      if (inRight === 0 && inDown === 0) return { moveX: 0, moveY: 0 };
      const inForward = -inDown;
      const { fwdX, fwdZ, rightX, rightZ } = getCameraForwardRightVectors();
      let wx = inForward * fwdX + inRight * rightX;
      let wz = inForward * fwdZ + inRight * rightZ;
      const mag = Math.hypot(wx, wz) || 1;
      wx = (wx / mag) * stepLen;
      wz = (wz / mag) * stepLen;
      return { moveX: Math.round(wx * 10) / 10, moveY: Math.round(wz * 10) / 10 };
    }

    function getDirectionVector() {
      let dx = 0, dy = 0;
      if (activeKeys.has('ArrowUp') || activeKeys.has('w') || activeKeys.has('W') || activeGamepadKeys.has('ArrowUp')) dy -= 1;
      if (activeKeys.has('ArrowDown') || activeKeys.has('s') || activeKeys.has('S') || activeGamepadKeys.has('ArrowDown')) dy += 1;
      if (activeKeys.has('ArrowLeft') || activeKeys.has('a') || activeKeys.has('A') || activeGamepadKeys.has('ArrowLeft')) dx -= 1;
      if (activeKeys.has('ArrowRight') || activeKeys.has('d') || activeKeys.has('D') || activeGamepadKeys.has('ArrowRight')) dx += 1;
      return { dx, dy };
    }

    function triggerMoveCheck() {
      if (moveDebounceTimer) { clearTimeout(moveDebounceTimer); moveDebounceTimer = null; }
      if (!isMoving) {
        processContinuousMovement();
      }
    }

    window.addEventListener('keydown', e => {
      if (document.activeElement === cmdInput || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' '].includes(e.key)) e.preventDefault();
      if (e.key === ' ') { if (!e.repeat) sendCommand('attack'); return; }
      if (!e.repeat) {
        if (e.key === '4') { promptTake(); return; }
        if (e.key === '5') { sendCommand('calibrate'); return; }
        if (e.key === '6') { sendCommand('use potion'); return; }
        if (e.key === '7') { sendCommand('inventory'); return; }
        if (e.key === '8') { sendCommand('short rest'); return; }
        if (e.key === '9') { sendCommand('long rest'); return; }
        if (e.key === 't' || e.key === 'T') { sendCommand('talk'); return; }
      }
      if (e.repeat) return;
      activeKeys.add(e.key);
      triggerMoveCheck();
    });

    window.addEventListener('keyup', e => {
      activeKeys.delete(e.key);
      if (e.key.length === 1) { activeKeys.delete(e.key.toLowerCase()); activeKeys.delete(e.key.toUpperCase()); }
    });
    window.addEventListener('blur', () => { if (moveDebounceTimer) clearTimeout(moveDebounceTimer); activeKeys.clear(); });

    function getGamepadSlot(slot) {
      if (!localGamepadPlayers[slot]) {
        const offset = slot === 0 ? 0 : (slot - 1) * 48;
        localGamepadPlayers[slot] = {
          id: baseGamepadId + slot,
          x: Math.min(960, (lastPlayerPos.x || 360) + offset),
          y: lastPlayerPos.y || 390,
          z: 64,
          dirty: 1,
          lastSent: 0
        };
      }
      return localGamepadPlayers[slot];
    }

    function sendBinarySlotNow(p) {
      p.dirty = 0;
      p.lastSent = performance.now();
      const buf = new ArrayBuffer(16), view = new DataView(buf);
      view.setUint32(0, p.id, true);
      view.setFloat32(4, p.x, true);
      view.setFloat32(8, p.y, true);
      view.setFloat32(12, p.z, true);
      fetch('/i', { method: 'POST', body: buf, keepalive: true }).catch(() => {});
    }

    const FACING_CODE_MAP = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

    function applyEntitiesVectorBuffer(buffer) {
      if (!threeRoomGroup || !buffer || buffer.byteLength < 12) return;
      const view = new DataView(buffer);
      // Header check: 4-byte magic 'DNDV'
      if (view.getUint8(0) !== 68 || view.getUint8(1) !== 78 || view.getUint8(2) !== 68 || view.getUint8(3) !== 86) return;
      const count = view.getUint8(5);
      const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
      const H = (current3DData && current3DData.height) ? current3DData.height : 768;
      let offset = 12;

      for (let i = 0; i < count; i++) {
        if (offset + 16 > buffer.byteLength) break;
        const nid = view.getUint16(offset, true);
        const fCode = view.getUint8(offset + 2);
        const flags = view.getUint8(offset + 3);
        const x = view.getFloat32(offset + 4, true);
        const y = view.getFloat32(offset + 8, true);
        const z = view.getFloat32(offset + 12, true);
        offset += 16;

        const facingStr = FACING_CODE_MAP[fCode % 8] || 'east';
        const serverIsMoving = Boolean(flags & 4);
        const targetX = x - W / 2;
        const targetZ = y - H / 2;

        let c = (typeof threeEntityByNumId !== 'undefined') ? threeEntityByNumId.get(nid) : null;
        if (!c || c.parent !== threeRoomGroup) {
          const vList = (threeDynamicEntities && threeDynamicEntities.length > 0) ? threeDynamicEntities : threeRoomGroup.children;
          c = null;
          for (let vi = 0; vi < vList.length; vi++) {
            const cand = vList[vi];
            if (cand && cand.userData && cand.userData.numericId === nid) {
              c = cand;
              if (typeof threeEntityByNumId !== 'undefined') threeEntityByNumId.set(nid, c);
              break;
            }
          }
        }
        if (c) {
          if (c.userData.isLocalPlayer) {
            if (!isLocalPlayerRecentlyActive() && moveSeq === lastAckedMoveSeq) {
              lastPlayerPos.x = x; lastPlayerPos.y = y; updateCoords(x, y);
              if (localGamepadPlayers[0]) { localGamepadPlayers[0].x = x; localGamepadPlayers[0].y = y; }
              c.userData.targetX = targetX;
              c.userData.targetZ = targetZ;
              c.userData.serverIsMoving = serverIsMoving;
            }
          } else {
            c.userData.targetX = targetX;
            c.userData.targetZ = targetZ;
            c.userData.serverIsMoving = serverIsMoving;
          }
          const charModel = c.userData.charGrp || c.children[0];
          if (charModel) {
            let dx = 0, dz = 0;
            if (facingStr.includes('north')) dz -= 1;
            if (facingStr.includes('south')) dz += 1;
            if (facingStr.includes('west')) dx -= 1;
            if (facingStr.includes('east')) dx += 1;
            if (dx !== 0 || dz !== 0) c.userData.targetRotY = Math.atan2(dx, dz);
          }
        }
      }
    }

    function updateLocal3DEntityPosition(entityId, nx, ny, nFacing, immediate=false, serverIsMoving=undefined) {
      if (!threeRoomGroup) return;
      const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
      const H = (current3DData && current3DData.height) ? current3DData.height : 768;
      const targetX = nx - W / 2;
      const targetZ = ny - H / 2;
      const direct = (typeof findEntity3DGroup === 'function') ? findEntity3DGroup(entityId) : null;
      const iterList = direct ? [direct] : ((threeDynamicEntities && threeDynamicEntities.length > 0) ? threeDynamicEntities : threeRoomGroup.children);
      for (let i = 0; i < iterList.length; i++) {
        const c = iterList[i];
        if (c && c.userData && (c === direct || c.userData.entityId === entityId || (entityId === myPlayerId && c.userData.isLocalPlayer))) {
          const terrainY = (typeof window.getOpenWorldTerrainHeight === 'function') ? window.getOpenWorldTerrainHeight(targetX, targetZ) : 0;
          c.userData.targetX = targetX;
          c.userData.targetY = terrainY;
          c.userData.targetZ = targetZ;
          c.position.y = terrainY;
          if (serverIsMoving !== undefined) {
            c.userData.serverIsMoving = Boolean(serverIsMoving);
          }
          const dist = Math.hypot(c.position.x - targetX, c.position.z - targetZ);
          if (immediate || dist > 380) {
            c.position.x = targetX;
            c.position.z = targetZ;
            c.userData.lastRenderPosX = targetX;
            c.userData.lastRenderPosZ = targetZ;
            c.userData.smoothedSpeed = 0;
            c.updateMatrixWorld(true);
            c.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.update(); });
          }
          const charModel = c.userData.charGrp || c.children[0];
          if (nFacing && charModel) {
            const fStr = nFacing.toLowerCase();
            let dx = 0, dz = 0;
            if (fStr.includes('north')) dz -= 1;
            if (fStr.includes('south')) dz += 1;
            if (fStr.includes('west')) dx -= 1;
            if (fStr.includes('east')) dx += 1;
            if (dx !== 0 || dz !== 0) {
              c.userData.targetRotY = Math.atan2(dx, dz);
              if (immediate) charModel.rotation.y = c.userData.targetRotY;
            }
          }
        }
      }
    }

