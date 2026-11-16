    function init3DWorld_p3(_I) {
      with (_I) {
      threeScene.add(dirLight);
      threeScene.add(dirLight.target);

      // Motivated secondary hemisphere sky-to-ground wrap & colored bounce/rim fill (Tier 2 #1 & #2)
      var hemiLight = new THREE.HemisphereLight(0xd8ebff, 0x3c342b, 0.36);
      threeScene.add(hemiLight);
      threeScene.userData.hemiLight = hemiLight;

      var bounceLight = new THREE.DirectionalLight(0xc2d5e8, 0.24);
      bounceLight.position.set(-420, 180, 120);
      threeScene.add(bounceLight);
      threeScene.userData.bounceLight = bounceLight;

      var rimLight = new THREE.DirectionalLight(0xc8dcf8, 0.32);
      rimLight.position.set(150, 420, -380);
      threeScene.add(rimLight);
      threeScene.userData.rimLight = rimLight;

      // Initialize initial procedural environment map (Tip 59)
      try {
        const initialEnv = createProceduralEnvironmentMap('morning', 'clear');
        if (initialEnv) {
          threeScene.environment = initialEnv;
        }
      } catch (envErr) {
        console.warn('Procedural environment map initialization error:', envErr);
      }

      // Draco and KTX2 mesh & texture compression loaders for high-speed geometry streaming
      var dracoLoader = null;
      var ktx2Loader = null;
      var gltfLoader = null;
      if (window.THREE_ADDONS) {
        if (typeof window.THREE_ADDONS.DRACOLoader === 'function') {
          dracoLoader = new window.THREE_ADDONS.DRACOLoader();
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        }
        if (typeof window.THREE_ADDONS.KTX2Loader === 'function') {
          ktx2Loader = new window.THREE_ADDONS.KTX2Loader();
          ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/basis/');
          if (threeRenderer) {
            try { ktx2Loader.detectSupport(threeRenderer); } catch (e) {}
          }
        }
        if (typeof window.THREE_ADDONS.GLTFLoader === 'function') {
          gltfLoader = new window.THREE_ADDONS.GLTFLoader();
          if (dracoLoader) gltfLoader.setDRACOLoader(dracoLoader);
          if (ktx2Loader) gltfLoader.setKTX2Loader(ktx2Loader);
          if (window.THREE_ADDONS.MeshoptDecoder) {
            gltfLoader.setMeshoptDecoder(window.THREE_ADDONS.MeshoptDecoder);
          }
        }
      }
      const texLoaderInstance = new THREE.TextureLoader();
      const textureCacheMap = {};
      const safeLoadTexture = (url) => {
        if (textureCacheMap[url]) return textureCacheMap[url];
        const t = texLoaderInstance.load(url);
        textureCacheMap[url] = t;
        return t;
      };
      window.__DND_LOADERS__ = {
        draco: dracoLoader,
        ktx2: ktx2Loader,
        gltf: gltfLoader,
        texture: { load: safeLoadTexture }
      };

      threeRoomGroup = new THREE.Group();
      threeRoomGroup.matrixAutoUpdate = false;
      threeScene.add(threeRoomGroup);

      threeProjectilesGroup = new THREE.Group();
      threeProjectilesGroup.matrixAutoUpdate = false;
      threeScene.add(threeProjectilesGroup);

      // Interactive Orbit & Look Dragging (Supports Iso, 3rd Person, and 1st Person; disabled in 2D Top-Down mode)
      var mouseDownScreenPos = { x: 0, y: 0, time: 0, button: 0 };
      var dragDistanceTraveled = 0;

      container.addEventListener('contextmenu', e => {
        // Prevent default context menu so right-click can attack target creatures Tactical-style
        e.preventDefault();
      });

      container.addEventListener('mousedown', e => {
        mouseDownScreenPos = { x: e.clientX, y: e.clientY, time: performance.now(), button: e.button };
        dragDistanceTraveled = 0;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        if (cameraMode !== '2d') {
          isOrbitDragging = true;
        }
      });

      window.addEventListener('mousemove', e => {
        if (isOrbitDragging && cameraMode !== '2d') {
          const dx = e.clientX - prevMouseX;
          const dy = e.clientY - prevMouseY;
          dragDistanceTraveled += Math.hypot(dx, dy);
          if (cameraMode === 'iso') {
            orbitAzimuth -= dx * 0.006;
            orbitElevation = Math.max(0.12, Math.min(Math.PI / 2.1, orbitElevation + dy * 0.006));
          } else if (cameraMode === 'preview') {
            previewOrbitAzimuth -= dx * 0.008;
            previewOrbitElevation = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, previewOrbitElevation + dy * 0.008));
          } else if (cameraMode === 'tp') {
            tpYawOffset -= dx * 0.008;
            tpPitchOffset = Math.max(-0.25, Math.min(0.40, tpPitchOffset + dy * 0.004));
          } else if (cameraMode === 'fp') {
            fpYawOffset -= dx * 0.008;
            fpPitchOffset = Math.max(-0.85, Math.min(0.85, fpPitchOffset - dy * 0.006));
          }
          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        }
      });

      window.addEventListener('mouseup', e => {
        const wasOrbitDragging = isOrbitDragging;
        isOrbitDragging = false;

        // If the mouse was dragged more than 8 pixels, treat it as a camera orbit rotation rather than a point-and-click action
        if (dragDistanceTraveled > 8) return;

        // Ensure the click was inside the 3D viewport canvas
        const rect = container.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

        handleTacticalMouseClick(e, rect);
      });

      // Raycaster-based Hover Object Labels across all views (2D Top-Down, Isometric, 3rd Person, 1st Person)
      var hoverRaycaster = new THREE.Raycaster();
      var hoverMouseNDC = new THREE.Vector2();
      var threeTooltip = document.getElementById('threeHoverTooltip');
      var _inspectPanel = document.getElementById('aeonwardInspectPanel');
      var _inspectTitle = document.getElementById('aeonwardInspectTitle');
      var _inspectBadge = document.getElementById('aeonwardInspectBadge');
      var _inspectBody = document.getElementById('aeonwardInspectBody');
      var _lastHoverKey = '';
      var activeHoveredTakeableItem = null;
      var lastHoverRaycastTime = 0;

      container.addEventListener('mousemove', e => {
        if (!threeTooltip || !threeCamera || !threeRoomGroup) return;
        if (isOrbitDragging || (typeof isMoving !== 'undefined' && isMoving)) {
          if (threeTooltip.style.display !== 'none') threeTooltip.style.display = 'none';
          if (_inspectPanel && _inspectPanel.style.display !== 'none') _inspectPanel.style.display = 'none';
          _lastHoverKey = '';
          activeHoveredTakeableItem = null;
          return;
        }
        const now = performance.now();
        if (now - lastHoverRaycastTime < 35) return;
        lastHoverRaycastTime = now;
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        hoverMouseNDC.x = (relX / rect.width) * 2 - 1;
        hoverMouseNDC.y = -(relY / rect.height) * 2 + 1;

        hoverRaycaster.setFromCamera(hoverMouseNDC, threeCamera);
        const hoverTargets = [];
        for (let ci = 0; ci < threeRoomGroup.children.length; ci++) {
          const ch = threeRoomGroup.children[ci];
          if (!ch || !ch.visible) continue;
          const u = ch.userData;
          if (u && (u.isScenery || u.isOuterTerrain || u.isGridOverlay)) continue;
          if (u && u.isStaticRoomGroup) {
            for (let si = 0; si < ch.children.length; si++) {
              const sch = ch.children[si];
              if (!sch || !sch.visible) continue;
              const su = sch.userData;
              // Skip heavy outer terrain (51k tris), grid lines, and non-interactive scenery during hover tests
              if (su && (su.isScenery || su.isOuterTerrain || su.isGridOverlay)) continue;
              if (su && (su.hoverInfo || su.isPortal || su.isFloor)) hoverTargets.push(sch);
            }
            continue;
          }
          if (u && u.entityId) {
            if (u.hitboxMesh) hoverTargets.push(u.hitboxMesh);
            continue;
          }
          hoverTargets.push(ch);
        }
        const intersects = hoverRaycaster.intersectObjects(hoverTargets, true);

        const foundInfos = [];
        const seenNames = new Set();
        let hoveredItemObj = null;

        for (let i = 0; i < intersects.length; i++) {
          let obj = intersects[i].object;
          if (!obj) continue;
          // Ignore floating text sprites so hovering picks the actual 3D object/character
          if (obj.isSprite) continue;

          // Climb ancestor chain up to direct child of threeRoomGroup
          let curr = obj;
          let isFloorHit = false;
          let isHidden = false;
          let hoverInfo = null;
          let itemUserData = null;
          while (curr && curr !== threeRoomGroup) {
            if (!curr.visible) { isHidden = true; break; }
            if (curr.userData && curr.userData.isFloor) { isFloorHit = true; break; }
            if (curr.userData && (curr.userData.isGroundItem || (curr.userData.hoverInfo && curr.userData.hoverInfo.tag === 'Item'))) {
              if (!itemUserData) itemUserData = curr.userData;
            }
            if (curr.userData && curr.userData.hoverInfo && !hoverInfo) {
              hoverInfo = curr.userData.hoverInfo;
            }
            curr = curr.parent;
          }
          if (isHidden) continue;
          if (isFloorHit) {
            // Stop once the ray hits the floor plane
            break;
          }
          if (itemUserData && !hoveredItemObj) {
            hoveredItemObj = itemUserData;
          }
          if (hoverInfo && hoverInfo.name && !seenNames.has(hoverInfo.name)) {
            seenNames.add(hoverInfo.name);
            foundInfos.push(hoverInfo);
            if (foundInfos.length >= 3) break;
          }
        }

        activeHoveredTakeableItem = hoveredItemObj;

        if (foundInfos.length > 0) {
          const hoverKey = foundInfos.map(i => i.name + '|' + (i.detail || '')).join(';');
          if (hoverKey !== _lastHoverKey) {
            _lastHoverKey = hoverKey;
            threeTooltip.innerHTML = foundInfos.map(info => `
              <div class="hover-layer-item">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                  <b style="color:#f0883e; font-size:0.84rem;">${info.name}</b>
                  <span class="tooltip-tag ${info.tagClass || 'tag-obstacle'}">${info.tag || 'Object'}</span>
                </div>
                ${info.detail ? `<div style="font-size:0.74rem; color:#c9d1d9; margin-top:2px;">${info.detail}</div>` : ''}
              </div>
            `).join('');
            if (_inspectPanel && _inspectTitle && _inspectBody) {
              const primary = foundInfos[0];
              _inspectTitle.innerText = primary.name;
              if (_inspectBadge) {
                _inspectBadge.innerText = (primary.tag || 'EXAMINE').toUpperCase();
                _inspectBadge.className = `aeonward-inspect-badge ${primary.tagClass || 'tag-obstacle'}`;
              }
              _inspectBody.innerText = primary.detail || 'Target within tactical view.';
              _inspectPanel.style.display = 'block';
            }
          }
          threeTooltip.style.display = 'block';
          const ttW = threeTooltip.offsetWidth || 200;
          const ttH = threeTooltip.offsetHeight || 56;
          const clampedX = Math.max(ttW / 2 + 8, Math.min(rect.width - ttW / 2 - 8, relX));
          const clampedY = (relY - ttH - 14 < 8) ? (relY + ttH + 22) : relY;
          threeTooltip.style.left = `${clampedX}px`;
          threeTooltip.style.top = `${clampedY}px`;
          container.style.cursor = 'pointer';
        } else {
          if (_lastHoverKey) {
            _lastHoverKey = '';
            threeTooltip.style.display = 'none';
            if (_inspectPanel) _inspectPanel.style.display = 'none';
          }
          container.style.cursor = (cameraMode === '2d') ? 'default' : (isOrbitDragging ? 'grabbing' : 'grab');
        }
      });

      container.addEventListener('mouseleave', () => {
        if (threeTooltip) threeTooltip.style.display = 'none';
      });
      container.addEventListener('wheel', e => {
        e.preventDefault();
        if (cameraMode === '2d') {
          topDownDistance = Math.max(180, Math.min(1300, topDownDistance + e.deltaY * 0.6));
        } else if (cameraMode === 'iso') {
          orbitDistance = Math.max(220, Math.min(950, orbitDistance + e.deltaY * 0.6));
        } else if (cameraMode === 'tp') {
          tpDistance = Math.max(35, Math.min(160, tpDistance + e.deltaY * 0.15));
        } else if (cameraMode === 'fp') {
          fpFov = Math.max(30, Math.min(85, fpFov + e.deltaY * 0.05));
          if (threeCamera) {
            threeCamera.fov = fpFov;
            threeCamera.updateProjectionMatrix();
          }
        } else if (cameraMode === 'preview') {
          previewDistance = Math.max(12, Math.min(130, previewDistance + e.deltaY * 0.05));
        }
      }, { passive: false });

      window.addEventListener('resize', () => {
        if (!container) return;
        syncCameraViewport(container.clientWidth, container.clientHeight);
      });

      // Telemetry & Advanced Graphics Performance Profiler State (Tips 15, 68, 72, 91, 94, 97, 99)
      var fpsLastTime = performance.now();
      var fpsFrameCount = 0;
      var currentFps = 60;
      var fpsBadge = document.getElementById('threedFpsBadge');

      // Sparkline history buffers (60 samples)
      var perfHistory = {
        fps: new Float32Array(60),
        cpu: new Float32Array(60),
        gpu: new Float32Array(60),
        idx: 0
      };

      // Quality adaptation controller (Tip 68 Drei PerformanceMonitor-inspired)
      var consecutiveLowFpsCount = 0;
      var consecutiveHighFpsCount = 0;
      var dynamicPixelRatio = Math.min(2.0, window.devicePixelRatio || 1.0);

      var perfMetrics = {
        fps: 60,
        cpuTime: 0,
        gpuTime: 0,
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        simMs: 0,
        camMs: 0,
        audioMs: 0,
        fxMs: 0,
        renderMs: 0
      };

      var lastHudUpdateTime = 0;

      if (typeof threeRenderer.init === 'function') {
        threeRenderer.init().then(() => {
          window.__DND_RENDERER_READY__ = true;
          if (typeof window.initRealismPipeline === 'function') window.initRealismPipeline();
          // Kick off asynchronous full asset pre-generation and shader warmup
          preloadAllSceneAssetsAndWarmup();

          if (typeof threeRenderer.setAnimationLoop === 'function') {
            threeRenderer.setAnimationLoop(render3DFrame);
          } else {
            function loop(ts) {
              render3DFrame(ts);
              requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
          }
        }).catch(err => {
          console.warn('threeRenderer.init error:', err);
          preloadAllSceneAssetsAndWarmup();
          if (typeof threeRenderer.setAnimationLoop === 'function') {
            threeRenderer.setAnimationLoop(render3DFrame);
          } else {
            function loop(ts) {
              render3DFrame(ts);
              requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
          }
        });
      } else if (typeof threeRenderer.setAnimationLoop === 'function') {
        threeRenderer.setAnimationLoop(render3DFrame);
        preloadAllSceneAssetsAndWarmup();
      } else {
        function loop(ts) {
          render3DFrame(ts);
          requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
        preloadAllSceneAssetsAndWarmup();
      }
      }
    }


    function set3DCameraMode(mode) {
      cameraMode = mode;
      isOrbitDragging = false;
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      ['btnCam2d', 'btnCamIso', 'btnCamTp', 'btnCamFp', 'btnCamPreview'].forEach(id => document.getElementById(id)?.classList.remove('active'));
      const [fx, fz] = (typeof facingToVec === 'function') ? facingToVec(lastFacing) : [1, 0];
      const facingYaw = Math.atan2(fx, fz);
      if (mode === 'tp') tpYawOffset = facingYaw;
      else if (mode === 'fp') fpYawOffset = facingYaw;
      const modeMeta = {
        '2d': ['btnCam2d', '🗺️ 2D Top-Down View | Scroll to Zoom'],
        iso: ['btnCamIso', '🎮 3D View | Drag to Orbit / Scroll to Zoom'],
        tp: ['btnCamTp', '👤 3rd Person View | Drag to Orbit / Scroll to Zoom'],
        fp: ['btnCamFp', '👁️ 1st Person View | Drag to Look / Scroll to Zoom'],
        preview: ['btnCamPreview', '🔍 Character Preview Mode | Drag to Orbit 360° / Scroll to Zoom'],
      }[mode];
      if (modeMeta) {
        document.getElementById(modeMeta[0])?.classList.add('active');
        const hud = document.getElementById('threedHudBadge');
        if (hud) hud.innerText = modeMeta[1];
      }
      const cCont = document.getElementById('threeCanvasContainer');
      if (cCont) syncCameraViewport(cCont.clientWidth, cCont.clientHeight);
    }

    let lastCamModeApplied = null;
    let lastCamShowGridApplied = null;
    let _lastCamEntityKey = '';
    let _camTerrainX = NaN, _camTerrainZ = NaN, _camTerrainRoom = null, _camTerrainY = 0;
    function update3DCamera() {
      if (!threeCamera) return;

      const is2D = (cameraMode === '2d');
      const isPreview = (cameraMode === 'preview');

      if (skyDomeMesh) skyDomeMesh.visible = Boolean(skyDomeMesh.userData.isOutdoorSky && !is2D && !isPreview);
      if (sunMoonMesh) sunMoonMesh.visible = Boolean(sunMoonMesh.userData.isOutdoorSky && !is2D && !isPreview);
      if (cloudParticlesMesh) {
        cloudParticlesMesh.visible = Boolean(cloudParticlesMesh.userData.isOutdoorSky && !is2D && !isPreview);
        if (cloudParticlesMesh.visible) cloudParticlesMesh.rotation.y += 0.00018;
      }

      if (threeRoomGroup && (cameraMode !== lastCamModeApplied || showGrid !== lastCamShowGridApplied)) {
        lastCamModeApplied = cameraMode;
        lastCamShowGridApplied = showGrid;
        threeRoomGroup.traverse(obj => {
          if (obj.userData && obj.userData.isRoof) {
            obj.visible = obj.userData.isBuildingRoof ? !isPreview : (!is2D && !isPreview);
          }
          if (isPreview) {
            if (obj.userData && (obj.userData.isFloor || obj.userData.isPortal || obj.userData.hoverInfo?.tag === 'Scenery')) {
              obj.visible = false;
            }
          } else {
            if (obj.userData && obj.userData.isFloor) {
              obj.visible = obj.userData.isGridOverlay ? showGrid : true;
            } else if (obj.userData && (obj.userData.isPortal || obj.userData.hoverInfo?.tag === 'Scenery')) {
              obj.visible = true;
            }
          }
        });
      }
      if (threeRoomGroup) {
        const camEntities = (threeDynamicEntities && threeDynamicEntities.length > 0) ? threeDynamicEntities : threeRoomGroup.children;
        const camEntityKey = `${cameraMode}_${isPreview ? 1 : 0}_${camEntities.length}_${lastBuilt3DRoomId || ''}`;
        if (camEntityKey !== _lastCamEntityKey) {
          _lastCamEntityKey = camEntityKey;
          for (let ei = 0; ei < camEntities.length; ei++) {
            const c = camEntities[ei];
            if (!c || !c.userData) continue;
            if (c.userData.isLocalPlayer) {
              c.visible = (cameraMode !== 'fp');
              if (c.userData.labelSprite) c.userData.labelSprite.visible = !isPreview;
            } else {
              c.visible = !isPreview;
              if (c.userData.labelSprite) c.userData.labelSprite.visible = !isPreview;
            }
            if (!isPreview && c.userData.labelSprite) {
              const sz = c.userData.entitySize || 48;
              const lblY = is2D ? (sz + 14) : (sz * 0.85);
              c.userData.labelSprite.position.set(0, lblY, is2D ? -(sz * 0.65) : 0);
            }
          }
        }
      }
      if (!renderPlayerPos.initialized || Math.hypot(lastPlayerPos.x - renderPlayerPos.x, lastPlayerPos.y - renderPlayerPos.y) > 160) {
        renderPlayerPos.x = lastPlayerPos.x;
        renderPlayerPos.y = lastPlayerPos.y;
        renderPlayerPos.initialized = true;
      } else {
        renderPlayerPos.x += (lastPlayerPos.x - renderPlayerPos.x) * 0.32;
        renderPlayerPos.y += (lastPlayerPos.y - renderPlayerPos.y) * 0.32;
      }
      const px = (renderPlayerPos.x - 512), pz = (renderPlayerPos.y - 384);
      if (px !== _camTerrainX || pz !== _camTerrainZ || lastBuilt3DRoomId !== _camTerrainRoom) {
        _camTerrainX = px; _camTerrainZ = pz; _camTerrainRoom = lastBuilt3DRoomId;
        _camTerrainY = (typeof window.getOpenWorldTerrainHeight === 'function') ? window.getOpenWorldTerrainHeight(px, pz) : 0;
      }
      if (window.__lwPhotoCam && window.__lwPhotoCam.active && typeof window.__lwUpdatePhotoCam === 'function') {
        window.__lwUpdatePhotoCam();
        return;
      }
      const elevY = (typeof window.__lwLocalElevation === 'number') ? window.__lwLocalElevation : 0;
      const py = _camTerrainY + elevY;
      const desiredFov = window.__lwIsSprinting ? 71 : (window.__lwRidingSpeed ? 66 : 60);
      if (Math.abs(threeCamera.fov - desiredFov) > 0.08) {
        threeCamera.fov += (desiredFov - threeCamera.fov) * 0.14;
        threeCamera.updateProjectionMatrix();
      }
      if (skyDomeMesh) skyDomeMesh.position.set(px, 0, pz);
      if (cloudParticlesMesh) cloudParticlesMesh.position.set(px, 0, pz);
      if (sunMoonMesh && Array.isArray(sunMoonMesh.userData.skyOffset)) {
        const so = sunMoonMesh.userData.skyOffset;
        sunMoonMesh.position.set(px + so[0], so[1], pz + so[2]);
      }
      if (dirLight && dirLight.target) {
        const texelStep = 2.0;
        const sx = Math.round(px / texelStep) * texelStep;
        const sy = Math.round(_camTerrainY / texelStep) * texelStep;
        const sz = Math.round(pz / texelStep) * texelStep;
        const lo = (dirLight.userData && dirLight.userData.sunOffset) || [260, 620, 220];
        dirLight.target.position.set(sx, sy, sz);
        dirLight.position.set(sx + lo[0], sy + lo[1], sz + lo[2]);
      }
      if (cameraMode === '2d') {
        // Direct top-down view centered on the room (fixed scene position, North = Up, scroll to zoom only)
        threeCamera.up.set(0, 0, -1);
        threeCamera.position.set(0, topDownDistance, 0);
        threeCamera.lookAt(0, 0, 0);
      } else if (cameraMode === 'iso') {
        threeCamera.up.set(0, 1, 0);
        const cx = px + orbitDistance * Math.cos(orbitElevation) * Math.sin(orbitAzimuth);
        const cy = elevY + orbitDistance * Math.sin(orbitElevation);
        const cz = pz + orbitDistance * Math.cos(orbitElevation) * Math.cos(orbitAzimuth);
        threeCamera.position.set(cx, cy, cz);
        threeCamera.lookAt(px, 14 + elevY, pz);
      } else if (cameraMode === 'preview') {
        threeCamera.up.set(0, 1, 0);
        // Direct character inspection showroom pedestal camera
        const cx = px + previewDistance * Math.cos(previewOrbitElevation) * Math.sin(previewOrbitAzimuth);
        const cy = 16 + previewDistance * Math.sin(previewOrbitElevation);
        const cz = pz + previewDistance * Math.cos(previewOrbitElevation) * Math.cos(previewOrbitAzimuth);
        threeCamera.position.set(cx, cy, cz);
        threeCamera.lookAt(px, 16, pz);
      } else if (cameraMode === 'tp') {
        threeCamera.up.set(0, 1, 0);
        // Third-person Skyrim-style over-the-shoulder exploration camera (unclamped open-world vista)
        const curAngle = tpYawOffset;
        const dx = Math.sin(curAngle), dz = Math.cos(curAngle);
        const rx = -Math.cos(curAngle), rz = Math.sin(curAngle);
        const sprintPull = window.__lwIsSprinting ? 14 : 0;

        const camX = px - dx * (tpDistance + sprintPull) + rx * 10;
        const camY = py + Math.max(24, 22 + tpDistance * (0.28 + tpPitchOffset));
        const camZ = pz - dz * (tpDistance + sprintPull) + rz * 10;

        threeCamera.position.set(camX, camY, camZ);
        threeCamera.lookAt(px + dx * 65 + rx * 6, py + 25, pz + dz * 65 + rz * 6);
      } else if (cameraMode === 'fp') {
        threeCamera.up.set(0, 1, 0);
        // First-person eye height looking forward with interactive look pitch & yaw
        const curAngle = fpYawOffset;
        const lx = Math.sin(curAngle), lz = Math.cos(curAngle);
        const ly = Math.tan(fpPitchOffset);

        threeCamera.position.set(px, py + 28, pz);
        threeCamera.lookAt(px + lx * 160, py + 28 + ly * 160, pz + lz * 160);
      }
      if (currentShake && currentShake.intensity > 0 && currentShake.duration > 0) {
        const elapsedShake = performance.now() - (currentShake.startTime || 0);
        if (elapsedShake < currentShake.duration) {
          const decay = 1.0 - (elapsedShake / currentShake.duration);
          const mag = currentShake.intensity * decay * 0.22;
          threeCamera.position.x += (Math.random() - 0.5) * mag;
          threeCamera.position.y += (Math.random() - 0.5) * mag * 0.7;
          threeCamera.position.z += (Math.random() - 0.5) * mag;
        } else {
          currentShake.intensity = 0;
        }
      }
    }

    function getProceduralTexture(category, name) {
      const key = `${category}:${name}`.toLowerCase();
      if (loaded3DTextures[key]) return loaded3DTextures[key];

      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const cx = 64, cy = 64, r = 56;
      const nl = (name || '').toLowerCase();
      const tokenStyles = (typeof getClientSkillClientCfg === 'function' && getClientSkillClientCfg().token_styles) || {};

      ctx.clearRect(0, 0, 128, 128);

      if (category === 'player') {
        const { st } = (typeof _resolveHeroPortraitEntry === 'function')
          ? _resolveHeroPortraitEntry(name, name)
          : { st: { torso: '#1c4ea8', trim: '#58a6ff', accent: '#f5c84b', headgear: 'helm', weapon: 'sword' } };
        ctx.fillStyle = st.torso || 'rgba(25, 45, 75, 0.95)';
        ctx.strokeStyle = st.accent || '#58a6ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = st.skin || '#ebd2b9'; ctx.beginPath(); ctx.arc(cx, cy - 12, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = st.trim || '#1c4ea8'; ctx.fillRect(cx - 20, cy + 6, 40, 38);
        ctx.fillStyle = st.accent || '#f5c84b'; ctx.fillRect(cx - 8, cy + 16, 16, 6);
      } else {
        const bank = tokenStyles[category] || tokenStyles.item || {};
        const crit = Object.fromEntries(Object.entries(bank).map(([k, v]) => [k, (v && v.keywords) || k]));
        const matchKey = (typeof classifyWithClientCCELM === 'function') ? classifyWithClientCCELM(nl, crit, 0.30, null) : null;
        const st = (matchKey && bank[matchKey]) || Object.values(bank)[0] || {
          bg: category === 'monster' ? 'rgba(75, 20, 20, 0.95)' : 'rgba(20, 40, 30, 0.95)',
          stroke: category === 'monster' ? '#ff5a50' : '#50d278',
          core: category === 'monster' ? '#c82828' : '#a06e28',
          eye: '#ff2828', shape: category === 'monster' ? 'brute' : 'chest'
        };
        ctx.fillStyle = st.bg; ctx.strokeStyle = st.stroke; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = st.core;
        if (st.shape === 'spider') {
          ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = st.stroke; ctx.lineWidth = 4;
          for (const ang of [-60, -30, 30, 60, 120, 150, 210, 240]) {
            const rad = ang * Math.PI / 180;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rad) * 44, cy + Math.sin(rad) * 44); ctx.stroke();
          }
        } else if (st.shape === 'crystal') {
          ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx + 24, cy - 8); ctx.lineTo(cx, cy + 36); ctx.lineTo(cx - 24, cy - 8); ctx.closePath(); ctx.fill();
        } else if (st.shape === 'key') {
          ctx.beginPath(); ctx.arc(cx, cy - 20, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(cx - 4, cy - 8, 8, 38); ctx.fillRect(cx + 4, cy + 8, 10, 6);
        } else if (st.shape === 'chest') {
          ctx.fillRect(cx - 24, cy - 16, 48, 36);
          ctx.fillStyle = st.stroke; ctx.fillRect(cx - 5, cy - 4, 10, 10);
        } else {
          ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
        }
        if (category === 'monster' && st.eye) {
          ctx.fillStyle = st.eye;
          ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 4.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 9, cy - 6, 4.5, 0, Math.PI * 2); ctx.fill();
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      loaded3DTextures[key] = tex;
      return tex;
    }

    let lastBuilt3DRoomId = null;
    let lastBuiltSkyKey = null;
    let lastBuiltItemsKey = null;

    function update3DScene(data) {
      if (!threeRoomGroup || !data) return;
      const _S = Object.assign(Object.create(null), {W: undefined, H: undefined, needStaticRebuild: undefined, tw: undefined, timeBadge: undefined, isOutdoor: undefined, skyKey: undefined, addVolumetricEntity: undefined, activeEntityIds: undefined, curItemsKey: undefined});
      update3DScene_p1(_S, data);
      update3DScene_p2(_S, data);
      if (typeof window.__LW_ON_SCENE_3D__ === 'function') window.__LW_ON_SCENE_3D__(data);
    }


    function update3DScene_static(_S, data) {
      const _B = Object.assign(Object.create(_S), {staticGrp: undefined, cacheHit: false, theme: undefined, tType: undefined, floorCacheKey: undefined, floorTex: undefined, floorNormalTex: undefined, floorRoughTex: undefined, floorGeo: undefined, floorMat: undefined, floorMesh: undefined, gridHelper: undefined, barkTex: undefined, forestCanopyTex: undefined, vibrantCanopyTex: undefined, pineCanopyTex: undefined, brambleTex1: undefined, brambleTex2: undefined, stoneTex: undefined, waterTex: undefined, stoneNormalTex: undefined, barkNormalTex: undefined, foliageNormalTex: undefined, stoneRoughTex: undefined, woodRoughTex: undefined, wallMat: undefined, woodMat: undefined, stoneMat: undefined, waterMat: undefined, chasmMat: undefined, relicMat: undefined, forgeMat: undefined, stumpTopTex: undefined, stumpTopMat: undefined, barkMat: undefined, treeCanopyMat1: undefined, treeCanopyMat2: undefined, treeCanopyMat3: undefined, brambleMat1: undefined, brambleMat2: undefined, brambleThornMat: undefined, rawObstacles: undefined, instancedWalls: undefined, instancedPillars: undefined, nonInstancedObstacles: undefined});
      const _prevTerrainFn = _S.bgOnly ? window.getOpenWorldTerrainHeight : null;
      const _prevFaunaState = _S.bgOnly ? window.__outdoorFaunaState : null;
      try {
        update3DScene_static_p1(_B, data);
        if (_B.cacheHit) return;
        update3DScene_static_p2(_B, data);
        update3DScene_static_p3(_B, data);
      } finally {
        if (_S.bgOnly) {
          if (_prevTerrainFn) window.getOpenWorldTerrainHeight = _prevTerrainFn;
          window.__outdoorFaunaState = _prevFaunaState;
        }
      }
    }

