    function classifyBiomeFromSkill(roomId, theme) {
      const tType = (theme && theme.type) || '';
      const q = `${roomId || ''} ${tType}`.replace(/_/g, ' ').toLowerCase();
      const rules = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().biome_rules) || {};
      const best = (typeof classifyWithClientCCELM === 'function') ? classifyWithClientCCELM(q, rules, 0.42, null) : null;
      return {
        isSnowBiome: best ? best === 'snow' : tType === 'glacier',
        isDenseForest: best ? best === 'dense_forest' : tType === 'forest',
      };
    }

    function createSkyTexture(period, weather) {
      const atmo = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().atmosphere_presets) || {};
      const periods = atmo.periods || {};
      const pKey = periods[period] ? period : ((typeof classifyWithClientCCELM === 'function' && atmo.period_criteria) ? classifyWithClientCCELM(period, atmo.period_criteria, 0.25, 'morning') : 'morning');
      const sp = periods[pKey] || periods.morning || Object.values(periods)[0] || {};
      const wKey = weather || 'clear';
      return (typeof getOrCreateProcTex === 'function')
        ? getOrCreateProcTex(`sky_${pKey}_${wKey}`, 1024, 512, 'sky', { sp, weather: wKey }, { wrapSky: true, aniso: false, srgb: true })
        : null;
    }

    window.realismFXEnabled = true;
    window.__targetExposure = 1.0;
    function toggleRealismFX() {
      window.realismFXEnabled = !window.realismFXEnabled;
      const btn = document.getElementById('btnToggleRealism');
      if (btn) {
        btn.innerText = window.realismFXEnabled ? '✨ FX: ON' : '✨ FX: OFF';
        btn.classList.toggle('active', window.realismFXEnabled);
      }
    }
    window.toggleRealismFX = toggleRealismFX;

    function freezeStaticHierarchy(rootObj) {
      if (!rootObj) return;
      rootObj.traverse(child => {
        if (child.isMesh || child.isGroup || child.isPoints) {
          if (child.userData && (child.userData.isLocalPlayer || child.userData.entityId || child.userData.isDynamic)) {
            return;
          }
          // Tip 34: Disable matrixAutoUpdate on static meshes & props
          child.matrixAutoUpdate = false;
          child.updateMatrix();

          // Tip 36: Ensure accurate tight bounding volumes for frustum culling
          if (child.isMesh && child.geometry) {
            child.frustumCulled = true;
            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
            if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
          }

          // Tip 58: Be selective with castShadow and receiveShadow on distant scenery props
          if (child.isMesh && child.userData && child.userData.isScenery) {
            child.castShadow = false; // Disable heavy shadow passes on distant decorative trees & crags
          }
        }
      });
    }

    function init3DWorld() {
      const _I = Object.assign(Object.create(null), {container: undefined, aspect: undefined, renderOptions: undefined, shWidth: undefined, shHeight: undefined, bounceLight: undefined, rimLight: undefined, dracoLoader: undefined, ktx2Loader: undefined, gltfLoader: undefined, mouseDownScreenPos: undefined, dragDistanceTraveled: undefined, handleTacticalMouseClick: undefined, spawnTacticalMovePing: undefined, findPathToTarget: undefined, startTacticalMouseMovement: undefined, hoverRaycaster: undefined, hoverMouseNDC: undefined, threeTooltip: undefined, activeHoveredTakeableItem: undefined, fpsLastTime: undefined, fpsFrameCount: undefined, currentFps: undefined, fpsBadge: undefined, perfHistory: undefined, consecutiveLowFpsCount: undefined, consecutiveHighFpsCount: undefined, dynamicPixelRatio: undefined, perfMetrics: undefined, lastHudUpdateTime: undefined, drawPerfSparkline: undefined, updateAdvancedPerformanceHUD: undefined, updateFpsMetrics: undefined, render3DFrame: undefined, preloadAllSceneAssetsAndWarmup: undefined});
      if (init3DWorld_p1(_I) === false) return;
      if (init3DWorld_p2(_I) === false) return;
      if (init3DWorld_p3(_I) === false) return;
    }


    function init3DWorld_p1(_I) {
      with (_I) {

      const _clickNDC = new THREE.Vector2();
      const _clickRaycaster = new THREE.Raycaster();
      handleTacticalMouseClick = function handleTacticalMouseClick(e, rect) {
        if (!threeCamera || !threeRoomGroup || cameraMode === 'preview') return;
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        _clickNDC.set(
          (relX / rect.width) * 2 - 1,
          -(relY / rect.height) * 2 + 1
        );

        _clickRaycaster.setFromCamera(_clickNDC, threeCamera);
        const clickTargets = [];
        for (let ci = 0; ci < threeRoomGroup.children.length; ci++) {
          const ch = threeRoomGroup.children[ci];
          if (!ch || !ch.visible) continue;
          if (ch.userData && ch.userData.isScenery) continue;
          if (ch.userData && ch.userData.isStaticRoomGroup) {
            for (let si = 0; si < ch.children.length; si++) {
              const sch = ch.children[si];
              if (!sch || !sch.visible) continue;
              const u = sch.userData;
              if (u && (u.isScenery || u.isGridOverlay || u.isOuterTerrain)) continue;
              if (u && (u.isFloor || u.isPortal || u.hoverInfo)) clickTargets.push(sch);
            }
            continue;
          }
          if (ch.userData && ch.userData.entityId) {
            if (ch.userData.hitboxMesh) clickTargets.push(ch.userData.hitboxMesh);
            continue;
          }
          clickTargets.push(ch);
        }
        const hits = _clickRaycaster.intersectObjects(clickTargets, true);

        let clickedMonster = null;
        let clickedNpc = null;
        let clickedMountable = null;
        let clickedItem = null;
        let clickedPortal = null;
        let floorPoint = null;

        for (const hit of hits) {
          if (!hit.object || hit.object.isSprite) continue;
          let curr = hit.object;
          let isFloor = false;
          let entity = null;
          let portalObj = null;
          while (curr && curr !== threeRoomGroup) {
            if (curr.userData) {
              if (curr.userData.isFloor) { isFloor = true; break; }
              if (curr.userData.isPortal || (curr.userData.hoverInfo && curr.userData.hoverInfo.tag === 'Portal')) {
                if (!portalObj) portalObj = curr.userData.portalData || curr.userData;
              }
              if (curr.userData.hoverInfo && !entity) entity = curr.userData;
            }
            curr = curr.parent;
          }
          if (isFloor && !floorPoint) {
            floorPoint = hit.point;
          }
          if (portalObj && !clickedPortal) {
            clickedPortal = portalObj;
          }
          if (entity && entity.hoverInfo) {
            if (entity.hoverInfo.tag === 'Monster' && !clickedMonster) {
              clickedMonster = entity;
            } else if (entity.hoverInfo.tag === 'NPC' && !clickedNpc) {
              clickedNpc = entity;
            } else if (entity.hoverInfo.tag === 'Mountable' && !clickedMountable) {
              clickedMountable = entity;
            } else if (entity.hoverInfo.tag === 'Item' && !clickedItem) {
              clickedItem = entity;
            }
          }
        }

        const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
        const H = (current3DData && current3DData.height) ? current3DData.height : 768;

        // Check if floorPoint falls directly inside any known portal rectangle
        if (!clickedPortal && floorPoint && current3DData && Array.isArray(current3DData.portals)) {
          const fx = floorPoint.x + W / 2;
          const fy = floorPoint.z + H / 2;
          for (const p of current3DData.portals) {
            if (p && Array.isArray(p.rect)) {
              const [rx, ry, rw, rh] = p.rect;
              if (fx >= rx - 10 && fx <= rx + rw + 10 && fy >= ry - 10 && fy <= ry + rh + 10) {
                clickedPortal = p;
                break;
              }
            }
          }
        }

        // Tactical Right-Click: Direct Combat Attack against Monster or closest enemy
        if (e.button === 2) {
          if (clickedMonster) {
            sendCommand('attack');
            spawnAeonwardFloatingDamage(clickedMonster.targetX !== undefined ? (clickedMonster.targetX + W / 2) : (lastPlayerPos.x + 30),
                                   clickedMonster.targetZ !== undefined ? (clickedMonster.targetZ + H / 2) : lastPlayerPos.y,
                                   'ATTACK!', 'hit');
          } else {
            sendCommand('attack');
          }
          return;
        }

        // Tactical Left-Click:
        // 1. If clicking or hovering over a takeable item -> Take it immediately
        // 2. If clicking a monster -> Trigger attack or examine
        // 3. If clicking a portal / passage -> Walk to portal and trigger travel transition
        // 4. Otherwise -> Select target ground point and pathfind/walk character directly there
        if (e.button === 0) {
          const itemToTake = clickedItem || activeHoveredTakeableItem;
          if (itemToTake) {
            const itemHover = itemToTake.hoverInfo || {};
            const itemName = itemHover.name || (itemToTake.raw_name || itemToTake.name);
            if (itemName) {
              sendCommand('take ' + itemName);
            } else {
              promptTake();
            }
            setTimeout(refreshTakeDropdown, 350);
            return;
          }
          if (clickedMonster) {
            sendCommand('attack');
            return;
          }
          if (clickedNpc) {
            const npcName = (clickedNpc.hoverInfo && clickedNpc.hoverInfo.name) ? clickedNpc.hoverInfo.name.replace(/\s*\(.*?\)/, '').trim() : 'npc';
            sendCommand('talk to ' + npcName);
            return;
          }

          if (clickedMountable) {
            if (clickedMountable.mountCommand === 'sky_dragon' && window.__dragonCtrl && window.__dragonCtrl.mount) {
              window.__dragonCtrl.mount();
              return;
            }
            sendCommand('mount ' + (clickedMountable.mountCommand || 'peddler'));
            return;
          }

          if (clickedPortal) {
            // Visual feedback: Tactical blue-gold movement ping ring at portal target
            spawnTacticalMovePing(relX, relY);

            const pr = Array.isArray(clickedPortal.rect) ? clickedPortal.rect : [clickedPortal.portalTargetX || (floorPoint ? floorPoint.x + W/2 : lastPlayerPos.x), clickedPortal.portalTargetY || (floorPoint ? floorPoint.z + H/2 : lastPlayerPos.y), 40, 40];
            const pTargetX = Math.round(pr[0] + pr[2] / 2);
            const pTargetY = Math.round(pr[1] + pr[3] / 2);
            const curX = lastPlayerPos.x || 140;
            const curY = lastPlayerPos.y || 390;
            const distToPortal = Math.hypot(pTargetX - curX, pTargetY - curY);

            // If already within reach of the portal (< 75px), trigger travel immediately
            if (distToPortal < 75) {
              const dir = clickedPortal.direction || 'go';
              sendCommand(dir);
              return;
            }

            // Otherwise, navigate towards the portal and trigger travel upon arrival
            startTacticalMouseMovement(pTargetX, pTargetY, clickedPortal);
            return;
          }

          if (floorPoint) {
            const worldTargetX = Math.round(Math.max(32, Math.min(W - 32, floorPoint.x + W / 2)));
            const worldTargetY = Math.round(Math.max(32, Math.min(H - 32, floorPoint.z + H / 2)));

            // Visual feedback: Tactical blue-gold movement ping ring at target floor location
            spawnTacticalMovePing(relX, relY);

            // Trigger smooth navigation step towards target point
            startTacticalMouseMovement(worldTargetX, worldTargetY);
          }
        }
      };

      spawnTacticalMovePing = function spawnTacticalMovePing(screenX, screenY) {
        const ping = document.createElement('div');
        ping.className = 'tactical-move-ping';
        ping.style.left = `${screenX}px`;
        ping.style.top = `${screenY}px`;
        container.appendChild(ping);
        setTimeout(() => { if (ping.parentNode) ping.parentNode.removeChild(ping); }, 450);
      };

      // Typed-array Binary Min-Heap A* Pathfinding around obstacles (Grid resolution: 32px)
      const _A_DIRS = [1, 0, 1.0, -1, 0, 1.0, 0, 1, 1.0, 0, -1, 1.0, 1, 1, 1.414, -1, 1, 1.414, 1, -1, 1.414, -1, -1, 1.414];
      findPathToTarget = function findPathToTarget(startX, startY, targetX, targetY, targetPortal = null) {
        const GRID_STEP = 32;
        const W = (current3DData && current3DData.width) ? current3DData.width : 1024;
        const H = (current3DData && current3DData.height) ? current3DData.height : 768;
        const cols = Math.floor(W / GRID_STEP);
        const rows = Math.floor(H / GRID_STEP);
        const startCol = Math.max(0, Math.min(cols - 1, Math.round(startX / GRID_STEP)));
        const startRow = Math.max(0, Math.min(rows - 1, Math.round(startY / GRID_STEP)));
        const targetCol = Math.max(0, Math.min(cols - 1, Math.round(targetX / GRID_STEP)));
        const targetRow = Math.max(0, Math.min(rows - 1, Math.round(targetY / GRID_STEP)));

        if (startCol === targetCol && startRow === targetRow) return [{ x: targetX, y: targetY }];

        const total = cols * rows;
        const blockedCache = new Int8Array(total).fill(-1);
        const pRect = (targetPortal && Array.isArray(targetPortal.rect)) ? targetPortal.rect : null;
        function isCellBlocked(c, r) {
          const idx = r * cols + c;
          const cached = blockedCache[idx];
          if (cached !== -1) return cached === 1;
          const cx = c * GRID_STEP + 16, cy = r * GRID_STEP + 16;
          let blk = false;
          if (!pRect || cx < pRect[0] || cx > pRect[0] + pRect[2] || cy < pRect[1] || cy > pRect[1] + pRect[3]) {
            blk = Boolean(checkLocalCollision(cx, cy));
          }
          blockedCache[idx] = blk ? 1 : 0;
          return blk;
        }

        const startIdx = startRow * cols + startCol;
        const targetIdx = targetRow * cols + targetCol;
        const gScore = new Float32Array(total).fill(1e9);
        const cameFrom = new Int32Array(total).fill(-1);
        const closed = new Uint8Array(total);
        const heapNode = new Int32Array(total * 2 + 16);
        const heapF = new Float32Array(total * 2 + 16);
        let heapLen = 0;

        function heapPush(nodeIdx, fVal) {
          let i = heapLen++;
          while (i > 0) {
            const p = (i - 1) >> 1;
            if (heapF[p] <= fVal) break;
            heapNode[i] = heapNode[p]; heapF[i] = heapF[p];
            i = p;
          }
          heapNode[i] = nodeIdx; heapF[i] = fVal;
        }
        function heapPop() {
          const top = heapNode[0];
          const lastN = heapNode[--heapLen], lastF = heapF[heapLen];
          if (heapLen > 0) {
            let i = 0;
            const half = heapLen >> 1;
            while (i < half) {
              let ch = (i << 1) + 1;
              if (ch + 1 < heapLen && heapF[ch + 1] < heapF[ch]) ch++;
              if (lastF <= heapF[ch]) break;
              heapNode[i] = heapNode[ch]; heapF[i] = heapF[ch];
              i = ch;
            }
            heapNode[i] = lastN; heapF[i] = lastF;
          }
          return top;
        }

        gScore[startIdx] = 0;
        let closestIdx = startIdx;
        let closestDist = Math.hypot(startCol - targetCol, startRow - targetRow);
        heapPush(startIdx, closestDist);
        let iterations = 0;

        while (heapLen > 0 && iterations < 600) {
          const currIdx = heapPop();
          if (closed[currIdx]) continue;
          closed[currIdx] = 1;
          iterations++;

          const cc = currIdx % cols, cr = (currIdx / cols) | 0;
          const distToTarget = Math.hypot(cc - targetCol, cr - targetRow);
          if (distToTarget < closestDist) { closestDist = distToTarget; closestIdx = currIdx; }

          if (currIdx === targetIdx) {
            const path = [];
            let cur = currIdx;
            while (cameFrom[cur] !== -1) {
              path.push({ x: (cur % cols) * GRID_STEP + 16, y: ((cur / cols) | 0) * GRID_STEP + 16 });
              cur = cameFrom[cur];
            }
            path.reverse();
            path.push({ x: targetX, y: targetY });
            return path;
          }

          const curG = gScore[currIdx];
          for (let k = 0; k < 24; k += 3) {
            const nc = cc + _A_DIRS[k], nr = cr + _A_DIRS[k + 1];
            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
            const nIdx = nr * cols + nc;
            if (closed[nIdx] || isCellBlocked(nc, nr)) continue;
            if (_A_DIRS[k] !== 0 && _A_DIRS[k + 1] !== 0) {
              if (isCellBlocked(cc + _A_DIRS[k], cr) || isCellBlocked(cc, cr + _A_DIRS[k + 1])) continue;
            }
            const tentG = curG + _A_DIRS[k + 2];
            if (tentG < gScore[nIdx]) {
              cameFrom[nIdx] = currIdx;
              gScore[nIdx] = tentG;
              heapPush(nIdx, tentG + Math.hypot(nc - targetCol, nr - targetRow));
            }
          }
        }

        const fallback = [];
        let cur = closestIdx;
        while (cameFrom[cur] !== -1) {
          fallback.push({ x: (cur % cols) * GRID_STEP + 16, y: ((cur / cols) | 0) * GRID_STEP + 16 });
          cur = cameFrom[cur];
        }
        fallback.reverse();
        return fallback.length > 0 ? fallback : [{ x: targetX, y: targetY }];
      };

      startTacticalMouseMovement = function startTacticalMouseMovement(targetX, targetY, targetPortal = null) {
        if (tacticalMoveInterval) clearInterval(tacticalMoveInterval);
        activeTacticalTargetPortal = targetPortal;

        const curX = lastPlayerPos.x || 140;
        const curY = lastPlayerPos.y || 390;

        // Compute intelligent path around scenery & obstacle bounding boxes
        activeTacticalPath = findPathToTarget(curX, curY, targetX, targetY, targetPortal);
        if (!activeTacticalPath || activeTacticalPath.length === 0) return;

        tacticalMoveInterval = setInterval(() => {
          if (activeKeys.size > 0 || isMoving) {
            clearInterval(tacticalMoveInterval);
            tacticalMoveInterval = null;
            activeTacticalPath = [];
            activeTacticalTargetPortal = null;
            return;
          }

          const curPos = { x: lastPlayerPos.x || 140, y: lastPlayerPos.y || 390 };

          // If targeting a portal, check if we arrived within trigger range of the portal
          if (activeTacticalTargetPortal) {
            const pr = Array.isArray(activeTacticalTargetPortal.rect) ? activeTacticalTargetPortal.rect : [targetX - 20, targetY - 20, 40, 40];
            const pCenterX = pr[0] + pr[2] / 2;
            const pCenterY = pr[1] + pr[3] / 2;
            const distToPortal = Math.hypot(pCenterX - curPos.x, pCenterY - curPos.y);
            const inPortalRect = (curPos.x >= pr[0] - 15 && curPos.x <= pr[0] + pr[2] + 15 && curPos.y >= pr[1] - 15 && curPos.y <= pr[1] + pr[3] + 15);
            if (inPortalRect || distToPortal < 55) {
              const dir = activeTacticalTargetPortal.direction || 'go';
              clearInterval(tacticalMoveInterval);
              tacticalMoveInterval = null;
              activeTacticalPath = [];
              activeTacticalTargetPortal = null;
              sendCommand(dir);
              return;
            }
          }

          if (activeTacticalPath.length === 0) {
            if (activeTacticalTargetPortal) {
              const dir = activeTacticalTargetPortal.direction || 'go';
              activeTacticalTargetPortal = null;
              sendCommand(dir);
            }
            clearInterval(tacticalMoveInterval);
            tacticalMoveInterval = null;
            return;
          }

          const waypoint = activeTacticalPath[0];
          const dist = Math.hypot(waypoint.x - curPos.x, waypoint.y - curPos.y);

          // If reached or very close to current waypoint, advance to next waypoint
          if (dist < 22) {
            activeTacticalPath.shift();
            if (activeTacticalPath.length === 0) {
              if (activeTacticalTargetPortal) {
                const dir = activeTacticalTargetPortal.direction || 'go';
                activeTacticalTargetPortal = null;
                sendCommand(dir);
              }
              clearInterval(tacticalMoveInterval);
              tacticalMoveInterval = null;
              return;
            }
          }

          const nextWp = activeTacticalPath[0];
          const wpDist = Math.hypot(nextWp.x - curPos.x, nextWp.y - curPos.y);
          if (wpDist < 10) {
            activeTacticalPath.shift();
            return;
          }

          const stepSize = Math.min(wpDist, 40);
          const dx = ((nextWp.x - curPos.x) / wpDist) * stepSize;
          const dy = ((nextWp.y - curPos.y) / wpDist) * stepSize;
          doMoveStep(dx, dy);
        }, 65);
      };
      }
    }

    function init3DWorld_p2(_I) {
      with (_I) {

      drawPerfSparkline = function drawPerfSparkline() {
        const chartCanvas = document.getElementById('perfChartCanvas');
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');
        const w = chartCanvas.width;
        const h = chartCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Subtle guide grid lines at 60 FPS (top) and 30 FPS (mid)
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25);
        ctx.moveTo(0, h * 0.62); ctx.lineTo(w, h * 0.62);
        ctx.stroke();

        const samples = 60;
        const stepX = w / (samples - 1);

        // Helper to draw series line
        function drawSeries(arr, maxVal, color) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < samples; i++) {
            const bufIdx = (perfHistory.idx + i) % samples;
            const val = arr[bufIdx] || 0;
            const normY = Math.max(0, Math.min(1, val / maxVal));
            const y = h - (normY * (h - 4)) - 2;
            const x = i * stepX;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        drawSeries(perfHistory.fps, 160, '#7ee787'); // Green: FPS (0 - 160)
        drawSeries(perfHistory.cpu, 10, '#58a6ff');  // Blue: CPU ms (0 - 10ms high precision)
        drawSeries(perfHistory.gpu, 10, '#f0883e');  // Orange: GPU ms (0 - 10ms high precision)
      };

      updateAdvancedPerformanceHUD = function updateAdvancedPerformanceHUD(now) {
        if (!showPerfHUD) return;
        if (now - lastHudUpdateTime < 150) return; // Refresh UI text @ ~6.6Hz to save DOM work
        lastHudUpdateTime = now;

        const elFps = document.getElementById('perfMetricFps');
        const elCpu = document.getElementById('perfMetricCpu');
        const elGpu = document.getElementById('perfMetricGpu');
        const elCalls = document.getElementById('perfMetricDrawCalls');
        const elTris = document.getElementById('perfMetricTriangles');
        const elMem = document.getElementById('perfMetricMem');
        const elBackend = document.getElementById('perfBackendBadge');

        const elSim = document.getElementById('perfStepSim');
        const elCam = document.getElementById('perfStepCam');
        const elAudio = document.getElementById('perfStepAudio');
        const elFx = document.getElementById('perfStepFx');
        const elRender = document.getElementById('perfStepRender');
        const elAdaptive = document.getElementById('perfAdaptiveStatus');

        if (elBackend && threeRenderer) {
          const isWebGPU = (typeof THREE.WebGPURenderer === 'function' && threeRenderer instanceof THREE.WebGPURenderer);
          elBackend.innerText = isWebGPU ? 'WebGPU' : 'WebGL 2';
          elBackend.style.background = isWebGPU ? '#1f6feb' : '#8957e5';
        }

        if (elFps) elFps.innerText = String(perfMetrics.fps);
        if (elCpu) elCpu.innerText = `${perfMetrics.cpuTime < 1.0 ? perfMetrics.cpuTime.toFixed(2) : perfMetrics.cpuTime.toFixed(1)} ms`;
        if (elGpu) elGpu.innerText = `${perfMetrics.gpuTime < 1.0 ? perfMetrics.gpuTime.toFixed(2) : perfMetrics.gpuTime.toFixed(1)} ms`;
        if (elCalls) elCalls.innerText = String(perfMetrics.drawCalls);
        if (elTris) elTris.innerText = (perfMetrics.triangles > 1000) ? `${(perfMetrics.triangles / 1000).toFixed(1)}k` : String(perfMetrics.triangles);
        
        // Memory stats from performance.memory or renderer.info (Tip 94)
        if (elMem) {
          const jsMem = (window.performance && window.performance.memory) ? (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(0) : '--';
          elMem.innerText = `${jsMem}MB / ${perfMetrics.geometries}g`;
        }

        // Detailed animation loop profiling steps (Tip 99)
        if (elSim) elSim.innerText = `${perfMetrics.simMs < 1.0 ? perfMetrics.simMs.toFixed(3) : perfMetrics.simMs.toFixed(2)} ms`;
        if (elCam) elCam.innerText = `${perfMetrics.camMs < 1.0 ? perfMetrics.camMs.toFixed(3) : perfMetrics.camMs.toFixed(2)} ms`;
        if (elAudio) elAudio.innerText = `${perfMetrics.audioMs < 1.0 ? perfMetrics.audioMs.toFixed(3) : perfMetrics.audioMs.toFixed(2)} ms`;
        if (elFx) elFx.innerText = `${perfMetrics.fxMs < 1.0 ? perfMetrics.fxMs.toFixed(3) : perfMetrics.fxMs.toFixed(2)} ms`;
        if (elRender) elRender.innerText = `${perfMetrics.renderMs < 1.0 ? perfMetrics.renderMs.toFixed(3) : perfMetrics.renderMs.toFixed(2)} ms`;

        if (elAdaptive) {
          elAdaptive.innerText = `Stable High-Perf (1.0x DPR)`;
          elAdaptive.style.color = '#7ee787';
        }

        drawPerfSparkline();
      };

      updateFpsMetrics = function updateFpsMetrics(time) {
        fpsFrameCount++;
        if (time >= fpsLastTime + 1000) {
          currentFps = Math.round((fpsFrameCount * 1000) / (time - fpsLastTime));
          perfMetrics.fps = currentFps;

          // Stable fixed high performance mode: lock pixel ratio to 1.0 to prevent hitching from dynamic reallocation
          if (threeRenderer && threeRenderer.getPixelRatio() !== 1.0) {
            threeRenderer.setPixelRatio(1.0);
          }

          if (fpsBadge) {
            fpsBadge.innerText = `⚡ ${currentFps} FPS`;
            if (currentFps >= 120) {
              fpsBadge.className = 'threed-fps-badge';
            } else if (currentFps >= 60) {
              fpsBadge.className = 'threed-fps-badge';
            } else if (currentFps >= 30) {
              fpsBadge.className = 'threed-fps-badge warning';
            } else {
              fpsBadge.className = 'threed-fps-badge critical';
            }
          }
          fpsLastTime = time;
          fpsFrameCount = 0;
        }
      };

      let _lastFrameTs = 0;
      let _lastGpuTsPoll = 0;
      render3DFrame = function render3DFrame(ts) {
        const frameStart = performance.now();
        const timeNow = (typeof ts === 'number' && ts > 0) ? ts : frameStart;
        const dtSec = _lastFrameTs > 0 ? Math.min(0.05, Math.max(0.001, (timeNow - _lastFrameTs) * 0.001)) : 0.016;
        _lastFrameTs = timeNow;

        // Profiler Step 1: FPS calculation
        updateFpsMetrics(timeNow);

        // Profiler Step 2: Simulation / entity smooth interpolation
        const tSim0 = performance.now();
        stepSmooth3DEntities(dtSec);
        if (typeof window.__lwTick === 'function') window.__lwTick(dtSec, timeNow);
        if (typeof window.__stepOutdoorScenery === 'function') window.__stepOutdoorScenery(dtSec, timeNow);
        perfMetrics.simMs = performance.now() - tSim0;

        // Profiler Step 3: Camera & Viewport updates
        const tCam0 = performance.now();
        update3DCamera();
        if (typeof updateAeonwardCompassStrip === 'function' && current3DData) {
          if (!render3DFrame._lastCompassUpdate || (timeNow - render3DFrame._lastCompassUpdate) > 60) {
            render3DFrame._lastCompassUpdate = timeNow;
            updateAeonwardCompassStrip(current3DData);
          }
        }
        perfMetrics.camMs = performance.now() - tCam0;

        if (cachedProcTex && cachedProcTex.water) {
          cachedProcTex.water.offset.x = (timeNow * 0.00035) % 1;
          cachedProcTex.water.offset.y = (timeNow * 0.00018) % 1;
        }
        if (cachedProcTex && cachedProcTex.norm_water) {
          cachedProcTex.norm_water.offset.x = (timeNow * -0.00028) % 1;
          cachedProcTex.norm_water.offset.y = (timeNow * 0.00042) % 1;
        }
        // Tier 1 #5: Smooth brightness adaptation between dark interiors and sunlit outdoors
        if (threeRenderer && typeof window.__targetExposure === 'number') {
          const curExp = threeRenderer.toneMappingExposure || 1.0;
          threeRenderer.toneMappingExposure = curExp + (window.__targetExposure - curExp) * Math.min(1.0, dtSec * 1.8);
        }
        if (typeof window.__tickRealismEnvironment === 'function') {
          window.__tickRealismEnvironment(dtSec, timeNow);
        }

        // Profiler Step 4: Web Audio 3D Spatial Listener (Throttled to 30Hz)
        const tAudio0 = performance.now();
        if (threeCamera && sfx && sfx.ctx && (timeNow - (sfx._lastAudioListenerUpdate || 0) > 33)) {
          sfx._lastAudioListenerUpdate = timeNow;
          const cp = threeCamera.position;
          if (!sfx._camDirV) sfx._camDirV = new THREE.Vector3();
          threeCamera.getWorldDirection(sfx._camDirV);
          const cu = threeCamera.up;
          sfx.updateListener(cp.x, cp.y, cp.z, sfx._camDirV.x, sfx._camDirV.y, sfx._camDirV.z, cu.x, cu.y, cu.z);
        }
        perfMetrics.audioMs = performance.now() - tAudio0;

        // Profiler Step 5: Visual FX & Combat animations
        const tFx0 = performance.now();
        if (typeof update3DCombatAnimations === 'function') {
          update3DCombatAnimations(timeNow);
        }
        if (typeof update3DVictoryCelebration === 'function') {
          update3DVictoryCelebration(timeNow);
        }
        perfMetrics.fxMs = performance.now() - tFx0;

        // Profiler Step 6: Three.js Render Pass (TSL RenderPipeline or direct fallback)
        const tRender0 = performance.now();
        const usePipeline = window.realismFXEnabled && window.__threePipeline && cameraMode !== '2d' && !window.__pipelineFailed;
        if (usePipeline) {
          try {
            window.__threePipeline.render();
          } catch (pipeErr) {
            window.__pipelineFailed = true;
            console.warn('RenderPipeline fallback to direct render:', pipeErr);
            threeRenderer.render(threeScene, threeCamera);
          }
        } else {
          threeRenderer.render(threeScene, threeCamera);
        }
        perfMetrics.renderMs = performance.now() - tRender0;

        // CPU frame total time
        const frameEnd = performance.now();
        perfMetrics.cpuTime = frameEnd - frameStart;

        // Tip 94 & 97: Read renderer.info & gate WebGPU timestamp queries on active Perf HUD
        if (threeRenderer.info) {
          const rInfo = threeRenderer.info;
          const rRender = rInfo.render || {};
          perfMetrics.drawCalls = (rRender.frameCalls !== undefined) ? rRender.frameCalls : (rRender.calls || rRender.drawCalls || 0);
          perfMetrics.triangles = rRender.triangles || 0;
          if (rInfo.memory) {
            perfMetrics.geometries = rInfo.memory.geometries || 0;
            perfMetrics.textures = rInfo.memory.textures || 0;
          }

          if (showPerfHUD) {
            const gpuTs = (rInfo.render && (typeof rInfo.render.timestamp === 'number' ? rInfo.render.timestamp : (rInfo.timestamp || 0)));
            if (gpuTs > 0) {
              perfMetrics.gpuTime = gpuTs;
            } else {
              perfMetrics.gpuTime = Math.max(0.1, perfMetrics.renderMs * 0.92);
            }
            if (typeof threeRenderer.resolveTimestampsAsync === 'function' && (timeNow - _lastGpuTsPoll) >= 150) {
              _lastGpuTsPoll = timeNow;
              try {
                threeRenderer.resolveTimestampsAsync('render').then(tsVal => {
                  if (typeof tsVal === 'number' && tsVal > 0) perfMetrics.gpuTime = tsVal;
                }).catch(() => {});
              } catch (e) {}
            }
          }
        }

        // Push into rolling sparkline circular buffer only when Perf HUD is visible
        if (showPerfHUD) {
          const bufIdx = perfHistory.idx;
          perfHistory.fps[bufIdx] = currentFps;
          perfHistory.cpu[bufIdx] = perfMetrics.cpuTime;
          perfHistory.gpu[bufIdx] = perfMetrics.gpuTime;
          perfHistory.idx = (bufIdx + 1) % 60;
          updateAdvancedPerformanceHUD(frameEnd);
        }
      };

      // Multi-core Pre-generation & Shader Warmup Routine (Full World Build + CPU Workers + GPU Shader Compile)
      preloadAllSceneAssetsAndWarmup = function preloadAllSceneAssetsAndWarmup(forceRebuild = false) {
        if (window.__DND_PREWARM_PROMISE__ && !forceRebuild) return window.__DND_PREWARM_PROMISE__;
        const p = (async () => {
        const overlay = document.getElementById('scenePreloadOverlay');
        const statusText = document.getElementById('preloadStatusText');
        const progressBar = document.getElementById('preloadProgressBar');
        const subText = document.getElementById('preloadSubText');

        const updateProgress = (pct, title, detail) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (statusText && title) statusText.textContent = title;
          if (subText && detail) subText.textContent = detail;
        };
        const dismissOverlayFast = () => {
          if (!overlay || (overlay.dataset && overlay.dataset.dismissed === '1')) return;
          if (overlay.dataset) overlay.dataset.dismissed = '1';
          overlay.style.pointerEvents = 'none';
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.style.display = 'none'; }, 140);
        };
        const yieldIdle = () => new Promise(res => (typeof requestIdleCallback === 'function')
          ? requestIdleCallback(() => res(), { timeout: 24 }) : setTimeout(res, 0));

        const _glbInflight = window.__DND_GLB_INFLIGHT__ || (window.__DND_GLB_INFLIGHT__ = {});
        const loadCachedGltf = (url) => {
          const modelCache = window.__DND_MODEL_CACHE__ || (window.__DND_MODEL_CACHE__ = {});
          if (modelCache[url]) return Promise.resolve(modelCache[url]);
          if (_glbInflight[url]) return _glbInflight[url];
          const gltfLoader = window.__DND_LOADERS__ && window.__DND_LOADERS__.gltf;
          if (!gltfLoader) return Promise.resolve(null);
          const job = (async () => {
            if (typeof caches !== 'undefined' && typeof gltfLoader.parse === 'function') {
              try {
                const c = await caches.open('aeonward-glb-v3');
                let r = await c.match(url);
                if (!r) {
                  r = await fetch(url);
                  if (r && r.ok) { const cl = r.clone(); c.put(url, cl).catch(() => {}); }
                }
                if (r && r.ok) {
                  const buf = await r.arrayBuffer();
                  const gltf = await new Promise((res, rej) => gltfLoader.parse(buf, '', res, rej));
                  modelCache[url] = gltf;
                  return gltf;
                }
              } catch (e) {}
            }
            return new Promise(res => {
              gltfLoader.load(url, g => { modelCache[url] = g; res(g); }, undefined, () => res(null));
            });
          })().finally(() => { delete _glbInflight[url]; });
          _glbInflight[url] = job;
          return job;
        };
        window.__loadCachedGltf = loadCachedGltf;

        try {
          if (forceRebuild === 'nocache' && typeof clearPrebuildCache === 'function') await clearPrebuildCache();
          const cacheStats = (window.__DND_PREBUILD_CACHE_STATS__ = { texHits: 0, texMisses: 0, terrainHits: 0, terrainMisses: 0, floorHits: 0, floorMisses: 0, manifestHit: false });
          updateProgress(15, 'Initializing Active Realm...', 'Hydrating local cache & textures');
          const dbRecs = (typeof loadPrebuildCacheRecords === 'function') ? await loadPrebuildCacheRecords() : {};
          const texWarmPromise = (typeof prewarmProcTexturesInWorkers === 'function')
            ? prewarmProcTexturesInWorkers(dbRecs, cacheStats) : Promise.resolve();

          const cfgHash = window.__DND_CONFIG__ && window.__DND_CONFIG__.manifestHash;
          const cachedManRec = (cfgHash && dbRecs['meta:manifest'] && dbRecs['meta:manifest'].sig === cfgHash && dbRecs['meta:manifest'].val) ? dbRecs['meta:manifest'].val : null;
          const fetchManifestWithRetry = async () => {
            const url = cachedManRec ? `/api/preload_assets?known_hash=${encodeURIComponent(cfgHash)}` : '/api/preload_assets';
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const r = await fetch(url);
                if (r.ok) return await r.json();
                if (attempt < 2 && (r.status === 502 || r.status === 503 || r.status === 504)) {
                  await new Promise(res => setTimeout(res, 400));
                  continue;
                }
                throw new Error('Failed to load asset manifest: ' + r.status);
              } catch (e) {
                if (attempt >= 2) throw e;
                await new Promise(res => setTimeout(res, 400));
              }
            }
          };
          const rawManifest = await fetchManifestWithRetry();
          let manifest = rawManifest;
          if (rawManifest && rawManifest.cached && cachedManRec) {
            cacheStats.manifestHit = true;
            const mergedRooms = {};
            for (const [rk, rv] of Object.entries(cachedManRec.rooms || {})) {
              mergedRooms[rk] = Object.assign({}, rv, (rawManifest.live_rooms && rawManifest.live_rooms[rk]) || {});
            }
            const mergedSkills = Object.assign({}, cachedManRec.skills || {}, rawManifest.action_catalog ? { action_catalog: rawManifest.action_catalog } : {});
            manifest = Object.assign({}, cachedManRec, {
              rooms: mergedRooms,
              skills: mergedSkills,
              current_room: rawManifest.current_room || cachedManRec.current_room,
              public_url: rawManifest.public_url || cachedManRec.public_url,
            });
          } else if (rawManifest && rawManifest.manifest_hash && typeof savePrebuildCacheRecord === 'function') {
            savePrebuildCacheRecord('meta:manifest', rawManifest.manifest_hash, 'manifest', {
              manifest_hash: rawManifest.manifest_hash,
              models: rawManifest.models,
              archetype_specs: rawManifest.archetype_specs,
              bestiary_specs: rawManifest.bestiary_specs,
              cc_elm_client: rawManifest.cc_elm_client,
              skills: rawManifest.skills,
              rooms: rawManifest.rooms,
              current_room: rawManifest.current_room,
            });
          }

          window.__DND_ROOM_CATALOG__ = manifest.rooms || {};
          if (manifest.public_url && window.__applyPublicUrl) window.__applyPublicUrl(manifest.public_url);
          if (typeof initClientCCELM === 'function' && manifest.cc_elm_client) initClientCCELM(manifest.cc_elm_client);
          if (typeof initClientSkills === 'function' && manifest.skills) initClientSkills(manifest.skills);

          const cliCfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
          const periodsObj = (cliCfg.atmosphere_presets && cliCfg.atmosphere_presets.periods) || {};

          // Hydrate cached floor textures whose style signature matches current client skills
          const floorSig = (typeof _getFloorPrebuildSig === 'function') ? _getFloorPrebuildSig(cliCfg.floor_styles || {}) : null;
          const floorHydratePromises = (floorSig && typeof createImageBitmap === 'function')
            ? Object.entries(dbRecs || {}).filter(([id, rec]) => id.startsWith('tex:floor_') && rec && rec.sig === floorSig && rec.val).map(async ([id, rec]) => {
                const fKey = id.slice(4);
                if (cachedProcTex[fKey] || _workerBitmaps[fKey]) { cacheStats.floorHits++; return; }
                try {
                  const bmp = await createImageBitmap(rec.val);
                  if (bmp && !cachedProcTex[fKey]) { _workerBitmaps[fKey] = bmp; cacheStats.floorHits++; }
                } catch (e) {}
              }) : [];

          // Order rooms by BFS proximity from curId so active room & adjacent exits warm first
          const roomIds = Object.keys(manifest.rooms || {});
          const curId = manifest.current_room;
          const orderedIds = [];
          const seenOrd = new Set();
          const pushOrd = (id) => { if (id && manifest.rooms[id] && !seenOrd.has(id)) { seenOrd.add(id); orderedIds.push(id); } };
          pushOrd(curId);
          const adjExits = (manifest.skills && manifest.skills.rooms && manifest.skills.rooms[curId] && manifest.skills.rooms[curId].exits) || {};
          Object.values(adjExits).forEach(pushOrd);
          roomIds.forEach(pushOrd);

          const curTerrainJobs = [], bgTerrainJobs = [];
          const tCache = window.__DND_TERRAIN_CACHE__ || (window.__DND_TERRAIN_CACHE__ = {});
          for (let ri = 0; ri < orderedIds.length; ri++) {
            const rid = orderedIds[ri], rd = manifest.rooms[rid];
            if (!rd || (rd.time_weather && rd.time_weather.is_outdoor === false)) continue;
            if (tCache[rid]) { cacheStats.terrainHits++; continue; }
            const theme = rd.theme || { base: [55, 65, 50], type: 'wilds' };
            const biome = classifyBiomeFromSkill(rid, theme);
            const seedNum = (rid || 'world').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100000, 17);
            const tCfg = {
              W: rd.width || 1024, H: rd.height || 768, seedNum,
              isSnowBiome: biome.isSnowBiome, isDenseForest: biome.isDenseForest,
              baseR: (theme.base ? theme.base[0] : 55) / 255, baseG: (theme.base ? theme.base[1] : 65) / 255, baseB: (theme.base ? theme.base[2] : 50) / 255,
              terrainSize: 16000, terrainSegs: 224
            };
            const tSig = (typeof _getTerrainPrebuildSig === 'function') ? _getTerrainPrebuildSig(tCfg) : '';
            const cachedTerrain = dbRecs && dbRecs[`terrain:${rid}`];
            if (cachedTerrain && cachedTerrain.sig === tSig && cachedTerrain.val && cachedTerrain.val.heights) {
              tCache[rid] = cachedTerrain.val;
              cacheStats.terrainHits++;
              continue;
            }
            cacheStats.terrainMisses++;
            if (typeof dispatchBgJob === 'function') {
              (rid === curId ? curTerrainJobs : bgTerrainJobs).push(dispatchBgJob({ kind: 'terrain', key: rid, sig: tSig, cfg: tCfg }));
            }
          }

          // STAGE 1 (Critical Path): Warm ONLY active room textures/sky + terrain, render Frame 1 & let player play IMMEDIATELY!
          const curRd = curId && manifest.rooms && manifest.rooms[curId];
          const curPeriod = (curRd && curRd.time_weather && curRd.time_weather.period) || 'morning';
          const curPeriodsObj = periodsObj[curPeriod] ? { [curPeriod]: periodsObj[curPeriod] } : {};
          const curAtmoPromise = (Object.keys(curPeriodsObj).length && typeof prewarmAtmosphereWorkers === 'function')
            ? prewarmAtmosphereWorkers(curPeriodsObj, dbRecs, cacheStats) : Promise.resolve();

          updateProgress(65, 'Entering Starting Sector...', (curRd && curRd.room_name) || curId || 'Solhaven');
          await Promise.all([texWarmPromise, curAtmoPromise, ...floorHydratePromises, ...curTerrainJobs]);

          if (typeof renderCharacterFaceAvatar === 'function') {
            ((window.__DND_CLIENT_SKILLS__ && window.__DND_CLIENT_SKILLS__.hero_archetypes) || []).forEach(a => {
              renderCharacterFaceAvatar(a.class || 'Fighter', a.name || '');
              if (typeof getProceduralTexture === 'function') getProceduralTexture('player', `${a.class || ''} ${a.name || ''}`);
            });
          }
          if (typeof acquireArrowMesh === 'function' && typeof releaseArrowMesh === 'function') {
            const warmArrows = Array.from({ length: 6 }, () => acquireArrowMesh());
            warmArrows.forEach(releaseArrowMesh);
          }

          if (curRd) {
            try {
              update3DScene(curRd);
            } catch (curErr) {
              console.warn('[Preload] Active room init notice:', curErr);
            }
          }
          window.__DND_STAGE1_READY__ = true;
          updateProgress(100, 'Ready!', 'Exploring seamlessly while world prebuilds in background');
          dismissOverlayFast();
          if (curRd && threeScene && threeCamera) {
            try {
              if (typeof threeRenderer.compileAsync === 'function') threeRenderer.compileAsync(threeScene, threeCamera).catch(() => {});
              else if (typeof threeRenderer.compile === 'function') threeRenderer.compile(threeScene, threeCamera);
            } catch (e) {}
          }

          // STAGE 2 (Zero-Pause Background Prebuild): Remaining workers, GLTFs, adjacent->distant rooms in idle slices
          const bgPeriodsObj = {};
          for (const [pk, pv] of Object.entries(periodsObj)) {
            if (pk !== curPeriod) bgPeriodsObj[pk] = pv;
          }
          const bgAtmoPromise = (Object.keys(bgPeriodsObj).length && typeof prewarmAtmosphereWorkers === 'function')
            ? prewarmAtmosphereWorkers(bgPeriodsObj, dbRecs, cacheStats) : Promise.resolve();

          const propUrls = Array.isArray(cliCfg.prop_urls) ? cliCfg.prop_urls : [];
          const modelUrls = Array.from(new Set([...(manifest.models || ['/characters/character_rogue.glb', '/characters/character_wizard.glb']), ...propUrls]));
          const bgModelsPromise = (async () => {
            for (let mi = 0; mi < modelUrls.length; mi += 2) {
              await Promise.all(modelUrls.slice(mi, mi + 2).map(u => loadCachedGltf(u).catch(() => null)));
              await yieldIdle();
            }
          })();

          await Promise.all([bgAtmoPromise, ...bgTerrainJobs, bgModelsPromise]);

          Object.keys(periodsObj).forEach(pKey => {
            createSkyTexture(pKey, 'clear');
            if (typeof createProceduralEnvironmentMap === 'function') createProceduralEnvironmentMap(pKey, 'clear');
          });
          if (typeof getProceduralTexture === 'function') {
            (manifest.bestiary_specs || []).forEach(b => getProceduralTexture('monster', b.name || ''));
            Object.keys(cliCfg.item_models || {}).forEach(k => getProceduralTexture('item', k));
          }

          const staticCache = window.__DND_STATIC_ROOM_CACHE__ || (window.__DND_STATIC_ROOM_CACHE__ = {});
          for (let bi = 0; bi < orderedIds.length; bi++) {
            const rk = orderedIds[bi], rd = manifest.rooms[rk];
            if (!rd || staticCache[rk]) continue;
            await yieldIdle();
            try {
              const _Sbg = {
                W: rd.width || 1024, H: rd.height || 768,
                tw: rd.time_weather || { period: 'morning', weather: 'clear', is_outdoor: true },
                isOutdoor: !(rd.time_weather && rd.time_weather.is_outdoor === false),
                bgOnly: true
              };
              update3DScene_static(_Sbg, rd);
            } catch (sceneErr) {
              console.warn('[Preload] Background sector warning:', rk, sceneErr);
            }
          }

          if (typeof flushPrebuildCache === 'function') await flushPrebuildCache();
          window.__DND_PREWARM_COMPLETE__ = true;
        } catch (err) {
          console.warn('[Preload] Non-fatal asset warmup issue:', err);
          updateProgress(100, 'Starting Engine...', 'Loaded available local assets');
        } finally {
          dismissOverlayFast();
        }
        })();
        window.__DND_PREWARM_PROMISE__ = p;
        return p;
      };
      if (typeof window !== 'undefined') window.preloadAllSceneAssetsAndWarmup = preloadAllSceneAssetsAndWarmup;
      var container = document.getElementById('threeCanvasContainer');
      if (!container || !window.THREE) return false;

      threeScene = new THREE.Scene();
      threeScene.background = new THREE.Color(0x0e1117);
      threeScene.fog = new THREE.FogExp2(0x0e1117, 0.00028);

      var aspect = container.clientWidth / (container.clientHeight || 1);
      threeCamera = new THREE.PerspectiveCamera(45, aspect, 5, 24000);

      // WebGPURenderer initialization with high-performance discrete GPU preference and automatic fallback
      var renderOptions = {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        precision: 'highp',
        samples: 2, // 2x MSAA delivers crisp edges with lower raster load
        trackTimestamp: true
      };

      try {
        if (typeof THREE.WebGPURenderer === 'function') {
          threeRenderer = new THREE.WebGPURenderer(renderOptions);
        } else {
          threeRenderer = new THREE.WebGLRenderer(renderOptions);
        }
      } catch (err) {
        console.warn('WebGPURenderer fallback to WebGLRenderer:', err);
        threeRenderer = new THREE.WebGLRenderer(renderOptions);
      }

      // Color Space & AgX Tone Mapping (Tier 1 #1: Natural Highlight Roll-Off & Contrast)
      if (typeof THREE.SRGBColorSpace !== 'undefined') {
        threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      if (typeof THREE.AgXToneMapping !== 'undefined') {
        threeRenderer.toneMapping = THREE.AgXToneMapping;
        threeRenderer.toneMappingExposure = 1.02;
      } else if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
        threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        threeRenderer.toneMappingExposure = 1.05;
      }
      threeRenderer.sortObjects = false; // Bypass CPU depth-sorting for opaque-heavy scene graphs

      // Set initial sizing and camera field of view via syncCameraViewport
      syncCameraViewport(container.clientWidth, container.clientHeight);
      if (threeRenderer.shadowMap) {
        threeRenderer.shadowMap.enabled = true;
        threeRenderer.shadowMap.autoUpdate = true;
        threeRenderer.shadowMap.needsUpdate = true;
        threeRenderer.shadowMap.type = THREE.PCFShadowMap || 1;
      }
      container.appendChild(threeRenderer.domElement);

      textureLoader = new THREE.TextureLoader();

      // Motivated High-Contrast Lighting (Tier 2 #1: Slash flat shadowless ambient fill!)
      ambLight = new THREE.AmbientLight(0xfff4e6, 0.14);
      threeScene.add(ambLight);

      // Warm directional sun / primary key light with crisp 2048px player-centered shadow frustum
      dirLight = new THREE.DirectionalLight(0xfff0d8, 2.15);
      dirLight.position.set(300, 650, 250);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.bias = -0.00025;
      dirLight.shadow.normalBias = 0.025;
      dirLight.shadow.radius = 2.5;
      dirLight.shadow.camera.near = 20;
      dirLight.shadow.camera.far = 2200;
      var shWidth = 460, shHeight = 460;
      dirLight.shadow.camera.left = -shWidth; dirLight.shadow.camera.right = shWidth;
      dirLight.shadow.camera.top = shHeight; dirLight.shadow.camera.bottom = -shHeight;

      // WebGPU TSL RenderPipeline (Tier 1: Contact AO, Subtle Light Bleed, AgX Highlight Roll-off, Split-Tone Grade, Subtle Vignette & Grain)
      window.initRealismPipeline = function initRealismPipeline() {
        const TSL = window.THREE_TSL;
        if (!threeRenderer || !threeScene || !threeCamera || !TSL || typeof THREE.RenderPipeline !== 'function') return false;
        if (window.__threePipeline) return true;
        try {
          const {
            pass, screenUV, time, float, vec2, vec3, vec4,
            mix, clamp, smoothstep, dot, length, fract, sin, renderOutput
          } = TSL;
          const scenePass = pass(threeScene, threeCamera);
          if (typeof scenePass.setSamples === 'function') scenePass.setSamples(1);
          let hdr = scenePass.getTextureNode('output');

          const DPY = window.THREE_DISPLAY;
          let aoPass = null;
          if (DPY && typeof DPY.ao === 'function') {
            aoPass = DPY.ao(scenePass.getTextureNode('depth'), null, threeCamera);
            aoPass.resolutionScale = 0.5;
            if (aoPass.samples) aoPass.samples.value = 6;
            if (aoPass.radius) aoPass.radius.value = 18.0;
            if (aoPass.thickness) aoPass.thickness.value = 1.25;
            if (aoPass.scale) aoPass.scale.value = 1.12;
            const aoShade = mix(vec3(1.0, 1.0, 1.0), clamp(aoPass.rgb, 0.24, 1.0), 0.72);
            hdr = vec4(hdr.rgb.mul(aoShade), hdr.a);
          }

          if (DPY && typeof DPY.bloom === 'function') {
            const bloomPass = DPY.bloom(hdr, 0.16, 0.32, 0.98);
            hdr = vec4(hdr.rgb.add(bloomPass.rgb), hdr.a);
          }

          const tm = (typeof THREE.AgXToneMapping !== 'undefined') ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
          const cs = (typeof THREE.SRGBColorSpace !== 'undefined') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          const ldr = (typeof renderOutput === 'function') ? renderOutput(hdr, tm, cs) : hdr;

          const lum = dot(ldr.rgb, vec3(0.2126, 0.7152, 0.0722));
          const splitTint = mix(vec3(0.95, 0.98, 1.04), vec3(1.03, 1.00, 0.96), smoothstep(0.14, 0.76, lum));
          let graded = ldr.rgb.mul(splitTint);

          const uvDist = length(screenUV.sub(vec2(0.5, 0.5)));
          const vig = float(1.0).sub(smoothstep(0.46, 0.94, uvDist).mul(0.15));
          graded = graded.mul(vig);

          const seed = dot(screenUV.add(fract(time.mul(0.073))), vec2(12.9898, 78.233));
          const grain = fract(sin(seed).mul(43758.5453)).sub(0.5);
          const grainStrength = mix(0.016, 0.003, smoothstep(0.0, 0.42, lum));
          graded = clamp(graded.add(grain.mul(grainStrength)), 0.0, 1.0);

          const pipeline = new THREE.RenderPipeline(threeRenderer);
          pipeline.outputColorTransform = false;
          pipeline.outputNode = vec4(graded, ldr.a);
          pipeline.needsUpdate = true;

          window.__threeScenePass = scenePass;
          window.__threeAoPass = aoPass;
          window.__threePipeline = pipeline;
          window.__pipelineFailed = false;
          return true;
        } catch (err) {
          console.warn('[RealismPipeline] Disabled (using direct render):', err);
          window.__pipelineFailed = true;
          return false;
        }
      };

      window.__syncRealismPipelineSize = function syncRealismPipelineSize() {
        try {
          if (!threeRenderer || !window.__threeScenePass) return;
          const sz = threeRenderer.getSize(new THREE.Vector2());
          if (typeof window.__threeScenePass.setSize === 'function' && sz.x > 0 && sz.y > 0) {
            window.__threeScenePass.setSize(sz.x, sz.y);
          }
        } catch (e) {}
      };
      }
    }


