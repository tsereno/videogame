    // =========================================================================
    // Procedural Immersive 3D Surrounding Background Environment
    // Generates distant mountains, infinite treelines, subterranean cave vaults,
    // stalactites, glowing mineral veins, and wooden roof rafters/arches.
    // =========================================================================
    function buildSurroundingEnvironment3D(tType, theme, W, H, isOutdoor, tw, roomId, targetParentGroup=null) {
      const parentGroup = targetParentGroup || threeRoomGroup;
      if (!parentGroup || !window.THREE) return;

      const rLow = (roomId || '').toLowerCase();
      const cliCfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const envRules = cliCfg.env_rules || {};
      const envStyles = cliCfg.env_styles || {};
      const envKind = (typeof classifyWithClientCCELM === 'function')
        ? classifyWithClientCCELM(`${rLow} ${tType}`, isOutdoor ? { mountain: envRules.mountain, wild: envRules.wild } : { cave: envRules.cave, indoor_roof: envRules.indoor_roof }, 0.45, isOutdoor ? 'wild' : 'indoor_roof')
        : (isOutdoor ? 'wild' : (tType === 'cave' ? 'cave' : 'indoor_roof'));
      const isCave = !isOutdoor && envKind === 'cave';
      const isIndoorRoof = !isOutdoor && !isCave;
      const isMountain = isOutdoor && envKind === 'mountain';
      const eSt = (isCave ? envStyles.cave : envStyles.indoor) || {};

      const envGrp = new THREE.Group();
      envGrp.userData.isScenery = true;
      envGrp.userData.isFloor = false;

      // Seedable deterministic pseudo-random helper
      function makeRng(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function() {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };
      }
      const rng = makeRng((roomId ? roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1337) : 42));

      // Shared Materials across all rooms with procedural grain & muted crevice reflections (Tier 3 #8)
      const _mat = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();
      const _geo = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
      const stoneNorm = (typeof createProceduralNormalTexture === 'function') ? createProceduralNormalTexture('stone') : null;
      const woodNorm = (typeof createProceduralNormalTexture === 'function') ? createProceduralNormalTexture('wood') : null;
      const stoneMap = (typeof createStoneTexture === 'function') ? createStoneTexture() : null;
      const woodMap = (typeof createWoodTexture === 'function') ? createWoodTexture() : null;
      const bevelGeo = (typeof createBeveledBoxGeo === 'function')
        ? _geo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05))
        : _geo('unit_box_fallback', () => new THREE.BoxGeometry(1, 1, 1));
      const flickerLights = [];
      const swayLanterns = [];
      envGrp.userData.flickerLights = flickerLights;
      envGrp.userData.swayLanterns = swayLanterns;

      const stoneMat = _mat(isCave ? 'env_stone_cave_v2' : (isMountain ? 'env_stone_mtn_v2' : 'env_stone_def_v2'), () => new THREE.MeshStandardMaterial({
        map: stoneMap, normalMap: stoneNorm, normalScale: new THREE.Vector2(0.7, 0.7),
        color: isMountain ? 0x586270 : (eSt.stone || 0x454d59),
        roughness: 0.90, metalness: 0.06, envMapIntensity: 0.35
      }));
      const darkRockMat = _mat(isCave ? 'env_darkrock_cave_v2' : 'env_darkrock_def_v2', () => new THREE.MeshStandardMaterial({
        map: stoneMap, normalMap: stoneNorm, normalScale: new THREE.Vector2(0.8, 0.8),
        color: eSt.dark || 0x2c3340,
        roughness: 0.94, metalness: 0.04, envMapIntensity: 0.20
      }));
      const woodBeamMat = _mat('env_woodbeam_v2', () => new THREE.MeshStandardMaterial({
        map: woodMap, normalMap: woodNorm, normalScale: new THREE.Vector2(0.55, 0.55),
        color: eSt.wood || 0x5e3d24,
        roughness: 0.82, envMapIntensity: 0.35
      }));

      // -----------------------------------------------------------------------
      // 1-2. OUTDOOR SURROUNDINGS & MOUNTAINS
      // Handled continuously by update3DScene_static_p1 (16000x16000 Skyrim heightmap,
      // roads, tiered pine forests, watchtowers, standing stones & snow peaks)
      // to avoid flat square planes or low-poly cones occluding the open world.
      // -----------------------------------------------------------------------

      // -----------------------------------------------------------------------
      // 3. SUBTERRANEAN CAVES: Natural Limestone Walls, Stalactites, Mineral Veins
      // -----------------------------------------------------------------------
      if (isCave) {
        const caveGrp = new THREE.Group();
        caveGrp.userData.isScenery = true;

        const wallR = Math.max(W, H) * 0.65;
        const numPerimeterRocks = 28;
        const perimRockGeo = _geo('env_perim_rock_v2', () => {
          const g = new THREE.DodecahedronGeometry(1.0, 2), pa = g.attributes.position;
          for (let v = 0; v < pa.count; v++) {
            const vx = pa.getX(v), vy = pa.getY(v), vz = pa.getZ(v);
            const d = 1.0 + Math.sin(vx * 3.1 + vy * 2.4) * 0.14 + Math.cos(vz * 3.8) * 0.09;
            pa.setXYZ(v, vx * d, vy * d, vz * d);
          }
          g.computeVertexNormals(); return g;
        });
        for (let i = 0; i < numPerimeterRocks; i++) {
          const theta = (i / numPerimeterRocks) * Math.PI * 2;
          const rad = wallR + 60 + rng() * 100;
          let rx = Math.cos(theta) * rad;
          let rz = Math.sin(theta) * rad;

          if (Math.abs(rx) < W / 2 + 40) rx = (rx >= 0 ? 1 : -1) * (W / 2 + 50 + rng() * 60);
          if (Math.abs(rz) < H / 2 + 40) rz = (rz >= 0 ? 1 : -1) * (H / 2 + 50 + rng() * 60);

          const rockH = 160 + rng() * 110;
          const rs = rockH * 0.45;
          const rockMesh = new THREE.Mesh(perimRockGeo, darkRockMat);
          rockMesh.scale.set((1.5 + rng() * 0.5) * rs, (2.2 + rng() * 0.8) * rs, (1.5 + rng() * 0.5) * rs);
          rockMesh.position.set(rx, rockH * 0.45, rz);
          rockMesh.rotation.y = rng() * Math.PI;
          caveGrp.add(rockMesh);
        }

        // Hanging Displaced Dripstone Stalactites & Cavern Light Shafts (Tier 2 #6)
        const caveCeilingGrp = new THREE.Group();
        caveCeilingGrp.userData.isRoof = true;
        const numStalactites = 22;
        const crystalEmissiveMat = _mat('env_crystal', () => new THREE.MeshStandardMaterial({
          color: eSt.crystal || 0x4ca2ff,
          emissive: eSt.crystal_em || 0x2674d6,
          emissiveIntensity: 1.05,
          roughness: 0.18
        }));
        const unitStalGeo = _geo('env_dripstone_v2', () => {
          const g = new THREE.CylinderGeometry(0.08, 1.0, 1.0, 9, 5), pa = g.attributes.position;
          for (let v = 0; v < pa.count; v++) {
            const vx = pa.getX(v), vy = pa.getY(v), vz = pa.getZ(v);
            const rMod = 1.0 + Math.sin(vy * 9.0 + Math.atan2(vz, vx) * 3.0) * 0.18;
            pa.setXYZ(v, vx * rMod, vy, vz * rMod);
          }
          g.computeVertexNormals(); return g;
        });
        const unitCryGeo = _geo('env_cry_cluster_v2', () => (window._sculptHelpers && window._sculptHelpers.crystal)
          ? window._sculptHelpers.crystal(22, 4.2, 5, 3) : new THREE.OctahedronGeometry(8, 0));
        let caveLights = 0;

        for (let s = 0; s < numStalactites; s++) {
          const sx = (rng() - 0.5) * (W * 1.15);
          const sz = (rng() - 0.5) * (H * 1.15);
          const sH = 75 + rng() * 70;
          const sR = 11 + rng() * 13;

          const stMesh = new THREE.Mesh(unitStalGeo, darkRockMat);
          stMesh.scale.set(sR, sH, sR);
          stMesh.rotation.x = Math.PI;
          stMesh.rotation.y = rng() * Math.PI;
          stMesh.position.set(sx, 230 - sH / 2, sz);
          caveCeilingGrp.add(stMesh);

          if (s % 5 === 0) {
            const cryMesh = new THREE.Mesh(unitCryGeo, crystalEmissiveMat);
            cryMesh.scale.set(0.85, 2.1, 0.85);
            cryMesh.position.set(sx, 230 - sH - 4, sz);
            caveCeilingGrp.add(cryMesh);

            if (caveLights < 2) {
              const cryLight = new THREE.PointLight(eSt.light || 0x58a6ff, 3.6, 460, 1.0);
              cryLight.position.set(sx, 230 - sH - 12, sz);
              caveCeilingGrp.add(cryLight);
              caveLights++;
            }
          }
        }
        caveGrp.add(caveCeilingGrp);

        // Damp cavern puddles (Truthful local cavern glow reflections)
        const puddleMat = _mat('env_cave_puddle', () => new THREE.MeshStandardMaterial({
          color: 0x162432, roughness: 0.08, metalness: 0.25, envMapIntensity: 1.4,
          transparent: true, opacity: 0.68, depthWrite: false
        }));
        const puddleGeo = _geo('env_puddle_disc', () => new THREE.CircleGeometry(1, 18));
        for (let p = 0; p < 5; p++) {
          const pm = new THREE.Mesh(puddleGeo, puddleMat);
          pm.rotation.x = -Math.PI / 2;
          const px = (rng() - 0.5) * (W * 0.7), pz = (rng() - 0.5) * (H * 0.7);
          const pr = 24 + rng() * 26;
          pm.scale.set(pr, pr * (0.65 + rng() * 0.45), 1);
          pm.position.set(px, 0.25, pz);
          caveGrp.add(pm);
        }

        // Subtle atmospheric fissure light shafts
        const shaftMat = _mat('env_cave_shaft', () => new THREE.MeshBasicMaterial({
          color: eSt.light || 0x7cb6ff, transparent: true, opacity: 0.055,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        }));
        const shaftGeo = _geo('env_shaft_cone', () => new THREE.ConeGeometry(42, 220, 14, 1, true));
        for (let k = 0; k < 2; k++) {
          const sf = new THREE.Mesh(shaftGeo, shaftMat);
          sf.position.set((k === 0 ? -0.22 : 0.24) * W, 110, (k === 0 ? -0.15 : 0.18) * H);
          sf.rotation.z = 0.24;
          caveGrp.add(sf);
        }

        // Perimeter Stalagmites rising from ground outside room paths
        for (let g = 0; g < 18; g++) {
          const theta = rng() * Math.PI * 2;
          const dist = Math.max(W, H) * 0.52 + rng() * 140;
          const gx = Math.cos(theta) * dist;
          const gz = Math.sin(theta) * dist;
          const gH = 45 + rng() * 55;
          const gR = 10 + rng() * 12;

          const smMesh = new THREE.Mesh(unitStalGeo, darkRockMat);
          smMesh.scale.set(gR, gH, gR);
          smMesh.rotation.y = rng() * Math.PI;
          smMesh.position.set(gx, gH / 2, gz);
          caveGrp.add(smMesh);
        }

        envGrp.add(caveGrp);
      }

      // -----------------------------------------------------------------------
      // 4. INDOOR DUNGEONS / MANORS / TAVERNS: Beveled Masonry, Plinths, Lanterns & Beams
      // -----------------------------------------------------------------------
      if (isIndoorRoof) {
        const dungeonGrp = new THREE.Group();
        dungeonGrp.userData.isScenery = true;

        const wallThickness = 45, wallHeight = 195;
        const wallMatDungeon = _mat('env_wall_dungeon_v3', () => new THREE.MeshStandardMaterial({
          map: stoneMap, normalMap: stoneNorm, normalScale: new THREE.Vector2(0.75, 0.75),
          color: eSt.wall || 0x5d6675, roughness: 0.84, envMapIntensity: 0.42
        }));
        const trimStoneMat = _mat('env_plinth_dungeon_v2', () => new THREE.MeshStandardMaterial({
          map: stoneMap, normalMap: stoneNorm, color: 0x3b424e, roughness: 0.88, envMapIntensity: 0.34
        }));
        [[W + wallThickness * 2, wallThickness, 0, -H / 2 - wallThickness / 2],
         [W + wallThickness * 2, wallThickness, 0, H / 2 + wallThickness / 2],
         [wallThickness, H, -W / 2 - wallThickness / 2, 0],
         [wallThickness, H, W / 2 + wallThickness / 2, 0]].forEach(([bw, bd, bx, bz]) => {
          const wm = new THREE.Mesh(bevelGeo, wallMatDungeon);
          wm.scale.set(bw, wallHeight, bd);
          wm.position.set(bx, wallHeight / 2, bz); dungeonGrp.add(wm);
          const pl = new THREE.Mesh(bevelGeo, trimStoneMat);
          pl.scale.set(bw + 6, 14, bd + 6);
          pl.position.set(bx, 7, bz); dungeonGrp.add(pl);
        });

        // Transverse Overhead Timber Roof Rafters, Swaying Lanterns & Window Gobo Light Pools
        const roofRaftersGrp = new THREE.Group();
        roofRaftersGrp.userData.isRoof = true;
        const numBeams = 7;
        const beamStep = (H - 80) / (numBeams - 1);
        const chainGeo = _geo('env_chain_38', () => new THREE.CylinderGeometry(0.8, 0.8, 38, 6));
        const chainMat = _mat('env_chain', () => new THREE.MeshStandardMaterial({ color: eSt.chain || 0x1c1e22, metalness: 0.8 }));
        const lanternGeo = _geo('env_lantern_cage_v2', () => {
          const mergeFn = window._sculptHelpers && window._sculptHelpers.merge;
          const cap = new THREE.ConeGeometry(7.2, 5.5, 6); cap.translate(0, 6.2, 0);
          const cage = new THREE.CylinderGeometry(5.6, 4.4, 9.5, 6); cage.translate(0, -1.0, 0);
          const bot = new THREE.ConeGeometry(4.4, 3.5, 6); bot.rotateX(Math.PI); bot.translate(0, -7.2, 0);
          return mergeFn ? mergeFn([cap, cage, bot]) : new THREE.BoxGeometry(10, 12, 10);
        });
        const lanternMat = _mat('env_lantern', () => new THREE.MeshStandardMaterial({
          color: eSt.lantern || 0x222222,
          metalness: 0.7,
          emissive: eSt.lantern_em || 0xff9a3c,
          emissiveIntensity: 0.85
        }));
        const grateTex = (typeof createGoboTexture === 'function') ? createGoboTexture('grate') : null;
        const grateMat = grateTex ? _mat('env_gobo_grate', () => new THREE.MeshBasicMaterial({
          map: grateTex, transparent: true, opacity: 0.34, depthWrite: false
        })) : null;
        const shaftMat = _mat('env_indoor_shaft', () => new THREE.MeshBasicMaterial({
          color: eSt.light || 0xffcc88, transparent: true, opacity: 0.048,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        }));
        const shaftGeo = _geo('env_shaft_cone', () => new THREE.ConeGeometry(42, 220, 14, 1, true));
        let rafterLights = 0;
        for (let b = 0; b < numBeams; b++) {
          const bZ = -H / 2 + 40 + b * beamStep;

          const beamMesh = new THREE.Mesh(bevelGeo, woodBeamMat);
          beamMesh.scale.set(W + 20, 10, 14);
          beamMesh.position.set(0, 185, bZ);
          roofRaftersGrp.add(beamMesh);

          [-1, 1].forEach(side => {
            const strut = new THREE.Mesh(bevelGeo, woodBeamMat);
            strut.scale.set(65, 8, 8);
            strut.position.set(side * (W / 2 - 25), 172, bZ);
            strut.rotation.z = side * 0.65;
            roofRaftersGrp.add(strut);
          });

          if (b % 2 === 1) {
            const swingGrp = new THREE.Group();
            swingGrp.position.set(0, 185, bZ);
            const chain = new THREE.Mesh(chainGeo, chainMat);
            chain.position.set(0, -19, 0);
            swingGrp.add(chain);

            const lantern = new THREE.Mesh(lanternGeo, lanternMat);
            lantern.position.set(0, -43, 0);
            swingGrp.add(lantern);

            if (rafterLights < 2) {
              const lanternLight = new THREE.PointLight(eSt.light || 0xffad60, 4.8, 560, 1.0);
              lanternLight.position.set(0, -45, 0);
              lanternLight.userData.baseIntensity = 4.8;
              lanternLight.userData.phase = b * 1.7;
              swingGrp.add(lanternLight);
              flickerLights.push(lanternLight);

              if (grateMat) {
                const gm = new THREE.Mesh(_geo('unit_plane_1x1', () => new THREE.PlaneGeometry(1, 1)), grateMat);
                gm.rotation.x = -Math.PI / 2;
                gm.scale.set(170, 170, 1);
                gm.position.set(0, 0.3, bZ);
                dungeonGrp.add(gm);
              }
              const sf = new THREE.Mesh(shaftGeo, shaftMat);
              sf.position.set(sideShift(b), 100, bZ);
              sf.rotation.z = 0.22;
              dungeonGrp.add(sf);
              rafterLights++;
            }
            roofRaftersGrp.add(swingGrp);
            swayLanterns.push(swingGrp);
          }
        }
        function sideShift(idx) { return (idx % 4 === 1 ? -1 : 1) * Math.min(180, W * 0.18); }

        const ridgeBeam = new THREE.Mesh(bevelGeo, woodBeamMat);
        ridgeBeam.scale.set(12, 12, H + 40);
        ridgeBeam.position.set(0, 192, 0);
        roofRaftersGrp.add(ridgeBeam);

        dungeonGrp.add(roofRaftersGrp);
        envGrp.add(dungeonGrp);
      }

      parentGroup.add(envGrp);
    }

    // =========================================================================
    // Drifting Dust, Fire Embers, Spores & Subtle Air Motion (Tier 2 #7)
    // =========================================================================
    window.__tickRealismEnvironment = function tickRealismEnvironment(dtSec, timeNow) {
      if (typeof threeScene === 'undefined' || !threeScene || typeof threeCamera === 'undefined' || !threeCamera) return;
      if (window.realismFXEnabled === false) {
        if (window.__realismMotePoints) window.__realismMotePoints.visible = false;
        return;
      }

      // Sync active indoor flicker/sway lists lazily from threeRoomGroup
      const _rmRef = (typeof lastBuilt3DRoomId !== 'undefined' && lastBuilt3DRoomId) ? lastBuilt3DRoomId : threeRoomGroup.children.length;
      if (typeof threeRoomGroup !== 'undefined' && threeRoomGroup && window.__flickerRoomRef !== _rmRef) {
        window.__flickerRoomRef = _rmRef;
        const fl = [], sl = [];
        threeRoomGroup.traverse(o => {
          if (o.userData && Array.isArray(o.userData.flickerLights)) fl.push(...o.userData.flickerLights);
          if (o.userData && Array.isArray(o.userData.swayLanterns)) sl.push(...o.userData.swayLanterns);
        });
        window.__activeFlickerLights = fl;
        window.__activeSwayLanterns = sl;
      }
      const flList = window.__activeFlickerLights || [];
      for (let i = 0; i < flList.length; i++) {
        const lt = flList[i], bi = (lt.userData && lt.userData.baseIntensity) || 1.5, ph = (lt.userData && lt.userData.phase) || 0;
        lt.intensity = bi * (0.91 + Math.sin(timeNow * 0.007 + ph) * 0.06 + Math.sin(timeNow * 0.019 + ph * 2.1) * 0.03);
      }
      const slList = window.__activeSwayLanterns || [];
      for (let i = 0; i < slList.length; i++) {
        slList[i].rotation.z = Math.sin(timeNow * 0.0014 + i * 1.9) * 0.035;
      }

      // Create/update pooled atmospheric mote Points system centered around player/camera focus
      let pts = window.__realismMotePoints;
      if (!pts) {
        const N = 180;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(N * 3);
        const vel = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 420;
          pos[i * 3 + 1] = Math.random() * 140 + 6;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 420;
          vel[i * 3] = (Math.random() - 0.5) * 8;
          vel[i * 3 + 1] = 3 + Math.random() * 6;
          vel[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const moteTex = (typeof createSoftMoteTexture === 'function') ? createSoftMoteTexture() : null;
        const mat = new THREE.PointsMaterial({
          map: moteTex, color: 0xffe8c2, size: 5.5,
          transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending,
          depthWrite: false, sizeAttenuation: true
        });
        pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        pts.userData = { vel, N, count: N };
        threeScene.add(pts);
        window.__realismMotePoints = pts;
      }
      pts.visible = (cameraMode !== '2d');
      if (!pts.visible) return;

      const indK = window.__curIndoorKind || 'outdoor';
      const isSnow = (window.__curThemeType === 'glacier' || window.__curWeather === 'snow');
      const mCol = (indK === 'tavern' || indK === 'forge') ? 0xffae5c
        : (indK === 'cave' ? 0x6cb8ff : (isSnow ? 0xe6f2ff : 0xfff0cc));
      if (pts.material.color.getHex() !== mCol) pts.material.color.setHex(mCol);
      pts.material.opacity = (indK === 'outdoor') ? (isSnow ? 0.52 : 0.28) : 0.46;

      const lp = window.__localPlayerWorldPos;
      const fx = lp ? lp.x : threeCamera.position.x;
      const fz = lp ? lp.z : threeCamera.position.z;
      const fy = (typeof window.getOpenWorldTerrainHeight === 'function') ? window.getOpenWorldTerrainHeight(fx, fz) : 0;
      const pa = pts.geometry.attributes.position.array;
      const vel = pts.userData.vel;
      const N = pts.userData.N;
      const riseDir = isSnow ? -2.8 : ((indK === 'tavern' || indK === 'forge') ? 1.8 : 0.45);
      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        pa[i3] += (vel[i3] + Math.sin(timeNow * 0.001 + i) * 3.5) * dtSec;
        pa[i3 + 1] += vel[i3 + 1] * riseDir * dtSec;
        pa[i3 + 2] += (vel[i3 + 2] + Math.cos(timeNow * 0.0009 + i) * 3.5) * dtSec;

        const dx = pa[i3] - fx, dy = pa[i3 + 1] - fy, dz = pa[i3 + 2] - fz;
        if (dx > 220) pa[i3] -= 440; else if (dx < -220) pa[i3] += 440;
        if (dz > 220) pa[i3 + 2] -= 440; else if (dz < -220) pa[i3 + 2] += 440;
        if (dy > 165) pa[i3 + 1] = fy + 4; else if (dy < 2) pa[i3 + 1] = fy + 160;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    };

    // =========================================================================
    // Interactive Split-Pane Resizer for 3D Scene View & DM Text Console
    // =========================================================================
    function initPanelResizer() {
      const resizer = document.getElementById('panelResizer');
      const threedPane = document.getElementById('threedPane');
      const terminalPane = document.getElementById('terminalPane');
      const container = document.querySelector('.container');
      if (!resizer || !threedPane || !terminalPane || !container) return;

      const savedRatio = localStorage.getItem('dnd_panel_split_ratio');
      if (savedRatio) {
        const ratio = parseFloat(savedRatio);
        if (!isNaN(ratio) && ratio >= 0.2 && ratio <= 0.85) {
          threedPane.style.flex = `${ratio * 2.85}`;
          terminalPane.style.flex = `${(1 - ratio) * 2.85}`;
        }
      }

      let isDragging = false;
      let startX = 0;
      let startThreedWidth = 0;
      let containerWidth = 0;

      resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startThreedWidth = threedPane.getBoundingClientRect().width;
        containerWidth = container.getBoundingClientRect().width;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const newThreedWidth = startThreedWidth + deltaX;
        const minThreed = 240;
        const minTerminal = 280;
        const maxThreed = containerWidth - minTerminal - 7;

        const clampedWidth = Math.max(minThreed, Math.min(maxThreed, newThreedWidth));
        const clampedTerminalWidth = containerWidth - clampedWidth - 7;

        const ratio = clampedWidth / (containerWidth - 7);
        threedPane.style.flex = `${ratio * 2.85}`;
        terminalPane.style.flex = `${(1 - ratio) * 2.85}`;

        // Notify Three.js renderer and camera of canvas viewport dimensions change
        const canvasContainer = document.getElementById('threeCanvasContainer');
        if (canvasContainer) {
          syncCameraViewport(canvasContainer.clientWidth, canvasContainer.clientHeight);
        }
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save panel split preference
        const curW = threedPane.getBoundingClientRect().width;
        const totalW = container.getBoundingClientRect().width - 7;
        if (totalW > 0) {
          const ratio = Math.max(0.2, Math.min(0.85, curW / totalW));
          localStorage.setItem('dnd_panel_split_ratio', ratio.toFixed(4));
        }

        // Final resize sync
        const canvasContainer = document.getElementById('threeCanvasContainer');
        if (canvasContainer) {
          syncCameraViewport(canvasContainer.clientWidth, canvasContainer.clientHeight);
        }
      });

      // Double-click resizer to restore default 65% / 35% layout
      resizer.addEventListener('dblclick', () => {
        threedPane.style.flex = '1.85';
        terminalPane.style.flex = '1.0';
        localStorage.removeItem('dnd_panel_split_ratio');
        setTimeout(() => {
          const canvasContainer = document.getElementById('threeCanvasContainer');
          if (canvasContainer) {
            syncCameraViewport(canvasContainer.clientWidth, canvasContainer.clientHeight);
          }
        }, 50);
      });
    }

    // Initialize 3D Engine once DOM is ready and window.THREE is available
    function startEngineWhenReady() {
      initPanelResizer();
      if (window.THREE) {
        init3DWorld();
      } else {
        window.addEventListener('threejs-loaded', () => init3DWorld(), { once: true });
        setTimeout(() => { if (!threeRenderer && window.THREE) init3DWorld(); }, 400);
      }
    }

    // Explicitly expose all DOM inline event handlers onto window object
    Object.assign(window, {
      set3DCameraMode,
      toggleGrid,
      toggleAudioMute,
      openCharacterModal,
      closeCharacterModal,
      openSaveModal,
      closeSaveModal,
      quickSaveGame,
      createSaveFromModal,
      closeVictoryModal,
      respawnHero,
      sendCommand,
      moveDir,
      promptTake,
      switchStatsTab,
      openWorldMapModal,
      closeWorldMapModal,
      executeFastTravel
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startEngineWhenReady);
    } else {
      startEngineWhenReady();
    }

