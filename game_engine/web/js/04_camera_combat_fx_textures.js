    // Helper to keep horizontal field of view / visible world width constant across panel resizing
    function syncCameraViewport(w, h) {
      if (!threeCamera || !threeRenderer) return;

      let renderW = w;
      let renderH = h;
      const isFixedRes = selected3DResolution && selected3DResolution !== 'auto' && selected3DResolution.includes('x');
      if (isFixedRes) {
        const parts = selected3DResolution.split('x').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
          renderW = parts[0];
          renderH = parts[1];
        }
      }

      const aspect = renderW / (renderH || 1);
      threeCamera.aspect = aspect;

      // In Perspective cameras, three.js fov is vertical in degrees.
      // If the viewport width changes, keeping vertical fov constant makes narrow aspect views
      // crop horizontally and appear heavily "zoomed in".
      // To maintain a constant visible scene scale without zooming:
      const targetBaseFov = (cameraMode === 'fp') ? fpFov : baseDefaultFov;
      if (aspect < baseCameraRefAspect) {
        // Viewport is narrower: expand vertical fov to preserve horizontal scene framing
        const hFovRad = 2 * Math.atan(Math.tan((targetBaseFov * Math.PI / 180) / 2) * baseCameraRefAspect);
        const adjustedVertFov = (2 * Math.atan(Math.tan(hFovRad / 2) / aspect)) * (180 / Math.PI);
        threeCamera.fov = Math.max(25, Math.min(85, adjustedVertFov));
      } else {
        threeCamera.fov = targetBaseFov;
      }
      threeCamera.updateProjectionMatrix();

      // Lock pixel ratio to 1.0 for stable fast performance (no dynamic resolution resizing or hitching)
      threeRenderer.setPixelRatio(1.0);
      // updateStyle: false when fixed resolution so CSS keeps canvas scaled to fill the container
      threeRenderer.setSize(renderW, renderH, !isFixedRes);
      if (isFixedRes && threeRenderer.domElement) {
        threeRenderer.domElement.style.width = '100%';
        threeRenderer.domElement.style.height = '100%';
        threeRenderer.domElement.style.objectFit = 'contain';
        // Bilinear canvas downscale filter for crisp display on lower-density viewports
        threeRenderer.domElement.style.imageRendering = 'auto';
      }
      if (typeof window.__syncRealismPipelineSize === 'function') window.__syncRealismPipelineSize();
    }

    // Active Combat Visual FX: Flying Arrows and Weapon Swings
    const activeArrows = [];
    const activeSwings = [];
    const arrowPool = [];
    let arrowSharedGeosMats = null;

    function getArrowSharedResources() {
      if (!arrowSharedGeosMats) {
        const shaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 14, 8);
        shaftGeo.rotateX(Math.PI / 2);
        const headGeo = new THREE.ConeGeometry(0.9, 3.2, 5);
        headGeo.rotateX(-Math.PI / 2);
        const fletchGeo = new THREE.BoxGeometry(0.15, 2.2, 3.6);
        const trailGeo = new THREE.CylinderGeometry(0.12, 0.65, 10, 6);
        trailGeo.rotateX(Math.PI / 2);

        arrowSharedGeosMats = {
          shaftGeo: shaftGeo,
          headGeo: headGeo,
          fletchGeo: fletchGeo,
          trailGeo: trailGeo,
          shaftMat: new THREE.MeshStandardMaterial({ color: 0xc89d66, roughness: 0.7 }),
          headMat: new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.9, roughness: 0.2 }),
          fletchMat: new THREE.MeshStandardMaterial({ color: 0x24292f, roughness: 0.85 }),
          trailMat: new THREE.MeshBasicMaterial({ color: 0xf0f6fc, transparent: true, opacity: 0.55 })
        };
      }
      return arrowSharedGeosMats;
    }

    function acquireArrowMesh() {
      if (arrowPool.length > 0) {
        const pooled = arrowPool.pop();
        pooled.visible = true;
        return pooled;
      }
      const res = getArrowSharedResources();
      const arrowGrp = new THREE.Group();

      const shaftMesh = new THREE.Mesh(res.shaftGeo, res.shaftMat);
      arrowGrp.add(shaftMesh);

      const headMesh = new THREE.Mesh(res.headGeo, res.headMat);
      headMesh.position.set(0, 0, 7.8);
      arrowGrp.add(headMesh);

      const fletchMesh1 = new THREE.Mesh(res.fletchGeo, res.fletchMat);
      fletchMesh1.position.set(0, 0, -5.5);
      arrowGrp.add(fletchMesh1);

      const fletchMesh2 = new THREE.Mesh(res.fletchGeo, res.fletchMat);
      fletchMesh2.position.set(0, 0, -5.5);
      fletchMesh2.rotation.z = Math.PI / 2;
      arrowGrp.add(fletchMesh2);

      const trailMesh = new THREE.Mesh(res.trailGeo, res.trailMat);
      trailMesh.position.set(0, 0, -11.0);
      arrowGrp.add(trailMesh);

      arrowGrp.matrixAutoUpdate = true;
      if (threeProjectilesGroup) threeProjectilesGroup.add(arrowGrp);
      return arrowGrp;
    }

    function releaseArrowMesh(arrowGrp) {
      if (!arrowGrp) return;
      arrowGrp.visible = false;
      if (arrowPool.length < 24) {
        arrowPool.push(arrowGrp);
      }
    }

    const _sharedGpuGeos = new Map();
    const _sharedGpuMats = new Map();
    const threeEntityById = new Map();
    const threeEntityByNumId = new Map();
    let threeLocalPlayerGrp = null;

    function getSharedGeo(key, factory) {
      let g = _sharedGpuGeos.get(key);
      if (!g) { g = factory(); _sharedGpuGeos.set(key, g); }
      return g;
    }

    function getSharedMat(key, factory) {
      let m = _sharedGpuMats.get(key);
      if (!m) { m = factory(); _sharedGpuMats.set(key, m); }
      return m;
    }

    function registerDynamicEntity(grp) {
      if (!grp || !grp.userData) return;
      if (grp.userData.entityId) threeEntityById.set(grp.userData.entityId, grp);
      if (grp.userData.numericId !== undefined) threeEntityByNumId.set(grp.userData.numericId, grp);
      if (grp.userData.isLocalPlayer) threeLocalPlayerGrp = grp;
      if (typeof threeDynamicEntities !== 'undefined' && Array.isArray(threeDynamicEntities) && !threeDynamicEntities.includes(grp)) {
        threeDynamicEntities.push(grp);
      }
    }

    function unregisterDynamicEntity(grp) {
      if (!grp || !grp.userData) return;
      if (grp.userData.entityId && threeEntityById.get(grp.userData.entityId) === grp) {
        threeEntityById.delete(grp.userData.entityId);
      }
      if (grp.userData.numericId !== undefined && threeEntityByNumId.get(grp.userData.numericId) === grp) {
        threeEntityByNumId.delete(grp.userData.numericId);
      }
      if (threeLocalPlayerGrp === grp) threeLocalPlayerGrp = null;
      if (typeof threeDynamicEntities !== 'undefined' && Array.isArray(threeDynamicEntities)) {
        const di = threeDynamicEntities.indexOf(grp);
        if (di !== -1) threeDynamicEntities.splice(di, 1);
      }
    }

    function findEntity3DGroup(entityId) {
      if (!threeRoomGroup || !entityId) return null;
      const direct = threeEntityById.get(entityId);
      if (direct && direct.parent === threeRoomGroup) return direct;
      if (entityId === myPlayerId && threeLocalPlayerGrp && threeLocalPlayerGrp.parent === threeRoomGroup) {
        return threeLocalPlayerGrp;
      }
      const list = (threeDynamicEntities && threeDynamicEntities.length > 0) ? threeDynamicEntities : threeRoomGroup.children;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c && c.userData && (c.userData.entityId === entityId || (entityId === myPlayerId && c.userData.isLocalPlayer))) {
          threeEntityById.set(entityId, c);
          return c;
        }
      }
      return null;
    }

    const activeInteractions = [];
    let _swingXAxis = null;
    let _swingQ = null;
    function _applySwingAngle(limb, pitchRad, extraYaw = 0, extraRoll = 0) {
      if (!limb) return;
      if (!_swingXAxis) _swingXAxis = new THREE.Vector3(1, 0, 0);
      if (!_swingQ) _swingQ = new THREE.Quaternion();
      const u = limb.userData;
      if (u && u.baseQuat) {
        const ax = u.pitchAxis || _swingXAxis;
        _swingQ.setFromAxisAngle(ax, pitchRad);
        limb.quaternion.copy(u.baseQuat).multiply(_swingQ);
        if (extraYaw && u.yawAxis) {
          _swingQ.setFromAxisAngle(u.yawAxis, extraYaw);
          limb.quaternion.multiply(_swingQ);
        }
      } else {
        limb.rotation.x = pitchRad;
        if (extraYaw) limb.rotation.y = extraYaw;
        if (extraRoll) limb.rotation.z = extraRoll;
      }
    }

    function triggerWeaponSwing(entityId, isRanged=false, customDuration=280) {
      const grp = findEntity3DGroup(entityId);
      if (!grp || !grp.userData) return;
      const ud = grp.userData;
      if (!ud.weaponMount && !ud.rArm) return;
      ud.isSwinging = true;
      const wm = ud.weaponMount || ud.rArm;
      const existing = activeSwings.find(s => s.entityId === entityId);
      if (existing) {
        existing.startTime = performance.now();
        existing.duration = customDuration;
        existing.isRanged = isRanged;
      } else {
        activeSwings.push({
          grp,
          entityId,
          weaponMount: wm,
          rArm: ud.rArm, rForeArm: ud.rForeArm,
          lArm: ud.lArm, lForeArm: ud.lForeArm,
          chestBone: ud.chestBone,
          leftHandKind: ud.leftHandKind,
          initialRotX: wm.rotation.x,
          initialRotY: wm.rotation.y,
          initialRotZ: wm.rotation.z,
          isRanged,
          startTime: performance.now(),
          duration: customDuration
        });
      }
    }

    window.triggerHandInteraction = function triggerHandInteraction(entityId, kind = 'use', durationMs = 540) {
      const grp = findEntity3DGroup(entityId);
      if (!grp || !grp.userData || !grp.userData.rArm) return;
      grp.userData.isInteracting = true;
      const existing = activeInteractions.find(a => a.entityId === entityId);
      if (existing) {
        existing.kind = kind;
        existing.startTime = performance.now();
        existing.duration = durationMs;
      } else {
        activeInteractions.push({
          grp, entityId, kind,
          rArm: grp.userData.rArm, rForeArm: grp.userData.rForeArm,
          lArm: grp.userData.lArm, lForeArm: grp.userData.lForeArm,
          startTime: performance.now(), duration: durationMs
        });
      }
    };

    function spawnFlyingArrow(fromX, fromY, toX, toY, speed=1350) {
      if (!threeProjectilesGroup) return;
      const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
      const H = (current3DData && current3DData.height) ? current3DData.height : 768;

      const startX = fromX - W / 2;
      const startZ = fromY - H / 2;
      const targetX = toX - W / 2;
      const targetZ = toY - H / 2;

      const dx = targetX - startX;
      const dz = targetZ - startZ;
      const totalDist = Math.hypot(dx, dz) || 1.0;
      const durationMs = Math.max(160, (totalDist / speed) * 1000);

      // Reusable pooled arrow mesh to prevent GPU geometry churn and GC pauses
      const arrowGrp = acquireArrowMesh();
      arrowGrp.position.set(startX, 18.0, startZ);
      arrowGrp.lookAt(targetX, 18.0, targetZ);

      sfx.playBowShot();

      activeArrows.push({
        mesh: arrowGrp,
        startX: startX,
        startZ: startZ,
        targetX: targetX,
        targetZ: targetZ,
        startTime: performance.now(),
        duration: durationMs,
        apexY: Math.min(38, 18 + totalDist * 0.08)
      });
    }

    function update3DCombatAnimations(nowTs) {
      if (window.__lwHitStopUntil && nowTs < window.__lwHitStopUntil) return;
      // 1. Update Weapon Swings
      for (let i = activeSwings.length - 1; i >= 0; i--) {
        const sw = activeSwings[i];
        const elapsed = nowTs - sw.startTime;
        const p = Math.min(1.0, elapsed / sw.duration);
        const defHands = (sw.grp && sw.grp.userData && sw.grp.userData.defaultHandPoses) || {};

        if (sw.rArm) {
          if (sw.isRanged && sw.leftHandKind === 'bow') {
            const draw = Math.sin(p * Math.PI);
            _applySwingAngle(sw.lArm, -0.45 * draw);
            _applySwingAngle(sw.lForeArm, 0.15 * draw);
            _applySwingAngle(sw.rArm, -0.35 * draw);
            _applySwingAngle(sw.rForeArm, p < 0.65 ? -0.62 * draw : 0.25 * (1 - p));
            if (typeof window.poseCharacterHands === 'function') {
              window.poseCharacterHands(sw.grp, defHands.left || 'bow', p > 0.65 ? 'open' : (defHands.right || 'draw'));
            }
          } else if (sw.isRanged) {
            const castArc = Math.sin(p * Math.PI);
            _applySwingAngle(sw.rArm, -0.95 * castArc);
            _applySwingAngle(sw.rForeArm, 0.22 * castArc);
            _applySwingAngle(sw.lArm, -0.25 * castArc);
            if (typeof window.poseCharacterHands === 'function') {
              window.poseCharacterHands(sw.grp, (p > 0.25 && p < 0.85) ? 'open' : (defHands.left || 'none'), defHands.right || 'staff');
            }
          } else {
            // 3-phase melee: windup (+0.45 back) -> fast cleave (-1.55 forward) -> settle
            const pitch = (p < 0.28)
              ? 0.45 * Math.sin((p / 0.28) * Math.PI * 0.5)
              : (p < 0.72)
                ? 0.45 - 2.00 * Math.sin(((p - 0.28) / 0.44) * Math.PI * 0.5)
                : -1.55 * (1.0 - (p - 0.72) / 0.28);
            const elbow = (p < 0.28) ? -0.42 * (p / 0.28) : Math.sin(Math.min(1, (p - 0.28) / 0.52) * Math.PI) * 0.36;
            _applySwingAngle(sw.rArm, pitch);
            _applySwingAngle(sw.rForeArm, elbow);
            _applySwingAngle(sw.lArm, -pitch * 0.18);
            if (sw.chestBone) _applySwingAngle(sw.chestBone, -pitch * 0.08, -pitch * 0.14);
          }
        } else if (sw.weaponMount) {
          if (sw.isRanged) {
            const snap = Math.sin(p * Math.PI);
            sw.weaponMount.rotation.x = sw.initialRotX - snap * 0.45;
          } else {
            const swingArc = Math.sin(p * Math.PI);
            sw.weaponMount.rotation.x = sw.initialRotX - swingArc * 1.65;
            sw.weaponMount.rotation.y = sw.initialRotY + swingArc * 0.85;
            sw.weaponMount.rotation.z = sw.initialRotZ + swingArc * 0.35;
          }
        }

        if (p >= 1.0) {
          if (sw.rArm) {
            _applySwingAngle(sw.rArm, 0); _applySwingAngle(sw.rForeArm, 0);
            _applySwingAngle(sw.lArm, 0); _applySwingAngle(sw.lForeArm, 0);
            if (sw.chestBone) _applySwingAngle(sw.chestBone, 0, 0);
            if (typeof window.poseCharacterHands === 'function') window.poseCharacterHands(sw.grp, defHands.left || 'none', defHands.right || 'none');
          } else if (sw.weaponMount) {
            sw.weaponMount.rotation.x = sw.initialRotX;
            sw.weaponMount.rotation.y = sw.initialRotY;
            sw.weaponMount.rotation.z = sw.initialRotZ;
          }
          if (sw.grp && sw.grp.userData) sw.grp.userData.isSwinging = false;
          activeSwings.splice(i, 1);
        }
      }

      // 1b. Transient Object Manipulation / Interaction Hand Gestures
      for (let i = activeInteractions.length - 1; i >= 0; i--) {
        const ia = activeInteractions[i];
        const p = Math.min(1.0, (nowTs - ia.startTime) / ia.duration);
        const s = Math.sin(p * Math.PI);
        const ud = ia.grp && ia.grp.userData;
        const defHands = (ud && ud.defaultHandPoses) || {};
        if (ud && !ud.isSwinging) {
          const twoHand = (ia.kind === 'craft' || ia.kind === 'build' || ia.kind === 'warm');
          _applySwingAngle(ia.rArm, -0.78 * s);
          _applySwingAngle(ia.rForeArm, 0.24 * s);
          if (twoHand) {
            _applySwingAngle(ia.lArm, -0.72 * s);
            _applySwingAngle(ia.lForeArm, 0.20 * s);
          }
          if (typeof window.poseCharacterHands === 'function') {
            const rHandPose = (ia.kind === 'take' || ia.kind === 'open')
              ? (p < 0.48 ? 'open' : 'sword')
              : 'open';
            window.poseCharacterHands(ia.grp, twoHand ? 'open' : defHands.left, rHandPose);
          }
        }
        if (p >= 1.0) {
          if (ud && !ud.isSwinging) {
            _applySwingAngle(ia.rArm, 0); _applySwingAngle(ia.rForeArm, 0);
            _applySwingAngle(ia.lArm, 0); _applySwingAngle(ia.lForeArm, 0);
            if (typeof window.poseCharacterHands === 'function') window.poseCharacterHands(ia.grp, defHands.left || 'none', defHands.right || 'none');
          }
          if (ud) ud.isInteracting = false;
          activeInteractions.splice(i, 1);
        }
      }

      // 2. Update Flying Arrows with Balistic Parabolic Trajectory
      for (let i = activeArrows.length - 1; i >= 0; i--) {
        const arr = activeArrows[i];
        const elapsed = nowTs - arr.startTime;
        const progress = Math.min(1.0, elapsed / arr.duration);

        // Linear ground interpolation
        const curX = arr.startX + (arr.targetX - arr.startX) * progress;
        const curZ = arr.startZ + (arr.targetZ - arr.startZ) * progress;

        // Parabolic vertical arc: 4 * h * p * (1 - p)
        const arcY = 18.0 + 4 * (arr.apexY - 18.0) * progress * (1.0 - progress);

        // Previous position for tangent heading vector
        const prevProg = Math.max(0, progress - 0.04);
        const prevX = arr.startX + (arr.targetX - arr.startX) * prevProg;
        const prevZ = arr.startZ + (arr.targetZ - arr.startZ) * prevProg;
        const prevY = 18.0 + 4 * (arr.apexY - 18.0) * prevProg * (1.0 - prevProg);

        arr.mesh.position.set(curX, arcY, curZ);
        arr.mesh.lookAt(curX + (curX - prevX), arcY + (arcY - prevY), curZ + (curZ - prevZ));

        // Impact reached
        if (progress >= 1.0) {
          // Impact sparks
          sfx.playHit();
          if (typeof window.spawnHitSparks3D === 'function') window.spawnHitSparks3D(curX, arcY, curZ, 0xffcc44, 14);
          currentShake = { intensity: 12, duration: 160, startTime: performance.now() };

          // Return arrow mesh to pool without disposing shared geometries/materials
          releaseArrowMesh(arr.mesh);
          activeArrows.splice(i, 1);
        }
      }
    }

    // Victory Celebration 3D Particle System
    let victoryCelebrationGroup = null;
    let victoryCelebrationActive = false;
    let victoryCelebrationStartTime = 0;
    let hasTriggeredVictoryModal = false;

    function triggerVictoryCelebration(data) {
      if (hasTriggeredVictoryModal) return;
      hasTriggeredVictoryModal = true;
      sfx.playVictory();
      appendLog('\\n🏆 VICTORY! The Aeonward Continuum Starforge is Reclaimed!', 'log-combat');

      const modal = document.getElementById('victoryCelebrationModal');
      if (modal) {
        if (data && data.turn !== undefined) {
          const tEl = document.getElementById('victoryTurnCount');
          if (tEl) tEl.innerText = data.turn;
        }
        if (data && data.char_stats) {
          const timeEl = document.getElementById('victoryTimeElapsed');
          if (timeEl && data.in_game_minutes !== undefined) {
            const hrs = Math.floor(data.in_game_minutes / 60);
            const mins = Math.floor(data.in_game_minutes % 60);
            timeEl.innerText = `${hrs}h ${mins}m`;
          }
        }
        modal.style.display = 'flex';
      }

      start3DVictoryCelebration();
    }

    function closeVictoryModal() {
      const modal = document.getElementById('victoryCelebrationModal');
      if (modal) modal.style.display = 'none';
    }

    function start3DVictoryCelebration() {
      if (!threeScene) return;
      victoryCelebrationActive = true;
      victoryCelebrationStartTime = performance.now();

      if (!victoryCelebrationGroup) {
        victoryCelebrationGroup = new THREE.Group();
        victoryCelebrationGroup.name = 'victoryCelebrationParticles';
        threeScene.add(victoryCelebrationGroup);

        // Generate colorful celebratory confetti and fireworks sparks (600 particles)
        const particleCount = 600;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];

        const palette = [
          [1.0, 0.84, 0.0],  // Bright Gold
          [0.98, 0.55, 0.24], // Ember Orange
          [0.34, 0.65, 1.0],  // Arcane Blue
          [0.49, 0.90, 0.53], // Radiant Emerald
          [0.85, 0.45, 1.0],  // Royal Purple
          [1.0, 0.35, 0.35]   // Ruby Crimson
        ];

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 0] = (Math.random() - 0.5) * 600;
          positions[i * 3 + 1] = 60 + Math.random() * 260;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 600;

          const col = palette[Math.floor(Math.random() * palette.length)];
          colors[i * 3 + 0] = col[0];
          colors[i * 3 + 1] = col[1];
          colors[i * 3 + 2] = col[2];

          velocities.push({
            vx: (Math.random() - 0.5) * 1.8,
            vy: -0.6 - Math.random() * 1.2,
            vz: (Math.random() - 0.5) * 1.8,
            rotSpeed: (Math.random() - 0.5) * 0.05
          });
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
          size: 7,
          vertexColors: true,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        });

        const pSys = new THREE.Points(geom, mat);
        pSys.userData = { velocities, positions, count: particleCount };
        victoryCelebrationGroup.add(pSys);

        // Radiant celebratory beacon light at town center
        const celebrationLight = new THREE.PointLight(0xffdf6d, 2.5, 900);
        celebrationLight.position.set(0, 140, 0);
        victoryCelebrationGroup.add(celebrationLight);
      }
    }

    function update3DVictoryCelebration(ts) {
      if (!victoryCelebrationActive || !victoryCelebrationGroup) return;
      const pSys = victoryCelebrationGroup.children[0];
      if (pSys && pSys.geometry && pSys.userData) {
        const { velocities, count } = pSys.userData;
        const posAttr = pSys.geometry.attributes.position;
        const arr = posAttr.array;

        for (let i = 0; i < count; i++) {
          const v = velocities[i];
          arr[i * 3 + 0] += v.vx + Math.sin((ts * 0.002) + i) * 0.4;
          arr[i * 3 + 1] += v.vy;
          arr[i * 3 + 2] += v.vz + Math.cos((ts * 0.002) + i) * 0.4;

          // Wrap particles back to top when landing
          if (arr[i * 3 + 1] < 5) {
            arr[i * 3 + 1] = 240 + Math.random() * 120;
            arr[i * 3 + 0] = (Math.random() - 0.5) * 600;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 600;
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    function applyTextureQuality(tex) {
      if (!tex || !threeRenderer) return tex;
      const maxAniso = threeRenderer.capabilities ? threeRenderer.capabilities.getMaxAnisotropy() : 16;
      tex.anisotropy = Math.min(16, maxAniso || 8);
      return tex;
    }

    const _workerBitmaps = window.__DND_WORKER_BITMAPS__ || (window.__DND_WORKER_BITMAPS__ = {});
    const _terrainCache = window.__DND_TERRAIN_CACHE__ || (window.__DND_TERRAIN_CACHE__ = {});

    function createOptimizedCanvas(w, h) {
      if (typeof OffscreenCanvas !== 'undefined') {
        try { return new OffscreenCanvas(w, h); } catch (e) {}
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    }

    function _paintHeightPbr(ctx, w, h, rawKind, mode) {
      const isNeutral = typeof rawKind === 'string' && rawKind.startsWith('obj_');
      const kind = isNeutral ? rawKind.slice(4) : rawKind;
      const n = w * h;
      const hf = new Float32Array(n);
      const aux = new Float32Array(n);
      const hash2 = (x, y) => {
        const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const tileSin = (x, y, fx, fy, ph) => Math.sin((x / w) * Math.PI * 2 * fx + (y / h) * Math.PI * 2 * fy + ph);
      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const idx = y * w + x;
          let ht = 0.5, ax = 0.0;
          if (kind === 'stone' || kind === 'floor') {
            const rows = kind === 'floor' ? 6 : 4, cols = kind === 'floor' ? 6 : 3;
            const rIdx = Math.floor(v * rows);
            const su = ((u * cols + (rIdx % 2) * 0.5) % 1.0);
            const sv = (v * rows) % 1.0;
            const edge = Math.min(Math.min(su, 1 - su), Math.min(sv, 1 - sv));
            const mortar = Math.max(0, Math.min(1, (0.06 - edge) / 0.06));
            const grain = tileSin(x, y, 5, 3, 0.4) * 0.14 + tileSin(x, y, 13, 11, 1.2) * 0.09 + (hash2(x & 255, y & 255) - 0.5) * 0.14;
            const blockHash = hash2(Math.floor((u * cols + (rIdx % 2) * 0.5) % cols), rIdx);
            ht = Math.max(0.04, Math.min(1.0, (0.68 + grain + (blockHash - 0.5) * 0.22) * (1.0 - mortar * 0.72)));
            ax = mortar * 0.85 + Math.max(0, tileSin(x, y, 2, 2, 0.9) * 0.32);
          } else if (kind === 'shingle') {
            const rows = 7, cols = 6;
            const rIdx = Math.floor(v * rows);
            const su = ((u * cols + (rIdx % 2) * 0.5) % 1.0);
            const sv = (v * rows) % 1.0;
            const gapX = Math.max(0, Math.min(1, (0.065 - Math.min(su, 1 - su)) / 0.065));
            const lapY = Math.max(0, Math.min(1, (0.14 - sv) / 0.14));
            const slateVar = hash2(Math.floor((u * cols + (rIdx % 2) * 0.5) % cols), rIdx);
            const grain = tileSin(x, y, 4, 18, slateVar * 3.1) * 0.08 + (hash2(x & 255, y & 255) - 0.5) * 0.10;
            ht = Math.max(0.06, Math.min(1.0, (0.58 + sv * 0.26 + grain + (slateVar - 0.5) * 0.16) * (1.0 - Math.max(gapX * 0.55, lapY * 0.72))));
            ax = Math.max(lapY * 0.9, gapX * 0.75);
          } else if (kind === 'bark') {
            const ridge = Math.abs(tileSin(x, y, 9, 0, Math.sin(v * Math.PI * 4) * 1.1));
            const fine = tileSin(x, y, 23, 2, 0.5) * 0.18 + (hash2(x & 127, y >> 1) - 0.5) * 0.16;
            ht = Math.max(0.05, Math.min(1.0, 0.35 + ridge * 0.48 + fine));
            ax = 1.0 - ridge;
          } else if (kind === 'wood') {
            const planks = 5;
            const pIdx = Math.floor(u * planks);
            const pu = (u * planks) % 1.0;
            const seam = Math.max(0, Math.min(1, (0.055 - Math.min(pu, 1 - pu)) / 0.055));
            const plankBias = (hash2(pIdx, 7) - 0.5) * 0.16;
            const rings = Math.sin(pu * 14.0 + tileSin(x, y, 1, 2, pIdx * 1.7) * 2.2) * 0.5 + 0.5;
            const pore = (hash2(x & 255, (y >> 2) & 255) - 0.5) * 0.14;
            ht = Math.max(0.04, Math.min(1.0, (0.64 + rings * 0.26 + plankBias + pore) * (1.0 - seam * 0.76)));
            ax = seam;
          } else if (kind === 'metal') {
            const brush = tileSin(x, y, 2, 24, tileSin(x, y, 3, 1, 0.3) * 1.4) * 0.13;
            const hammer = (tileSin(x, y, 5, 5, 0.8) * tileSin(x, y, 7, -6, 1.7)) * 0.11;
            const micro = (hash2(x & 255, y & 255) - 0.5) * 0.09;
            const patinaWave = Math.max(0, Math.min(1, 0.38 - tileSin(x, y, 2, 2, 1.1) * 0.35 - brush));
            ht = Math.max(0.08, Math.min(1.0, 0.62 + brush + hammer + micro));
            ax = patinaWave;
          } else if (kind === 'leather') {
            const peb = Math.abs(tileSin(x, y, 14, 14, 0.2) * tileSin(x, y, 14, -14, 1.4));
            const crease = Math.max(0, 1.0 - Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v)) * 18.0);
            const stip = (hash2(x & 255, y & 255) - 0.5) * 0.10;
            ht = Math.max(0.08, Math.min(1.0, (0.50 + peb * 0.36 + stip) * (1.0 - crease * 0.45)));
            ax = Math.max(crease * 0.75, 0.45 - peb * 0.45);
          } else if (kind === 'cloth') {
            const warp = tileSin(x, y, 24, 0, 0.0) * 0.5 + 0.5;
            const weft = tileSin(x, y, 0, 24, Math.PI * 0.5) * 0.5 + 0.5;
            const weave = ((x + y) & 1) ? warp : weft;
            const fold = tileSin(x, y, 2, 3, 0.9) * 0.10 + (hash2(x & 255, y & 255) - 0.5) * 0.06;
            ht = Math.max(0.12, Math.min(1.0, 0.48 + weave * 0.32 + fold));
            ax = Math.max(0, 0.45 - fold * 2.2);
          } else if (kind === 'fur') {
            const strand = Math.abs(tileSin(x, y, 22, 2, tileSin(x, y, 2, 4, 0.4) * 1.6));
            const tuft = tileSin(x, y, 5, 7, 1.2) * 0.16 + (hash2(x & 127, y & 255) - 0.5) * 0.12;
            ht = Math.max(0.08, Math.min(1.0, 0.38 + strand * 0.42 + tuft));
            ax = 0.8 - strand * 0.65;
          } else if (kind === 'crystal') {
            const f1 = Math.abs(tileSin(x, y, 3, 5, 0.5));
            const f2 = Math.abs(tileSin(x, y, -5, 4, 1.6));
            const vein = Math.max(0, 1.0 - Math.abs(f1 - f2) * 7.5);
            ht = Math.max(0.08, Math.min(1.0, 0.42 + f1 * 0.32 + f2 * 0.18 + vein * 0.25));
            ax = vein;
          } else if (kind === 'wilderness') {
            const lumps = tileSin(x, y, 3, 2, 0.2) * 0.18 + tileSin(x, y, 7, 9, 1.5) * 0.14 + tileSin(x, y, 19, 17, 0.8) * 0.10;
            const grit = (hash2(x, y) - 0.5) * 0.24;
            ht = Math.max(0.05, Math.min(1.0, 0.52 + lumps + grit));
            ax = Math.max(0, Math.min(1, 0.5 + tileSin(x, y, 2, 3, 0.6) * 0.4));
          } else if (kind === 'water') {
            const w1 = tileSin(x, y, 3, 4, 0.2) * 0.26 + tileSin(x, y, -5, 3, 1.4) * 0.20 + tileSin(x, y, 9, -7, 2.3) * 0.12;
            ht = Math.max(0.05, Math.min(1.0, 0.5 + w1));
            ax = Math.max(0, ht - 0.55);
          } else {
            ht = Math.max(0.05, Math.min(1.0, 0.5 + tileSin(x, y, 8, 8, 0.3) * 0.22 + (hash2(x, y) - 0.5) * 0.16));
          }
          hf[idx] = ht;
          aux[idx] = ax;
        }
      }
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const strength = kind === 'water' ? 2.6 : kind === 'wood' ? 3.2 : kind === 'metal' ? 2.2 : (kind === 'cloth' || kind === 'fur') ? 1.9 : kind === 'shingle' ? 4.4 : 4.0;
      for (let y = 0; y < h; y++) {
        const ym = (y - 1 + h) % h, yp = (y + 1) % h;
        for (let x = 0; x < w; x++) {
          const xm = (x - 1 + w) % w, xp = (x + 1) % w;
          const idx = y * w + x, o = idx * 4;
          const ht = hf[idx], ax = aux[idx];
          if (mode === 'norm') {
            const gx = (hf[y * w + xp] - hf[y * w + xm]) * strength;
            const gy = (hf[yp * w + x] - hf[ym * w + x]) * strength;
            const inv = 1.0 / Math.sqrt(gx * gx + gy * gy + 1.0);
            d[o] = Math.max(0, Math.min(255, ((-gx * inv) * 0.5 + 0.5) * 255));
            d[o + 1] = Math.max(0, Math.min(255, ((-gy * inv) * 0.5 + 0.5) * 255));
            d[o + 2] = Math.max(0, Math.min(255, (inv * 0.5 + 0.5) * 255));
            d[o + 3] = 255;
          } else if (mode === 'rough') {
            const baseR = kind === 'metal' ? 86 : kind === 'crystal' ? 48 : kind === 'leather' ? 158 : (kind === 'cloth' || kind === 'fur') ? 212 : kind === 'wood' ? 148 : kind === 'shingle' ? 192 : kind === 'stone' ? 185 : kind === 'wilderness' ? 222 : 205;
            const rv = Math.max(24, Math.min(246, Math.round(baseR + ax * 56 - (ht - 0.5) * 58)));
            d[o] = d[o + 1] = d[o + 2] = rv;
            d[o + 3] = 255;
          } else if (isNeutral) {
            const seam = kind === 'crystal' ? (-ax * 22 + ht * 56) : (-ax * 58 + ht * 68);
            const v = Math.max(88, Math.min(238, 174 + seam));
            const warm = (kind === 'wood' || kind === 'leather') ? 5 : (kind === 'metal' || kind === 'crystal') ? -3 : 1;
            d[o] = Math.max(76, Math.min(240, v + warm));
            d[o + 1] = Math.max(76, Math.min(240, v + (kind === 'crystal' ? 4 : 0)));
            d[o + 2] = Math.max(76, Math.min(240, v - warm));
            d[o + 3] = 255;
          } else if (kind === 'stone') {
            const moss = Math.max(0, Math.min(0.65, ax * 0.72 - 0.12));
            const lum = 74 + ht * 68 - ax * 28;
            d[o] = Math.max(26, Math.min(220, lum * 0.94 * (1 - moss) + 52 * moss));
            d[o + 1] = Math.max(28, Math.min(220, lum * 0.98 * (1 - moss) + 74 * moss));
            d[o + 2] = Math.max(30, Math.min(220, lum * 1.04 * (1 - moss) + 42 * moss));
            d[o + 3] = 255;
          } else if (kind === 'bark') {
            const moss = Math.max(0, (tileSin(x, y, 2, 3, 0.5) > 0.55 ? 0.35 : 0));
            const r = (44 + ht * 56) * (1 - moss) + 54 * moss;
            const g = (30 + ht * 40) * (1 - moss) + 72 * moss;
            const b = (20 + ht * 26) * (1 - moss) + 38 * moss;
            d[o] = Math.max(24, Math.min(210, r));
            d[o + 1] = Math.max(22, Math.min(210, g));
            d[o + 2] = Math.max(18, Math.min(210, b));
            d[o + 3] = 255;
          } else if (kind === 'wood') {
            const seamDark = 1.0 - ax * 0.62;
            d[o] = Math.max(28, Math.min(218, (88 + ht * 82) * seamDark));
            d[o + 1] = Math.max(24, Math.min(200, (56 + ht * 58) * seamDark));
            d[o + 2] = Math.max(18, Math.min(180, (32 + ht * 35) * seamDark));
            d[o + 3] = 255;
          } else if (kind === 'wilderness') {
            const grassMix = ax;
            const r = (74 * (1 - grassMix) + 56 * grassMix) * (0.72 + ht * 0.55);
            const g = (68 * (1 - grassMix) + 84 * grassMix) * (0.72 + ht * 0.55);
            const b = (50 * (1 - grassMix) + 42 * grassMix) * (0.72 + ht * 0.55);
            d[o] = Math.max(24, Math.min(212, r));
            d[o + 1] = Math.max(26, Math.min(215, g));
            d[o + 2] = Math.max(20, Math.min(200, b));
            d[o + 3] = 255;
          } else if (kind === 'water') {
            const foam = Math.max(0, ax * 3.4);
            d[o] = Math.min(215, 22 + ht * 24 + foam * 140);
            d[o + 1] = Math.min(225, 68 + ht * 52 + foam * 125);
            d[o + 2] = Math.min(230, 108 + ht * 68 + foam * 100);
            d[o + 3] = 255;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    const _texPainters = {
      contactShadow(ctx) {
        const grad = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
        grad.addColorStop(0.0, 'rgba(6, 8, 12, 0.78)');
        grad.addColorStop(0.28, 'rgba(6, 8, 12, 0.56)');
        grad.addColorStop(0.64, 'rgba(6, 8, 12, 0.22)');
        grad.addColorStop(1.0, 'rgba(6, 8, 12, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
      },
      norm(ctx, arg) {
        const type = (arg && arg.type) || 'stone';
        const sz = ctx.canvas ? ctx.canvas.width : 256;
        const sh = ctx.canvas ? ctx.canvas.height : 256;
        if (type === 'foliage') {
          ctx.fillStyle = 'rgb(128, 128, 255)';
          ctx.fillRect(0, 0, sz, sh);
          for (let i = 0; i < 340; i++) {
            const x = (i * 73) % sz, y = (i * 97) % sh, r = 6 + (i % 10), ang = i * 0.47;
            ctx.fillStyle = `rgb(${128 + Math.round(Math.cos(ang) * 58)}, ${128 + Math.round(Math.sin(ang) * 58)}, 232)`;
            ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.58, ang, 0, Math.PI * 2); ctx.fill();
          }
          return;
        }
        _paintHeightPbr(ctx, sz, sh, type, 'norm');
      },
      stumpTop(ctx) {
        const sz = 256, cx = 128, cy = 128;
        const woodGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, sz * 0.48);
        woodGrad.addColorStop(0.0, '#4a2e18');
        woodGrad.addColorStop(0.35, '#684524');
        woodGrad.addColorStop(0.70, '#8c5f34');
        woodGrad.addColorStop(0.92, '#ad7b45');
        woodGrad.addColorStop(1.0, '#2e190e');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(0, 0, sz, sz);
        const numRings = 42;
        for (let r = 1; r <= numRings; r++) {
          const baseRadius = (r / numRings) * (sz * 0.46);
          ctx.strokeStyle = (r % 5 === 0) ? 'rgba(35, 18, 9, 0.72)' : 'rgba(55, 30, 14, 0.42)';
          ctx.lineWidth = (r % 5 === 0) ? 2.0 : 1.1;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.08) {
            const wobble = Math.sin(a * 5.0 + r * 0.7) * (1.5 + (r / numRings) * 3.5) + Math.cos(a * 3.0) * (1.0 + (r / numRings) * 2.2);
            const curR = baseRadius + wobble;
            const px = cx + Math.cos(a) * curR, py = cy + Math.sin(a) * curR;
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        for (let k = 0; k < 12; k++) {
          const crackAngle = (k * (Math.PI * 2 / 12)) + ((k % 3) * 0.22);
          const crackLen = (sz * 0.18) + ((k * 31) % Math.round(sz * 0.26));
          ctx.strokeStyle = 'rgba(20, 10, 5, 0.85)';
          ctx.lineWidth = (k % 4 === 0) ? 2.4 : 1.3;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          for (let d = 8; d <= crackLen; d += 10) {
            const jitterAngle = crackAngle + Math.sin(d * 0.2) * 0.08;
            ctx.lineTo(cx + Math.cos(jitterAngle) * d, cy + Math.sin(jitterAngle) * d);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 235, 205, 0.18)';
        ctx.lineWidth = 1.2;
        for (let s = -sz * 0.4; s <= sz * 0.4; s += 22) {
          ctx.beginPath(); ctx.moveTo(cx + s - 30, cy - sz * 0.4); ctx.lineTo(cx + s + 30, cy + sz * 0.4); ctx.stroke();
        }
        for (let m = 0; m < 18; m++) {
          const mAngle = m * 1.37, mDist = sz * 0.42 + (m % 4) * 2.5;
          ctx.fillStyle = (m % 2 === 0) ? 'rgba(58, 82, 35, 0.55)' : 'rgba(84, 112, 45, 0.45)';
          ctx.beginPath(); ctx.arc(cx + Math.cos(mAngle) * mDist, cy + Math.sin(mAngle) * mDist, 4 + (m % 5), 0, Math.PI * 2); ctx.fill();
        }
      },
      rough(ctx, arg) {
        const sz = ctx.canvas ? ctx.canvas.width : 256;
        const sh = ctx.canvas ? ctx.canvas.height : 256;
        if (arg && arg.type) {
          _paintHeightPbr(ctx, sz, sh, arg.type, 'rough');
          return;
        }
        const baseVal = (arg && arg.baseVal !== undefined) ? arg.baseVal : 200;
        ctx.fillStyle = `rgb(${baseVal}, ${baseVal}, ${baseVal})`;
        ctx.fillRect(0, 0, sz, sh);
        for (let i = 0; i < 180; i++) {
          const x = (i * 41) % sz, y = (i * 19) % sh;
          const val = Math.max(40, Math.min(246, baseVal + Math.round(Math.sin(i * 3.1) * 34)));
          ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
          ctx.fillRect(x, y, 4 + (i % 5), 4 + (i % 4));
        }
      },
      env(ctx, arg) {
        const indoorKind = arg && arg.indoorKind;
        if (indoorKind) {
          // Truthful Local Reflections (Tier 2 #5): dark stone/timber ceilings & warm torch bounces indoors
          const configs = {
            cave: { ceil: ['#0a0e14', '#16202e', '#1c2a3a'], floor: ['#1a1e24', '#0d1014'], lights: ['#4aa8ff', '#388bfd', '#ffa657'] },
            tavern: { ceil: ['#1e140c', '#2e1f14', '#3d291a'], floor: ['#2a1d12', '#140e09'], lights: ['#ffaa55', '#ff8833', '#ffd288'] },
            forge: { ceil: ['#161210', '#241a14', '#2e221a'], floor: ['#1e1814', '#0e0b09'], lights: ['#ff8c32', '#3fb950', '#ffaa44'] },
            vault: { ceil: ['#0c1018', '#18202c', '#222b3a'], floor: ['#161b22', '#090c10'], lights: ['#ffa657', '#79c0ff', '#d2a8ff'] },
          };
          const c = configs[indoorKind] || configs.vault;
          const topG = ctx.createLinearGradient(0, 0, 0, 128);
          topG.addColorStop(0.0, c.ceil[0]); topG.addColorStop(0.6, c.ceil[1]); topG.addColorStop(1.0, c.ceil[2]);
          ctx.fillStyle = topG; ctx.fillRect(0, 0, 512, 128);
          const botG = ctx.createLinearGradient(0, 128, 0, 256);
          botG.addColorStop(0.0, c.floor[0]); botG.addColorStop(1.0, c.floor[1]);
          ctx.fillStyle = botG; ctx.fillRect(0, 128, 512, 128);
          [[96, 98, c.lights[0], 58], [256, 86, c.lights[1], 72], [416, 102, c.lights[2], 54]].forEach(([lx, ly, col, rad]) => {
            const g = ctx.createRadialGradient(lx, ly, 3, lx, ly, rad);
            g.addColorStop(0.0, col); g.addColorStop(1.0, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, rad, 0, Math.PI * 2); ctx.fill();
          });
          return;
        }
        const pal = (arg && arg.palette) || {
          sky: ['#16487e', '#468bc7', '#9ed2f5'], ground: ['#4a4435', '#221e16'],
          sun: 'rgba(255, 246, 220, 0.90)', bar_hi: 'rgba(255, 255, 255, 0.45)',
          bar_lo: 'rgba(160, 210, 255, 0.35)', bar_r: 'rgba(255, 225, 170, 0.32)'
        };
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 128);
        skyGrad.addColorStop(0.0, pal.sky[0]); skyGrad.addColorStop(0.55, pal.sky[1]); skyGrad.addColorStop(1.0, pal.sky[2]);
        ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, 512, 128);
        const groundGrad = ctx.createLinearGradient(0, 128, 0, 256);
        groundGrad.addColorStop(0.0, pal.ground[0]); groundGrad.addColorStop(1.0, pal.ground[1]);
        ctx.fillStyle = groundGrad; ctx.fillRect(0, 128, 512, 128);
        const sunGlow = ctx.createRadialGradient(256, 70, 6, 256, 70, 96);
        sunGlow.addColorStop(0, pal.sun); sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sunGlow; ctx.beginPath(); ctx.arc(256, 70, 96, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.bar_hi; ctx.fillRect(80, 18, 352, 12);
        ctx.fillStyle = pal.bar_lo; ctx.fillRect(16, 54, 70, 24);
        ctx.fillStyle = pal.bar_r; ctx.fillRect(426, 54, 70, 24);
      },
      bark(ctx) {
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 256, ctx.canvas ? ctx.canvas.height : 512, 'bark', 'albedo');
      },
      wood(ctx) {
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 256, ctx.canvas ? ctx.canvas.height : 256, 'wood', 'albedo');
      },
      obj_pbr(ctx, arg) {
        const k = (arg && arg.kind) || 'stone';
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 256, ctx.canvas ? ctx.canvas.height : 256, 'obj_' + k, 'albedo');
      },
      foliage(ctx, arg) {
        const sz = 256, { baseHex, specHex, darkHex } = arg;
        ctx.clearRect(0, 0, sz, sz);
        // Core shadow fill in center while leaving ~16% organic leaf gaps around edges for alphaTest/alphaToCoverage
        ctx.fillStyle = darkHex;
        ctx.beginPath(); ctx.arc(128, 128, 108, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 460; i++) {
          const angPos = i * 2.39996;
          const dist = Math.sqrt((i % 230) / 230) * 116;
          const lx = 128 + Math.cos(angPos) * dist, ly = 128 + Math.sin(angPos) * dist;
          const lr = 7 + (i % 9), ang = i * 0.42;
          ctx.fillStyle = (i % 4 === 0) ? specHex : (i % 3 === 0) ? baseHex : darkHex;
          ctx.beginPath(); ctx.ellipse(lx, ly, lr, lr * 0.56, ang, 0, Math.PI * 2); ctx.fill();
          if (i % 2 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 220, 0.14)'; ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(lx - Math.cos(ang) * lr * 0.6, ly - Math.sin(ang) * lr * 0.6);
            ctx.lineTo(lx + Math.cos(ang) * lr * 0.6, ly + Math.sin(ang) * lr * 0.6);
            ctx.stroke();
          }
        }
      },
      stone(ctx) {
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 512, ctx.canvas ? ctx.canvas.height : 512, 'stone', 'albedo');
      },
      water(ctx) {
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 256, ctx.canvas ? ctx.canvas.height : 256, 'water', 'albedo');
      },
      floorEdge(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 256, 256);
        const grad = ctx.createRadialGradient(128, 128, 66, 128, 128, 126);
        grad.addColorStop(0.0, '#ffffff'); grad.addColorStop(0.62, '#ffffff');
        grad.addColorStop(0.86, '#888888'); grad.addColorStop(1.0, '#000000');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
      },
      wilderness(ctx) {
        _paintHeightPbr(ctx, ctx.canvas ? ctx.canvas.width : 512, ctx.canvas ? ctx.canvas.height : 512, 'wilderness', 'albedo');
      },
      gobo(ctx, arg) {
        const sz = 256, kind = (arg && arg.kind) || 'canopy';
        ctx.clearRect(0, 0, sz, sz);
        if (kind === 'grate') {
          const rad = ctx.createRadialGradient(128, 128, 22, 128, 128, 124);
          rad.addColorStop(0.0, 'rgba(255, 220, 165, 0.28)');
          rad.addColorStop(0.7, 'rgba(255, 195, 130, 0.14)');
          rad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
          ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          for (let i = 36; i < sz; i += 44) { ctx.fillRect(i, 0, 10, sz); ctx.fillRect(0, i, sz, 10); }
          ctx.globalCompositeOperation = 'source-over';
        } else {
          // Dappled tree canopy light & leaf shadow blobs
          const rad = ctx.createRadialGradient(128, 128, 10, 128, 128, 122);
          rad.addColorStop(0.0, 'rgba(10, 18, 14, 0.34)');
          rad.addColorStop(0.65, 'rgba(10, 18, 14, 0.22)');
          rad.addColorStop(1.0, 'rgba(10, 18, 14, 0.0)');
          ctx.fillStyle = rad; ctx.beginPath(); ctx.arc(128, 128, 122, 0, Math.PI * 2); ctx.fill();
          ctx.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 34; i++) {
            const px = 40 + ((i * 67) % 176), py = 40 + ((i * 97) % 176), r = 8 + (i % 12);
            ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.68, i * 0.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      },
      mote(ctx) {
        const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
        g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        g.addColorStop(0.35, 'rgba(255, 248, 232, 0.55)');
        g.addColorStop(1.0, 'rgba(255, 240, 210, 0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      },
      sky(ctx, arg) {
        const W = 1024, H = 512, sp = (arg && arg.sp) || {}, weather = (arg && arg.weather) || 'clear';
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        (sp.sky || [[0, '#0f325c'], [0.5, '#b7d9f0'], [1, '#7294ae']]).forEach(([stop, hex]) => grad.addColorStop(stop, hex));
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // Subtle Mie horizon scattering band near equator (H*0.48)
        const mieGrad = ctx.createRadialGradient(W * 0.35, H * 0.44, 16, W * 0.35, H * 0.44, W * 0.42);
        mieGrad.addColorStop(0.0, sp.stars > 100 ? 'rgba(135, 175, 235, 0.14)' : 'rgba(255, 224, 172, 0.24)');
        mieGrad.addColorStop(0.5, 'rgba(255, 210, 165, 0.06)');
        mieGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = mieGrad; ctx.fillRect(0, 0, W, H);
        const starCount = (weather === 'overcast' && sp.stars_overcast !== undefined) ? sp.stars_overcast : (sp.stars || 0);
        for (let i = 0; i < starCount; i++) {
          const px = (Math.sin(i * 197.3) * 0.5 + 0.5) * W, py = Math.pow(Math.sin(i * 311.7) * 0.5 + 0.5, 0.78) * 244, alpha = (i % 4 === 0) ? 0.92 : 0.55;
          ctx.fillStyle = (i % 9 === 0) ? `rgba(185, 225, 255, ${alpha})` : `rgba(255, 250, 235, ${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, (i % 13 === 0) ? 1.8 : (i % 5 === 0) ? 1.2 : 0.8, 0, Math.PI * 2); ctx.fill();
        }
        if (sp.aurora && weather !== 'overcast') {
          ctx.save();
          for (let band = 0; band < 3; band++) {
            const baseY = 78 + band * 26, gradAur = ctx.createLinearGradient(0, baseY - 45, 0, baseY + 55);
            gradAur.addColorStop(0.0, band % 2 === 0 ? 'rgba(32, 240, 175, 0)' : 'rgba(130, 90, 255, 0)');
            gradAur.addColorStop(0.5, band % 2 === 0 ? 'rgba(48, 255, 185, 0.24)' : 'rgba(110, 235, 195, 0.18)');
            gradAur.addColorStop(1.0, band % 2 === 0 ? 'rgba(64, 180, 255, 0)' : 'rgba(130, 90, 255, 0)');
            ctx.fillStyle = gradAur; ctx.beginPath(); ctx.moveTo(0, baseY + 45);
            for (let x = 0; x <= W; x += 24) ctx.lineTo(x, baseY - 35 + Math.sin(x * 0.012 + band * 1.9) * 20 + Math.cos(x * 0.025 - band) * 10);
            ctx.lineTo(W, baseY + 55); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
        const cloudCfg = sp.cloud || ['rgba(245, 250, 255, ', 'rgba(230, 240, 252, 0)', 0.34, 0.56, 0.65];
        const cAlpha = (weather === 'overcast') ? (cloudCfg[4] ?? cloudCfg[3]) : (weather === 'clear' ? cloudCfg[2] : cloudCfg[3]);
        const cloudCount = (weather === 'overcast') ? 56 : (weather === 'misty') ? 40 : (weather === 'cloudy') ? 32 : 16;
        for (let i = 0; i < cloudCount; i++) {
          const cx = ((i * 89 + (i % 5) * 37) % W), cy = 104 + ((i * 43) % 136), cw = 72 + ((i * 29) % 120), ch = 14 + ((i * 11) % 24);
          const cGrad = ctx.createRadialGradient(cx, cy - ch * 0.18, 4, cx, cy, cw);
          cGrad.addColorStop(0, `${cloudCfg[0]}${cAlpha})`); cGrad.addColorStop(1, cloudCfg[1]);
          ctx.fillStyle = cGrad; ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    };

    function getOrCreateProcTex(key, w, h, painterName, arg, opts) {
      if (cachedProcTex[key]) return cachedProcTex[key];
      let source = _workerBitmaps[key];
      if (source) {
        delete _workerBitmaps[key];
      } else {
        source = createOptimizedCanvas(w, h);
        const ctx = source.getContext('2d');
        if (ctx && _texPainters[painterName]) _texPainters[painterName](ctx, arg);
      }
      const tex = new THREE.CanvasTexture(source);
      if (opts) {
        if (opts.wrapSky) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; }
        if (opts.wrapRepeat) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; }
        if (opts.wrapClamp) { tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; }
        if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
        if (opts.mapping !== undefined) tex.mapping = opts.mapping;
        if (opts.srgb && typeof THREE.SRGBColorSpace !== 'undefined') tex.colorSpace = THREE.SRGBColorSpace;
        if (opts.aniso !== false) applyTextureQuality(tex);
      } else {
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        applyTextureQuality(tex);
      }
      cachedProcTex[key] = tex;
      return tex;
    }

    // Persistent IndexedDB Prebuild Cache & Per-Object Signature Helpers
    function _fnv1aHash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    }
    const _painterSigCache = {};
    let _terrainFnSigCache = null;
    function _getTexPrebuildSig(j) {
      if (!_painterSigCache[j.painter]) {
        const fn = _texPainters && _texPainters[j.painter];
        _painterSigCache[j.painter] = fn ? _fnv1aHash(fn.toString() + _paintHeightPbr.toString()) : '0';
      }
      return _fnv1aHash(JSON.stringify([j.width, j.height, j.painter, _painterSigCache[j.painter], j.arg || null]));
    }
    function _getTerrainPrebuildSig(cfg) {
      if (_terrainFnSigCache === null) {
        _terrainFnSigCache = (typeof computeOpenWorldTerrainData === 'function') ? _fnv1aHash(computeOpenWorldTerrainData.toString()) : '0';
      }
      return _fnv1aHash(JSON.stringify([cfg, _terrainFnSigCache]));
    }
    function _getFloorPrebuildSig(floorStyles) {
      return _fnv1aHash(JSON.stringify(floorStyles || null));
    }

    let _prebuildDbPromise = null;
    const _pendingPrebuildWrites = new Set();
    function _openPrebuildDB() {
      if (typeof indexedDB === 'undefined') return Promise.resolve(null);
      if (_prebuildDbPromise) return _prebuildDbPromise;
      _prebuildDbPromise = new Promise(resolve => {
        let done = false;
        const finish = (v) => { if (!done) { done = true; resolve(v); } };
        const tid = setTimeout(() => finish(null), 2000);
        try {
          const req = indexedDB.open('aeonward_prebuild_cache_v1', 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('objects')) db.createObjectStore('objects', { keyPath: 'id' });
          };
          req.onsuccess = () => { clearTimeout(tid); finish(req.result); };
          req.onerror = () => { clearTimeout(tid); finish(null); };
          req.onblocked = () => { clearTimeout(tid); finish(null); };
        } catch (e) { clearTimeout(tid); finish(null); }
      });
      return _prebuildDbPromise;
    }
    async function loadPrebuildCacheRecords() {
      const db = await _openPrebuildDB();
      if (!db) return {};
      return new Promise(resolve => {
        let done = false;
        const finish = (v) => { if (!done) { done = true; resolve(v); } };
        const tid = setTimeout(() => finish({}), 2500);
        try {
          const tx = db.transaction('objects', 'readonly');
          const req = tx.objectStore('objects').getAll();
          req.onsuccess = () => {
            clearTimeout(tid);
            const out = {};
            for (const rec of (req.result || [])) if (rec && rec.id) out[rec.id] = rec;
            finish(out);
          };
          req.onerror = () => { clearTimeout(tid); finish({}); };
        } catch (e) { clearTimeout(tid); finish({}); }
      });
    }
    function savePrebuildCacheRecord(id, sig, kind, val) {
      const p = _openPrebuildDB().then(db => {
        if (!db) return;
        return new Promise(resolve => {
          try {
            const tx = db.transaction('objects', 'readwrite');
            tx.objectStore('objects').put({ id, sig, kind, val });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch (e) { resolve(); }
        });
      }).catch(() => {});
      _pendingPrebuildWrites.add(p);
      p.finally(() => _pendingPrebuildWrites.delete(p));
      return p;
    }
    async function flushPrebuildCache() {
      while (_pendingPrebuildWrites.size > 0) await Promise.all(Array.from(_pendingPrebuildWrites));
    }
    async function clearPrebuildCache() {
      await flushPrebuildCache();
      const db = await _openPrebuildDB();
      if (!db) return;
      return new Promise(resolve => {
        try {
          const tx = db.transaction('objects', 'readwrite');
          tx.objectStore('objects').clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (e) { resolve(); }
      });
    }

    // Multi-core CPU Web Worker Pool (OffscreenCanvas -> ImageBitmap + Float32Array Transferables)
    const _bgWorkers = [];
    const _bgPending = new Map();
    let _bgNextJobId = 1;
    let _bgNextWorkerIdx = 0;

    function _ensureBgWorkerPool() {
      if (_bgWorkers.length > 0) return _bgWorkers;
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return _bgWorkers;
      try {
        const painterSrc = Object.entries(_texPainters).map(([k, fn]) => {
          const s = fn.toString();
          return k + ':' + (s.startsWith('function') ? s : 'function ' + s);
        }).join(',\n');
        const terrainSrc = (typeof computeOpenWorldTerrainData === 'function')
          ? computeOpenWorldTerrainData.toString() : 'function computeOpenWorldTerrainData() { return null; }';
        const workerCode = `
          ${_paintHeightPbr.toString()}
          const PAINTERS = {\n${painterSrc}\n};
          ${terrainSrc}
          self.onmessage = async function(e) {
            const d = e.data;
            if (d.kind === 'tex') {
              try {
                const fn = PAINTERS[d.painter];
                if (fn) {
                  const canvas = new OffscreenCanvas(d.width, d.height);
                  const ctx = canvas.getContext('2d');
                  fn(ctx, d.arg);
                  const blob = (typeof canvas.convertToBlob === 'function')
                    ? await canvas.convertToBlob({ type: 'image/png' }).catch(() => null) : null;
                  const bitmap = canvas.transferToImageBitmap();
                  self.postMessage({ jobId: d.jobId, key: d.key, kind: 'tex', sig: d.sig, bitmap, blob }, [bitmap]);
                  return;
                }
              } catch (err) {}
              self.postMessage({ jobId: d.jobId, key: d.key, kind: 'tex', sig: d.sig, bitmap: null, blob: null });
            } else if (d.kind === 'terrain') {
              try {
                const res = computeOpenWorldTerrainData(d.cfg);
                if (res && res.heights && res.colors && res.treeMatrices && res.rockMatrices) {
                  self.postMessage({ jobId: d.jobId, key: d.key, kind: 'terrain', sig: d.sig, res }, [
                    res.heights.buffer, res.colors.buffer, res.treeMatrices.buffer, res.rockMatrices.buffer
                  ]);
                  return;
                }
              } catch (err) {}
              self.postMessage({ jobId: d.jobId, key: d.key, kind: 'terrain', sig: d.sig, res: null });
            }
          };
        `;
        const url = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
        const poolCount = Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4));
        for (let i = 0; i < poolCount; i++) {
          const w = new Worker(url);
          w.onmessage = function(e) {
            const { jobId, key, kind, sig, bitmap, blob, res } = e.data;
            if (kind === 'tex' && bitmap) {
              if (!cachedProcTex[key]) _workerBitmaps[key] = bitmap;
              if (blob && sig) savePrebuildCacheRecord(`tex:${key}`, sig, 'tex', blob);
            } else if (kind === 'terrain' && res) {
              (window.__DND_TERRAIN_CACHE__ || _terrainCache)[key] = res;
              if (sig) savePrebuildCacheRecord(`terrain:${key}`, sig, 'terrain', res);
            }
            const resolve = _bgPending.get(jobId);
            if (resolve) { _bgPending.delete(jobId); resolve(true); }
          };
          w.onerror = function() {
            for (const [jid, resolve] of _bgPending) { resolve(false); }
            _bgPending.clear();
          };
          _bgWorkers.push(w);
        }
      } catch (e) {}
      return _bgWorkers;
    }

    function dispatchBgJob(msg) {
      const pool = _ensureBgWorkerPool();
      if (pool.length === 0) return Promise.resolve(false);
      return new Promise(resolve => {
        const jobId = _bgNextJobId++;
        msg.jobId = jobId;
        _bgPending.set(jobId, resolve);
        const w = pool[_bgNextWorkerIdx % pool.length];
        _bgNextWorkerIdx++;
        w.postMessage(msg);
      });
    }

    async function _prewarmTexJobs(jobs, dbRecords, statsOut) {
      if (!jobs.length) return [];
      const toDecode = [], missJobs = [];
      for (const j of jobs) {
        if (cachedProcTex[j.key] || _workerBitmaps[j.key]) {
          if (statsOut) statsOut.texHits++;
          continue;
        }
        j.sig = _getTexPrebuildSig(j);
        const rec = dbRecords && dbRecords[`tex:${j.key}`];
        if (rec && rec.sig === j.sig && rec.val && typeof createImageBitmap === 'function') {
          toDecode.push({ j, rec });
        } else {
          missJobs.push(j);
        }
      }
      if (toDecode.length) {
        await Promise.all(toDecode.map(async ({ j, rec }) => {
          try {
            const bmp = await createImageBitmap(rec.val);
            if (bmp) {
              if (!cachedProcTex[j.key]) _workerBitmaps[j.key] = bmp;
              if (statsOut) statsOut.texHits++;
              return;
            }
          } catch (e) {}
          missJobs.push(j);
        }));
      }
      if (statsOut) statsOut.texMisses += missJobs.length;
      const pool = _ensureBgWorkerPool();
      return (pool.length > 0 && missJobs.length > 0) ? Promise.all(missJobs.map(dispatchBgJob)) : [];
    }

    async function prewarmProcTexturesInWorkers(dbRecords, statsOut) {
      const jobs = [
        { kind: 'tex', key: 'wilderness_ground_512', painter: 'wilderness', width: 512, height: 512 },
        { kind: 'tex', key: 'norm_wilderness', painter: 'norm', width: 512, height: 512, arg: { type: 'wilderness' } },
        { kind: 'tex', key: 'rough_wilderness', painter: 'rough', width: 256, height: 256, arg: { type: 'wilderness' } },
        { kind: 'tex', key: 'floor_edge_alpha', painter: 'floorEdge', width: 256, height: 256 },
        { kind: 'tex', key: 'bark', painter: 'bark', width: 256, height: 512 },
        { kind: 'tex', key: 'wood', painter: 'wood', width: 256, height: 256 },
        { kind: 'tex', key: 'stone', painter: 'stone', width: 512, height: 512 },
        { kind: 'tex', key: 'water', painter: 'water', width: 256, height: 256 },
        { kind: 'tex', key: 'stumpTop', painter: 'stumpTop', width: 256, height: 256 },
        { kind: 'tex', key: 'contactShadow', painter: 'contactShadow', width: 128, height: 128 },
        { kind: 'tex', key: 'norm_stone', painter: 'norm', width: 512, height: 512, arg: { type: 'stone' } },
        { kind: 'tex', key: 'norm_bark', painter: 'norm', width: 256, height: 512, arg: { type: 'bark' } },
        { kind: 'tex', key: 'norm_wood', painter: 'norm', width: 256, height: 256, arg: { type: 'wood' } },
        { kind: 'tex', key: 'norm_water', painter: 'norm', width: 256, height: 256, arg: { type: 'water' } },
        { kind: 'tex', key: 'norm_foliage', painter: 'norm', width: 256, height: 256, arg: { type: 'foliage' } },
        { kind: 'tex', key: 'norm_floor', painter: 'norm', width: 512, height: 512, arg: { type: 'floor' } },
        { kind: 'tex', key: 'rough_stone', painter: 'rough', width: 256, height: 256, arg: { type: 'stone' } },
        { kind: 'tex', key: 'rough_wood', painter: 'rough', width: 256, height: 256, arg: { type: 'wood' } },
        { kind: 'tex', key: 'rough_floor', painter: 'rough', width: 256, height: 256, arg: { type: 'floor' } },
        { kind: 'tex', key: 'rough_205', painter: 'rough', width: 64, height: 64, arg: { baseVal: 205 } },
        { kind: 'tex', key: 'rough_215', painter: 'rough', width: 64, height: 64, arg: { baseVal: 215 } },
        { kind: 'tex', key: 'rough_190', painter: 'rough', width: 64, height: 64, arg: { baseVal: 190 } },
        { kind: 'tex', key: 'gobo_canopy', painter: 'gobo', width: 256, height: 256, arg: { kind: 'canopy' } },
        { kind: 'tex', key: 'gobo_grate', painter: 'gobo', width: 256, height: 256, arg: { kind: 'grate' } },
        { kind: 'tex', key: 'soft_mote', painter: 'mote', width: 64, height: 64 },
        { kind: 'tex', key: 'env_indoor_cave', painter: 'env', width: 512, height: 256, arg: { indoorKind: 'cave' } },
        { kind: 'tex', key: 'env_indoor_tavern', painter: 'env', width: 512, height: 256, arg: { indoorKind: 'tavern' } },
        { kind: 'tex', key: 'env_indoor_forge', painter: 'env', width: 512, height: 256, arg: { indoorKind: 'forge' } },
        { kind: 'tex', key: 'env_indoor_vault', painter: 'env', width: 512, height: 256, arg: { indoorKind: 'vault' } },
        { kind: 'tex', key: 'fol_#1b4d24', painter: 'foliage', width: 256, height: 256, arg: { baseHex: '#1b4d24', specHex: '#2d6a36', darkHex: '#102e15' } },
        { kind: 'tex', key: 'fol_#266632', painter: 'foliage', width: 256, height: 256, arg: { baseHex: '#266632', specHex: '#419650', darkHex: '#184721' } },
        { kind: 'tex', key: 'fol_#14351a', painter: 'foliage', width: 256, height: 256, arg: { baseHex: '#14351a', specHex: '#24522c', darkHex: '#0c2111' } },
        { kind: 'tex', key: 'fol_#424f21', painter: 'foliage', width: 256, height: 256, arg: { baseHex: '#424f21', specHex: '#5e6e2a', darkHex: '#293313' } },
        { kind: 'tex', key: 'fol_#526126', painter: 'foliage', width: 256, height: 256, arg: { baseHex: '#526126', specHex: '#728533', darkHex: '#333d17' } }
      ];
      return _prewarmTexJobs(jobs, dbRecords !== undefined ? dbRecords : await loadPrebuildCacheRecords(), statsOut);
    }

    async function prewarmAtmosphereWorkers(periodsObj, dbRecords, statsOut) {
      if (!periodsObj) return [];
      const jobs = [];
      for (const [pKey, sp] of Object.entries(periodsObj)) {
        if (sp && sp.env) jobs.push({ kind: 'tex', key: `env_${pKey}`, painter: 'env', width: 512, height: 256, arg: { period: pKey, palette: sp.env } });
        for (const weather of ['clear', 'cloudy', 'overcast', 'misty']) {
          jobs.push({ kind: 'tex', key: `sky_${pKey}_${weather}`, painter: 'sky', width: 1024, height: 512, arg: { sp, weather } });
        }
      }
      return _prewarmTexJobs(jobs, dbRecords !== undefined ? dbRecords : await loadPrebuildCacheRecords(), statsOut);
    }

    function createContactShadowTexture() {
      return getOrCreateProcTex('contactShadow', 128, 128, 'contactShadow', null, { aniso: false });
    }
    function createProceduralNormalTexture(type = 'stone') {
      const sz = (type === 'stone' || type === 'floor' || type === 'wilderness') ? 512 : 256;
      const sh = type === 'bark' ? 512 : sz;
      return getOrCreateProcTex(`norm_${type}`, sz, sh, 'norm', { type }, { wrapRepeat: true });
    }
    function createStumpTopTexture() {
      return getOrCreateProcTex('stumpTop', 256, 256, 'stumpTop', null, { aniso: true });
    }
    function createProceduralRoughnessTexture(baseVal = 200, type = null) {
      if (type) return getOrCreateProcTex(`rough_${type}`, 256, 256, 'rough', { type }, { wrapRepeat: true });
      return getOrCreateProcTex(`rough_${baseVal}`, 64, 64, 'rough', { baseVal }, { wrapRepeat: true });
    }
    function createWoodTexture() {
      return getOrCreateProcTex('wood', 256, 256, 'wood', null, { wrapRepeat: true, srgb: true });
    }
    function createGoboTexture(kind = 'canopy') {
      return getOrCreateProcTex(`gobo_${kind}`, 256, 256, 'gobo', { kind }, { wrapClamp: true, aniso: false });
    }
    function createSoftMoteTexture() {
      return getOrCreateProcTex('soft_mote', 64, 64, 'mote', null, { wrapClamp: true, aniso: false });
    }
    const _pmremEnvCache = {};
    function createProceduralEnvironmentMap(period = 'morning', weather = 'clear', isOutdoor = true, indoorKind = 'vault') {
      if (!threeRenderer || !window.THREE) return null;
      let cacheKey, painterArg;
      if (!isOutdoor) {
        const ik = ['cave', 'tavern', 'forge', 'vault'].includes(indoorKind) ? indoorKind : 'vault';
        cacheKey = `env_indoor_${ik}`;
        painterArg = { indoorKind: ik };
      } else {
        const atmo = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().atmosphere_presets) || {};
        const periods = atmo.periods || {};
        const pKey = periods[period] ? period : ((typeof classifyWithClientCCELM === 'function' && atmo.period_criteria) ? classifyWithClientCCELM(period, atmo.period_criteria, 0.25, 'morning') : 'morning');
        const palette = (periods[pKey] && periods[pKey].env) || null;
        cacheKey = `env_${pKey}${palette ? '' : '_pre'}`;
        painterArg = { period: pKey, palette };
      }
      if (_pmremEnvCache[cacheKey]) return _pmremEnvCache[cacheKey];
      const equirect = getOrCreateProcTex(cacheKey, 512, 256, 'env', painterArg, {
        mapping: THREE.EquirectangularReflectionMapping,
        srgb: true,
        aniso: false
      });
      if (equirect && typeof THREE.PMREMGenerator === 'function' && (!threeRenderer.isWebGPURenderer || window.__DND_RENDERER_READY__)) {
        try {
          const pmrem = new THREE.PMREMGenerator(threeRenderer);
          const rt = pmrem.fromEquirectangular(equirect);
          pmrem.dispose();
          if (rt && rt.texture) {
            _pmremEnvCache[cacheKey] = rt.texture;
            return rt.texture;
          }
        } catch (e) {}
      }
      return equirect;
    }
    function createBarkTexture() {
      return getOrCreateProcTex('bark', 256, 512, 'bark', null, { wrapRepeat: true, srgb: true });
    }
    function createFoliageTexture(baseHex, specHex, darkHex) {
      return getOrCreateProcTex('fol_' + baseHex, 256, 256, 'foliage', { baseHex, specHex, darkHex }, { wrapRepeat: true, srgb: true });
    }
    function createStoneTexture() {
      return getOrCreateProcTex('stone', 512, 512, 'stone', null, { wrapRepeat: true, srgb: true });
    }
    function createWaterTexture() {
      return getOrCreateProcTex('water', 256, 256, 'water', null, { wrapRepeat: true, repeat: [3, 3], srgb: true });
    }
    const _objPbrKitCache = {};
    function getProceduralObjectMaps(kind = 'stone') {
      const k = ['wood', 'stone', 'metal', 'leather', 'cloth', 'fur', 'crystal', 'shingle'].includes(kind) ? kind : 'stone';
      if (_objPbrKitCache[k]) return _objPbrKitCache[k];
      const ok = 'obj_' + k;
      return (_objPbrKitCache[k] = {
        map: getOrCreateProcTex(`obj_alb_${k}`, 256, 256, 'obj_pbr', { kind: k }, { wrapRepeat: true, srgb: true }),
        normalMap: getOrCreateProcTex(`norm_${ok}`, 256, 256, 'norm', { type: ok }, { wrapRepeat: true }),
        roughnessMap: getOrCreateProcTex(`rough_${ok}`, 256, 256, 'rough', { type: ok }, { wrapRepeat: true }),
      });
    }
    window.getProceduralObjectMaps = getProceduralObjectMaps;

