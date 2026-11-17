    let _limbDefaultXAxis = null;
    let _limbScratchQuat = null;
    function _setLimbPitch(limb, pitchRad) {
      if (!limb) return;
      const u = limb.userData;
      if (u && u.baseQuat) {
        if (!_limbScratchQuat) _limbScratchQuat = new THREE.Quaternion();
        const axis = u.pitchAxis || (_limbDefaultXAxis || (_limbDefaultXAxis = new THREE.Vector3(1, 0, 0)));
        _limbScratchQuat.setFromAxisAngle(axis, pitchRad);
        limb.quaternion.copy(u.baseQuat).multiply(_limbScratchQuat);
      } else {
        limb.rotation.x = pitchRad;
      }
    }

    const _quadLegKeys = ['fl', 'fr', 'bl', 'br'];
    function stepSmooth3DEntities(dtSec = 0.016) {
      if (!threeRoomGroup) return;
      const lerpFactor = 0.32;
      const targetEntities = (threeDynamicEntities && threeDynamicEntities.length > 0) ? threeDynamicEntities : threeRoomGroup.children;
      const dynamicEntities = [];
      const now = performance.now();
      if (window.__lwHitStopUntil && now < window.__lwHitStopUntil) return;
      const setLimbPitch = _setLimbPitch;

      // Check if current room has active hostile monsters (Battle Mode detection)
      let hasHostilesInRoom = false;
      if (current3DData && current3DData.monsters) {
        const ms = current3DData.monsters;
        for (let mi = 0; mi < ms.length; mi++) {
          const m = ms[mi];
          if (m.discovered !== false && (m.hp === undefined || m.hp > 0)) { hasHostilesInRoom = true; break; }
        }
      }

      for (let ei = 0; ei < targetEntities.length; ei++) {
        const c = targetEntities[ei];
        if (!c || !c.userData) continue;

        if (c.userData.targetX !== undefined && c.userData.targetZ !== undefined) {
          const dx = c.userData.targetX - c.position.x;
          const dz = c.userData.targetZ - c.position.z;
          const distToTarget = Math.hypot(dx, dz);
          if (distToTarget > 0.35) {
            c.position.x += dx * lerpFactor;
            c.position.z += dz * lerpFactor;
          } else {
            c.position.x = c.userData.targetX;
            c.position.z = c.userData.targetZ;
          }
        }
        if (typeof window.getOpenWorldTerrainHeight === 'function') {
          c.position.y = window.getOpenWorldTerrainHeight(c.position.x, c.position.z);
        }
        if (c.userData.isLocalPlayer) {
          window.__localPlayerWorldPos = c.position;
        }
        if (c.userData.entityId) {
          dynamicEntities.push(c);
        }
      }

        // Client-side mutual collision & physical space exclusion (minimum 52px center-to-center)
        // Only separate stationary AI companions or monsters so the human player is never pushed or attracted by AI
        const minSep = 52.0;
        const minSepSq = minSep * minSep;
        for (let i = 0; i < dynamicEntities.length; i++) {
          const e1 = dynamicEntities[i];
          const e1Dist = (e1.userData.targetX !== undefined && e1.userData.targetZ !== undefined)
            ? Math.hypot(e1.userData.targetX - e1.position.x, e1.userData.targetZ - e1.position.z)
            : 0;
          if (e1Dist > 1.5) continue;
          for (let j = i + 1; j < dynamicEntities.length; j++) {
            const e2 = dynamicEntities[j];
            const e2Dist = (e2.userData.targetX !== undefined && e2.userData.targetZ !== undefined)
              ? Math.hypot(e2.userData.targetX - e2.position.x, e2.userData.targetZ - e2.position.z)
              : 0;
            if (e2Dist > 1.5) continue;
            // Never push or displace the human player character via AI relaxation
            if (e1.userData.isLocalPlayer && e2.userData.isLocalPlayer) continue;
            const ddx = e1.position.x - e2.position.x;
            const ddz = e1.position.z - e2.position.z;
            const dSq = ddx * ddx + ddz * ddz;
            if (dSq < minSepSq && dSq > 0.001) {
              const d = Math.sqrt(dSq);
              const overlap = (minSep - d);
              const nx = (ddx / d) * overlap;
              const nz = (ddz / d) * overlap;
              if (e1.userData.isLocalPlayer) {
                // Only displace e2 away from player
                e2.position.x -= nx;
                e2.position.z -= nz;
                if (e2.userData.targetX !== undefined) e2.userData.targetX -= nx;
                if (e2.userData.targetZ !== undefined) e2.userData.targetZ -= nz;
              } else if (e2.userData.isLocalPlayer) {
                // Only displace e1 away from player
                e1.position.x += nx;
                e1.position.z += nz;
                if (e1.userData.targetX !== undefined) e1.userData.targetX += nx;
                if (e1.userData.targetZ !== undefined) e1.userData.targetZ += nz;
              } else {
                // Two NPCs/AI heroes: separate evenly
                e1.position.x += nx * 0.5;
                e1.position.z += nz * 0.5;
                if (e1.userData.targetX !== undefined) e1.userData.targetX += nx * 0.5;
                if (e1.userData.targetZ !== undefined) e1.userData.targetZ += nz * 0.5;
                e2.position.x -= nx * 0.5;
                e2.position.z -= nz * 0.5;
                if (e2.userData.targetX !== undefined) e2.userData.targetX -= nx * 0.5;
                if (e2.userData.targetZ !== undefined) e2.userData.targetZ -= nz * 0.5;
              }
            }
          }
        }

      for (let ei = 0; ei < targetEntities.length; ei++) {
        const c = targetEntities[ei];
        if (!c || !c.userData) continue;

        let actualDisplacement = 0;
        if (c.userData.lastRenderPosX !== undefined && c.userData.lastRenderPosZ !== undefined) {
          actualDisplacement = Math.hypot(c.position.x - c.userData.lastRenderPosX, c.position.z - c.userData.lastRenderPosZ);
        }
        c.userData.lastRenderPosX = c.position.x;
        c.userData.lastRenderPosZ = c.position.z;

        const speed = (c.userData.targetX !== undefined && c.userData.targetZ !== undefined)
          ? Math.hypot(c.userData.targetX - c.position.x, c.userData.targetZ - c.position.z)
          : 0;
        const prevSmooth = c.userData.smoothedSpeed || 0;
        c.userData.smoothedSpeed = (actualDisplacement < 0.15 && speed < 0.35)
          ? prevSmooth * 0.45
          : (prevSmooth * 0.55 + actualDisplacement * 0.45);
        if (c.userData.smoothedSpeed < 0.08) c.userData.smoothedSpeed = 0;

        let turnRate = 0;
        if (c.userData.targetRotY !== undefined) {
          const charModel = c.userData.charGrp || c.children[0];
          if (charModel) {
            let diff = c.userData.targetRotY - charModel.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > 0.01) {
              turnRate = Math.max(-0.25, Math.min(0.25, diff * 0.35));
              charModel.rotation.y += diff * 0.35;
            } else {
              charModel.rotation.y = c.userData.targetRotY;
            }
          }
        }

        // SKELETAL ARTICULATION & SECONDARY MOTION PIPELINE (Tier 5)
        const charGrp = c.userData.charGrp;
        if (charGrp) {
          const isDead = (c.userData.hp !== undefined && c.userData.hp <= 0);
          const isKneeling = c.userData.isKneeling;
          const isJumping = c.userData.isJumping;

          // Living eye blinks on humanoid NPCs/companions
          if (Array.isArray(c.userData.eyes)) {
            const blinkOn = ((now + ei * 1370) % 4200) < 115;
            const sy = blinkOn ? 0.10 : 1.0;
            for (let bi = 0; bi < c.userData.eyes.length; bi++) {
              c.userData.eyes[bi].scale.y = sy;
            }
          }

          // Track jump landing compression squash-and-stretch spring (local player)
          if (c.userData.baseCharScale === undefined) {
            c.userData.baseCharScale = charGrp.scale.y || 1;
          }
          if (c.userData.isLocalPlayer) {
            const curElev = (typeof window.__lwLocalElevation === 'number') ? window.__lwLocalElevation : 0;
            if ((c.userData._prevElev || 0) > 1.5 && curElev <= 0.1) {
              c.userData.landSquash = 0.16;
            }
            c.userData._prevElev = curElev;
          }
          if (c.userData.landSquash > 0.004) {
            const bs = c.userData.baseCharScale;
            const q = c.userData.landSquash;
            charGrp.scale.set(bs * (1 + q * 0.45), bs * (1 - q), bs * (1 + q * 0.45));
            c.userData.landSquash *= 0.78;
          } else if (c.userData.landSquash) {
            c.userData.landSquash = 0;
            charGrp.scale.setScalar(c.userData.baseCharScale);
          }

          // 1. Posture: Dead flat on ground
          if (isDead) {
            charGrp.rotation.x = Math.PI / 2;
            charGrp.position.y = 2.0;
            setLimbPitch(c.userData.lLeg, 0);
            setLimbPitch(c.userData.rLeg, 0);
            setLimbPitch(c.userData.lArm, 0);
            setLimbPitch(c.userData.rArm, 0);
            if (c.userData.weaponGroup) c.userData.weaponGroup.visible = false;
            continue;
          }

          // 2. Posture: Kneeling / Rest state
          if (isKneeling) {
            charGrp.position.y = -6.5;
            charGrp.rotation.x = 0.22;
            setLimbPitch(c.userData.lLeg, -1.2);
            setLimbPitch(c.userData.rLeg, 0.8);
            continue;
          }

          // 3. Posture: Jumping
          if (isJumping) {
            const jumpTime = (now - (c.userData.jumpStartTime || now)) * 0.005;
            charGrp.position.y = Math.max(0, Math.sin(jumpTime) * 16.0);
            setLimbPitch(c.userData.lLeg, -0.4);
            setLimbPitch(c.userData.rLeg, -0.4);
            setLimbPitch(c.userData.lArm, 0.7);
            setLimbPitch(c.userData.rArm, 0.7);
            continue;
          }

          // 4. Locomotion: Walking vs Running Skeletal Animation
          // Only animate walking/running when the character is genuinely translating across the floor
          const isMovingNow = (actualDisplacement > 0.30 || c.userData.smoothedSpeed > 0.30);
          if (isMovingNow) {
            // Running if speed > 6.0, active sprint/run posture, or large step
            const isRunning = (speed > 6.0 || actualDisplacement > 3.5 || (c.userData.isLocalPlayer && (window.__lwIsSprinting || window.__lwLocalPosture === 'run')));
            const animFreq = isRunning ? 0.016 : 0.010;
            const legAmp = isRunning ? 0.72 : 0.48;
            const armAmp = isRunning ? 0.62 : 0.38;

            const phase = (now * animFreq) + (ei * 1.1);
            const stride = Math.sin(phase);
            // Negative pitch around character +X swings limb forward (+Z); positive swings backward (-Z)
            setLimbPitch(c.userData.lLeg, stride * legAmp);
            setLimbPitch(c.userData.rLeg, -stride * legAmp);

            // Natural knee flexion (+pitch bends lower leg backward during recovery/lift phase)
            if (c.userData.lShin) setLimbPitch(c.userData.lShin, Math.max(0, stride) * legAmp * 0.85);
            if (c.userData.rShin) setLimbPitch(c.userData.rShin, Math.max(0, -stride) * legAmp * 0.85);

            const armActive = c.userData.isSwinging || c.userData.isInteracting;
            if (!armActive) {
              setLimbPitch(c.userData.lArm, -stride * armAmp);
              if (c.userData.rArm) setLimbPitch(c.userData.rArm, stride * armAmp);
              // Dynamic elbow pump on forward arm swing
              if (c.userData.lForeArm) setLimbPitch(c.userData.lForeArm, -Math.max(0, stride) * armAmp * 0.45);
              if (c.userData.rForeArm) setLimbPitch(c.userData.rForeArm, -Math.max(0, -stride) * armAmp * 0.45);
            }

            // Subtle torso counter-twist during stride
            if (c.userData.chestBone && c.userData.chestBone.userData.baseQuat && c.userData.chestBone.userData.yawAxis) {
              const cb = c.userData.chestBone;
              if (!cb.userData._yawQuat) cb.userData._yawQuat = new THREE.Quaternion();
              cb.userData._yawQuat.setFromAxisAngle(cb.userData.yawAxis, stride * 0.09);
              cb.quaternion.copy(cb.userData.baseQuat).multiply(cb.userData._yawQuat);
            }

            // Subtle vertical center-of-mass bobbing, forward sprint lean & turn banking (Tier 5)
            charGrp.position.y = Math.abs(Math.sin(phase * 2)) * (isRunning ? 2.4 : 1.2);
            charGrp.rotation.x += ((isRunning ? 0.08 : 0.03) - (charGrp.rotation.x || 0)) * 0.22;
            charGrp.rotation.z += ((-turnRate * 0.55) - (charGrp.rotation.z || 0)) * 0.22;
            if (c.userData.cloakMesh) {
              const targetCloak = 0.16 + (isRunning ? 0.44 : 0.25) + Math.abs(Math.sin(phase)) * 0.10;
              c.userData.cloakMesh.rotation.x += (targetCloak - c.userData.cloakMesh.rotation.x) * 0.20;
              c.userData.cloakMesh.rotation.z = -turnRate * 0.65 + Math.sin(phase) * 0.05;
            }

            // =========================================================================
            // SkinTokens / UniRig Kinematic Non-Humanoid Locomotion Cycles
            // =========================================================================
            // A. Arachnid Alternating Tetrapod Gait
            // Legs (L1, R2, L3, R4) move in phase 1; (R1, L2, R4, L3) move in phase 2.
            if (Array.isArray(c.userData.spiderLegs)) {
              const spiderFreq = isRunning ? 0.022 : 0.012;
              const sLegs = c.userData.spiderLegs;
              for (let li = 0; li < sLegs.length; li++) {
                const leg = sLegs[li];
                const isTetrapodSetA = ((leg.globalIndex % 2) === 0);
                const lPhase = (now * spiderFreq) + (isTetrapodSetA ? 0 : Math.PI);
                const stepSwing = Math.sin(lPhase);
                const stepLift = Math.max(0, Math.cos(lPhase));
                leg.coxa.rotation.y = leg.baseYaw + stepSwing * 0.28;
                leg.femur.rotation.x = stepLift * (leg.side * 0.35);
                leg.tibia.rotation.z = (leg.side * 0.45) + (stepLift * 0.22);
              }
              if (c.userData.spiderAbdomen) {
                c.userData.spiderAbdomen.rotation.x = Math.sin(now * spiderFreq * 0.5) * 0.08;
              }
              if (Array.isArray(c.userData.spiderPedipalps)) {
                const pList = c.userData.spiderPedipalps;
                for (let idx = 0; idx < pList.length; idx++) {
                  pList[idx].rotation.x = 0.8 + Math.sin(now * spiderFreq * 1.5 + idx) * 0.15;
                }
              }
            }

            // B. Quadruped Diagonal Trot Gait
            // Diagonal pairs: (FL + BR) synchronized opposite to (FR + BL).
            if (c.userData.quadrupedLegs) {
              const quadFreq = isRunning ? 0.020 : 0.011;
              const trotAmp = isRunning ? 0.75 : 0.45;
              const qTime = now * quadFreq;
              const trotDiag1 = Math.sin(qTime);
              const trotDiag2 = -trotDiag1;

              const ql = c.userData.quadrupedLegs;
              for (let qi = 0; qi < 4; qi++) {
                const q = ql[_quadLegKeys[qi]], d = (qi === 0 || qi === 3) ? trotDiag1 : trotDiag2;
                if (q) { q.hip.rotation.x = d * trotAmp; q.lower.rotation.x = Math.max(0, d) * 0.4; }
              }

              // Tail dynamic counterbalance sway
              if (c.userData.quadrupedTail) {
                c.userData.quadrupedTail.rotation.y = Math.sin(qTime) * 0.35;
                c.userData.quadrupedTail.rotation.z = Math.cos(qTime * 2) * 0.12;
              }
              // Head forward bobbing
              if (c.userData.wolfHead) {
                c.userData.wolfHead.rotation.x = Math.sin(qTime * 2) * 0.08;
              }
            }
          } else {
            // Idle / Standing pose (skipped when Living World action posture controls kinematics)
            const breath = Math.sin(now * 0.0025 + ei * 1.3);
            if (!c.userData.isDoingAction) {
              charGrp.position.y = 0;
              charGrp.rotation.x += (0 - (charGrp.rotation.x || 0)) * 0.18;
              charGrp.rotation.z += (0 - (charGrp.rotation.z || 0)) * 0.18;
              if (c.userData.cloakMesh) {
                const idleCloak = 0.14 + breath * 0.025;
                c.userData.cloakMesh.rotation.x += (idleCloak - c.userData.cloakMesh.rotation.x) * 0.12;
                c.userData.cloakMesh.rotation.z += (0 - c.userData.cloakMesh.rotation.z) * 0.12;
              }
              setLimbPitch(c.userData.lLeg, 0);
              setLimbPitch(c.userData.rLeg, 0);
              if (c.userData.lShin) setLimbPitch(c.userData.lShin, 0);
              if (c.userData.rShin) setLimbPitch(c.userData.rShin, 0);
              const armBusy = c.userData.isSwinging || c.userData.isInteracting;
              if (!armBusy) {
                setLimbPitch(c.userData.lArm, breath * 0.03);
                if (c.userData.lForeArm) setLimbPitch(c.userData.lForeArm, -breath * 0.04);
                if (c.userData.rArm) {
                  const isBoneRig = Boolean(c.userData.rArm.userData && c.userData.rArm.userData.baseQuat);
                  setLimbPitch(c.userData.rArm, isBoneRig ? ((hasHostilesInRoom ? -0.10 : 0) - breath * 0.03) : (hasHostilesInRoom ? -0.35 : 0.05));
                }
                if (c.userData.rForeArm) {
                  setLimbPitch(c.userData.rForeArm, -(hasHostilesInRoom ? 0.12 : 0) + breath * 0.04);
                }
              }
            }
            if (!c.userData.isSwinging && c.userData.chestBone && c.userData.chestBone.userData.baseQuat && c.userData.chestBone.userData.pitchAxis) {
              const cb = c.userData.chestBone;
              if (!cb.userData._pitchQuat) cb.userData._pitchQuat = new THREE.Quaternion();
              cb.userData._pitchQuat.setFromAxisAngle(cb.userData.pitchAxis, breath * 0.025);
              cb.quaternion.copy(cb.userData.baseQuat).multiply(cb.userData._pitchQuat);
            }

            // Idle reset & subtle breathing for non-humanoid SkinTokens rigs
            if (Array.isArray(c.userData.spiderLegs)) {
              const sLegs = c.userData.spiderLegs;
              for (let li = 0; li < sLegs.length; li++) {
                const leg = sLegs[li];
                leg.coxa.rotation.y = leg.baseYaw;
                leg.femur.rotation.x = 0;
                leg.tibia.rotation.z = leg.side * 0.45;
              }
              if (c.userData.spiderAbdomen) {
                // Subtle breathing pulsation
                c.userData.spiderAbdomen.scale.set(
                  1.15 + Math.sin(now * 0.003) * 0.03,
                  0.95 + Math.cos(now * 0.003) * 0.03,
                  1.45
                );
              }
            }
            if (c.userData.quadrupedLegs) {
              const ql = c.userData.quadrupedLegs;
              for (let qi = 0; qi < _quadLegKeys.length; qi++) {
                const qLeg = ql[_quadLegKeys[qi]];
                if (qLeg) { qLeg.hip.rotation.x = 0; qLeg.lower.rotation.x = 0; }
              }
              if (c.userData.quadrupedTail) {
                // Relaxed tail wag
                c.userData.quadrupedTail.rotation.y = Math.sin(now * 0.002) * 0.15;
              }
              if (c.userData.wolfHead) {
                c.userData.wolfHead.rotation.x = Math.sin(now * 0.002) * 0.04;
              }
            }
          }

          // 5. Contextual Weapon Drawing / Sheathing in Battle Mode
          if (c.userData.weaponGroup) {
            c.userData.weaponGroup.visible = hasHostilesInRoom || isMovingNow;
          }

          // 6. High-Fidelity Skeletal Mesh Animation Transition (Idle vs Walk/Run)
          if (c.userData.animMixer && c.userData.animActions) {
            const targetAction = isMovingNow ? c.userData.animActions.walk : c.userData.animActions.idle;
            const curAction = c.userData.currentAnimAction;
            if (targetAction && curAction !== targetAction) {
              if (curAction) curAction.fadeOut(0.2);
              targetAction.reset().fadeIn(0.2).play();
              c.userData.currentAnimAction = targetAction;
            }
            c.userData.animMixer.update(dtSec);
          }
        }
      }
    }

    function checkLocalCollision(nx, ny) {
      const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
      const H = (current3DData && current3DData.height) ? current3DData.height : 768;
      const pr = 22.0; // Matches server self.player_radius
      const isOutdoor = !(current3DData && current3DData.time_weather && current3DData.time_weather.is_outdoor === false);
      const pad = isOutdoor ? 3600 : 30;
      if (nx < -pad || nx > W + pad || ny < -pad || ny > H + pad) return true;
      const obsList = (current3DData && current3DData.obstacles) ? current3DData.obstacles : inspectableObjects.filter(o => o.type === 'scenery' || o.type === 'obstacle');
      for (const obs of obsList) {
        const oName = (obs.name || '').toLowerCase();
        if (oName.includes('wall') || oName.includes('bastion') || oName.includes('meridian')) continue;
        const r = obs.rect || obs;
        if (!Array.isArray(r) || r.length < 4) continue;
        const [ox, oy, ow, oh] = r;
        const cx = Math.max(ox, Math.min(nx, ox + ow));
        const cy = Math.max(oy, Math.min(ny, oy + oh));
        if ((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < (pr * 0.85) * (pr * 0.85)) {
          return true;
        }
      }
      return false;
    }

    let isFrameLoading = false;
    let inFlightMoves = 0;
    let moveSeq = 0;
    let lastAckedMoveSeq = 0;
    let lastLocalInputTime = 0;
    let pendingMoveTarget = null;
    const renderPlayerPos = { x: 140, y: 390, initialized: false };

    function isLocalPlayerRecentlyActive() {
      const now = performance.now();
      const hasTacticalMove = (typeof tacticalMoveInterval !== 'undefined' && tacticalMoveInterval !== null);
      return isMoving || hasTacticalMove || inFlightMoves > 0 || activeKeys.size > 0 || (now - lastLocalInputTime < 1200) || (now - lastGamepadMoveTime < 1200);
    }

    function computeFacingFromDelta(dx, dy, fallback) {
      if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) return fallback;
      const ang = Math.atan2(dy, dx) * (180 / Math.PI);
      if (ang >= -22.5 && ang < 22.5) return 'east';
      if (ang >= 22.5 && ang < 67.5) return 'southeast';
      if (ang >= 67.5 && ang < 112.5) return 'south';
      if (ang >= 112.5 && ang < 157.5) return 'southwest';
      if (ang >= 157.5 || ang < -157.5) return 'west';
      if (ang >= -157.5 && ang < -112.5) return 'northwest';
      if (ang >= -112.5 && ang < -67.5) return 'north';
      return 'northeast';
    }

    function predictLocalMovePosition(ox, oy, dx, dy) {
      const tx = ox + dx, ty = oy + dy;
      if (!checkLocalCollision(tx, ty)) {
        return { x: Math.round(tx * 10) / 10, y: Math.round(ty * 10) / 10 };
      }
      for (const frac of [0.7, 0.45, 0.25]) {
        const sx = ox + dx * frac, sy = oy + dy * frac;
        if (!checkLocalCollision(sx, sy)) {
          return { x: Math.round(sx * 10) / 10, y: Math.round(sy * 10) / 10 };
        }
      }
      if (Math.abs(dx) > 0.5 && !checkLocalCollision(tx, oy)) {
        return { x: Math.round(tx * 10) / 10, y: oy };
      }
      if (Math.abs(dy) > 0.5 && !checkLocalCollision(ox, ty)) {
        return { x: ox, y: Math.round(ty * 10) / 10 };
      }
      return { x: ox, y: oy };
    }

    async function dispatchMoveToServer(moveX, moveY, targetX, targetY, mySeq) {
      inFlightMoves++;
      try {
        const resp = await fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dx: moveX,
            dy: moveY,
            target_x: targetX,
            target_y: targetY,
            seq: mySeq,
            player_id: myPlayerId,
            known_room: currentRoomId || ''
          })
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const isLatestSeq = (mySeq >= moveSeq);
        if (mySeq > lastAckedMoveSeq) {
          lastAckedMoveSeq = mySeq;
        }
        // Only reconcile local player position when room transitions, or when all moves & keys have settled on the latest sequence
        if (data.transition) {
          pendingMoveTarget = null;
          lastPlayerPos.x = data.player_x;
          lastPlayerPos.y = data.player_y;
          renderPlayerPos.x = data.player_x;
          renderPlayerPos.y = data.player_y;
          updateCoords(data.player_x, data.player_y);
          if (localGamepadPlayers[0]) {
            localGamepadPlayers[0].x = data.player_x;
            localGamepadPlayers[0].y = data.player_y;
            localGamepadPlayers[0].dirty = 0;
            localGamepadPlayers[0].lastSent = performance.now();
          }
          if (data.player_facing) lastFacing = data.player_facing;
          updateLocal3DEntityPosition(myPlayerId, data.player_x, data.player_y, lastFacing, true);
        } else if (isLatestSeq && inFlightMoves <= 1 && !isMoving && !(typeof tacticalMoveInterval !== 'undefined' && tacticalMoveInterval !== null) && activeKeys.size === 0 && !pendingMoveTarget) {
          const drift = Math.hypot(data.player_x - lastPlayerPos.x, data.player_y - lastPlayerPos.y);
          if (drift > 8.0) {
            lastPlayerPos.x = data.player_x;
            lastPlayerPos.y = data.player_y;
            updateCoords(data.player_x, data.player_y);
            if (localGamepadPlayers[0]) {
              localGamepadPlayers[0].x = data.player_x;
              localGamepadPlayers[0].y = data.player_y;
            }
            updateLocal3DEntityPosition(myPlayerId, data.player_x, data.player_y, lastFacing);
          }
        }

        if (data.message) appendLog(data.message, data.transition ? 'log-room' : (data.battle_triggered ? 'log-combat' : 'log-item'));
        applyCommonServerDelta(data, { updateRoomOnTransitionOnly: true });
        if (data.scene_3d) {
          if (data.transition || !lastBuilt3DRoomId || data.scene_3d.room_id !== lastBuilt3DRoomId || data.battle_triggered) {
            update3DScene(data.scene_3d);
          } else if (isLatestSeq) {
            syncRoomEntitiesFromDelta(data.scene_3d, true);
          }
        }
        if (data.turn !== undefined && data.turn > lastSyncTurn) lastSyncTurn = data.turn;
      } catch (e) { console.error(e); } finally {
        inFlightMoves = Math.max(0, inFlightMoves - 1);
        if (pendingMoveTarget && inFlightMoves < 2) {
          const next = pendingMoveTarget;
          pendingMoveTarget = null;
          dispatchMoveToServer(next.moveX, next.moveY, next.targetX, next.targetY, next.seq);
        }
      }
    }

    async function doMoveStep(moveX, moveY) {
      const myStats = cachedPartyStats[myPlayerId];
      if (myStats && myStats.current_hp <= 0) return;
      sfx.playStep();

      // Optimistic 0ms client-side prediction so movement is instant over high-latency internet connections
      lastLocalInputTime = performance.now();
      const mySeq = ++moveSeq;
      lastFacing = computeFacingFromDelta(moveX, moveY, lastFacing);
      const pred = predictLocalMovePosition(lastPlayerPos.x, lastPlayerPos.y, moveX, moveY);
      lastPlayerPos.x = pred.x;
      lastPlayerPos.y = pred.y;
      updateCoords(pred.x, pred.y);
      if (localGamepadPlayers[0]) {
        localGamepadPlayers[0].x = pred.x;
        localGamepadPlayers[0].y = pred.y;
        localGamepadPlayers[0].dirty = 0;
        localGamepadPlayers[0].lastSent = lastLocalInputTime;
      }
      updateLocal3DEntityPosition(myPlayerId, pred.x, pred.y, lastFacing);

      // Coalesce network calls when internet tunnel RTT has >= 2 requests in flight so local movement never pauses
      if (inFlightMoves >= 2) {
        pendingMoveTarget = { moveX, moveY, targetX: pred.x, targetY: pred.y, seq: mySeq };
        return;
      }
      dispatchMoveToServer(moveX, moveY, pred.x, pred.y, mySeq);
    }

    // Direct Directional Button Handler (Quick-Action Buttons: Forward, Back, Left, Right relative to camera)
    async function moveDir(dx, dy) {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      const stepLen = Math.hypot(dx, dy) || 64;
      const inR = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
      const inD = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
      const { moveX, moveY } = transformInputToWorldDelta(inR, inD, stepLen);
      doMoveStep(moveX, moveY);
    }

    async function processContinuousMovement() {
      if (isMoving) return;
      isMoving = true;
      let isFirstStep = true;
      while (true) {
        if (document.activeElement === cmdInput) break;
        const { dx, dy } = getDirectionVector();
        if (dx === 0 && dy === 0) break;

        // Perspective-relative movement based on active camera mode & scene rotation (+ Shift sprint)
        const isSprinting = activeKeys.has('Shift') || activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
        window.__lwIsSprinting = isSprinting;
        const mult = (typeof window.__lwSpeedMult === 'number' ? window.__lwSpeedMult : 1.0);
        const b = (isFirstStep ? 48 : 34) * (isSprinting ? 1.75 : 1.0) * mult;
        const { moveX, moveY } = transformInputToWorldDelta(dx, dy, b);

        // Always predict locally with 0ms delay; network requests coalesce automatically via pendingMoveTarget
        doMoveStep(moveX, moveY);

        // Smooth high-frequency glide cadence: 90ms initial tap threshold, 50ms continuous step
        const stepCadence = isFirstStep ? 90 : 50;
        isFirstStep = false;
        await new Promise(r => setTimeout(r, stepCadence));

        // Immediately check if keys were released while step delay was active
        const nextDir = getDirectionVector();
        if (nextDir.dx === 0 && nextDir.dy === 0) break;
      }
      window.__lwIsSprinting = false;
      isMoving = false;
    }

    let isPolling = false;
    let lastCodeVersion = null;
    async function syncState() {
      if (isPolling || isLocalPlayerRecentlyActive()) return;
      isPolling = true;
      try {
        const chosenIdx = sessionStorage.getItem('dnd_chosen_archetype_idx');
        const joinParam = (chosenIdx !== null) ? '' : '&spectate=1';
        let resp = await fetch(`/api/sync?player_id=${encodeURIComponent(myPlayerId)}&base_id=${baseGamepadId}&known_turn=${lastSyncTurn}&known_room=${encodeURIComponent(currentRoomId || '')}${joinParam}&vector=1`);
        if (resp.status === 502 || resp.status === 503 || resp.status === 504) {
          await new Promise(r => setTimeout(r, 350));
          resp = await fetch(`/api/sync?player_id=${encodeURIComponent(myPlayerId)}&base_id=${baseGamepadId}&known_turn=${lastSyncTurn}&known_room=${encodeURIComponent(currentRoomId || '')}${joinParam}&vector=1`);
        }
        if (resp.ok) {
          const hdrUrl = resp.headers && typeof resp.headers.get === 'function' && resp.headers.get('x-public-url');
          if (hdrUrl && window.__applyPublicUrl) window.__applyPublicUrl(hdrUrl);
          const contentType = (resp.headers && typeof resp.headers.get === 'function' && resp.headers.get('content-type')) || '';
          if (contentType.includes('application/octet-stream')) {
            // High-speed binary Flat TypedArray Vector packet (<HBBfff: 16-byte records)
            const buf = await resp.arrayBuffer();
            applyEntitiesVectorBuffer(buf);
            return;
          }
          const s = await resp.json();
          if (s.public_url && window.__applyPublicUrl) window.__applyPublicUrl(s.public_url);
          if (s.code_version !== undefined) {
            if (lastCodeVersion !== null && s.code_version !== lastCodeVersion) {
              location.reload();
              return;
            }
            lastCodeVersion = s.code_version;
          }
          if (s.players) document.getElementById('partyBadge').innerText = `👥 Party: ${s.players.length} Online`;
          if (s.learning_metrics) {
            const lb = document.getElementById('learningBadge');
            if (lb) {
              const lm = s.learning_metrics;
              lb.innerText = `🧠 CC-ELM SLM: ${lm.learning_step_count} Steps (Loss ${lm.mean_recent_loss.toFixed(3)})`;
              lb.title = `Algorithm: ${lm.algorithm} | Steps: ${lm.learning_step_count} | Mean Loss: ${lm.mean_recent_loss.toFixed(4)} | Reward: ${lm.recent_mean_reward.toFixed(2)} | Adaptive Norm: ${lm.adaptive_weight_norm.toFixed(3)}`;
            }
          }
          if (s.unchanged) {
            if (s.active_room_players) {
              s.active_room_players.forEach(p => {
                if (p.id === myPlayerId) {
                  if (!isLocalPlayerRecentlyActive() && moveSeq === lastAckedMoveSeq) {
                    lastPlayerPos.x = p.x; lastPlayerPos.y = p.y; updateCoords(p.x, p.y);
                    if (localGamepadPlayers[0]) { localGamepadPlayers[0].x = p.x; localGamepadPlayers[0].y = p.y; }
                    updateLocal3DEntityPosition(p.id, p.x, p.y, p.facing, false, p.is_moving);
                  }
                } else {
                  updateLocal3DEntityPosition(p.id, p.x, p.y, p.facing, false, p.is_moving);
                }
              });
            }
            if (s.active_room_monsters) {
              s.active_room_monsters.forEach(m => {
                updateLocal3DEntityPosition(m.id, m.x, m.y, m.facing, false, m.is_moving);
              });
            }
            return;
          }
          if (s.events && s.events.length) {
            s.events.forEach(ev => {
              if (ev.message) appendLog(ev.message, ev.transition ? 'log-room' : (ev.battle_triggered ? 'log-combat' : 'log-item'));
              applyCommonServerDelta(ev, { updateRoomOnTransitionOnly: true });
            });
          }
          if (s.action_visuals && s.action_visuals.length) {
            const wSfxCrit = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().weapon_sfx_criteria) || {};
            s.action_visuals.forEach(av => {
              const from3D = { x: (av.from_x || 512) - 512, y: 14, z: (av.from_y || 384) - 384 };
              const isProj = av.type === 'projectile';
              triggerWeaponSwing(av.attacker_id, isProj, isProj ? 220 : 320);
              if (isProj) spawnFlyingArrow(av.from_x, av.from_y, av.to_x, av.to_y);
              const kind = (typeof classifyWithClientCCELM === 'function' && av.weapon) ? classifyWithClientCCELM(av.weapon, wSfxCrit, 0.35, isProj ? 'bow' : 'attack') : (isProj ? 'bow' : 'attack');
              if (kind === 'spell_cast') sfx.playSpellCast(from3D);
              else if (isProj) sfx.playBowShot(from3D);
              else if (kind === 'heal') sfx.playHeal(from3D);
              else sfx.playAttack(from3D);
            });
          }
          applyCommonServerDelta(s);
          if (s.scene_3d) {
            if (!lastBuilt3DRoomId || s.scene_3d.room_id !== lastBuilt3DRoomId || (s.events && s.events.some(ev => ev.battle_triggered || ev.transition))) {
              update3DScene(s.scene_3d);
            } else if (isLocalPlayerRecentlyActive() || inFlightMoves > 0) {
              syncRoomEntitiesFromDelta(s.scene_3d, true);
            } else {
              update3DScene(s.scene_3d);
            }
          }
          if (s.active_room_players && !isLocalPlayerRecentlyActive() && moveSeq === lastAckedMoveSeq) {
            const me = s.active_room_players.find(p => p.id === myPlayerId);
            if (me) {
              lastPlayerPos.x = me.x; lastPlayerPos.y = me.y; updateCoords(me.x, me.y);
              if (localGamepadPlayers[0]) { localGamepadPlayers[0].x = me.x; localGamepadPlayers[0].y = me.y; }
            }
          }
          if (s.turn !== undefined && s.turn !== lastSyncTurn) { lastSyncTurn = s.turn; }
        }
      } catch (e) {} finally { isPolling = false; }
    }
    syncState(); setInterval(syncState, 750);
    refreshTakeDropdown();

    function getValidGamepads() {
      if (!navigator.getGamepads) return [];
      const raw = Array.from(navigator.getGamepads()).filter(p => p && p.connected);
      const seen = new Set();
      const unique = [];
      for (const gp of raw) {
        // Strip trailing indices or whitespace that Chromium appends for virtual/duplicate device nodes
        const normId = (gp.id || '').trim().replace(/\s*\(.*?\)$/, '').toLowerCase();
        const key = `${normId}_${gp.axes.length}_${gp.buttons.length}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(gp);
        }
      }
      return unique;
    }

    function updateGamepadBadge() {
      const pads = getValidGamepads();
      const b = document.getElementById('gamepadBadge');
      if (!b) return;
      if (pads.length > 0) {
        gamepadConnected = true;
        b.style.display = 'inline-block';
        b.innerText = pads.length === 1 ? `🎮 ${pads[0].id.slice(0, 16)} Active` : `🎮 ${pads.length} Gamepads Active`;
      } else {
        gamepadConnected = false;
        b.style.display = 'none';
        activeGamepadKeys.clear();
      }
    }

    window.addEventListener('gamepadconnected', e => {
      const pads = getValidGamepads();
      updateGamepadBadge();
      const slot = pads.findIndex(p => p.index === e.gamepad.index) + 1;
      if (slot > 0) {
        getGamepadSlot(slot);
        appendLog(`🎮 Gamepad #${slot} connected: ${e.gamepad.id}.`, 'log-player');
      }
    });

    window.addEventListener('gamepaddisconnected', e => {
      updateGamepadBadge();
      const pads = getValidGamepads();
      // Remove any slots no longer corresponding to a unique connected gamepad
      for (let s = 1; s <= 4; s++) {
        if (s > pads.length) {
          delete localGamepadPlayers[s];
        }
      }
    });

    function pollGamepads() {
      const pads = getValidGamepads();
      let activeCount = 0;
      // Clean up slots that no longer correspond to an active unique pad
      for (let s = 1; s <= 4; s++) {
        if (s > pads.length && localGamepadPlayers[s]) {
          delete localGamepadPlayers[s];
        }
      }
      for (let i = 0; i < pads.length; i++) {
        const gp = pads[i], slot = i + 1;
        activeCount++;
        const p = getGamepadSlot(slot);
        const gpPlayerId = slot === 1 ? myPlayerId : `gp_${p.id}`;

        // Left Stick & D-Pad continuous movement + Right Stick/Triggers size z adjustment
        const dpadX = (gp.buttons[15]?.pressed ? 1 : 0) - (gp.buttons[14]?.pressed ? 1 : 0);
        const dpadY = (gp.buttons[13]?.pressed ? 1 : 0) - (gp.buttons[12]?.pressed ? 1 : 0);
        const lx = Math.abs(gp.axes[0] || 0) > 0.15 ? gp.axes[0] : dpadX * 0.75;
        const ly = Math.abs(gp.axes[1] || 0) > 0.15 ? gp.axes[1] : dpadY * 0.75;
        const rz = Math.abs(gp.axes[3] || 0) > 0.15 ? -gp.axes[3] : 0;
        const trig = (gp.buttons[7]?.value || 0) - (gp.buttons[6]?.value || 0);

        if (lx || ly || rz || Math.abs(trig) > 0.05) {
          lastGamepadMoveTime = performance.now();
          const maxW = (current3DData && current3DData.width) ? current3DData.width : 1024;
          const maxH = (current3DData && current3DData.height) ? current3DData.height : 768;
          const { moveX: gpDx, moveY: gpDy } = transformInputToWorldDelta(lx, ly, Math.hypot(lx, ly) * 14);
          const tx = Math.max(24, Math.min(maxW - 24, p.x + gpDx));
          const ty = Math.max(24, Math.min(maxH - 24, p.y + gpDy));
          if (!checkLocalCollision(tx, ty)) {
            p.x = tx; p.y = ty;
          } else if (!checkLocalCollision(tx, p.y)) {
            p.x = tx;
          } else if (!checkLocalCollision(p.x, ty)) {
            p.y = ty;
          }
          p.z = Math.max(15, Math.min(180, p.z + (rz + trig) * 3));
          p.dirty = 1;
          if (slot === 1) {
            lastPlayerPos.x = p.x;
            lastPlayerPos.y = p.y;
            if (localGamepadPlayers[0]) {
              localGamepadPlayers[0].x = p.x;
              localGamepadPlayers[0].y = p.y;
            }
            if (Math.abs(gpDx) > 0.5 || Math.abs(gpDy) > 0.5) {
              lastFacing = ((gpDy > 0.5 ? 'south' : gpDy < -0.5 ? 'north' : '') + (gpDx > 0.5 ? 'east' : gpDx < -0.5 ? 'west' : '')) || lastFacing;
            }
            updateCoords(p.x, p.y);
            const mySeq = ++moveSeq;
            if (inFlightMoves < 2) {
              dispatchMoveToServer(gpDx, gpDy, p.x, p.y, mySeq);
            } else {
              pendingMoveTarget = { moveX: gpDx, moveY: gpDy, targetX: p.x, targetY: p.y, seq: mySeq };
            }
          }
          updateLocal3DEntityPosition(slot === 1 ? myPlayerId : gpPlayerId, p.x, p.y, lastFacing);
        }

        // Edge-triggered Action Buttons per Gamepad Slot:
        function checkButtonEdge(index, action) {
          const key = `${slot}:${index}`;
          const isPressed = !!gp.buttons[index]?.pressed;
          const wasPressed = !!prevGamepadState[key];
          prevGamepadState[key] = isPressed;
          if (isPressed && !wasPressed) action();
        }

        // Button 0 (A / Cross): Attack / Confirm for this gamepad's character
        checkButtonEdge(0, () => sendCommand('attack', gpPlayerId));
        // Button 1 (B / Circle): Look / Examine
        checkButtonEdge(1, () => sendCommand('look', gpPlayerId));
        // Button 2 (X / Square): Take item
        checkButtonEdge(2, () => promptTake());
        // Button 3 (Y / Triangle): Inventory
        checkButtonEdge(3, () => sendCommand('inventory', gpPlayerId));
        // Button 4 (LB / L1): Cycle stats tabs left
        checkButtonEdge(4, () => {
          const tabs = ['tab-core', 'tab-abilities', 'tab-rests'];
          const activeTab = document.querySelector('.stats-tab-btn.active');
          const currId = activeTab ? activeTab.getAttribute('onclick').match(/'([^']+)'/)[1] : 'tab-core';
          const nextIdx = (tabs.indexOf(currId) - 1 + tabs.length) % tabs.length;
          switchStatsTab(tabs[nextIdx]);
        });
        // Button 5 (RB / R1): Cycle stats tabs right
        checkButtonEdge(5, () => {
          const tabs = ['tab-core', 'tab-abilities', 'tab-rests'];
          const activeTab = document.querySelector('.stats-tab-btn.active');
          const currId = activeTab ? activeTab.getAttribute('onclick').match(/'([^']+)'/)[1] : 'tab-core';
          const nextIdx = (tabs.indexOf(currId) + 1) % tabs.length;
          switchStatsTab(tabs[nextIdx]);
        });
        // Button 8 (Select / Back / Share): Toggle Saves Menu
        checkButtonEdge(8, () => {
          if (saveModal.style.display === 'flex') closeSaveModal();
          else openSaveModal();
        });
        // Button 9 (Start / Options / Menu): Quick Save Game
        checkButtonEdge(9, () => quickSaveGame());
        // Button 10 (L3 / Left Stick Press): Toggle Camera Mode (2D Top-Down -> Iso -> 3rd Person -> 1st Person)
        checkButtonEdge(10, () => {
          const nextMode = cameraMode === '2d' ? 'iso' : cameraMode === 'iso' ? 'tp' : cameraMode === 'tp' ? 'fp' : '2d';
          set3DCameraMode(nextMode);
        });
        // Button 11 (R3 / Right Stick Press): Toggle Grid Overlay
        checkButtonEdge(11, () => toggleGrid());

        // Right Stick X (axis 2): 3D Camera Orbit Yaw
        const rsX = Math.abs(gp.axes[2] || 0) > 0.2 ? gp.axes[2] : 0;
        if (rsX !== 0) {
          if (cameraMode === 'iso') orbitAzimuth -= rsX * 0.04;
          else if (cameraMode === 'tp') tpYawOffset -= rsX * 0.04;
          else if (cameraMode === 'fp') fpYawOffset -= rsX * 0.04;
        }
      }
      if (activeCount > 0 && !gamepadConnected) updateGamepadBadge();
    }

    // 10Hz Binary Input Loop (/i): Packs secondary gamepad players [id, x, y, z] as 16-byte <Ifff records
    // Slot 1 (primary player) communicates authoritatively via /api/move to prevent 12-core CPU thread thrashing
    (async () => {
      while (1) {
        pollGamepads();
        const now = performance.now(), toSend = [];
        for (const k in localGamepadPlayers) {
          if (k === '0' || k === '1') continue; // Slots 0 & 1 move via /api/move
          const p = localGamepadPlayers[k];
          if (p.dirty || now - p.lastSent > 1500) {
            p.dirty = 0; p.lastSent = now;
            toSend.push(p);
          }
        }
        if (toSend.length) {
          const buf = new ArrayBuffer(toSend.length * 16), view = new DataView(buf);
          toSend.forEach((p, idx) => {
            const off = idx * 16;
            view.setUint32(off, p.id, true);
            view.setFloat32(off + 4, p.x, true);
            view.setFloat32(off + 8, p.y, true);
            view.setFloat32(off + 12, p.z, true);
          });
          try { await fetch('/i', { method: 'POST', body: buf }); } catch { await new Promise(r => setTimeout(r, 500)); }
        }
        await new Promise(r => setTimeout(r, 100));
      }
    })();

    function handleForm(e) { e.preventDefault(); const v = cmdInput.value; cmdInput.value = ''; sendCommand(v); }
    function switchStatsTab(id) {
      document.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(id)));
      document.querySelectorAll('.stats-tab-content').forEach(c => c.classList.toggle('active', c.id === id));
    }

    const saveModal = document.getElementById('saveModalOverlay'), savesList = document.getElementById('savesListContainer');
    function openSaveModal() { saveModal.style.display = 'flex'; fetch('/api/saves').then(r => r.json()).then(d => renderSaves(d.saves || [])); }
    function closeSaveModal() { saveModal.style.display = 'none'; }
    function renderSaves(saves) {
      savesList.innerHTML = saves.length ? saves.map(s => { const sn = String(s.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); return `<div class="save-slot-card"><div><b style="color:#f0883e;">💾 ${s.name}</b><div style="font-size:0.75rem;color:#8b949e;">${s.room} | Turn ${s.turn} | ${s.size_bytes} B</div></div><div style="display:flex;gap:6px;"><button class="btn btn-accent" onclick="saveAct('load','${sn}')">Load</button><button class="btn" onclick="const n=prompt('New name:','${sn}');if(n)saveAct('rename','${sn}',n)">Rename</button><button class="btn btn-attack" onclick="saveAct('delete','${sn}')">Del</button></div></div>`; }).join('') : '<div style="color:#8b949e;padding:10px;">No saves yet.</div>';
    }

    const charModal = document.getElementById('charModalOverlay'), charContainer = document.getElementById('charArchetypesContainer');
    let availableArchetypes = [];
    async function openCharacterModal(isInitialJoin = false) {
      if (!charModal) return;
      const closeBtn = document.getElementById('closeCharModalBtn');
      if (closeBtn) closeBtn.style.display = isInitialJoin ? 'none' : 'inline-block';
      charModal.style.display = 'flex';
      const skillArchetypes = window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.hero_archetypes;
      if (Array.isArray(skillArchetypes) && skillArchetypes.length > 0) {
        availableArchetypes = skillArchetypes;
        const used = Object.entries(cachedPartyStats || {}).filter(([pid, st]) => pid !== myPlayerId && st && !st.is_ai && st.class).map(([, st]) => st.class);
        renderArchetypes(availableArchetypes, used);
        return;
      }
      try {
        const resp = await fetch(`/api/archetypes?player_id=${encodeURIComponent(myPlayerId)}`);
        if (resp.ok) {
          const data = await resp.json();
          availableArchetypes = data.archetypes || [];
          renderArchetypes(availableArchetypes, data.used_classes || []);
        }
      } catch (e) {}
    }
    function closeCharacterModal() {
      if (charModal) charModal.style.display = 'none';
    }
    function renderArchetypes(archetypes, usedClasses) {
      if (!charContainer) return;
      const currentChosenIdx = parseInt(sessionStorage.getItem('dnd_chosen_archetype_idx') || '-1', 10);
      const abOrder = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().ability_display_order) || [];
      charContainer.innerHTML = archetypes.map((a, idx) => {
        const isTaken = usedClasses.includes(a.class) && idx !== currentChosenIdx;
        const isCurrent = idx === currentChosenIdx;
        const ab = a.abilities || {};
        const abKeys = abOrder.length ? abOrder : Object.keys(ab);
        const abStr = abKeys.map(k => ab[k] ? `${k} ${ab[k].score}` : '').filter(Boolean).join(' • ');
        const feats = (a.features_2024 || []).slice(0, 2).join(', ');
        return `<div style="background:#0d1117; border:1.5px solid ${isCurrent ? '#2ea043' : (isTaken ? '#30363d' : '#388bfd')}; border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#f0883e; font-size:0.92rem;">🛡️ ${a.name}</b>
              <span style="font-size:0.7rem; padding:2px 6px; border-radius:8px; background:${isTaken ? '#30363d' : 'rgba(56,139,253,0.2)'}; color:${isTaken ? '#8b949e' : '#79c0ff'};">${a.species || 'Hero'} • ${a.class}</span>
            </div>
            <div style="font-size:0.78rem; color:#7ee787; margin-top:4px; font-weight:600;">❤️ HP: ${a.hp} &nbsp;|&nbsp; 🛡️ Guard: ${a.ac} &nbsp;|&nbsp; ⚡ Spd: ${a.speed || 30} ft</div>
            ${abStr ? `<div style="font-size:0.7rem; color:#8b949e; margin-top:4px;">${abStr}</div>` : ''}
            ${feats ? `<div style="font-size:0.7rem; color:#c9d1d9; margin-top:4px;">✨ ${feats}</div>` : ''}
          </div>
          <button class="btn ${isCurrent ? '' : 'btn-accent'}" style="${isCurrent ? 'border-color:#2ea043; color:#7ee787;' : ''}" onclick="selectCharacterArchetype(${idx})">
            ${isCurrent ? '✓ Active Character (Reselect)' : (isTaken ? 'Join as ' + a.name + ' (In Party)' : '▶ Join as ' + a.name)}
          </button>
        </div>`;
      }).join('');
    }
    async function selectCharacterArchetype(idx) {
      try {
        const resp = await fetch('/api/select_character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: myPlayerId, archetype_index: idx, base_id: baseGamepadId })
        });
        if (resp.ok) {
          const data = await resp.json();
          sessionStorage.setItem('dnd_chosen_archetype_idx', String(idx));
          sfx.playSelectHero();
          closeCharacterModal();
          if (data.player_x !== undefined && data.player_y !== undefined) {
            lastPlayerPos.x = data.player_x;
            lastPlayerPos.y = data.player_y;
            if (localGamepadPlayers[0]) {
              localGamepadPlayers[0].x = data.player_x;
              localGamepadPlayers[0].y = data.player_y;
            }
          }
          if (data.char_stats) updateStatsUI(data.char_stats, data.all_player_stats);
          if (data.scene_3d) update3DScene(data.scene_3d);
          if (data.turn !== undefined) lastSyncTurn = data.turn;
          appendLog(`🧙‍♂️ You joined the adventure as ${data.char_stats?.name || 'Hero'} (${data.char_stats?.species || ''} ${data.char_stats?.class || ''})!`, 'log-player');
        }
      } catch (e) { console.error(e); }
    }
    // Automatically prompt new players to choose their preset character when joining (unless joining via invite link)
    setTimeout(() => {
      if (typeof window.__lwCheckInviteJoin === 'function' && window.__lwCheckInviteJoin()) return;
      if (sessionStorage.getItem('dnd_chosen_archetype_idx') === null) openCharacterModal(true);
    }, 150);
    async function saveAct(action, slot, new_slot='') {
      sfx.playSaveAction(action);
      const r = await fetch('/api/saves/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, slot, new_slot, player_id: myPlayerId }) });
      const d = await r.json(); appendLog(d.message, 'log-dm');
      if (action === 'load') { if (d.room_id) currentRoomId = d.room_id; if (d.room_name) currentRoomName = d.room_name; updateCoords(d.player_x, d.player_y); invBadge.innerText = 'Inv: ' + (d.inventory.join(', ') || 'empty'); if (d.inspectable_objects) inspectableObjects = d.inspectable_objects; if (d.char_stats) updateStatsUI(d.char_stats); if (d.scene_3d) update3DScene(d.scene_3d); closeSaveModal(); }
      renderSaves(d.saves || []);
    }
    function createSaveFromModal() { const v = document.getElementById('newSaveInput').value.trim(); if (v) { document.getElementById('newSaveInput').value = ''; saveAct('save', v); } }
    function quickSaveGame() { saveAct('save', 'QuickSave_' + new Date().toISOString().slice(11, 19).replace(/:/g, '-')); }

    // ==========================================
    // OPEN WORLD ATLAS & FAST-TRAVEL SYSTEM
    // ==========================================
    const worldMapModal = document.getElementById('worldMapModalOverlay');
    const worldMapCanvas = document.getElementById('aeonwardWorldMapCanvas');
    const worldMapSectorList = document.getElementById('worldMapSectorList');
    const worldMapHoverInfo = document.getElementById('worldMapHoverInfo');

    function getWorldAtlasData() {
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const c = skills.client || {};
      if (Array.isArray(c.atlas_sectors) && c.atlas_sectors.length) {
        return { sectors: c.atlas_sectors, connections: Array.isArray(c.atlas_connections) ? c.atlas_connections : [] };
      }
      const rooms = Object.entries(skills.rooms || {});
      const cols = Math.max(1, Math.ceil(Math.sqrt(rooms.length || 1)));
      const sectors = rooms.map(([id, r], idx) => ({
        id,
        name: (r && r.name) || id.replace(/_/g, ' '),
        x: 75 + (idx % cols) * 110,
        y: 55 + Math.floor(idx / cols) * 95,
        icon: '📍',
        danger: 'Charted Sector',
        region: skills.title || 'World Region',
      }));
      const connections = [];
      const seen = new Set();
      rooms.forEach(([id, r]) => {
        Object.values((r && r.exits) || {}).forEach(toId => {
          const edge = [id, toId].sort().join('->');
          if (!seen.has(edge)) { seen.add(edge); connections.push([id, toId]); }
        });
      });
      return { sectors, connections };
    }

    function openWorldMapModal() {
      if (!worldMapModal) return;
      worldMapModal.style.display = 'flex';
      renderWorldMapAtlas();
      renderWorldMapSectorList();
    }

    function closeWorldMapModal() {
      if (worldMapModal) worldMapModal.style.display = 'none';
    }

    // Keyboard shortcut [M] to toggle open world atlas (+ Living World hotkeys)
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (typeof window.__lwHandleKey === 'function' && window.__lwHandleKey(e)) return;
      if (e.key === 'm' || e.key === 'M') {
        if (worldMapModal && worldMapModal.style.display === 'flex') {
          closeWorldMapModal();
        } else {
          openWorldMapModal();
        }
      }
    });

    async function executeFastTravel(sectorId) {
      if (!sectorId) return;
      sfx.playDoor();
      closeWorldMapModal();
      sendCommand(`travel ${sectorId}`);
    }

    function renderWorldMapSectorList() {
      if (!worldMapSectorList) return;
      const { sectors } = getWorldAtlasData();
      const curRoom = currentRoomId || (window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.start_room) || '';
      worldMapSectorList.innerHTML = sectors.map(s => {
        const isCur = s.id === curRoom;
        return `
          <div style="background:${isCur ? 'rgba(46, 160, 67, 0.2)' : '#161b22'}; border:1px solid ${isCur ? '#2ea043' : '#30363d'}; border-radius:6px; padding:7px 9px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.15s ease;"
               onclick="executeFastTravel('${s.id}')"
               onmouseenter="highlightWorldMapSector('${s.id}')">
            <div>
              <div style="font-size:0.8rem; font-weight:bold; color:${isCur ? '#7ee787' : '#c9d1d9'};">${s.icon || '📍'} ${s.name}</div>
              <div style="font-size:0.65rem; color:#8b949e;">${s.region || ''} • ${s.danger || ''}</div>
            </div>
            <button class="btn btn-accent" style="padding:2px 8px; font-size:0.68rem;">${isCur ? 'Here' : 'Warp'}</button>
          </div>
        `;
      }).join('');
    }

    function highlightWorldMapSector(sectorId) {
      const { sectors } = getWorldAtlasData();
      const s = sectors.find(item => item.id === sectorId);
      if (s && worldMapHoverInfo) {
        worldMapHoverInfo.innerText = `${s.icon || '📍'} ${s.name} — ${s.region || ''} [${s.danger || ''}]`;
      }
    }

    function renderWorldMapAtlas() {
      if (!worldMapCanvas) return;
      const ctx = worldMapCanvas.getContext('2d');
      if (!ctx) return;

      const W = worldMapCanvas.width, H = worldMapCanvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(56, 139, 253, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 40; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const { sectors, connections } = getWorldAtlasData();
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);

      connections.forEach(([fromId, toId]) => {
        const p1 = sectors.find(s => s.id === fromId);
        const p2 = sectors.find(s => s.id === toId);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);

      const curRoom = currentRoomId || (window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.start_room) || '';

      sectors.forEach(s => {
        const isCur = s.id === curRoom;

        // Node Glow Ring
        ctx.fillStyle = isCur ? 'rgba(46, 160, 67, 0.4)' : 'rgba(200, 164, 92, 0.2)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, isCur ? 16 : 11, 0, Math.PI * 2);
        ctx.fill();

        // Node Core Circle
        ctx.fillStyle = isCur ? '#2ea043' : '#1f2937';
        ctx.strokeStyle = isCur ? '#7ee787' : '#ffd700';
        ctx.lineWidth = isCur ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, isCur ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sector Label
        ctx.fillStyle = isCur ? '#7ee787' : '#e6edf3';
        ctx.font = isCur ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x, s.y + 19);
      });
    }

    // Click on World Map Canvas to Fast Travel to Nearest Sector Node
    if (worldMapCanvas) {
      worldMapCanvas.addEventListener('click', (e) => {
        const rect = worldMapCanvas.getBoundingClientRect();
        const scaleX = worldMapCanvas.width / rect.width;
        const scaleY = worldMapCanvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let closest = null, minD = 36.0;
        getWorldAtlasData().sectors.forEach(s => {
          const d = Math.hypot(s.x - clickX, s.y - clickY);
          if (d < minD) { minD = d; closest = s; }
        });
        if (closest) {
          executeFastTravel(closest.id);
        }
      });

      worldMapCanvas.addEventListener('mousemove', (e) => {
        const rect = worldMapCanvas.getBoundingClientRect();
        const scaleX = worldMapCanvas.width / rect.width;
        const scaleY = worldMapCanvas.height / rect.height;
        const moveX = (e.clientX - rect.left) * scaleX;
        const moveY = (e.clientY - rect.top) * scaleY;

        let hovered = null, minD = 24.0;
        getWorldAtlasData().sectors.forEach(s => {
          const d = Math.hypot(s.x - moveX, s.y - moveY);
          if (d < minD) { minD = d; hovered = s; }
        });
        if (hovered && worldMapHoverInfo) {
          worldMapHoverInfo.innerText = `${hovered.icon || '📍'} ${hovered.name} — ${hovered.region || ''} [Click to Fast-Travel]`;
          worldMapCanvas.style.cursor = 'pointer';
        } else {
          worldMapCanvas.style.cursor = 'crosshair';
        }
      });
    }

    // ==========================================
    // 3D Engine: WebGL / Three.js Room & Object Synthesis
    // ==========================================
    let threeScene, threeCamera, threeRenderer, threeRoomGroup, threeProjectilesGroup = null;
    let threeDynamicEntities = [];
    let ambLight, dirLight, skyDomeMesh = null, cloudParticlesMesh = null, sunMoonMesh = null;
    let cameraMode = 'tp';
    let current3DData = null;
    let textureLoader = null;
    const loaded3DTextures = {};
    let isOrbitDragging = false, prevMouseX = 0, prevMouseY = 0;
    let orbitAzimuth = Math.PI / 4, orbitElevation = Math.PI / 5, orbitDistance = 480;
    let previewOrbitAzimuth = 0, previewOrbitElevation = Math.PI / 8, previewDistance = 42;
    let topDownDistance = 720;
    let tpYawOffset = Math.PI / 2, tpPitchOffset = 0;
    let fpYawOffset = Math.PI / 2, fpPitchOffset = 0;
    let tpDistance = 128, fpFov = 55;
    const baseCameraRefAspect = 1.3333; // Reference aspect ratio (4:3) for consistent horizontal framing
    const baseDefaultFov = 45;

    // Viewport resolution scaling (Auto fill or fixed resolution 640x480 up to 4K 3840x2160)
    let selected3DResolution = 'auto';

    function set3DResolution(resKey) {
      selected3DResolution = resKey || 'auto';
      const cCont = document.getElementById('threeCanvasContainer');
      if (cCont) {
        syncCameraViewport(cCont.clientWidth, cCont.clientHeight);
      }
    }

