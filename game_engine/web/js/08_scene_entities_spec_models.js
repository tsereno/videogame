    function update3DScene_p1(_S, data) {
      with (_S) {
      const catRoom = !data.obstacles && window.__DND_ROOM_CATALOG__ && window.__DND_ROOM_CATALOG__[data.room_id];
      if (catRoom) {
        if (!data.obstacles) data.obstacles = catRoom.obstacles;
        if (!data.portals) data.portals = catRoom.portals;
        if (!data.theme) data.theme = catRoom.theme;
      }
      if (current3DData && data.room_id === current3DData.room_id) {
        if (!data.obstacles && current3DData.obstacles) data.obstacles = current3DData.obstacles;
        if (!data.portals && current3DData.portals) data.portals = current3DData.portals;
        if (!data.theme && current3DData.theme) data.theme = current3DData.theme;
      }
      current3DData = data;
      var W = data.width || 1024;
      var H = data.height || 768;
      var needStaticRebuild = (data.room_id !== lastBuilt3DRoomId);

      // Detect water presence and 3D stream coordinates for spatial audio
      if (needStaticRebuild && data.obstacles) {
        let hasWaterObstacle = false;
        let waterCenter = { x: 0, y: 0, z: 0 };
        const waterObs = data.obstacles.filter(o => {
          const nm = (o.name || o.raw_name || '').toLowerCase();
          return nm.includes('stream') || nm.includes('water') || nm.includes('canal') || nm.includes('pool') || nm.includes('brook');
        });
        if (waterObs.length > 0) {
          hasWaterObstacle = true;
          let sumX = 0, sumZ = 0;
          waterObs.forEach(wo => {
            const r = wo.rect || [0, 0, 100, 100];
            sumX += (r[0] + r[2] / 2 - W / 2);
            sumZ += (r[1] + r[3] / 2 - H / 2);
          });
          waterCenter = { x: sumX / waterObs.length, y: 1, z: sumZ / waterObs.length };
        }
        if (sfx) sfx.setWaterPresence(hasWaterObstacle, waterCenter);
      }
      if (sfx) {
        // Switch MIDI OST context dynamically
        const hasThreats = (data.monsters && data.monsters.length > 0) || (data.active_room_monsters && data.active_room_monsters.length > 0);
        if (data.is_won) {
          sfx.setMidiTrack('victory');
        } else if (hasThreats) {
          sfx.setMidiTrack('combat');
        } else {
          sfx.setMidiTrack('exploration');
        }
      }
      var tw = data.time_weather || { period: 'morning', period_label: 'Morning', weather: 'clear', weather_label: 'Clear Skies', time_str: '09:00', is_outdoor: true };
      const _cliAtmo = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().atmosphere_presets) || {};
      const _periods = _cliAtmo.periods || {};
      const _hasSkills = Object.keys(_periods).length > 0;
      const _fallbackPeriod = { bg: 0x3b7eb8, fog: 0x9bc4e2, amb: 0xffffff, ambI: 0.90, dir: 0xfffaed, dirI: 1.15, pos: [-250, 650, 350], orb: 0xfffae0 };
      const _pKey = _periods[tw.period] ? tw.period : ((typeof classifyWithClientCCELM === 'function' && _cliAtmo.period_criteria) ? classifyWithClientCCELM(tw.period, _cliAtmo.period_criteria, 0.25, 'morning') : 'morning');
      const _spCur = (_hasSkills && (_periods[_pKey] || Object.values(_periods)[0])) || _fallbackPeriod;
      if (!window.__invalidatePreSkill3DScene) {
        window.__invalidatePreSkill3DScene = () => { lastBuiltSkyKey = null; lastBuilt3DRoomId = null; };
      }
      var timeBadge = document.getElementById('threedTimeBadge');
      if (timeBadge) {
        const icon = (tw.weather === 'cloudy' || tw.weather === 'overcast') ? '⛅' : (_spCur.badge || '☀️');
        timeBadge.innerHTML = `${icon} ${tw.time_str} • ${tw.period_label} <span style="font-size:0.7rem; color:#8b949e; margin-left:4px;">(${tw.weather_label})</span>`;
      }

      // Update Sky Dome and Motivated Atmospheric Lighting (Tier 1 & Tier 2)
      var isOutdoor = (tw.is_outdoor !== false);
      const _tType = (data.theme && data.theme.type ? String(data.theme.type) : '').toLowerCase();
      const _rmIdLow = String(data.room_id || '').toLowerCase();
      const indoorKind = isOutdoor ? 'outdoor' : (
        (_tType === 'cave' || _rmIdLow.includes('cave') || _rmIdLow.includes('catacomb') || _rmIdLow.includes('hollow')) ? 'cave'
          : ((_tType === 'tavern' || _rmIdLow.includes('tavern') || _rmIdLow.includes('inn')) ? 'tavern'
          : ((_tType === 'starforge' || _rmIdLow.includes('forge') || _rmIdLow.includes('sector')) ? 'forge' : 'vault'))
      );
      window.__curIsOutdoor = isOutdoor;
      window.__curIndoorKind = indoorKind;
      window.__curWeather = tw.weather || 'clear';
      window.__curPeriod = tw.period || 'morning';
      window.__curThemeType = _tType;

      var skyKey = `${isOutdoor ? 1 : 0}_${indoorKind}_${tw.period}_${tw.weather}_${_tType}`;
      if (skyKey !== lastBuiltSkyKey) {
        if (_hasSkills) lastBuiltSkyKey = skyKey;

        const hemiLight = threeScene.userData && threeScene.userData.hemiLight;
        const bounceLight = threeScene.userData && threeScene.userData.bounceLight;
        const rimLight = threeScene.userData && threeScene.userData.rimLight;
        const isHeavyMist = (tw.weather === 'overcast' || tw.weather === 'misty');

        if (isOutdoor) {
          const skyTex = createSkyTexture(tw.period, tw.weather);
          if (!skyDomeMesh) {
            skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(12500, 40, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false }));
            threeScene.add(skyDomeMesh);
          } else {
            if (skyDomeMesh.material && skyDomeMesh.material.map !== skyTex) { skyDomeMesh.material.map = skyTex; skyDomeMesh.material.needsUpdate = true; }
            if (!skyDomeMesh.parent) threeScene.add(skyDomeMesh);
          }
          skyDomeMesh.userData.isOutdoorSky = true;
          skyDomeMesh.visible = (cameraMode !== '2d' && cameraMode !== 'preview');

          const sp = _spCur;
          const bgHex = sp.bg ?? _fallbackPeriod.bg;
          const fogHex = sp.fog ?? _fallbackPeriod.fog;
          const ambHex = sp.amb ?? _fallbackPeriod.amb;
          const dirHex = sp.dir ?? _fallbackPeriod.dir;
          const rawAmbInt = isHeavyMist ? (sp.ambMist ?? sp.ambI) : sp.ambI;
          const rawDirInt = isHeavyMist ? (sp.dirMist ?? sp.dirI) : sp.dirI;
          const isDim = (_pKey === 'night' || _pKey === 'evening');
          const ambInt = Math.min(0.18, Math.max(0.08, (Number.isFinite(rawAmbInt) ? rawAmbInt : _fallbackPeriod.ambI) * 0.16));
          const dirInt = (Number.isFinite(rawDirInt) ? rawDirInt : _fallbackPeriod.dirI) * (isDim ? 1.25 : (isHeavyMist ? 1.45 : 1.95));
          const fogDensity = isHeavyMist ? 0.00052 : (isDim ? 0.00032 : 0.00018);

          if (!threeScene.background) threeScene.background = new THREE.Color(bgHex); else threeScene.background.setHex(bgHex);
          if (!threeScene.fog || typeof threeScene.fog.density !== 'number') threeScene.fog = new THREE.FogExp2(fogHex, fogDensity);
          else { threeScene.fog.color.setHex(fogHex); threeScene.fog.density = fogDensity; }

          if (ambLight) { ambLight.color.setHex(ambHex); ambLight.intensity = ambInt; }
          if (dirLight && sp.pos) {
            dirLight.color.setHex(dirHex);
            dirLight.intensity = dirInt;
            dirLight.userData.sunOffset = [sp.pos[0], Math.max(360, sp.pos[1]), sp.pos[2]];
            dirLight.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
          }
          const groundBounceHex = (_tType === 'glacier') ? 0x5c7692 : ((_tType === 'forest' || _tType === 'glade' || _tType === 'steppe') ? 0x3b4d28 : ((_tType === 'desert' || _tType === 'road') ? 0x624b32 : 0x454340));
          if (hemiLight) {
            hemiLight.color.setHex(isDim ? 0x7c9ad4 : (isHeavyMist ? 0xc2d0dc : 0xd8ecff));
            hemiLight.groundColor.setHex(isDim ? 0x1d2330 : groundBounceHex);
            hemiLight.intensity = isDim ? 0.24 : (isHeavyMist ? 0.34 : 0.40);
          }
          if (bounceLight && sp.pos) {
            bounceLight.color.setHex(isDim ? 0x344664 : groundBounceHex);
            bounceLight.intensity = isDim ? 0.14 : 0.28;
            bounceLight.position.set(-sp.pos[0], Math.max(120, Math.abs(sp.pos[1]) * 0.45), -sp.pos[2]);
          }
          if (rimLight) {
            rimLight.color.setHex((_pKey === 'sunset' || _pKey === 'evening') ? 0x8fb0ff : 0xd0e6ff);
            rimLight.intensity = isDim ? 0.36 : 0.40;
          }
          window.__targetExposure = isDim ? 1.18 : (isHeavyMist ? 0.96 : 1.02);

          const orbColor = sp.orb || 0xfffae0;
          if (!sunMoonMesh) {
            sunMoonMesh = new THREE.Mesh(new THREE.SphereGeometry(280, 20, 20), new THREE.MeshBasicMaterial({ color: orbColor, fog: false }));
            const coronaCanvas = document.createElement('canvas');
            coronaCanvas.width = 128; coronaCanvas.height = 128;
            const cctx = coronaCanvas.getContext('2d');
            const cgrad = cctx.createRadialGradient(64, 64, 4, 64, 64, 64);
            cgrad.addColorStop(0.0, 'rgba(255,250,235,0.95)');
            cgrad.addColorStop(0.25, 'rgba(255,235,190,0.45)');
            cgrad.addColorStop(0.6, 'rgba(255,215,155,0.12)');
            cgrad.addColorStop(1.0, 'rgba(255,200,140,0.0)');
            cctx.fillStyle = cgrad; cctx.fillRect(0, 0, 128, 128);
            const coronaTex = new THREE.CanvasTexture(coronaCanvas);
            const coronaSprite = new THREE.Sprite(new THREE.SpriteMaterial({
              map: coronaTex, color: orbColor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false
            }));
            coronaSprite.scale.set(2400, 2400, 1);
            sunMoonMesh.add(coronaSprite);
            sunMoonMesh.userData.coronaSprite = coronaSprite;
            threeScene.add(sunMoonMesh);
          } else {
            if (sunMoonMesh.material) { sunMoonMesh.material.color.setHex(orbColor); sunMoonMesh.material.fog = false; }
            if (sunMoonMesh.userData.coronaSprite && sunMoonMesh.userData.coronaSprite.material) {
              sunMoonMesh.userData.coronaSprite.material.color.setHex(orbColor);
            }
            if (!sunMoonMesh.parent) threeScene.add(sunMoonMesh);
          }
          sunMoonMesh.userData.isOutdoorSky = true;
          sunMoonMesh.visible = (cameraMode !== '2d' && cameraMode !== 'preview');
          if (cloudParticlesMesh) { cloudParticlesMesh.userData.isOutdoorSky = true; cloudParticlesMesh.visible = (cameraMode !== '2d' && cameraMode !== 'preview'); }
        } else {
          if (skyDomeMesh) { skyDomeMesh.userData.isOutdoorSky = false; skyDomeMesh.visible = false; }
          if (sunMoonMesh) { sunMoonMesh.userData.isOutdoorSky = false; sunMoonMesh.visible = false; }
          if (cloudParticlesMesh) { cloudParticlesMesh.userData.isOutdoorSky = false; cloudParticlesMesh.visible = false; }
          const ind = _cliAtmo.indoor || { bg: 0x080b10, fog: 0x080b10, amb: 0xd0d7de, dir: 0xf0e6d2, pos: [160, 480, 210] };
          const indBg = (indoorKind === 'tavern') ? 0x1a110b : ((indoorKind === 'forge') ? 0x1c0e09 : (ind.bg ?? 0x0c111a));
          const indFogDen = (indoorKind === 'cave') ? 0.00075 : 0.00048;
          const indAmbCol = (indoorKind === 'tavern' || indoorKind === 'forge') ? 0x6a4e36 : 0x3f5678;
          const indDirCol = (indoorKind === 'tavern') ? 0xffcb8c : ((indoorKind === 'forge') ? 0xffa068 : 0xb4ccf0);
          const indDirInt = (indoorKind === 'tavern') ? 1.65 : ((indoorKind === 'forge') ? 1.75 : 1.48);

          if (!threeScene.background) threeScene.background = new THREE.Color(indBg); else threeScene.background.setHex(indBg);
          if (!threeScene.fog || typeof threeScene.fog.density !== 'number') threeScene.fog = new THREE.FogExp2(indBg, indFogDen);
          else { threeScene.fog.color.setHex(indBg); threeScene.fog.density = indFogDen; }

          if (ambLight) { ambLight.color.setHex(indAmbCol); ambLight.intensity = (indoorKind === 'tavern') ? 0.17 : 0.14; }
          if (dirLight) {
            const p = ind.pos || [160, 480, 210];
            dirLight.color.setHex(indDirCol);
            dirLight.intensity = indDirInt;
            dirLight.userData.sunOffset = [p[0], p[1], p[2]];
            dirLight.position.set(p[0], p[1], p[2]);
          }
          if (hemiLight) {
            hemiLight.color.setHex((indoorKind === 'tavern' || indoorKind === 'forge') ? 0xffcf9e : 0x6e90bd);
            hemiLight.groundColor.setHex(0x282019);
            hemiLight.intensity = 0.42;
          }
          if (bounceLight) {
            bounceLight.color.setHex((indoorKind === 'tavern' || indoorKind === 'forge') ? 0xff984e : 0x526f94);
            bounceLight.intensity = 0.34;
          }
          if (rimLight) {
            rimLight.color.setHex((indoorKind === 'tavern' || indoorKind === 'forge') ? 0x7aa2de : 0xe4d2b4);
            rimLight.intensity = 0.44;
          }
          window.__targetExposure = 1.24;
        }

        // Truthful Local Reflections (Tier 2 #5): match envMap to outdoor/indoorKind
        try {
          const updatedEnv = createProceduralEnvironmentMap(tw.period || 'morning', tw.weather || 'clear', isOutdoor, indoorKind);
          if (updatedEnv && threeScene.environment !== updatedEnv) {
            threeScene.environment = updatedEnv;
          }
        } catch (e) {}

        if (dirLight && dirLight.shadow) {
          dirLight.shadow.needsUpdate = true;
          if (threeRenderer.shadowMap) threeRenderer.shadowMap.needsUpdate = true;
        }
      }
      if (isOutdoor && sunMoonMesh && tw.hour !== undefined) {
        const orbDist = 10200;
        const sunAngle = (tw.hour / 24.0) * Math.PI * 2;
        const relX = Math.cos(sunAngle) * orbDist;
        const relY = Math.max(900, Math.sin(sunAngle) * 4200 + 2800);
        const relZ = Math.sin(sunAngle * 0.5) * 3200 - 1800;
        sunMoonMesh.userData.skyOffset = [relX, relY, relZ];
        const refX = (skyDomeMesh && skyDomeMesh.position) ? skyDomeMesh.position.x : 0;
        const refZ = (skyDomeMesh && skyDomeMesh.position) ? skyDomeMesh.position.z : 0;
        sunMoonMesh.position.set(refX + relX, relY, refZ + relZ);
      }

      if (needStaticRebuild) {
        update3DScene_static(_S, data);
        if (data.players) {
          const me = data.players.find(p => p.id === myPlayerId);
          if (me && me.x !== undefined && me.y !== undefined) {
            lastPlayerPos.x = me.x;
            lastPlayerPos.y = me.y;
            renderPlayerPos.x = me.x;
            renderPlayerPos.y = me.y;
          }
        }
      }

      var addVolumetricEntity = (...a) => addVolumetricEntity_impl(_S, ...a);
      var activeEntityIds = new Set();
      const _upsertEntity = (opts) => {
        activeEntityIds.add(opts.id);
        let grp = findEntity3DGroup(opts.id);
        const skillsNow = Boolean(window.__DND_CLIENT_SKILLS__);
        if (grp && opts.rebuildIfChanged && (grp.userData.tokenName !== opts.tokenName || !grp.userData.hasRealisticMesh || grp.userData.skillsLoaded !== skillsNow)) {
          threeRoomGroup.remove(grp);
          if (typeof unregisterDynamicEntity === 'function') unregisterDynamicEntity(grp);
          grp = null;
        }
        if (!grp) {
          grp = addVolumetricEntity(opts.sx, opts.sy, opts.cat, opts.tokenName, opts.color, opts.size, opts.label, opts.hp, opts.maxHp, opts.isMonster, opts.facing, opts.id, opts.visualSpec);
          if (grp) {
            grp.userData.tokenName = opts.tokenName;
            grp.userData.skillsLoaded = skillsNow;
            if (opts.numericId !== undefined) { grp.userData.numericId = opts.numericId; if (typeof registerDynamicEntity === 'function') registerDynamicEntity(grp); }
          }
        } else {
          if (opts.numericId !== undefined && grp.userData.numericId !== opts.numericId) { grp.userData.numericId = opts.numericId; if (typeof registerDynamicEntity === 'function') registerDynamicEntity(grp); }
          if (opts.syncHp) { if (opts.hp !== undefined) grp.userData.hp = opts.hp; if (opts.maxHp !== undefined) grp.userData.maxHp = opts.maxHp; }
          if (opts.syncPos) updateLocal3DEntityPosition(opts.id, opts.ux, opts.uy, opts.facing, Boolean(opts.immediate), opts.isMoving);
        }
        if (grp) {
          if (opts.syncHp && opts.isMoving !== undefined) grp.userData.serverIsMoving = Boolean(opts.isMoving);
          grp.userData.hoverInfo = opts.hoverInfo;
        }
      };

      (data.players || []).forEach(p => {
        const isYou = p.id === myPlayerId, pf = (isYou && lastFacing) ? lastFacing : (p.facing || 'east');
        const shortLabel = (typeof _resolveHeroPortraitEntry === 'function') ? (_resolveHeroPortraitEntry(p.class, p.name).st.label || 'Fighter') : (p.class || 'Fighter');
        const useLocal = isYou && isLocalPlayerRecentlyActive();
        _upsertEntity({
          id: p.id, numericId: p.numeric_id, cat: p.token_category || 'player', tokenName: p.token_name || p.class || 'Fighter',
          color: 0x1f6feb, size: p.z ? (p.z * 0.75) : 48, label: shortLabel, hp: p.hp, maxHp: p.max_hp, isMonster: false,
          facing: pf, visualSpec: p.visual_spec, rebuildIfChanged: true, sx: useLocal ? lastPlayerPos.x : p.x, sy: useLocal ? lastPlayerPos.y : p.y,
          ux: p.x, uy: p.y, immediate: needStaticRebuild, isMoving: needStaticRebuild ? false : p.is_moving, syncHp: true,
          syncPos: needStaticRebuild || !isYou || (!isLocalPlayerRecentlyActive() && moveSeq === lastAckedMoveSeq),
          hoverInfo: { name: `${p.name || 'Hero'} (${shortLabel})`, detail: `${p.species || 'Hero'} ${p.class || 'Adventurer'} • ${isYou ? 'You' : (p.is_ai ? 'AI Party Companion' : 'Player')} | ❤️ HP: ${p.hp}/${p.max_hp}${p.ac ? ' • 🛡️ Guard: ' + p.ac : ''}`, tag: isYou ? 'You' : 'Party', tagClass: 'tag-character' }
        });
      });

      (data.monsters || []).forEach(m => _upsertEntity({
        id: m.id, numericId: m.numeric_id, cat: m.token_category || 'monster', tokenName: m.token_name || m.name || 'Sentinel',
        color: 0xb62324, size: 48, label: m.name, hp: m.hp, maxHp: m.max_hp, isMonster: true,
        facing: m.facing || ((m.x > lastPlayerPos.x) ? 'west' : 'east'), visualSpec: m.visual_spec,
        sx: m.x + 32, sy: m.y + 32, ux: m.x + 32, uy: m.y + 32, isMoving: m.is_moving, syncHp: true, syncPos: true,
        hoverInfo: { name: m.name || m.raw_name || 'Hostile Creature', detail: `Hostile Creature (${(m.archetype || 'brute').replace('_', ' ').toUpperCase()}) | ❤️ HP: ${m.hp}/${m.max_hp}${m.ac ? ' • 🛡️ Guard: ' + m.ac : ''}`, tag: 'Monster', tagClass: 'tag-monster' }
      }));

      (data.npcs || []).forEach(n => _upsertEntity({
        id: n.id, numericId: n.numeric_id, cat: 'npc', tokenName: n.token_name || n.name || 'Townsperson',
        color: 0x4dabf7, size: 48, label: n.name, hp: 20, maxHp: 20, isMonster: false, facing: n.facing || 'south',
        visualSpec: n.visual_spec, sx: n.x, sy: n.y, ux: n.x, uy: n.y, isMoving: false, syncHp: false, syncPos: true,
        hoverInfo: { name: `${n.name} (${n.title || 'Townsperson'})`, detail: `Friendly Citizen | Languages: ${(n.languages || ['Common']).join(', ')} • Click or type 'talk ${n.name}' to converse`, tag: 'NPC', tagClass: 'tag-character' }
      }));

      // Remove any entities (slain monsters or departed players) no longer in the room
      for (let i = threeRoomGroup.children.length - 1; i >= 0; i--) {
        const ch = threeRoomGroup.children[i];
        if (ch.userData && ch.userData.entityId && !activeEntityIds.has(ch.userData.entityId)) {
          threeRoomGroup.remove(ch);
          if (typeof unregisterDynamicEntity === 'function') unregisterDynamicEntity(ch);
        }
      }

      // Update Aeonward Initiative Ribbon
      if (typeof updateAeonwardInitiativeRibbon === 'function') {
        updateAeonwardInitiativeRibbon(data.monsters, data.players);
      }

      // 6. 3D Ground Items / Treasure (Only rebuild when ground items list changes)
      var curItemsKey = (data.items || []).map(it => `${it.name}:${it.x}:${it.y}`).join('|');
      }
    }

    function update3DScene_p2(_S, data) {
      with (_S) {
      if (curItemsKey !== lastBuiltItemsKey) {
        lastBuiltItemsKey = curItemsKey;
        for (let i = threeRoomGroup.children.length - 1; i >= 0; i--) {
          const ch = threeRoomGroup.children[i];
          if (ch.userData && ch.userData.isGroundItem) {
            threeRoomGroup.remove(ch);
          }
        }
        let itemLights = 0;
        const _mat = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();
        const _geo = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
        (data.items || []).forEach(it => {
          const cx = it.x - W / 2, cz = it.y - H / 2;
          const itName = (it.name || '').toLowerCase();
          const itemGrp = new THREE.Group();
          itemGrp.position.set(cx, 0, cz);
          itemGrp.scale.set(0.65, 0.65, 0.65);
          itemGrp.userData.isGroundItem = true;
          itemGrp.userData.hoverInfo = {
            name: it.raw_name || it.name || 'Treasure Item',
            detail: 'Ground Item / Loot (Walk over or type "take" to pick up)',
            tag: 'Item',
            tagClass: 'tag-item'
          };

          const itemRules = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg().item_models : null;
          const matchedItemUrl = (typeof resolveSkillModelUrl === 'function') ? resolveSkillModelUrl(itName, itemRules, '/models/chest.glb') : '/models/chest.glb';

          const gltfCache = window.__DND_MODEL_CACHE__ || (window.__DND_MODEL_CACHE__ = {});
          const itemFb = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().item_fallbacks) || {};
          const fbKey = (typeof classifyWithClientCCELM === 'function' && itemFb.criteria) ? classifyWithClientCCELM(itName, itemFb.criteria, 0.35, 'chest') : 'chest';
          const fbTpl = (itemFb.templates && itemFb.templates[fbKey]) || { light: 0x7ee787, parts: [{ type: 'box', fixed: [22, 14, 16], pos: [0, 7, 0], color: 0xa06e28 }] };
          if (matchedItemUrl && gltfCache[matchedItemUrl]) {
            const clone = gltfCache[matchedItemUrl].scene.clone(true);
            clone.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
            itemGrp.add(clone);
          } else if (typeof buildSkillPartMeshes === 'function') {
            buildSkillPartMeshes(itemGrp, fbTpl.parts || [], { shadows: true });
          }
          if (itemLights < 2 && fbTpl.light) {
            const hLight = new THREE.PointLight(fbTpl.light, 2.2, 110, 1.0);
            hLight.position.set(0, 16, 0); itemGrp.add(hLight); itemLights++;
          }

          freezeStaticHierarchy(itemGrp);
          threeRoomGroup.add(itemGrp);
        });
      }

      // Update Aeonward Mini-Map & Open-World Compass Strip (persist throttle timestamp across calls)
      const _now = performance.now();
      if (!update3DScene._lastMinimapUpdate || (_now - update3DScene._lastMinimapUpdate) > 120) {
        update3DScene._lastMinimapUpdate = _now;
        if (typeof updateAeonwardMinimap === 'function') {
          updateAeonwardMinimap(data);
        }
        if (typeof updateAeonwardCompassStrip === 'function') {
          updateAeonwardCompassStrip(data);
        }
      }
      if (typeof refreshActionDropdown === 'function') refreshActionDropdown();
      }
    }

    function addVolumetricEntity_pre_p1(_E) {
      with (_E) {
        var shortType = String(label || tokenName || '').replace(/\\s*\\([^)]*\\)/g, '').replace(/\\s*#\\d+$/, '').trim();
        var cx = x - W / 2, cz = y - H / 2;
        var grp = new THREE.Group();
        grp.position.set(cx, 0, cz);
        grp.userData.entityId = entityId;
        grp.userData.hp = hp;
        grp.userData.maxHp = maxHp;
        grp.userData.isMonster = Boolean(isMonster);
        grp.userData.targetX = cx;
        grp.userData.targetZ = cz;
        grp.userData.lastRenderPosX = cx;
        grp.userData.lastRenderPosZ = cz;
        grp.userData.smoothedSpeed = 0;
        if (!isMonster && entityId === myPlayerId) {
          grp.userData.isLocalPlayer = true;
          grp.visible = (cameraMode !== 'fp');
        }

        const _geo = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
        const _mat = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();

        // Fast shared low-poly raycast proxy cylinder so mouse hover/click never raycasts 950k-triangle SkinnedMeshes
        var hitboxGeo = _geo('ent_hitbox_cyl', () => new THREE.CylinderGeometry(0.36, 0.36, 0.85, 8));
        var hitboxMat = _mat('ent_hitbox_mat', () => new THREE.MeshBasicMaterial({ visible: false }));
        var hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitboxMesh.scale.set(size, size, size);
        hitboxMesh.position.y = size * 0.425;
        grp.add(hitboxMesh);
        grp.userData.hitboxMesh = hitboxMesh;

        // Ground locator circle: Green for local player, Yellow for other players, Red for monsters, none for NPCs
        var catLow = (category || '').toLowerCase();
        var isNpc = catLow === 'npc' || (entityId && String(entityId).toLowerCase().startsWith('npc'));
        if (!isNpc) {
          const ringColor = isMonster ? 0xff3b30 : (entityId === myPlayerId ? 0x2ea043 : 0xffeb3b);
          const ringGeo = _geo('ent_locator_ring_v2', () => new THREE.RingGeometry(0.46, 0.495, 24));
          const ringMat = _mat(`ent_ring_v2_${ringColor}`, () => new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.scale.set(size, size, 1);
          ringMesh.rotation.x = -Math.PI / 2;
          ringMesh.position.y = 0.25;
          grp.add(ringMesh);
        }

        const [dx, dz] = (typeof facingToVec === 'function') ? facingToVec(facing) : [1, 0];
        var faceAngle = Math.atan2(dx, dz);

        // Multi-Layer Ground Contact & Ambient Shadow (Shared GPU unit plane + materials)
        var contactTex = createContactShadowTexture();
        var unitPlaneGeo = _geo('unit_plane_1x1', () => new THREE.PlaneGeometry(1, 1));
        var contactShadowGeo = unitPlaneGeo;
        var contactShadowMat = _mat('ent_contact_shadow', () => new THREE.MeshBasicMaterial({
          map: contactTex,
          transparent: true,
          opacity: 0.82,
          depthWrite: false
        }));
        var contactShadowMesh = new THREE.Mesh(unitPlaneGeo, contactShadowMat);
        contactShadowMesh.scale.set(size * 0.92, size * 0.92, 1);
        contactShadowMesh.rotation.x = -Math.PI / 2;
        contactShadowMesh.position.y = 0.5;
        grp.add(contactShadowMesh);

        var ambShadowGeo = unitPlaneGeo;
        var ambShadowMat = _mat('ent_amb_shadow', () => new THREE.MeshBasicMaterial({
          map: contactTex,
          transparent: true,
          opacity: 0.35,
          depthWrite: false
        }));
        var ambShadowMesh = new THREE.Mesh(unitPlaneGeo, ambShadowMat);
        ambShadowMesh.scale.set(size * 1.55, size * 1.55, 1);
        ambShadowMesh.rotation.x = -Math.PI / 2;
        ambShadowMesh.position.y = 0.45;
        grp.add(ambShadowMesh);

        // Volumetric 3D Character Model Body standing directly on the ground
        var charGrp = new THREE.Group();
        charGrp.position.y = 0;
        charGrp.rotation.y = faceAngle; // Rotate entire figure towards movement/facing direction
        grp.userData.charGrp = charGrp;

        var lowName = (tokenName || '').toLowerCase();
        var _em = (typeof window.createRichObjectMaterial === 'function')
          ? window.createRichObjectMaterial
          : (sp) => new THREE.MeshStandardMaterial({ color: sp.color, roughness: sp.roughness ?? 0.7, metalness: sp.metalness ?? 0.05 });
        var _skinPbr = (col) => (typeof THREE.MeshPhysicalMaterial === 'function')
          ? new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.58, metalness: 0.02, sheen: 0.35, sheenRoughness: 0.65, sheenColor: new THREE.Color(0xffccb4) })
          : new THREE.MeshStandardMaterial({ color: col, roughness: 0.62 });
        var skinMat = _mat('ent_skin_v2', () => _skinPbr(0xf2c69e));
        var darkSkinMat = _mat('ent_darkSkin_v2', () => _skinPbr(0x8d5524));
        var orcSkinMat = _mat('ent_orcSkin_v2', () => _skinPbr(0x4d7c3b));
        var steelMat = _mat('ent_steel_v2', () => _em({ color: 0xd5dce6, pbrKind: 'metal', metalness: 0.92, roughness: 0.24 }));
        var goldMat = _mat('ent_gold_v2', () => _em({ color: 0xdfb03a, pbrKind: 'metal', metalness: 0.94, roughness: 0.22 }));
        var leatherMat = _mat('ent_leather_v2', () => _em({ color: 0x5c3b28, pbrKind: 'leather', roughness: 0.68 }));
        var darkLeatherMat = _mat('ent_darkLeather_v2', () => _em({ color: 0x4c372c, pbrKind: 'leather', roughness: 0.62 }));
        var darkClothMat = _mat('ent_darkCloth_v2', () => _em({ color: 0x3b434e, pbrKind: 'cloth', roughness: 0.84, sheen: 0.62 }));
        var royalBlueMat = _mat('ent_royalBlue_v2', () => _em({ color: 0x2268d6, pbrKind: 'cloth', roughness: 0.58, sheen: 0.68 }));
        var royalBlueLightMat = _mat('ent_royalBlueLight_v2', () => _em({ color: 0x529be8, pbrKind: 'cloth', roughness: 0.55, sheen: 0.68 }));
        var purpleRobeMat = _mat('ent_purpleRobe_v2', () => _em({ color: 0x6c42be, pbrKind: 'cloth', roughness: 0.74, sheen: 0.72 }));
        var boneMat = _mat('ent_bone_v2', () => _em({ color: 0xdcd9cf, pbrKind: 'stone', roughness: 0.52 }));
        var woodMat = _mat('ent_wood_v2', () => _em({ color: 0x8b5a2b, pbrKind: 'wood', roughness: 0.76 }));

        var eyeScleraMat = _mat('ent_eyeSclera', () => new THREE.MeshBasicMaterial({ color: 0xf0f3f6 }));
        const _eyeHex = (!isMonster && typeof _resolveHeroPortraitEntry === 'function')
          ? (_resolveHeroPortraitEntry(tokenName, label).st.eye || '#238636') : '#d91d1d';
        const irisColor = isMonster ? 0xd91d1d : parseInt(String(_eyeHex).replace('#', ''), 16);
        var eyeIrisMat = _mat(`ent_eyeIris_${irisColor}`, () => new THREE.MeshBasicMaterial({ color: irisColor }));
        var eyePupilMat = _mat('ent_eyePupil', () => new THREE.MeshBasicMaterial({ color: 0x05070a }));
        var eyeGlintMat = _mat('ent_eyeGlint', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));

        // Normal maps for SF3D PBR enhancements within entity scope
        var entityStoneNormal = (typeof createProceduralNormalTexture === 'function') ? createProceduralNormalTexture('stone') : null;
        var entityBarkNormal = (typeof createProceduralNormalTexture === 'function') ? createProceduralNormalTexture('bark') : null;
        var entityFoliageNormal = (typeof createProceduralNormalTexture === 'function') ? createProceduralNormalTexture('foliage') : null;

      }
    }

    function _liftDarkGltfTex(origTex, preset) {
      const im = origTex && origTex.image;
      if (!im || !window.THREE) return { map: origTex, wasDark: false };
      try {
        const probe = createOptimizedCanvas(16, 16), pCtx = probe.getContext('2d');
        pCtx.drawImage(im, 0, 0, 16, 16);
        const dt = pCtx.getImageData(0, 0, 16, 16).data;
        let sum = 0;
        for (let i = 0; i < dt.length; i += 4) sum += (dt[i] + dt[i + 1] + dt[i + 2]) / 3;
        const avg = sum / (dt.length / 4);
        if (avg >= 72) return { map: origTex, wasDark: false };
        const sz = 512, cv = createOptimizedCanvas(sz, sz), ctx = cv.getContext('2d');
        ctx.drawImage(im, 0, 0, sz, sz);
        // GPU screen-blend passes lift dark gothic albedos cleanly without clipping highlights
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(cv, 0, 0);
        ctx.drawImage(cv, 0, 0);
        if (preset && preset.torso && preset.key !== 'wizard') {
          ctx.globalCompositeOperation = 'color';
          ctx.globalAlpha = (preset.key === 'rogue') ? 0.25 : 0.45;
          ctx.fillStyle = preset.torso;
          ctx.fillRect(0, 0, sz, sz);
          ctx.globalAlpha = 1.0;
        }
        ctx.globalCompositeOperation = 'source-over';
        const tex = new THREE.CanvasTexture(cv);
        tex.flipY = origTex.flipY;
        tex.wrapS = origTex.wrapS;
        tex.wrapT = origTex.wrapT;
        if (typeof THREE.SRGBColorSpace !== 'undefined') tex.colorSpace = origTex.colorSpace || THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return { map: tex, wasDark: true };
      } catch (e) {
        return { map: origTex, wasDark: false };
      }
    }

    function _getHeroSpecPreset(matchedKey, fallbackQuery='') {
      const cfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const resolvedKey = matchedKey || ((typeof _resolveHeroPortraitEntry === 'function')
        ? _resolveHeroPortraitEntry(fallbackQuery, fallbackQuery).key : 'fighter');
      const ps = (cfg.portrait_styles && cfg.portrait_styles[resolvedKey]) || {};
      const hp = (cfg.hero_presets && cfg.hero_presets[resolvedKey]) || {};
      return { key: resolvedKey, ...ps, ...hp };
    }

    function _buildSkillWeaponMesh(kind, bs, preset = {}) {
      if (!kind || kind === 'none') return null;
      const cfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const recipes = cfg.weapon_recipes || {};
      const key = recipes[kind] ? kind : ((typeof classifyWithClientCCELM === 'function' && cfg.weapon_criteria) ? classifyWithClientCCELM(kind, cfg.weapon_criteria, 0.30, null) : null);
      const parts = key && recipes[key];
      if (!parts || typeof buildSkillPartMeshes !== 'function') return null;
      const g = new THREE.Group();
      const _wm = (typeof window.createRichObjectMaterial === 'function')
        ? window.createRichObjectMaterial
        : (sp) => new THREE.MeshStandardMaterial({ color: sp.color, roughness: sp.roughness ?? 0.6, metalness: sp.metalness ?? 0.1 });
      const grip = _wm({ color: 0x3b2314, pbrKind: 'leather', roughness: 0.70, metalness: 0.08 });
      const gold = _wm({ color: 0xdead38, pbrKind: 'metal', metalness: 0.92, roughness: 0.22 });
      const steel = _wm({ color: 0xd5dce6, pbrKind: 'metal', metalness: 0.94, roughness: 0.18 });
      const shield = _wm({ color: (preset.key === 'cleric') ? 0xd2d9e2 : (preset.trim || 0x2268d6), pbrKind: 'metal', metalness: 0.55, roughness: 0.30 });
      const tome = _wm({ color: preset.torso || 0x4b2e83, pbrKind: 'leather', roughness: 0.58, metalness: 0.14 });
      buildSkillPartMeshes(g, parts, { unitScale: bs, shadows: true, mats: { grip, gold, steel, shield, tome } });
      return g;
    }

    function addVolumetricEntity_spec(_E) {
      with (_E) {
          if (visualSpec.model_asset && window.__DND_LOADERS__ && window.__DND_LOADERS__.gltf) {
            const assetUrl = visualSpec.model_asset;
            const modelCache = window.__DND_MODEL_CACHE__ || (window.__DND_MODEL_CACHE__ = {});
            const targetCharGrp = charGrp;
            grp.userData.hasRealisticMesh = true;

            const setupAnimationMixer = (gltfData, cloneInstance) => {
              if (!gltfData || !gltfData.animations || gltfData.animations.length === 0) return;
              const mixer = new THREE.AnimationMixer(cloneInstance);
              const actions = {};
              gltfData.animations.forEach(clip => { actions[clip.name.toLowerCase()] = mixer.clipAction(clip); });
              const actKeys = Object.keys(actions);
              const idleAction = actions[actKeys.find(k => k.includes('idle') || k.includes('stand')) || actKeys.find(k => k.includes('pose'))] || actions.idle || actions.tpose || Object.values(actions)[0];
              const walkAction = actions[actKeys.find(k => k.includes('walk') || k.includes('run') || k.includes('jog') || k.includes('sneak'))] || actions.walk || actions.run || idleAction;
              if (idleAction) { idleAction.play(); grp.userData.currentAnimAction = idleAction; }
              grp.userData.animMixer = mixer;
              grp.userData.animActions = { idle: idleAction, walk: walkAction, all: actions };
            };

            const instantiateGltf = (gltfData) => {
              const utils = (window.THREE_ADDONS && window.THREE_ADDONS.SkeletonUtils);
              const clone = utils ? utils.clone(gltfData.scene) : gltfData.scene.clone(true);
              const mScale = visualSpec.model_scale || 16.0;
              clone.scale.set(mScale, mScale, mScale);
              clone.updateMatrixWorld(true);
              const bbox = new THREE.Box3().setFromObject(clone);
              const autoGroundOffset = (bbox.min.y < 0 || bbox.min.y >= 1.0) ? -bbox.min.y : 0;
              const off = visualSpec.model_offset;
              clone.position.set(off ? off[0] : 0, (off && off[1] !== 0) ? off[1] : autoGroundOffset, off ? off[2] : 0);

              const preset = _getHeroSpecPreset(visualSpec.matched_key, `${tokenName} ${shortType}`);
              const _glbMat = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();

              let needsShadowProxy = false;
              clone.traverse(child => {
                if (child.isSkinnedMesh) { child.frustumCulled = false; child.raycast = () => {}; }
                if (!child.isMesh) return;
                const vCount = (child.geometry && child.geometry.attributes && child.geometry.attributes.position) ? child.geometry.attributes.position.count : 0;
                const isHeavyMesh = vCount > 40000;
                if (isHeavyMesh) needsShadowProxy = true;
                child.castShadow = !isHeavyMesh;
                child.receiveShadow = true;
                if (!child.material) return;
                const origMat = child.material, matName = (origMat.name || '').toLowerCase();
                if (origMat.map) {
                  child.material = _glbMat(`glb_phys_${preset.key}_${origMat.map.uuid}_${origMat.side}`, () => {
                    const lifted = _liftDarkGltfTex(origMat.map, preset);
                    const isArmor = !!preset.metallic_map;
                    if (typeof THREE.MeshPhysicalMaterial === 'function') {
                      return new THREE.MeshPhysicalMaterial({
                        map: lifted.map, normalMap: origMat.normalMap || null, normalScale: new THREE.Vector2(0.55, 0.55),
                        roughnessMap: origMat.roughnessMap || null,
                        roughness: isArmor ? 0.40 : 0.74, metalness: isArmor ? 0.38 : 0.04,
                        clearcoat: isArmor ? 0.42 : 0.0, clearcoatRoughness: 0.24,
                        sheen: isArmor ? 0.0 : 0.65, sheenRoughness: 0.72, sheenColor: new THREE.Color(0xc8d2e2),
                        envMapIntensity: isArmor ? 1.15 : 0.85,
                        side: origMat.side !== undefined ? origMat.side : THREE.FrontSide
                      });
                    }
                    return new THREE.MeshStandardMaterial({
                      map: lifted.map, normalMap: origMat.normalMap || null, normalScale: new THREE.Vector2(0.55, 0.55),
                      roughnessMap: origMat.roughnessMap || null,
                      roughness: isArmor ? 0.40 : 0.74, metalness: isArmor ? 0.38 : 0.04,
                      envMapIntensity: isArmor ? 1.15 : 0.85,
                      side: origMat.side !== undefined ? origMat.side : THREE.FrontSide
                    });
                  });
                } else {
                  const isJoint = matName.includes('joint');
                  child.material = _glbMat(`glb_phys_${preset.key}_${isJoint ? 'j' : 'b'}`, () => {
                    if (typeof THREE.MeshPhysicalMaterial === 'function') {
                      return new THREE.MeshPhysicalMaterial({
                        color: isJoint ? (preset.joint_color || 0xd4af37) : (preset.body_color || 0xcfd6e0),
                        normalMap: preset.metallic_map ? entityStoneNormal : entityBarkNormal, normalScale: new THREE.Vector2(0.35, 0.35),
                        roughness: preset.roughness ?? 0.34, metalness: preset.metalness ?? 0.55,
                        clearcoat: preset.metallic_map ? 0.45 : 0.0, clearcoatRoughness: 0.22,
                        sheen: preset.metallic_map ? 0.0 : 0.55, sheenRoughness: 0.7,
                        envMapIntensity: Math.min(1.6, preset.env || 1.35)
                      });
                    }
                    return new THREE.MeshStandardMaterial({
                      color: isJoint ? (preset.joint_color || 0xd4af37) : (preset.body_color || 0xcfd6e0),
                      normalMap: preset.metallic_map ? entityStoneNormal : entityBarkNormal, normalScale: new THREE.Vector2(0.35, 0.35),
                      roughness: preset.roughness ?? 0.34, metalness: preset.metalness ?? 0.55, envMapIntensity: Math.min(1.6, preset.env || 1.35)
                    });
                  });
                }
              });
              if (needsShadowProxy) {
                const spGeo = (typeof getSharedGeo === 'function')
                  ? getSharedGeo('ent_shadow_proxy_cyl', () => new THREE.CylinderGeometry(0.28, 0.34, 1.55, 8))
                  : new THREE.CylinderGeometry(0.28, 0.34, 1.55, 8);
                const spMat = _glbMat('ent_shadow_proxy_mat', () => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
                const spMesh = new THREE.Mesh(spGeo, spMat);
                spMesh.position.y = 0.82;
                spMesh.castShadow = true;
                spMesh.receiveShadow = false;
                spMesh.raycast = () => {};
                clone.add(spMesh);
              }

              let boneHead = null, boneRightHand = null, boneLeftHand = null, boneChest = null;
              let boneLeftArm = null, boneRightArm = null, boneLeftForeArm = null, boneRightForeArm = null;
              let boneLeftLeg = null, boneRightLeg = null, boneLeftShin = null, boneRightShin = null;
              const fingerBones = [];
              let hasArmatureCm = false;
              const boneMap = { bone_5: b => boneHead = b, bone_3: b => boneChest = b, bone_9: b => boneLeftHand = b, bone_28: b => boneRightHand = b, bone_7: b => boneLeftArm = b, bone_8: b => boneLeftForeArm = b, bone_26: b => boneRightArm = b, bone_27: b => boneRightForeArm = b, bone_44: b => boneLeftLeg = b, bone_45: b => boneLeftShin = b, bone_48: b => boneRightLeg = b, bone_49: b => boneRightShin = b };
              clone.traverse(o => {
                if (o.scale && Math.abs(o.scale.x - 0.01) < 0.005) hasArmatureCm = true;
                if (!o.isBone) return;
                const b = o.name || '';
                if (boneMap[b]) boneMap[b](o);
                else {
                  if ((b.includes('Head') || b.endsWith('head')) && !b.includes('End') && !b.includes('Top')) boneHead = o;
                  if ((b.includes('RightHand') || b.endsWith('r_hand')) && !b.includes('Thumb') && !b.includes('Index')) boneRightHand = o;
                  if ((b.includes('LeftHand') || b.endsWith('l_hand')) && !b.includes('Thumb') && !b.includes('Index')) boneLeftHand = o;
                  if (b.includes('Spine2') || b.includes('Spine1') || b.includes('Chest') || b.endsWith('spine2')) boneChest = o;
                }
                if (b.startsWith('bone_')) {
                  const idx = parseInt(b.slice(5), 10);
                  if ((idx >= 10 && idx <= 24) || (idx >= 29 && idx <= 43)) fingerBones.push({ bone: o, idx });
                }
              });

              const boneScale = 1.0 / (mScale * (hasArmatureCm ? 0.01 : 1.0));
              const isCustomBakedRig = Boolean(boneLeftArm || (preset.custom_rigs || []).some(r => assetUrl.includes(r)));
              if (isCustomBakedRig) {
                clone.updateMatrixWorld(true);
                const cloneWorldQuatInv = new THREE.Quaternion();
                clone.getWorldQuaternion(cloneWorldQuatInv).invert();
                const pose = preset.pose || { l_arm_pitch: -0.26, r_arm_pitch: -0.26, arm_adduct: 0.42, l_elbow: -0.54, r_elbow: -0.54, leg_adduct: 0.06 };
                const charRightAxis = new THREE.Vector3(1, 0, 0), bw = new THREE.Quaternion();
                const rotBone = (bone, rx, ry, rz, key) => {
                  if (!bone) return;
                  clone.updateMatrixWorld(true);
                  bone.getWorldQuaternion(bw);
                  const relW = cloneWorldQuatInv.clone().multiply(bw);
                  const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
                  bone.quaternion.multiply(relW.clone().invert().multiply(qDelta).multiply(relW));
                  if (key) {
                    clone.updateMatrixWorld(true);
                    bone.getWorldQuaternion(bw);
                    const relAfter = cloneWorldQuatInv.clone().multiply(bw);
                    bone.userData.baseQuat = bone.quaternion.clone();
                    bone.userData.pitchAxis = charRightAxis.clone().applyQuaternion(relAfter.clone().invert()).normalize();
                    if (key === 'chestBone') bone.userData.yawAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(relAfter.invert()).normalize();
                    grp.userData[key] = bone;
                  }
                };
                rotBone(boneLeftArm, pose.l_arm_pitch ?? -0.26, 0, -(pose.arm_adduct ?? 0.42), 'lArm');
                rotBone(boneLeftForeArm, pose.l_elbow ?? -0.54, -0.25, 0, 'lForeArm');
                rotBone(boneRightArm, pose.r_arm_pitch ?? -0.26, 0, pose.arm_adduct ?? 0.42, 'rArm');
                rotBone(boneRightForeArm, pose.r_elbow ?? -0.54, 0.25, 0, 'rForeArm');
                rotBone(boneLeftLeg, -0.06, 0, -(pose.leg_adduct ?? 0.06), 'lLeg');
                rotBone(boneLeftShin, 0.10, 0, 0, 'lShin');
                rotBone(boneRightLeg, -0.06, 0, pose.leg_adduct ?? 0.06, 'rLeg');
                rotBone(boneRightShin, 0.10, 0, 0, 'rShin');
                rotBone(boneChest, 0, 0, 0, 'chestBone');
              }

              if (isCustomBakedRig && fingerBones.length > 0) {
                const curlX = new THREE.Vector3(1, 0, 0);
                fingerBones.forEach(({ bone, idx }) => {
                  const isThumb = (idx >= 10 && idx <= 12) || (idx >= 29 && idx <= 31);
                  bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(curlX, isThumb ? 0.38 : 0.72));
                });
              }

              const cliCfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
              const hgParts = boneHead && (!(preset.headgear === 'hood' && isCustomBakedRig)) && (cliCfg.gltf_headgear_recipes || {})[preset.headgear];
              if (hgParts && typeof buildSkillPartMeshes === 'function') {
                buildSkillPartMeshes(boneHead, hgParts, { unitScale: boneScale, shadows: true, mats: { cowl: new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.78 }), gold: new THREE.MeshStandardMaterial({ color: 0xe6b235, metalness: 0.92, roughness: 0.20 }) } });
              }
              const embParts = boneChest && (cliCfg.emblem_recipes || {})[preset.emblem];
              if (embParts && typeof buildSkillPartMeshes === 'function') {
                buildSkillPartMeshes(boneChest, embParts, { unitScale: boneScale, shadows: true, mats: { trim: new THREE.MeshStandardMaterial({ color: preset.trim || 0x1f6feb, roughness: 0.55 }), gold: new THREE.MeshStandardMaterial({ color: 0xe6b235, metalness: 0.92, roughness: 0.20 }) } });
              }

              clone.updateMatrixWorld(true);
              const alignWeapon = (handBone, itemGrp, alignCfg) => {
                if (!alignCfg) { itemGrp.rotation.x = Math.PI / 2; return; }
                itemGrp.position.set(alignCfg.offset[0], alignCfg.offset[1], alignCfg.offset[2]);
                clone.updateMatrixWorld(true);
                const bwq = new THREE.Quaternion(), cwq = new THREE.Quaternion();
                handBone.getWorldQuaternion(bwq); clone.getWorldQuaternion(cwq);
                const boneRelQ = cwq.clone().invert().multiply(bwq);
                const yAx = new THREE.Vector3(...alignCfg.dir).normalize();
                const edV = new THREE.Vector3(...alignCfg.edge);
                const xAx = edV.clone().sub(yAx.clone().multiplyScalar(edV.dot(yAx))).normalize();
                const zAx = new THREE.Vector3().crossVectors(xAx, yAx).normalize();
                xAx.crossVectors(yAx, zAx).normalize();
                const desiredQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
                itemGrp.quaternion.copy(boneRelQ.invert().multiply(desiredQ));
              };
              grp.userData.weaponMount = null;
              if (boneRightHand) {
                const rightItemGrp = _buildSkillWeaponMesh(preset.right_hand, boneScale, preset);
                if (rightItemGrp) {
                  alignWeapon(boneRightHand, rightItemGrp, isCustomBakedRig ? preset.right_align : null);
                  boneRightHand.add(rightItemGrp);
                  grp.userData.weaponMount = rightItemGrp;
                }
              }
              if (boneLeftHand) {
                const leftItemGrp = _buildSkillWeaponMesh(preset.left_hand, boneScale, preset);
                if (leftItemGrp) {
                  if (preset.left_hand !== 'shield' && preset.left_hand !== 'bow') alignWeapon(boneLeftHand, leftItemGrp, isCustomBakedRig ? preset.left_align : null);
                  boneLeftHand.add(leftItemGrp);
                }
              }

              setupAnimationMixer(gltfData, clone);
              targetCharGrp.add(clone);
            };

            if (modelCache[assetUrl]) {
              instantiateGltf(modelCache[assetUrl]);
            } else {
              // Render instant procedural stand-in immediately so startup never blocks on multi-MB GLB downloads
              let placeholderGrp = null;
              if (!String(entityId || '').startsWith('__warm_')) {
                try {
                  placeholderGrp = new THREE.Group();
                  const _EPh = Object.assign(Object.create(_E), { charGrp: placeholderGrp });
                  if (isMonster && typeof addVolumetricEntity_monster === 'function') addVolumetricEntity_monster(_EPh);
                  else if (typeof addVolumetricEntity_humanoid === 'function') addVolumetricEntity_humanoid(_EPh);
                  if (placeholderGrp.children.length > 0) targetCharGrp.add(placeholderGrp);
                  else placeholderGrp = null;
                } catch (e) { placeholderGrp = null; }
              }
              const _swapIn = (gltf) => {
                if (placeholderGrp && placeholderGrp.parent === targetCharGrp) targetCharGrp.remove(placeholderGrp);
                placeholderGrp = null;
                modelCache[assetUrl] = gltf;
                instantiateGltf(gltf);
                if (typeof dirLight !== 'undefined' && dirLight && dirLight.shadow) dirLight.shadow.needsUpdate = true;
                if (typeof threeRenderer !== 'undefined' && threeRenderer && threeRenderer.shadowMap) threeRenderer.shadowMap.needsUpdate = true;
              };
              if (typeof window.__loadCachedGltf === 'function') window.__loadCachedGltf(assetUrl).then(g => { if (g) _swapIn(g); });
              else window.__DND_LOADERS__.gltf.load(assetUrl, _swapIn, undefined, () => {});
            }
          }
      }
    }

