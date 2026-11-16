    // Shared chamfered/beveled box geometry helper (Tier 4 #1: catch rim highlights on hard corners)
    function createBeveledBoxGeo(w = 1, h = 1, d = 1, bevel = 0.05) {
      const b = Math.max(0.004, Math.min(bevel, Math.min(w, h, d) * 0.22));
      const iw = Math.max(0.01, w - b * 2);
      const id = Math.max(0.01, d - b * 2);
      const hw = iw * 0.5, hd = id * 0.5;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hd + b);
      shape.lineTo(-hw, hd - b);
      shape.quadraticCurveTo(-hw, hd, -hw + b, hd);
      shape.lineTo(hw - b, hd);
      shape.quadraticCurveTo(hw, hd, hw, hd - b);
      shape.lineTo(hw, -hd + b);
      shape.quadraticCurveTo(hw, -hd, hw - b, -hd);
      shape.lineTo(-hw + b, -hd);
      shape.quadraticCurveTo(-hw, -hd, -hw, -hd + b);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.01, h - b * 2),
        bevelEnabled: true,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 2,
        curveSegments: 2
      });
      geo.rotateX(Math.PI / 2);
      geo.center();
      geo.computeVertexNormals();
      return geo;
    }
    if (typeof window !== 'undefined') window.createBeveledBoxGeo = createBeveledBoxGeo;

    // Shared cached alpha feather mask so outdoor sector clearings melt seamlessly into open terrain
    function getFloorEdgeAlphaTexture(cachedProcTex) {
      if (typeof getOrCreateProcTex === 'function') {
        return getOrCreateProcTex('floor_edge_alpha', 256, 256, 'floorEdge', null, { wrapClamp: true, aniso: false });
      }
      return cachedProcTex.floor_edge_alpha || null;
    }

    // Tileable alpine wilderness grass/stone/moss ground texture (no hard room patterns)
    function getWildernessGroundTexture(cachedProcTex, applyQualityFn) {
      if (typeof getOrCreateProcTex === 'function') {
        return getOrCreateProcTex('wilderness_ground_512', 512, 512, 'wilderness', null, { wrapRepeat: true, repeat: [64, 64] });
      }
      return cachedProcTex.wilderness_ground_512 || null;
    }

    // Pure zero-DOM terrain heightmap, vertex color, and Forest/Rock matrix generator (runs in Worker Pool or main thread)
    function computeOpenWorldTerrainData(cfg) {
      const { W, H, seedNum, isSnowBiome, isDenseForest, baseR, baseG, baseB } = cfg;
      const terrainSize = cfg.terrainSize || 16000;
      const terrainSegs = cfg.terrainSegs || 224;
      const stride = terrainSegs + 1;
      const phaseX = (seedNum % 97) * 0.13;
      const phaseZ = (seedNum % 89) * 0.17;
      const halfRoadW = W / 2 + 40;
      const halfRoadH = H / 2 + 40;
      const halfBoundW = W / 2 + 95;
      const halfBoundH = H / 2 + 95;
      const halfW0 = W / 2 + 60;
      const halfH0 = H / 2 + 60;
      const snowLine = isSnowBiome ? 210 : 420;

      const getRoadMask = (wx, wz) => {
        const dNS = (Math.abs(wz) > halfRoadH * 0.7) ? Math.abs(wx - Math.sin(wz * 0.0014) * 140) : 9999;
        const dEW = (Math.abs(wx) > halfRoadW * 0.7) ? Math.abs(wz - Math.cos(wx * 0.0014) * 140) : 9999;
        const dRoad = dNS < dEW ? dNS : dEW;
        return Math.max(0, 1.0 - Math.max(0, dRoad - 42) / 95);
      };

      const getHeight = (wx, wz) => {
        const dx = wx < 0 ? (-wx - halfBoundW) : (wx - halfBoundW);
        const dz = wz < 0 ? (-wz - halfBoundH) : (wz - halfBoundH);
        const cdx = dx > 0 ? dx : 0;
        const cdz = dz > 0 ? dz : 0;
        const distOut = Math.hypot(cdx, cdz);
        if (distOut <= 12) return -0.25;

        const blend = distOut < 520.0 ? (distOut / 520.0) : 1.0;
        const passDamp = 1.0 - getRoadMask(wx, wz) * 0.88;
        const rx = 1.0 - Math.abs(Math.sin(wx * 0.00055 + phaseX));
        const rz = 1.0 - Math.abs(Math.sin(wz * 0.00052 + phaseZ));
        const r1 = Math.pow(rx, 1.4) * Math.pow(rz, 1.3) * 340.0;
        const r2 = (1.0 - Math.abs(Math.sin(wx * 0.0014 + wz * 0.0011 + 0.8))) * 115.0;
        const hills = (Math.sin(wx * 0.0028 + phaseZ) * Math.cos(wz * 0.0026 - phaseX) + 0.6) * 42.0;
        const detail = Math.cos(wx * 0.009) * Math.sin(wz * 0.009) * 14.0;
        const rimBase = Math.max(0, (distOut - 1350) / 4800);
        const rimSharp = 0.55 + 0.9 * (1.0 - Math.abs(Math.sin((Math.atan2(wz, wx) * 3.5) + phaseX * 0.2)));
        const mountainRing = Math.pow(rimBase, 1.45) * 1850.0 * rimSharp;
        const rawH = Math.max(0, (r1 + r2 + hills + detail) * 0.52 + mountainRing);
        return -0.25 + blend * rawH * passDamp;
      };

      const vCount = stride * stride;
      const heights = new Float32Array(vCount);
      const colors = new Float32Array(vCount * 3);
      const halfSpan = terrainSize * 0.5;
      const step = terrainSize / terrainSegs;
      const defR = isSnowBiome ? 0.38 : 0.22, defG = isSnowBiome ? 0.43 : 0.31, defB = isSnowBiome ? 0.47 : 0.18;

      for (let iy = 0; iy < stride; iy++) {
        const vz = -halfSpan + iy * step;
        const rowOff = iy * stride;
        for (let ix = 0; ix < stride; ix++) {
          heights[rowOff + ix] = getHeight(-halfSpan + ix * step, vz);
        }
      }

      for (let iy = 0; iy < stride; iy++) {
        const vz = -halfSpan + iy * step;
        const rowOff = iy * stride;
        const iyU = iy > 0 ? iy - 1 : iy, iyD = iy < terrainSegs ? iy + 1 : iy;
        for (let ix = 0; ix < stride; ix++) {
          const vx = -halfSpan + ix * step;
          const idx = rowOff + ix;
          const vy = heights[idx];
          const ixL = ix > 0 ? ix - 1 : ix, ixR = ix < terrainSegs ? ix + 1 : ix;
          const dhx = Math.abs(heights[rowOff + ixR] - heights[rowOff + ixL]);
          const dhz = Math.abs(heights[iyD * stride + ix] - heights[iyU * stride + ix]);
          const slope = Math.min(1.0, Math.hypot(dhx, dhz) / (step * 1.15));

          const distOut = Math.hypot(Math.max(0, Math.abs(vx) - halfW0), Math.max(0, Math.abs(vz) - halfH0));
          const road = getRoadMask(vx, vz);
          const centerMix = Math.max(0, 1.0 - distOut / 360.0);
          let r = defR, g = defG, b = defB;
          if (vy > snowLine + 160) {
            r = 0.80; g = 0.84; b = 0.89;
          } else if (vy > snowLine) {
            const sMix = (vy - snowLine) / 160;
            r = 0.40 + 0.40 * sMix; g = 0.40 + 0.44 * sMix; b = 0.42 + 0.47 * sMix;
          } else if (vy > 155) {
            r = 0.39; g = 0.39; b = 0.40;
          } else if (vy > 40) {
            const hMix = (vy - 40) / 115;
            r = r + (0.34 - r) * hMix; g = g + (0.37 - g) * hMix; b = b + (0.25 - b) * hMix;
          }
          if (slope > 0.24) {
            const rockMix = Math.min(1.0, (slope - 0.24) * 1.45);
            const strata = 0.92 + Math.sin(vy * 0.22) * 0.08;
            r = r * (1 - rockMix) + 0.34 * strata * rockMix;
            g = g * (1 - rockMix) + 0.34 * strata * rockMix;
            b = b * (1 - rockMix) + 0.36 * strata * rockMix;
          }
          if (road > 0.15 && vy < 240) {
            const rm = road * 0.85;
            r = r * (1 - rm) + 0.38 * rm; g = g * (1 - rm) + 0.31 * rm; b = b * (1 - rm) + 0.22 * rm;
          }
          if (centerMix > 0) {
            r = r * (1 - centerMix) + baseR * centerMix;
            g = g * (1 - centerMix) + baseG * centerMix;
            b = b * (1 - centerMix) + baseB * centerMix;
          }
          const c3 = idx * 3;
          colors[c3] = r; colors[c3 + 1] = g; colors[c3 + 2] = b;
        }
      }

      const treeTarget = isDenseForest ? 860 : 680;
      const treeMatrices = new Float32Array(treeTarget * 3 * 16);
      const tierStride = treeTarget * 16;
      let placedTrees = 0;
      for (let t = 0; t < treeTarget * 4 && placedTrees < treeTarget; t++) {
        const ang = (t * 2.39996 + phaseX) % (Math.PI * 2);
        const rad = 640 + ((t * 197 + seedNum) % 4800);
        const tx = Math.cos(ang) * rad;
        const tz = Math.sin(ang) * rad;
        if (Math.abs(tx) < halfBoundW && Math.abs(tz) < halfBoundH) continue;
        if (getRoadMask(tx, tz) > 0.25) continue;
        const ty = getHeight(tx, tz);
        if (ty > snowLine - 25) continue;

        const sc = 0.85 + ((t * 41) % 100) / 90.0;
        const ca = Math.cos(ang) * sc, sa = Math.sin(ang) * sc;
        const mOff = placedTrees * 16;
        // Tier 0: trunk, Tier 1: low crown, Tier 2: top crown (Euler Y rotation + uniform scale)
        for (let k = 0; k < 3; k++) {
          const o = k * tierStride + mOff;
          treeMatrices[o] = ca;      treeMatrices[o + 1] = 0;   treeMatrices[o + 2] = -sa; treeMatrices[o + 3] = 0;
          treeMatrices[o + 4] = 0;   treeMatrices[o + 5] = sc;  treeMatrices[o + 6] = 0;   treeMatrices[o + 7] = 0;
          treeMatrices[o + 8] = sa;  treeMatrices[o + 9] = 0;   treeMatrices[o + 10] = ca; treeMatrices[o + 11] = 0;
          treeMatrices[o + 12] = tx;
          treeMatrices[o + 13] = ty + (k === 0 ? 18 : (k === 1 ? 48 : 78)) * sc;
          treeMatrices[o + 14] = tz;
          treeMatrices[o + 15] = 1;
        }
        placedTrees++;
      }

      const rockCount = 280;
      const rockMatrices = new Float32Array(rockCount * 16);
      let placedRocks = 0;
      for (let r = 0; r < rockCount * 2 && placedRocks < rockCount; r++) {
        const ang = (r * 1.913 + phaseZ) % (Math.PI * 2);
        const rad = 600 + ((r * 263 + seedNum) % 4900);
        const rx = Math.cos(ang) * rad;
        const rz = Math.sin(ang) * rad;
        if (getRoadMask(rx, rz) > 0.35) continue;
        const ry = getHeight(rx, rz);
        const sc = 0.8 + ((r * 53) % 100) / 40.0;
        const sx = sc * 1.3, sy = sc * 0.8, sz = sc;
        const e1 = r * 0.4, e2 = r * 0.7;
        const c1 = Math.cos(e1), s1 = Math.sin(e1), c2 = Math.cos(e2), s2 = Math.sin(e2);
        const o = placedRocks * 16;
        // Three.js Euler('XYZ') rotation (rx=e1, ry=e2, rz=0) * scale (sx, sy, sz)
        rockMatrices[o] = c2 * sx;      rockMatrices[o + 1] = s1 * s2 * sx;  rockMatrices[o + 2] = -c1 * s2 * sx; rockMatrices[o + 3] = 0;
        rockMatrices[o + 4] = 0;        rockMatrices[o + 5] = c1 * sy;       rockMatrices[o + 6] = s1 * sy;       rockMatrices[o + 7] = 0;
        rockMatrices[o + 8] = s2 * sz;  rockMatrices[o + 9] = -s1 * c2 * sz; rockMatrices[o + 10] = c1 * c2 * sz; rockMatrices[o + 11] = 0;
        rockMatrices[o + 12] = rx;      rockMatrices[o + 13] = ry + 6 * sc;  rockMatrices[o + 14] = rz;          rockMatrices[o + 15] = 1;
        placedRocks++;
      }

      return { heights, colors, treeMatrices, rockMatrices, placedTrees, placedRocks, treeTarget, rockCount, terrainSize, terrainSegs };
    }

    function makeBilinearTerrainHeightFn(heights, terrainSize, terrainSegs) {
      const stride = terrainSegs + 1;
      const half = terrainSize * 0.5;
      const invStep = terrainSegs / terrainSize;
      return function(wx, wz) {
        const fx = (wx + half) * invStep;
        const fz = (wz + half) * invStep;
        if (fx <= 0 || fx >= terrainSegs || fz <= 0 || fz >= terrainSegs) return 0;
        const x0 = fx | 0, z0 = fz | 0;
        const tx = fx - x0, tz = fz - z0;
        const i00 = z0 * stride + x0;
        const h00 = heights[i00], h10 = heights[i00 + 1];
        const h01 = heights[i00 + stride], h11 = heights[i00 + stride + 1];
        const hx0 = h00 + (h10 - h00) * tx;
        const hx1 = h01 + (h11 - h01) * tx;
        return hx0 + (hx1 - hx0) * tz;
      };
    }

    // Builds seamless 16000x16000 Skyrim continental mountains, roads, tiered pine forests, watchtowers & standing stones
    function buildSkyrimOpenWorld(staticGrp, data, W, H, theme, tw, stoneMat, woodMat, cachedProcTex, applyQualityFn) {
      const seedNum = (data.room_id || 'world').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100000, 17);
      const { isSnowBiome, isDenseForest } = (typeof classifyBiomeFromSkill === 'function')
        ? classifyBiomeFromSkill(data.room_id, theme)
        : { isSnowBiome: theme.type === 'glacier', isDenseForest: theme.type === 'forest' };
      const baseR = (theme.base ? theme.base[0] : 55) / 255;
      const baseG = (theme.base ? theme.base[1] : 65) / 255;
      const baseB = (theme.base ? theme.base[2] : 50) / 255;

      const tCache = window.__DND_TERRAIN_CACHE__;
      const roomKey = data.room_id || 'default_room';
      let tData = (tCache && tCache[roomKey]) ? tCache[roomKey] : null;
      if (!tData) {
        const tCfg = { W, H, seedNum, isSnowBiome, isDenseForest, baseR, baseG, baseB, terrainSize: 16000, terrainSegs: 224 };
        tData = computeOpenWorldTerrainData(tCfg);
        if (tCache) tCache[roomKey] = tData;
        if (typeof savePrebuildCacheRecord === 'function' && typeof _getTerrainPrebuildSig === 'function' && tData) {
          savePrebuildCacheRecord(`terrain:${roomKey}`, _getTerrainPrebuildSig(tCfg), 'terrain', tData);
        }
      }

      const { heights, colors, treeMatrices, rockMatrices, placedTrees, placedRocks, treeTarget, rockCount, terrainSize, terrainSegs } = tData;
      window.getOpenWorldTerrainHeight = makeBilinearTerrainHeightFn(heights, terrainSize, terrainSegs);
      const getTerrainHeight = window.getOpenWorldTerrainHeight;

      const outerTerrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
      outerTerrainGeo.rotateX(-Math.PI / 2);
      const posAttr = outerTerrainGeo.attributes.position;
      const posArr = posAttr.array;
      for (let i = 0; i < posAttr.count; i++) {
        posArr[i * 3 + 1] = heights[i];
      }
      outerTerrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      outerTerrainGeo.computeVertexNormals();

      const wildNormTex = createProceduralNormalTexture('wilderness');
      if (wildNormTex) { wildNormTex.wrapS = wildNormTex.wrapT = THREE.RepeatWrapping; wildNormTex.repeat.set(64, 64); }
      const wildRoughTex = createProceduralRoughnessTexture(212);
      if (wildRoughTex) { wildRoughTex.wrapS = wildRoughTex.wrapT = THREE.RepeatWrapping; wildRoughTex.repeat.set(64, 64); }
      const outerTerrainMat = new THREE.MeshStandardMaterial({
        map: getWildernessGroundTexture(cachedProcTex, applyQualityFn),
        normalMap: wildNormTex,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: wildRoughTex,
        vertexColors: true,
        roughness: 0.90,
        metalness: 0.03
      });
      const outerTerrainMesh = new THREE.Mesh(outerTerrainGeo, outerTerrainMat);
      outerTerrainMesh.receiveShadow = true;
      outerTerrainMesh.userData.isFloor = true;
      outerTerrainMesh.userData.isOuterTerrain = true;
      staticGrp.add(outerTerrainMesh);

      // Instanced Multi-Tiered Nordic Pine Forest + Granite Outcrops + Micro-Clutter (Tier 4 #4 & #5)
      if (typeof THREE.InstancedMesh === 'function') {
        const _geo = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
        const _mat = (typeof getSharedMat === 'function') ? getSharedMat : (_, fn) => fn();
        const _shadeCone = (geo, botShade, topShade) => {
          const p = geo.attributes.position;
          const cols = new Float32Array(p.count * 3);
          geo.computeBoundingBox();
          const minY = geo.boundingBox.min.y, span = Math.max(0.1, geo.boundingBox.max.y - minY);
          for (let i = 0; i < p.count; i++) {
            const t = (p.getY(i) - minY) / span;
            const sh = botShade + (topShade - botShade) * t;
            cols[i * 3] = sh; cols[i * 3 + 1] = sh * 1.03; cols[i * 3 + 2] = sh * 0.96;
          }
          geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
          return geo;
        };
        const _mkPineTierGeo = (radius, height, tiers, botShade, topShade) => {
          const mergeFn = window._sculptHelpers && window._sculptHelpers.merge;
          const rings = [];
          for (let t = 0; t < tiers; t++) {
            const frac = t / Math.max(1, tiers - 1);
            const rT = radius * (1.0 - frac * 0.42);
            const hT = height * (0.48 - frac * 0.08);
            const yOff = -height * 0.30 + frac * height * 0.56;
            const c = new THREE.ConeGeometry(rT, hT, 14, 2).toNonIndexed();
            const p = c.attributes.position;
            const cols = new Float32Array(p.count * 3);
            for (let i = 0; i < p.count; i++) {
              let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
              const ang = Math.atan2(z, x);
              const rNow = Math.hypot(x, z);
              const bough = 1.0 + 0.24 * Math.cos(ang * 7 + t * 1.4);
              const droop = (rNow / Math.max(0.1, rT)) * -4.2;
              x *= bough; z *= bough; y += droop + yOff;
              p.setXYZ(i, x, y, z);
              const ly = Math.max(0, Math.min(1, (y + height * 0.5) / height));
              const sh = botShade + (topShade - botShade) * (ly * 0.75 + (rNow / Math.max(0.1, rT)) * 0.25);
              cols[i * 3] = sh; cols[i * 3 + 1] = sh * 1.04; cols[i * 3 + 2] = sh * 0.96;
            }
            c.setAttribute('color', new THREE.BufferAttribute(cols, 3));
            c.computeVertexNormals();
            rings.push(c);
          }
          if (!mergeFn) return rings[0];
          const merged = mergeFn(rings);
          const mp = merged.attributes.position;
          const mcols = new Float32Array(mp.count * 3);
          for (let i = 0; i < mp.count; i++) {
            const y = mp.getY(i), rNow = Math.hypot(mp.getX(i), mp.getZ(i));
            const ly = Math.max(0, Math.min(1, (y + height * 0.5) / height));
            const sh = botShade + (topShade - botShade) * (ly * 0.72 + Math.min(1, rNow / Math.max(1, radius)) * 0.28);
            mcols[i * 3] = sh; mcols[i * 3 + 1] = sh * 1.04; mcols[i * 3 + 2] = sh * 0.96;
          }
          merged.setAttribute('color', new THREE.BufferAttribute(mcols, 3));
          return merged;
        };
        const trunkGeo = _geo('pine_trunk', () => new THREE.CylinderGeometry(3.2, 6.2, 36, 8));
        const lowCrownGeo = _geo('pine_low_v3', () => _mkPineTierGeo(25, 58, 3, 0.50, 1.08));
        const topCrownGeo = _geo('pine_top_v3', () => _mkPineTierGeo(17, 50, 3, 0.68, 1.18));
        const broadTrunkGeo = _geo('broad_trunk_v1', () => new THREE.CylinderGeometry(2.4, 5.2, 42, 8));
        const broadCrownGeo = _geo('broad_crown_v1', () => {
          const mergeFn = window._sculptHelpers && window._sculptHelpers.merge;
          const lobes = [[0, 6, 0, 22, 18], [-11, -1, 7, 15, 13], [11, 0, -6, 15, 13], [3, -2, 11, 13, 12]].map(([lx, ly, lz, rx, ry], li) => {
            const ig = new THREE.IcosahedronGeometry(1.0, 1).toNonIndexed();
            const pa = ig.attributes.position, cols = new Float32Array(pa.count * 3);
            for (let vi = 0; vi < pa.count; vi++) {
              const vx = pa.getX(vi), vy = pa.getY(vi), vz = pa.getZ(vi);
              const warp = 0.88 + 0.18 * Math.sin(vx * 3.8 + li) * Math.cos(vz * 4.1 - vy * 2.7);
              pa.setXYZ(vi, vx * rx * warp + lx, vy * ry * warp + ly, vz * rx * warp + lz);
              const shade = 0.56 + 0.56 * Math.max(0, Math.min(1, (vy + 1.0) * 0.5));
              cols[vi * 3] = shade; cols[vi * 3 + 1] = shade * 1.02; cols[vi * 3 + 2] = shade * 0.94;
            }
            ig.setAttribute('color', new THREE.BufferAttribute(cols, 3));
            ig.computeVertexNormals();
            return ig;
          });
          return mergeFn ? mergeFn(lobes) : lobes[0];
        });
        const folNorm = createProceduralNormalTexture('foliage');
        const pineBarkTex = (typeof createBarkTexture === 'function') ? createBarkTexture() : null;
        const pineBarkNorm = createProceduralNormalTexture('bark');
        const _folRough = (typeof window.getProceduralObjectMaps === 'function') ? window.getProceduralObjectMaps('cloth').roughnessMap : null;
        const trunkMat = _mat('pine_trunk_v3', () => new THREE.MeshStandardMaterial({ color: 0xa28870, map: pineBarkTex, normalMap: pineBarkNorm, normalScale: new THREE.Vector2(0.75, 0.75), roughness: 0.90 }));
        const broadTrunkMat = _mat('broad_trunk_mat_v1', () => new THREE.MeshStandardMaterial({ color: 0xd0c9bc, map: pineBarkTex, normalMap: pineBarkNorm, normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.84 }));
        const _mkCrownMat = (key, colHex, shHex, rVal) => _mat(key, () => (typeof THREE.MeshPhysicalMaterial === 'function')
          ? new THREE.MeshPhysicalMaterial({ color: colHex, vertexColors: true, normalMap: folNorm, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: _folRough, roughness: rVal, sheen: 0.48, sheenRoughness: 0.72, sheenColor: new THREE.Color(shHex), envMapIntensity: 0.55 })
          : new THREE.MeshStandardMaterial({ color: colHex, vertexColors: true, normalMap: folNorm, normalScale: new THREE.Vector2(0.45, 0.45), roughness: rVal }));
        const crownMat = _mkCrownMat(isSnowBiome ? 'pine_crown_snow_v4' : 'pine_crown_green_v4', isSnowBiome ? 0x527468 : 0x567e48, isSnowBiome ? 0xbcd0dc : 0x6ea048, 0.84);
        const topCrownMat = _mkCrownMat(isSnowBiome ? 'pine_top_snow_v4' : 'pine_top_green_v4', isSnowBiome ? 0x749088 : 0x689452, isSnowBiome ? 0xd0e2ea : 0x84b856, 0.78);
        const broadCrownMat = _mkCrownMat(isSnowBiome ? 'broad_crown_snow_v1' : 'broad_crown_green_v1', 0xb8beaa, isSnowBiome ? 0xd0dfe8 : 0xc6b468, 0.76);

        const coniferCap = Math.max(1, placedTrees);
        const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, coniferCap);
        const lowInst = new THREE.InstancedMesh(lowCrownGeo, crownMat, coniferCap);
        const topInst = new THREE.InstancedMesh(topCrownGeo, topCrownMat, coniferCap);
        const broadTrunkInst = new THREE.InstancedMesh(broadTrunkGeo, broadTrunkMat, coniferCap);
        const broadCrownInst = new THREE.InstancedMesh(broadCrownGeo, broadCrownMat, coniferCap);
        const tierStride = treeTarget * 16;
        const _tDum = new THREE.Object3D(), _tMat = new THREE.Matrix4(), _tCol = new THREE.Color();
        const _coniferCols = isSnowBiome ? [0x6e9288, 0x84a09a, 0x5e827a, 0x90aaa2, 0x6c8676] : [0x58825a, 0x6e9248, 0x4e7448, 0x7e9a54, 0x587a68, 0x668446];
        const _broadCols = isSnowBiome ? [0x88a49e, 0xa2b6b0, 0x9c8e6c, 0x76948a] : [0x7e9c4a, 0xbe8e44, 0x9e5e3c, 0x648c4c, 0xc8a44e, 0x829460];
        const _barkCols = [0x8c7056, 0xa47a58, 0x746458, 0x96887a, 0x6a5444];
        const _birchBarkCols = [0xd6d0c4, 0xc4bcb0, 0x9e7458, 0xb2aa98];
        let conIdx = 0, brdIdx = 0;
        for (let ti = 0; ti < placedTrees; ti++) {
          const h = ((ti * 2654435761 + seedNum * 97) >>> 0);
          const mOff = ti * 16;
          const isBroad = (h % 10) < 3; // ~30% broadleaf/birch-autumn mix
          const tiltX = (((h >> 4) % 11) - 5) * 0.015;
          const tiltZ = (((h >> 8) % 11) - 5) * 0.015;
          // Realistic sapling -> mature -> elder distribution while keeping ground alignment
          const sizeRoll = (h >> 12) % 100;
          const yStret = sizeRoll < 18 ? (0.62 + ((h >> 19) % 16) * 0.01) : (sizeRoll > 82 ? (1.18 + ((h >> 19) % 22) * 0.01) : (0.86 + ((h >> 19) % 30) * 0.01));
          const wStret = 0.78 + ((h >> 24) % 44) * 0.01;
          if (!isBroad) {
            _tMat.fromArray(treeMatrices, mOff);
            _tMat.decompose(_tDum.position, _tDum.quaternion, _tDum.scale);
            const origSc = _tDum.scale.y || 1;
            const groundY = _tDum.position.y - 18 * origSc;
            for (let k = 0; k < 3; k++) {
              _tMat.fromArray(treeMatrices, k * tierStride + mOff);
              _tMat.decompose(_tDum.position, _tDum.quaternion, _tDum.scale);
              _tDum.rotation.setFromQuaternion(_tDum.quaternion);
              _tDum.rotation.x += tiltX; _tDum.rotation.z += tiltZ;
              const tierOff = k === 0 ? 18 : (k === 1 ? 48 : 78);
              _tDum.position.y = groundY + tierOff * origSc * yStret;
              _tDum.scale.set(_tDum.scale.x * wStret, _tDum.scale.y * yStret, _tDum.scale.z * wStret);
              _tDum.updateMatrix();
              if (k === 0) trunkInst.setMatrixAt(conIdx, _tDum.matrix);
              else if (k === 1) lowInst.setMatrixAt(conIdx, _tDum.matrix);
              else topInst.setMatrixAt(conIdx, _tDum.matrix);
            }
            _tCol.setHex(_barkCols[h % _barkCols.length]); trunkInst.setColorAt(conIdx, _tCol);
            _tCol.setHex(_coniferCols[(h >> 3) % _coniferCols.length]); lowInst.setColorAt(conIdx, _tCol);
            _tCol.offsetHSL(0.0, 0.02, 0.06); topInst.setColorAt(conIdx, _tCol);
            conIdx++;
          } else {
            _tMat.fromArray(treeMatrices, mOff);
            _tMat.decompose(_tDum.position, _tDum.quaternion, _tDum.scale);
            const origSc = _tDum.scale.y || 1;
            const groundY = _tDum.position.y - 18 * origSc;
            _tDum.position.y = groundY + 20 * origSc * yStret;
            _tDum.rotation.setFromQuaternion(_tDum.quaternion);
            _tDum.rotation.x += tiltX * 1.4; _tDum.rotation.z += tiltZ * 1.4;
            _tDum.scale.set(_tDum.scale.x * wStret * (yStret < 0.8 ? 0.85 : 1.0), _tDum.scale.y * yStret, _tDum.scale.z * wStret * (yStret < 0.8 ? 0.85 : 1.0));
            _tDum.updateMatrix();
            broadTrunkInst.setMatrixAt(brdIdx, _tDum.matrix);
            _tMat.fromArray(treeMatrices, tierStride + mOff);
            _tMat.decompose(_tDum.position, _tDum.quaternion, _tDum.scale);
            _tDum.position.y = groundY + 48 * origSc * yStret;
            _tDum.rotation.setFromQuaternion(_tDum.quaternion);
            _tDum.rotation.x += tiltX; _tDum.rotation.z += tiltZ;
            _tDum.scale.set(_tDum.scale.x * wStret * 1.14, _tDum.scale.y * yStret * 0.96, _tDum.scale.z * wStret * 1.14);
            _tDum.updateMatrix();
            broadCrownInst.setMatrixAt(brdIdx, _tDum.matrix);
            _tCol.setHex(_birchBarkCols[h % _birchBarkCols.length]); broadTrunkInst.setColorAt(brdIdx, _tCol);
            _tCol.setHex(_broadCols[(h >> 5) % _broadCols.length]); broadCrownInst.setColorAt(brdIdx, _tCol);
            brdIdx++;
          }
        }
        [trunkInst, lowInst, topInst].forEach(im => {
          im.count = conIdx; im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.castShadow = false; im.userData.isScenery = true; staticGrp.add(im);
        });
        [broadTrunkInst, broadCrownInst].forEach(im => {
          im.count = brdIdx; im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.castShadow = false; im.userData.isScenery = true; staticGrp.add(im);
        });

        const rockGeo = _geo('outcrop_rock_v2', () => {
          const g = new THREE.DodecahedronGeometry(16, 1), pa = g.attributes.position;
          for (let v = 0; v < pa.count; v++) {
            const vx = pa.getX(v), vy = pa.getY(v), vz = pa.getZ(v);
            const d = 1.0 + Math.sin(vx * 0.28 + vy * 0.22) * 0.14 + Math.cos(vz * 0.31) * 0.10;
            pa.setXYZ(v, vx * d, vy * d, vz * d);
          }
          g.computeVertexNormals(); return g;
        });
        const _stMaps = (typeof window.getProceduralObjectMaps === 'function') ? window.getProceduralObjectMaps('stone') : null;
        const rockMat = _mat('outcrop_rock_v3', () => new THREE.MeshStandardMaterial({ color: 0xb4bac2, map: _stMaps ? _stMaps.map : null, normalMap: wildNormTex, roughnessMap: _stMaps ? _stMaps.roughnessMap : null, roughness: 0.88 }));
        const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
        const _rockCols = [0x7e8690, 0x988a74, 0x626870, 0x76846c, 0x8a7266, 0x9ea2a6];
        for (let ri = 0; ri < placedRocks; ri++) {
          const rh = ((ri * 2654435761 + seedNum * 53) >>> 0);
          _tMat.fromArray(rockMatrices, ri * 16);
          _tMat.decompose(_tDum.position, _tDum.quaternion, _tDum.scale);
          _tDum.scale.multiply(new THREE.Vector3(0.70 + (rh % 65) * 0.01, 0.65 + ((rh >> 6) % 70) * 0.01, 0.72 + ((rh >> 12) % 62) * 0.01));
          _tDum.updateMatrix();
          rockInst.setMatrixAt(ri, _tDum.matrix);
          _tCol.setHex(_rockCols[(ri * 7 + seedNum) % _rockCols.length]);
          rockInst.setColorAt(ri, _tCol);
        }
        if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
        rockInst.instanceMatrix.needsUpdate = true;
        rockInst.count = placedRocks;
        rockInst.userData.isScenery = true;
        staticGrp.add(rockInst);

        // Tier 4 #4 Three-Tier Micro-Clutter: Soft grass blade tufts & faceted pebbles around the clearing
        const grassGeo = _geo('clutter_grass_tuft_v4', () => (window._sculptHelpers && window._sculptHelpers.grassTuft) ? window._sculptHelpers.grassTuft(2.6, 8.2) : new THREE.ConeGeometry(1.4, 8.0, 4));
        const _grHasCol = Boolean(grassGeo.attributes && grassGeo.attributes.color);
        const grassMat = _mat(isSnowBiome ? 'clutter_grass_snow_v4' : 'clutter_grass_v4', () => (typeof THREE.MeshPhysicalMaterial === 'function')
          ? new THREE.MeshPhysicalMaterial({ color: isSnowBiome ? 0xb4c6ce : 0xc6d0b8, vertexColors: _grHasCol, roughness: 0.86, sheen: 0.48, sheenColor: new THREE.Color(isSnowBiome ? 0xd2e2ea : 0x96be66) })
          : new THREE.MeshStandardMaterial({ color: isSnowBiome ? 0xb4c6ce : 0xc6d0b8, vertexColors: _grHasCol, roughness: 0.86 }));
        const grassMax = 640;
        const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassMax);
        const pebbleGeo = _geo('clutter_pebble_v2', () => (window._sculptHelpers && window._sculptHelpers.rock) ? window._sculptHelpers.rock(2.6, 1.6, 2.4, 3) : new THREE.DodecahedronGeometry(2.6, 0));
        const pebbleMat = _mat('clutter_pebble_v3', () => new THREE.MeshStandardMaterial({ color: 0xb6bac2, map: _stMaps ? _stMaps.map : null, normalMap: wildNormTex, roughness: 0.90 }));
        const pebbleMax = 320;
        const pebbleInst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleMax);
        const cdum = new THREE.Object3D();
        const _grassCols = isSnowBiome ? [0x6e8880, 0x829892, 0x8e8668, 0x627c74, 0x94a69c] : [0x58823c, 0x729842, 0x8e8648, 0x4a6e38, 0x6c8856, 0x7ca246];
        let gCount = 0, pCount = 0;
        for (let ci = 0; ci < 960; ci++) {
          const ch = ((ci * 2654435761 + seedNum * 37) >>> 0);
          const ang = ((ci * 2.39996 + seedNum * 0.13) % (Math.PI * 2));
          const rad = 110 + ((ci * 173 + seedNum * 29) % 1450);
          const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
          const cy = getTerrainHeight(cx, cz);
          if (ci < grassMax && gCount < grassMax) {
            cdum.position.set(cx, cy + 3.0, cz);
            cdum.rotation.set(Math.sin(ci * 1.9) * 0.18, ang, Math.cos(ci * 2.3) * 0.18);
            const gs = 0.55 + ((ch % 100) * 0.01);
            cdum.scale.set(gs * (0.95 + ((ch >> 7) % 35) * 0.01), gs * (0.78 + ((ch >> 13) % 45) * 0.01), gs * (0.95 + ((ch >> 19) % 35) * 0.01));
            cdum.updateMatrix();
            _tCol.setHex(_grassCols[((ci * 13 + seedNum) >>> 0) % _grassCols.length]);
            grassInst.setColorAt(gCount, _tCol);
            grassInst.setMatrixAt(gCount++, cdum.matrix);
          } else if (pCount < pebbleMax) {
            cdum.position.set(cx, cy + 0.65, cz);
            cdum.rotation.set(ci * 0.6, ci * 1.3, ci * 0.4);
            const ps = 0.40 + ((ch % 125) * 0.01);
            cdum.scale.set(ps * (1.05 + ((ch >> 8) % 45) * 0.01), ps * (0.45 + ((ch >> 14) % 35) * 0.01), ps * (0.85 + ((ch >> 20) % 40) * 0.01));
            cdum.updateMatrix();
            _tCol.setHex(_rockCols[((ci * 11 + seedNum) >>> 0) % _rockCols.length]);
            pebbleInst.setColorAt(pCount, _tCol);
            pebbleInst.setMatrixAt(pCount++, cdum.matrix);
          }
        }
        grassInst.count = gCount; grassInst.instanceMatrix.needsUpdate = true;
        if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
        grassInst.receiveShadow = true; grassInst.userData.isScenery = true;
        pebbleInst.count = pCount; pebbleInst.instanceMatrix.needsUpdate = true;
        if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
        pebbleInst.receiveShadow = true; pebbleInst.userData.isScenery = true;
        staticGrp.add(grassInst);
        staticGrp.add(pebbleInst);

        // Outdoor Landscape Ecology: 630+ Plants, Wildflowers, Ferns, Mushrooms, Pine Cones, Twigs, Fallen Leaves, Logs & Animated Animals
        const _scMerge = window._sculptHelpers && window._sculptHelpers.merge;
        const _scLathe = window._sculptHelpers && window._sculptHelpers.lathe;
        const _tintVerts = (geo, fn) => {
          const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
          for (let i = 0; i < pa.count; i++) {
            const [r, g, b] = fn(pa.getX(i), pa.getY(i), pa.getZ(i));
            cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b;
          }
          geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
          return geo;
        };
        const _fMat = (key, spec) => _mat(key, () => (typeof window.createRichObjectMaterial === 'function')
          ? window.createRichObjectMaterial(spec)
          : new THREE.MeshStandardMaterial({ color: spec.color ?? 0xffffff, roughness: spec.roughness ?? 0.80, vertexColors: Boolean(spec.vertexColors) }));

        // 1. Wildflower Stems & Colorful Petals (180)
        const flStemGeo = _geo('land_fl_stem_v2', () => {
          const stk = _tintVerts(new THREE.CylinderGeometry(0.22, 0.34, 7.8, 5).translate(0, 3.9, 0), (_, y) => [0.28, 0.46 + y * 0.04, 0.20]);
          const lfL = _tintVerts(new THREE.BoxGeometry(1.1, 3.6, 0.20).translate(0, 1.6, 0).rotateZ(0.82).translate(-0.3, 0.7, 0), () => [0.34, 0.60, 0.24]);
          const lfR = _tintVerts(new THREE.BoxGeometry(1.1, 3.6, 0.20).translate(0, 1.6, 0).rotateZ(-0.84).rotateY(1.1).translate(0.3, 0.8, 0), () => [0.38, 0.64, 0.26]);
          return _scMerge ? _scMerge([stk, lfL, lfR]) : stk;
        });
        const flBloomGeo = _geo('land_fl_bloom_v2', () => {
          const pts = [_tintVerts(new THREE.CylinderGeometry(0.85, 0.55, 0.55, 7).translate(0, 7.85, 0), () => [0.96, 0.80, 0.28])];
          for (let pi = 0; pi < 6; pi++) {
            const pa = (pi / 6) * Math.PI * 2;
            const pet = _tintVerts(new THREE.BoxGeometry(1.05, 0.20, 2.15).translate(0, 0, 1.32).rotateX(-0.24).rotateY(pa).translate(0, 7.85, 0),
              (x, _, z) => { const d = Math.min(1, Math.hypot(x, z) / 2.4); return [0.76 + d * 0.24, 0.74 + d * 0.24, 0.74 + d * 0.24]; });
            pts.push(pet);
          }
          return _scMerge ? _scMerge(pts) : pts[0];
        });
        // 2. Arched Woodland Ferns (120)
        const fernGeo = _geo('land_fern_v2', () => {
          const pts = [];
          for (let fi = 0; fi < 8; fi++) {
            const ang = (fi / 8) * Math.PI * 2 + (fi % 2) * 0.25, inner = fi >= 5;
            const len = inner ? 6.2 : 9.2, tilt = inner ? -0.62 : -0.30;
            const fr = _tintVerts(new THREE.BoxGeometry(inner ? 1.35 : 1.75, 0.20, len).translate(0, 0, len * 0.5).rotateX(tilt).rotateY(ang),
              (x, y, z) => { const d = Math.min(1, Math.hypot(x, z) / 9.0); return [0.55 + d * 0.45, 0.65 + d * 0.45, 0.45 + d * 0.38]; });
            pts.push(fr);
          }
          return _scMerge ? _scMerge(pts) : pts[0];
        });
        // 3. Toadstool Mushroom Clumps (72)
        const shroomGeo = _geo('land_shroom_v2', () => {
          const mkOne = (sx, sz, h, r) => {
            const st = _tintVerts(new THREE.CylinderGeometry(r * 0.28, r * 0.38, h, 6).translate(sx, h * 0.5, sz), () => [0.92, 0.88, 0.80]);
            const capRaw = _scLathe ? _scLathe([[r * 0.25, h * 0.88], [r * 1.08, h * 0.94], [r * 0.85, h * 1.24], [r * 0.05, h * 1.40]], 9) : new THREE.ConeGeometry(r, h * 0.5, 8).translate(0, h * 1.1, 0);
            const cap = _tintVerts(capRaw.translate(sx, 0, sz), (_, y) => [0.85 + Math.min(0.15, (y - h) * 0.12), 0.82, 0.80]);
            return [st, cap];
          };
          const parts = [...mkOne(0, 0, 4.4, 2.2), ...mkOne(2.0, 1.2, 2.9, 1.45), ...mkOne(-1.7, -1.0, 2.4, 1.2)];
          return _scMerge ? _scMerge(parts) : parts[0];
        });
        // 4. Sculpted Pine Cones (110)
        const coneGeo = _geo('land_pinecone_v2', () => {
          const cg = _scLathe
            ? _scLathe([[0.28, 0], [1.35, 0.72], [1.65, 1.80], [1.32, 3.0], [0.65, 3.95], [0.10, 4.35]], 9, 7, 0.24, 2.2)
            : new THREE.ConeGeometry(1.5, 4.3, 7);
          cg.rotateZ(1.48); cg.translate(0, 1.28, 0);
          return _tintVerts(cg, (_, y) => { const s = 0.72 + Math.min(0.32, y * 0.18); return [s * 1.05, s * 0.95, s * 0.86]; });
        });
        // 5. Forked Fallen Twigs (110)
        const twigGeo = _geo('land_twig_v2', () => {
          const m = new THREE.CylinderGeometry(0.26, 0.42, 12.6, 5).rotateZ(1.52).translate(0, 0.36, 0);
          const f1 = new THREE.CylinderGeometry(0.16, 0.26, 5.2, 5).rotateZ(1.48).rotateY(0.56).translate(2.0, 0.42, 1.6);
          const f2 = new THREE.CylinderGeometry(0.15, 0.24, 4.4, 5).rotateZ(1.50).rotateY(-0.52).translate(-1.6, 0.38, -1.3);
          const mrg = _scMerge ? _scMerge([m, f1, f2]) : m;
          return _tintVerts(mrg, (x) => { const s = 0.80 + Math.min(0.22, Math.abs(x) * 0.04); return [s, s * 0.96, s * 0.90]; });
        });
        // 6. Cupped Fallen Leaf Clusters (160 clusters = ~480 fallen leaves)
        const leafGeo = _geo('land_leaf_v2', () => {
          const mkLeaf = (ox, oz, ry, sc) => {
            const bl = new THREE.BoxGeometry(2.4 * sc, 0.12, 3.8 * sc, 2, 1, 2).toNonIndexed();
            const pa = bl.attributes.position;
            for (let i = 0; i < pa.count; i++) {
              const lx = pa.getX(i), lz = pa.getZ(i);
              const tip = Math.max(0.12, 1.0 - Math.abs(lz) * 0.45);
              pa.setXYZ(i, lx * tip, Math.abs(lx) * 0.16 + (lz * lz) * 0.02, lz);
            }
            bl.rotateY(ry); bl.translate(ox, 0.24, oz); bl.computeVertexNormals();
            return _tintVerts(bl, (x) => { const edge = Math.min(1, Math.abs(x) * 0.5); return [0.98 - edge * 0.14, 0.94 - edge * 0.16, 0.86 - edge * 0.18]; });
          };
          const parts = [mkLeaf(0, 0, 0.2, 1.0), mkLeaf(1.8, 1.4, 1.6, 0.82), mkLeaf(-1.6, 1.1, -0.9, 0.88)];
          return _scMerge ? _scMerge(parts) : parts[0];
        });
        // 7. Mossy Fallen Logs (36)
        const logGeo = _geo('land_log_v2', () => {
          const lg = _scLathe ? _scLathe([[3.2, 0], [2.8, 9], [3.0, 18], [2.5, 27]], 10, 6, 0.12) : new THREE.CylinderGeometry(2.6, 3.2, 27, 9);
          lg.rotateZ(1.54); lg.translate(13.5, 1.5, 0);
          const snag = new THREE.CylinderGeometry(0.65, 1.1, 5.5, 6).rotateZ(-0.55).translate(-2.0, 3.4, 0.8);
          const mrg = _scMerge ? _scMerge([lg, snag]) : lg;
          return _tintVerts(mrg, (_, y) => y > 3.0 ? [0.78, 0.92, 0.70] : [0.76, 0.72, 0.68]);
        });

        // Animal Cohort Geometries (+Z facing forward, sized relative to 15u Deer & 32u Hero!)
        // A. Cottontail Rabbit (22)
        const rabbitGeo = _geo('land_ani_rabbit_v2', () => {
          const body = _tintVerts(new THREE.SphereGeometry(2.4, 8, 6).scale(0.85, 0.88, 1.32).translate(0, 2.2, -0.3), (_, y) => y > 2.2 ? [0.94, 0.92, 0.90] : [1.05, 1.02, 0.98]);
          const head = _tintVerts(new THREE.SphereGeometry(1.55, 7, 6).scale(0.88, 0.92, 1.12).translate(0, 3.8, 2.5), () => [0.96, 0.94, 0.92]);
          const earL = _tintVerts(new THREE.CylinderGeometry(0.32, 0.45, 3.0, 5).rotateX(-0.22).rotateZ(0.18).translate(-0.58, 5.8, 2.0), () => [0.92, 0.82, 0.80]);
          const earR = _tintVerts(new THREE.CylinderGeometry(0.32, 0.45, 3.0, 5).rotateX(-0.22).rotateZ(-0.18).translate(0.58, 5.8, 2.0), () => [0.92, 0.82, 0.80]);
          const tail = _tintVerts(new THREE.SphereGeometry(0.95, 6, 5).translate(0, 2.2, -3.4), () => [1.20, 1.18, 1.16]);
          return _scMerge ? _scMerge([body, head, earL, earR, tail]) : body;
        });
        // B. Woodland Fox (16)
        const foxGeo = _geo('land_ani_fox_v2', () => {
          const body = _tintVerts(new THREE.CylinderGeometry(1.85, 2.1, 8.2, 7).rotateX(Math.PI / 2).translate(0, 3.8, 0), (_, y) => y > 3.8 ? [0.98, 0.94, 0.90] : [1.08, 1.04, 0.98]);
          const head = _tintVerts(new THREE.ConeGeometry(1.6, 3.8, 6).rotateX(1.52).translate(0, 5.2, 5.1), () => [0.98, 0.95, 0.92]);
          const earL = _tintVerts(new THREE.ConeGeometry(0.55, 1.6, 4).translate(-0.80, 6.5, 3.8), () => [0.40, 0.34, 0.32]);
          const earR = _tintVerts(new THREE.ConeGeometry(0.55, 1.6, 4).translate(0.80, 6.5, 3.8), () => [0.40, 0.34, 0.32]);
          const tail = _tintVerts(new THREE.ConeGeometry(1.15, 6.4, 6).rotateX(-1.08).translate(0, 3.9, -6.1), (_, __, z) => z < -7.2 ? [1.20, 1.18, 1.14] : [0.94, 0.90, 0.88]);
          const legs = [[-1.05, 2.5], [1.05, 2.5], [-1.05, -2.6], [1.05, -2.6]].map(([lx, lz]) =>
            _tintVerts(new THREE.CylinderGeometry(0.45, 0.32, 3.5, 5).translate(lx, 1.75, lz), () => [0.38, 0.34, 0.32]));
          return _scMerge ? _scMerge([body, head, earL, earR, tail, ...legs]) : body;
        });
        // C. Articulated Soaring/Landing Birds (body + tail + beak + separate left/right wings so wings flap, glide, and fold when perched!)
        const birdBodyGeo = _geo('land_ani_bird_body_v3', () => {
          const torso = _tintVerts(new THREE.SphereGeometry(0.95, 7, 6).scale(0.85, 0.85, 2.1), (_, y) => y > 0 ? [0.90, 0.88, 0.86] : [1.08, 1.04, 0.98]);
          const head = _tintVerts(new THREE.SphereGeometry(0.62, 6, 5).translate(0, 0.62, 1.85), () => [0.95, 0.92, 0.88]);
          const beak = _tintVerts(new THREE.ConeGeometry(0.22, 0.85, 4).rotateX(Math.PI * 0.5).translate(0, 0.56, 2.65), () => [0.96, 0.76, 0.30]);
          const tail = _tintVerts(new THREE.BoxGeometry(2.1, 0.14, 2.3).translate(0, 0.08, -2.5), () => [0.76, 0.74, 0.72]);
          const leg = _tintVerts(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 4).translate(0, -0.95, -0.1), () => [0.82, 0.64, 0.32]);
          return _scMerge ? _scMerge([torso, head, beak, tail, leg]) : torso;
        });
        const _mkBirdWingGeo = (sideSign) => _geo(`land_ani_bird_w_${sideSign > 0 ? 'r' : 'l'}_v3`, () => {
          const inner = _tintVerts(new THREE.BoxGeometry(3.8, 0.16, 2.1).translate(sideSign * 1.9, 0, 0), () => [0.96, 0.94, 0.92]);
          const tip = _tintVerts(new THREE.BoxGeometry(2.8, 0.12, 1.4).rotateY(sideSign * 0.22).translate(sideSign * 4.8, 0.08, -0.35), () => [0.76, 0.74, 0.74]);
          return _scMerge ? _scMerge([inner, tip]) : inner;
        });
        const birdWingLGeo = _mkBirdWingGeo(-1), birdWingRGeo = _mkBirdWingGeo(1);

        // D. Articulated Meadow Butterflies (body + left/right flapping/basking wings)
        const bflyBodyGeo = _geo('land_ani_bfly_body_v3', () => {
          const body = _tintVerts(new THREE.CylinderGeometry(0.18, 0.14, 2.1, 5).rotateX(Math.PI / 2), () => [0.24, 0.22, 0.22]);
          return body;
        });
        const _mkBflyWingGeo = (sideSign) => _geo(`land_ani_bfly_w_${sideSign > 0 ? 'r' : 'l'}_v3`, () => {
          const fore = _tintVerts(new THREE.BoxGeometry(2.1, 0.07, 1.5).translate(sideSign * 1.1, 0, 0.45), (x) => { const edge = Math.min(1, Math.abs(x) / 2.2); return [1.0 - edge * 0.12, 0.98 - edge * 0.12, 0.96]; });
          const hind = _tintVerts(new THREE.BoxGeometry(1.5, 0.07, 1.3).translate(sideSign * 0.8, -0.02, -0.55), () => [0.88, 0.86, 0.88]);
          return _scMerge ? _scMerge([fore, hind]) : fore;
        });
        const bflyWingLGeo = _mkBflyWingGeo(-1), bflyWingRGeo = _mkBflyWingGeo(1);

        const flowerCols = isSnowBiome ? [0x8aa8e0, 0xb89ee8, 0xd8dce4, 0x7ac0d4] : [0xd94e46, 0xe8b43c, 0x5282de, 0x945ed0, 0xe0d6c4, 0xde6c94, 0xe07e34];
        const fernCols = isSnowBiome ? [0x6e8880, 0x829c94, 0x627874] : [0x4c7c3e, 0x649042, 0x7c8646, 0x3e6a3a, 0x5c8452];
        const shroomCols = [0xc84e3c, 0xd89c3c, 0xd8ceb6, 0x946444, 0x7c8868];
        const woodScatterCols = [0x8c6442, 0x6c4e36, 0xa27e56, 0x787266, 0x5c422c];
        const leafCols = isSnowBiome ? [0x8c7256, 0x747e6c, 0xa29078] : [0xb64c34, 0xd08838, 0x9c6e3e, 0x688240, 0x863e32, 0xc2a246];

        const flStemMat = _fMat('land_fl_stem_mat_v1', { color: 0xb6c6a4, pbrKind: 'foliage', roughness: 0.84, sheen: 0.45, vertexColors: true });
        const flBloomMat = _fMat('land_fl_bloom_mat_v1', { color: 0xeae4dc, pbrKind: 'cloth', roughness: 0.62, sheen: 0.72, vertexColors: true });
        const fernMat = _fMat('land_fern_mat_v1', { color: 0xc2cca8, pbrKind: 'foliage', roughness: 0.82, sheen: 0.56, vertexColors: true });
        const shroomMat = _fMat('land_shroom_mat_v1', { color: 0xe0d8ce, pbrKind: 'leather', roughness: 0.68, sheen: 0.35, vertexColors: true });
        const woodObjMat = _fMat('land_wood_obj_mat_v1', { color: 0xb4a490, pbrKind: 'wood', roughness: 0.86, vertexColors: true });
        const leafMat = _fMat('land_leaf_mat_v1', { color: 0xdad2c4, pbrKind: 'cloth', roughness: 0.74, sheen: 0.48, side: THREE.DoubleSide, vertexColors: true });

        const _scatterStatic = (geo, mat, count, cols, minR, maxR, scMin, scMax, opts = {}) => {
          const im = new THREE.InstancedMesh(geo, mat, count);
          const dum = new THREE.Object3D(), cTmp = new THREE.Color();
          let placed = 0;
          for (let attempt = 0; attempt < count * 4 && placed < count; attempt++) {
            const hh = (((attempt + 1) * 2654435761 + seedNum * 193 + count * 17) >>> 0);
            const ang = ((hh % 6283) * 0.001);
            const closeZone = ((hh >> 4) % 100) < 68;
            const zoneMax = closeZone ? Math.min(maxR, 760) : maxR;
            const rad = minR + ((hh >> 6) % Math.max(10, zoneMax - minR));
            const sx = Math.cos(ang) * rad, sz = Math.sin(ang) * rad;
            if (Math.abs(sx) < 48 || Math.abs(sz) < 48) continue;
            if (opts.skipCenter && Math.hypot(sx, sz) < opts.skipCenter) continue;
            const sy = getTerrainHeight(sx, sz) + (opts.yOff || 0);
            const sc = scMin + (((hh >> 12) % 100) * 0.01) * (scMax - scMin);
            dum.position.set(sx, sy, sz);
            dum.rotation.set(opts.tilt ? (((hh >> 18) % 21) - 10) * 0.025 : 0, (hh % 628) * 0.01, opts.tilt ? (((hh >> 22) % 21) - 10) * 0.025 : 0);
            dum.scale.set(sc * (0.9 + ((hh >> 15) % 22) * 0.01), sc * (0.85 + ((hh >> 20) % 30) * 0.01), sc);
            dum.updateMatrix();
            im.setMatrixAt(placed, dum.matrix);
            if (cols && cols.length) {
              cTmp.setHex(cols[(hh >> 4) % cols.length]);
              im.setColorAt(placed, cTmp);
            }
            if (opts.outSpots) {
              opts.outSpots.push({ x: sx, y: sy, z: sz, sc });
            }
            if (opts.pairedInst) {
              opts.pairedInst.setMatrixAt(placed, dum.matrix);
            }
            placed++;
          }
          im.count = placed; im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.receiveShadow = true; im.userData.isScenery = true; staticGrp.add(im);
          if (opts.pairedInst) {
            opts.pairedInst.count = placed; opts.pairedInst.instanceMatrix.needsUpdate = true;
            opts.pairedInst.receiveShadow = true; opts.pairedInst.userData.isScenery = true;
            staticGrp.add(opts.pairedInst);
          }
          return im;
        };

        // 180 Wildflowers (paired stems + colorful blooms) & collect flowerSpots for butterflies
        const flowerSpots = [], logSpots = [];
        const flBloomInst = new THREE.InstancedMesh(flBloomGeo, flBloomMat, 180);
        const _flSInst = _scatterStatic(flStemGeo, flStemMat, 180, null, 140, 1350, 0.72, 1.45, { tilt: true, pairedInst: flBloomInst, outSpots: flowerSpots });
        for (let fi = 0; fi < flBloomInst.count; fi++) {
          _tCol.setHex(flowerCols[(fi * 7 + seedNum) % flowerCols.length]);
          flBloomInst.setColorAt(fi, _tCol);
        }
        if (flBloomInst.instanceColor) flBloomInst.instanceColor.needsUpdate = true;
        // 120 Ferns, 72 Mushroom Clumps, 110 Pine Cones, 110 Twigs, 160 Leaf Clusters, 36 Fallen Logs
        _scatterStatic(fernGeo, fernMat, 120, fernCols, 145, 1500, 0.70, 1.48, { tilt: true, yOff: 0.2 });
        _scatterStatic(shroomGeo, shroomMat, 72, shroomCols, 175, 1400, 0.65, 1.45, { tilt: true });
        _scatterStatic(coneGeo, woodObjMat, 110, woodScatterCols, 150, 1550, 0.68, 1.45, { tilt: true });
        _scatterStatic(twigGeo, woodObjMat, 110, woodScatterCols, 145, 1450, 0.65, 1.48, { tilt: true });
        _scatterStatic(leafGeo, leafMat, 160, leafCols, 130, 1400, 0.68, 1.45, { tilt: true, yOff: 0.15 });
        _scatterStatic(logGeo, woodObjMat, 36, woodScatterCols, 280, 1750, 0.72, 1.42, { tilt: true, skipCenter: 260, outSpots: logSpots });

        // Build Perch & Landing Target Lists for Flying Birds & Butterflies (bias ~75% in foreground clearing/treeline)
        const birdPerches = [];
        for (let gi = 0; gi < 48; gi++) {
          const gh = ((gi * 2654435761 + seedNum * 61) >>> 0);
          const ang = (gh % 6283) * 0.001, rad = 120 + ((gh >> 5) % 480);
          const gx = Math.cos(ang) * rad, gz = Math.sin(ang) * rad;
          if (Math.abs(gx) > 48 && Math.abs(gz) > 48) {
            birdPerches.push({ x: gx, y: getTerrainHeight(gx, gz) + 1.2, z: gz, kind: 'ground' });
          }
        }
        logSpots.slice(0, 24).forEach(lp => birdPerches.push({ x: lp.x + 6 * lp.sc, y: lp.y + 3.2 * lp.sc, z: lp.z, kind: 'log' }));
        for (let pi = 0; pi < placedTrees && birdPerches.length < 105; pi++) {
          const mOff = pi * 16, tx = treeMatrices[mOff + 12], tz = treeMatrices[mOff + 14];
          if (Math.hypot(tx, tz) < 880) {
            birdPerches.push({ x: tx, y: getTerrainHeight(tx, tz) + 64, z: tz, kind: 'tree' });
          }
        }
        for (let ri = 0; ri < placedRocks && birdPerches.length < 125; ri++) {
          const ro = ri * 16, rx = rockMatrices[ro + 12], rz = rockMatrices[ro + 14];
          if (Math.hypot(rx, rz) < 880) {
            birdPerches.push({ x: rx, y: getTerrainHeight(rx, rz) + 12, z: rz, kind: 'rock' });
          }
        }
        if (!birdPerches.length) birdPerches.push({ x: 200, y: getTerrainHeight(200, 200) + 1.2, z: 200, kind: 'ground' });

        // 4 Animated Outdoor Animal Cohorts (98 Animals: Rabbits, Foxes, Autonomous Landing/Flapping Birds & Butterflies)
        const _outdoorFauna = [];
        const _spawnArticulatedFliers = (kind, bodyGeo, wLGeo, wRGeo, mat, count, cols, scMin, scMax, perches) => {
          const bInst = new THREE.InstancedMesh(bodyGeo, mat, count);
          const wlInst = new THREE.InstancedMesh(wLGeo, mat, count);
          const wrInst = new THREE.InstancedMesh(wRGeo, mat, count);
          [bInst, wlInst, wrInst].forEach(im => {
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            im.castShadow = kind === 'bird'; im.receiveShadow = true;
            im.frustumCulled = false;
            im.userData.isDynamic = true;
          });
          const items = [], cTmp = new THREE.Color();
          for (let i = 0; i < count; i++) {
            const h = ((i * 2654435761 + seedNum * 317 + count * 53) >>> 0);
            const p0 = perches[i % perches.length];
            const pTarget = perches[(i * 7 + 3 + (h % perches.length)) % perches.length];
            const startPerched = (i % 10) < 3; // 30% begin perched pecking/basking; 70% start in active flight
            const sc = scMin + (((h >> 12) % 100) * 0.01) * (scMax - scMin);
            const isBfly = kind === 'butterfly';
            const altOff = isBfly ? (flowerSpots.length ? 8.2 * (p0.sc || 1) : 6.0) : 0;
            const sx = startPerched ? p0.x : p0.x + Math.cos(i) * (isBfly ? 25 : 140);
            const sz = startPerched ? p0.z : p0.z + Math.sin(i) * (isBfly ? 25 : 140);
            const sy = startPerched ? (p0.y + altOff) : (p0.y + (isBfly ? 12 + (h % 14) : 42 + (h % 75)));
            items.push({
              x: sx, y: sy, z: sz,
              vx: 0, vz: 0, yaw: (h % 628) * 0.01,
              state: startPerched ? 'perched' : 'fly',
              timer: startPerched ? (2.0 + (h % 5)) : (3.0 + (h % 6)),
              tx: pTarget.x, ty: pTarget.y + (isBfly ? 8.2 * (pTarget.sc || 1) : 0), tz: pTarget.z,
              targetKind: pTarget.kind || 'flower',
              perchKind: p0.kind || 'flower',
              cruiseAlt: isBfly ? (10 + (h % 14)) : (36 + (h % 68)),
              speed: isBfly ? (20 + (h % 16)) : (62 + (h % 38)),
              sc, phase: (h % 100) * 0.1,
              nextTurnAt: 0.8 + (h % 20) * 0.1,
            });
            cTmp.setHex(cols[(h >> 3) % cols.length]);
            bInst.setColorAt(i, cTmp); wlInst.setColorAt(i, cTmp); wrInst.setColorAt(i, cTmp);
          }
          [bInst, wlInst, wrInst].forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; staticGrp.add(im); });
          _outdoorFauna.push({ kind, inst: bInst, wingL: wlInst, wingR: wrInst, items, perches });
        };

        const _spawnFauna = (kind, geo, mat, count, cols, rMin, rMax, scMin, scMax) => {
          const im = new THREE.InstancedMesh(geo, mat, count);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.castShadow = true; im.receiveShadow = true;
          im.frustumCulled = false;
          im.userData.isDynamic = true;
          const items = [];
          const cTmp = new THREE.Color();
          for (let i = 0; i < count; i++) {
            const h = ((i * 2654435761 + seedNum * 271 + count * 41) >>> 0);
            const ang = (h % 6283) * 0.001;
            const nearZone = (h % 100) < 70;
            const zMax = nearZone ? Math.min(rMax, 720) : rMax;
            const homeR = rMin + ((h >> 5) % Math.max(20, zMax - rMin));
            const loopR = 35 + (h % 95);
            const dir = (i % 2 === 0 ? 1 : -1);
            items.push({
              cx: Math.cos(ang) * homeR, cz: Math.sin(ang) * homeR,
              a: (h >> 8) * 0.01, loopR, speed: dir * (kind === 'fox' ? 0.42 : 0.55) * (0.75 + (h % 50) * 0.01),
              sc: scMin + (((h >> 12) % 100) * 0.01) * (scMax - scMin),
              phase: (h % 100) * 0.1,
            });
            cTmp.setHex(cols[(h >> 3) % cols.length]);
            im.setColorAt(i, cTmp);
          }
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          staticGrp.add(im);
          _outdoorFauna.push({ kind, inst: im, items });
        };
        const rabCols = isSnowBiome ? [0xe4e2de, 0xc8ccd0, 0xb8a898] : [0x9c7656, 0x86847e, 0xc2a278, 0x76563c, 0xd4cec4];
        const foxCols = isSnowBiome ? [0xe4e4e8, 0xb8bec6, 0xc8a47c] : [0xc65e2c, 0x8c8682, 0xd4843c, 0x6e442c];
        const birdCols = [0x383e46, 0x6e523c, 0x4c749e, 0x8c4c3c, 0xc8c4bc];
        const bflyCols = [0xe88a2e, 0x4ca4e8, 0xe8c43c, 0xe492b8, 0xebe6d8];
        const bflyPerches = flowerSpots.length ? flowerSpots : birdPerches;
        _spawnFauna('rabbit', rabbitGeo, _fMat('land_rab_mat_v1', { color: 0xe6ddd4, pbrKind: 'fur', roughness: 0.82, sheen: 0.74, vertexColors: true }), 22, rabCols, 145, 920, 0.78, 1.25);
        _spawnFauna('fox', foxGeo, _fMat('land_fox_mat_v1', { color: 0xe6dcd2, pbrKind: 'fur', roughness: 0.78, sheen: 0.76, vertexColors: true }), 16, foxCols, 165, 1100, 0.80, 1.22);
        _spawnArticulatedFliers('bird', birdBodyGeo, birdWingLGeo, birdWingRGeo, _fMat('land_bird_mat_v1', { color: 0xdcdad4, pbrKind: 'cloth', roughness: 0.74, sheen: 0.55, vertexColors: true }), 32, birdCols, 0.90, 1.42, birdPerches);
        _spawnArticulatedFliers('butterfly', bflyBodyGeo, bflyWingLGeo, bflyWingRGeo, _fMat('land_bfly_mat_v1', { color: 0xf0ece6, pbrKind: 'crystal', roughness: 0.34, side: THREE.DoubleSide, vertexColors: true }), 36, bflyCols, 0.70, 1.38, bflyPerches);

        const _faunaState = { cohorts: _outdoorFauna, getTerrainHeight };
        staticGrp.userData.outdoorFaunaState = _faunaState;
        window.__outdoorFaunaState = _faunaState;
        {
          const _fDum = new THREE.Object3D(), _wDum = new THREE.Object3D(), _wMat = new THREE.Matrix4();
          const _pickNextPerch = (a, ch, isBfly) => {
            const pArr = ch.perches;
            const pick = pArr[Math.floor((a.phase * 137.5 + performance.now() * 0.017) % pArr.length)] || pArr[0];
            a.tx = pick.x + ((isBfly || pick.kind === 'ground') ? 0 : (Math.sin(a.phase * 5) * 3));
            a.tz = pick.z + ((isBfly || pick.kind === 'ground') ? 0 : (Math.cos(a.phase * 7) * 3));
            a.ty = pick.y + (isBfly ? 8.1 * (pick.sc || 1) : 0);
            a.targetKind = pick.kind || 'flower';
          };
          const _stepCohortState = (st, dtSec, nowMs) => {
            if (!st || !st.cohorts) return;
            const pWorld = window.__localPlayerWorldPos || null;
            for (let ci = 0; ci < st.cohorts.length; ci++) {
              const ch = st.cohorts[ci];
              if (!ch.inst || !ch.inst.parent) continue;
              const { kind, inst, items } = ch;
              if (kind === 'bird' || kind === 'butterfly') {
                const isBfly = kind === 'butterfly';
                for (let i = 0; i < items.length; i++) {
                  const a = items[i];
                  a.timer -= dtSec;
                  const p = nowMs * 0.001 + a.phase;
                  const distSq = (a.tx - a.x) * (a.tx - a.x) + (a.tz - a.z) * (a.tz - a.z);
                  const dist = Math.sqrt(distSq);
                  const startled = pWorld && a.state === 'perched' && Math.hypot(pWorld.x - a.x, pWorld.z - a.z) < (isBfly ? 22 : 48);
                  if (startled || (a.state === 'perched' && a.timer <= 0)) {
                    a.state = 'takeoff';
                    a.timer = isBfly ? 0.65 : 1.05;
                    _pickNextPerch(a, ch, isBfly);
                    if (startled && pWorld) {
                      a.yaw = Math.atan2(a.x - pWorld.x, a.z - pWorld.z);
                    }
                  } else if (a.state === 'takeoff' && a.timer <= 0) {
                    a.state = 'fly';
                    a.timer = 4.5 + (i % 5);
                  } else if (a.state === 'fly' && dist < (isBfly ? 12 : 44)) {
                    a.state = 'land';
                    a.timer = 2.4;
                  } else if (a.state === 'fly' && a.timer <= 0 && dist > 60) {
                    _pickNextPerch(a, ch, isBfly);
                    a.timer = 5.0;
                  }

                  let rx = 0, rz = 0, wFlap = 0, wFoldY = 0, wDropZ = 0;
                  if (a.state === 'perched') {
                    a.x = a.tx; a.y = a.ty; a.z = a.tz;
                    if (isBfly) {
                      // Slow tranquil basking wing open-and-close atop flower head
                      wFlap = 0.25 + Math.sin(p * 2.2) * 0.22;
                    } else {
                      // Perched wings tucked snugly back against flanks; look around, hop & peck on ground
                      wFoldY = 1.05; wDropZ = 0.55; wFlap = -0.35;
                      a.nextTurnAt -= dtSec;
                      if (a.nextTurnAt <= 0) {
                        a.nextTurnAt = 0.9 + ((i * 7) % 13) * 0.12;
                        a.yaw += (Math.sin(p * 3.7) * 0.95);
                      }
                      if (a.perchKind === 'ground' || a.perchKind === 'log' || a.perchKind === 'rock') {
                        const cycle = p % 2.4;
                        if (cycle < 0.45) {
                          // Double head-peck toward ground for seeds
                          rx = Math.abs(Math.sin(cycle * Math.PI * 4.4)) * 0.62;
                        } else if (a.perchKind === 'ground' && cycle > 1.3 && cycle < 1.75) {
                          // Little ground hop forward along perch
                          const hp = Math.sin(((cycle - 1.3) / 0.45) * Math.PI);
                          a.y += hp * 1.4;
                          a.x += Math.sin(a.yaw) * dtSec * 8;
                          a.z += Math.cos(a.yaw) * dtSec * 8;
                          a.tx = a.x; a.tz = a.z;
                        }
                      }
                    }
                  } else {
                    const desiredYaw = Math.atan2(a.tx - a.x, a.tz - a.z);
                    let dy = desiredYaw - a.yaw;
                    while (dy > Math.PI) dy -= Math.PI * 2;
                    while (dy < -Math.PI) dy += Math.PI * 2;
                    const maxTurn = (isBfly ? 5.2 : (a.state === 'land' ? 5.8 : 2.6)) * dtSec;
                    const turnAmt = Math.max(-maxTurn, Math.min(maxTurn, dy));
                    a.yaw += turnAmt;
                    const tgtY = a.state === 'land'
                      ? a.ty
                      : Math.max((st.getTerrainHeight ? st.getTerrainHeight(a.x, a.z) : 0) + (isBfly ? 6 : 22), a.ty + a.cruiseAlt + (isBfly ? Math.sin(p * 3.0) * 3.5 : Math.sin(p * 0.9) * 8));
                    const spd = a.speed * (a.state === 'land' ? Math.max(0.20, Math.min(0.95, dist / 36)) : a.state === 'takeoff' ? 0.90 : 1.0);
                    const flutterX = isBfly ? Math.sin(p * 5.2 + i) * 6 * dtSec : 0;
                    if (a.state === 'land' && dist < 16) {
                      const settle = Math.min(1, dtSec * 4.0);
                      a.x += (a.tx - a.x) * settle;
                      a.z += (a.tz - a.z) * settle;
                    } else {
                      a.x += Math.sin(a.yaw) * spd * dtSec + flutterX;
                      a.z += Math.cos(a.yaw) * spd * dtSec;
                    }
                    a.y += (tgtY - a.y) * Math.min(1, dtSec * (a.state === 'takeoff' ? 3.2 : a.state === 'land' ? 3.8 : 1.8));
                    if (a.state === 'land' && ((dist < (isBfly ? 2.5 : 4.5) && Math.abs(a.y - a.ty) < 2.2) || a.timer <= 0)) {
                      a.state = 'perched';
                      a.perchKind = a.targetKind;
                      a.timer = isBfly ? (2.5 + (i % 4)) : (3.5 + (i % 6));
                      a.x = a.tx; a.y = a.ty; a.z = a.tz;
                    }
                    if (isBfly) {
                      wFlap = Math.sin(p * 18.0) * 0.72 + 0.15;
                      rx = 0.18 + Math.sin(p * 4.5) * 0.16;
                      rz = -turnAmt * 6.0;
                    } else {
                      // Natural flight: alternate flapping bursts with soaring glides, flare upward when landing
                      const glideCycle = (p * 0.35 + i * 0.4) % 1.0;
                      const isGliding = a.state === 'fly' && glideCycle > 0.58;
                      wFlap = a.state === 'takeoff'
                        ? Math.sin(p * 17.5) * 0.82 + 0.12
                        : isGliding ? (0.12 + Math.sin(p * 2.0) * 0.04) : (Math.sin(p * 12.0) * 0.65 + 0.08);
                      rx = a.state === 'takeoff' ? -0.34 : (a.state === 'land' ? -0.26 : Math.max(-0.22, Math.min(0.22, (a.y - tgtY) * 0.015)));
                      rz = Math.max(-0.45, Math.min(0.45, -turnAmt * 12.0));
                    }
                  }
                  _fDum.position.set(a.x, a.y, a.z);
                  _fDum.rotation.set(rx, a.yaw, rz);
                  _fDum.scale.setScalar(a.sc);
                  _fDum.updateMatrix();
                  inst.setMatrixAt(i, _fDum.matrix);
                  const syOff = isBfly ? 0.05 : 0.32;
                  _wDum.position.set(0, syOff, 0.18);
                  _wDum.rotation.set(-wDropZ * 0.35, -wFoldY, -wFlap);
                  _wDum.scale.setScalar(1);
                  _wDum.updateMatrix();
                  _wMat.multiplyMatrices(_fDum.matrix, _wDum.matrix);
                  ch.wingL.setMatrixAt(i, _wMat);
                  _wDum.rotation.set(-wDropZ * 0.35, wFoldY, wFlap);
                  _wDum.updateMatrix();
                  _wMat.multiplyMatrices(_fDum.matrix, _wDum.matrix);
                  ch.wingR.setMatrixAt(i, _wMat);
                }
                inst.instanceMatrix.needsUpdate = true;
                ch.wingL.instanceMatrix.needsUpdate = true;
                ch.wingR.instanceMatrix.needsUpdate = true;
                continue;
              }
              for (let i = 0; i < items.length; i++) {
                const a = items[i];
                const p = nowMs * 0.008 + a.phase;
                const rabPause = (kind === 'rabbit') && (((p * 0.14) % 1.0) > 0.74);
                if (!rabPause) a.a += a.speed * dtSec;
                const wx = a.cx + Math.cos(a.a) * a.loopR;
                const wz = a.cz + Math.sin(a.a) * a.loopR * 0.78;
                const dx = -Math.sin(a.a) * a.loopR * a.speed;
                const dz = Math.cos(a.a) * a.loopR * 0.78 * a.speed;
                const gy = st.getTerrainHeight ? st.getTerrainHeight(wx, wz) : 0;
                let y = gy, rx = 0, rz = 0;
                if (kind === 'rabbit') {
                  if (rabPause) { rx = Math.abs(Math.sin(p * 2.2)) * 0.25; }
                  else { const hop = Math.abs(Math.sin(p * 1.1)); y = gy + hop * 2.6; rx = -Math.cos(p * 1.1) * 0.16; }
                } else if (kind === 'fox') {
                  y = gy + Math.abs(Math.sin(p * 0.9)) * 0.65;
                }
                _fDum.position.set(wx, y, wz);
                _fDum.rotation.set(rx, Math.atan2(dx, dz), rz);
                _fDum.scale.setScalar(a.sc);
                _fDum.updateMatrix();
                inst.setMatrixAt(i, _fDum.matrix);
              }
              inst.instanceMatrix.needsUpdate = true;
            }
          };
          window.__stepOutdoorScenery = function (dtSec, nowMs) {
            const scGroup = (typeof threeRoomGroup !== 'undefined' && threeRoomGroup)
              ? threeRoomGroup.children.find(c => c && c.userData && c.userData.isStaticRoomGroup && c.userData.outdoorFaunaState)
              : null;
            const st = (scGroup && scGroup.userData.outdoorFaunaState) || window.__outdoorFaunaState;
            if (st) {
              window.__outdoorFaunaState = st;
              _stepCohortState(st, dtSec, nowMs);
            }
          };
          _stepCohortState(_faunaState, 0.016, performance.now());
        }
      }

      // Open-World Landmarks driven by skills world_landmarks config
      const lm = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().world_landmarks) || {};
      const beaconFlameMat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff6200, emissiveIntensity: 1.4, roughness: 0.25 });
      const bevelStoneGeo = createBeveledBoxGeo ? ((typeof getSharedGeo === 'function') ? getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05)) : createBeveledBoxGeo(1, 1, 1, 0.05)) : new THREE.BoxGeometry(1, 1, 1);
      const _scH = window._sculptHelpers || {};
      (lm.towers || []).forEach(([tx, tz], idx) => {
        const tGrp = new THREE.Group(); tGrp.userData.isScenery = true; tGrp.position.set(tx, getTerrainHeight(tx, tz) - 8, tz);
        const plinth = new THREE.Mesh(bevelStoneGeo, stoneMat); plinth.scale.set(122, 18, 122); plinth.position.y = 9; tGrp.add(plinth);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(45, 56, 198, 8), stoneMat); shaft.position.y = 108; tGrp.add(shaft);
        const hoard = new THREE.Mesh(bevelStoneGeo, woodMat); hoard.scale.set(112, 18, 112); hoard.position.y = 212; tGrp.add(hoard);
        for (let mi = 0; mi < 4; mi++) {
          const ang = (mi / 4) * Math.PI * 2 + Math.PI * 0.25;
          const m = new THREE.Mesh(bevelStoneGeo, stoneMat); m.scale.set(22, 16, 22); m.position.set(Math.cos(ang) * 56, 228, Math.sin(ang) * 56); tGrp.add(m);
        }
        const basket = new THREE.Mesh(new THREE.TorusGeometry(16, 2.2, 8, 14), woodMat); basket.rotation.x = Math.PI / 2; basket.position.y = 228; tGrp.add(basket);
        const flameGeo = _scH.flame ? _scH.flame(28, 13, 6) : new THREE.ConeGeometry(14, 28, 8);
        const br = new THREE.Mesh(flameGeo, beaconFlameMat); br.position.y = 226; tGrp.add(br);
        if (idx === 0) { const gl = new THREE.PointLight(0xff8c32, 4.8, 1150, 1.0); gl.position.y = 258; tGrp.add(gl); }
        staticGrp.add(tGrp);
      });
      if (lm.stone_circle) {
        const sc = lm.stone_circle, cGrp = new THREE.Group(), cnt = sc.count || 6, rad = sc.radius || 115;
        cGrp.userData.isScenery = true; cGrp.position.set(sc.x, getTerrainHeight(sc.x, sc.z) - 4, sc.z);
        for (let s = 0; s < cnt; s++) {
          const a = (s / cnt) * Math.PI * 2, mh = 48 + (s % 3) * 12;
          const mGeo = _scH.rock ? _scH.rock(13, mh, 9, s + 2) : bevelStoneGeo;
          const m = new THREE.Mesh(mGeo, stoneMat);
          m.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); m.rotation.set(Math.sin(a) * 0.08, -a, Math.cos(a) * 0.06); cGrp.add(m);
        }
        const crGeo = _scH.crystal ? _scH.crystal(24, 5.5, 5, 2) : new THREE.OctahedronGeometry(14, 0);
        const cr = new THREE.Mesh(crGeo, new THREE.MeshStandardMaterial({ color: sc.rune_color || 0x56d4ff, emissive: sc.rune_color || 0x2674d6, emissiveIntensity: 1.2, roughness: 0.15 }));
        cr.position.y = 48; cGrp.add(cr); staticGrp.add(cGrp);
      }
      if (lm.arch_offset) {
        const ao = lm.arch_offset;
        const archRoofGeo = _scH.gableRoof ? _scH.gableRoof(174, 34, 34) : null;
        const lanFlameGeo = _scH.flame ? _scH.flame(7.5, 3.2, 4) : new THREE.ConeGeometry(3.2, 7.5, 6);
        [[0, -H / 2 - ao, 0], [0, H / 2 + ao, 0], [W / 2 + ao, 0, Math.PI / 2], [-W / 2 - ao, 0, Math.PI / 2]].forEach(([ax, az, ry]) => {
          const aGrp = new THREE.Group(); aGrp.userData.isScenery = true; aGrp.position.set(ax, getTerrainHeight(ax, az) - 2, az); aGrp.rotation.y = ry;
          [-68, 68].forEach(px => {
            const c = new THREE.Mesh(bevelStoneGeo, stoneMat); c.scale.set(18, 86, 18); c.position.set(px, 43, 0); aGrp.add(c);
            const bp = new THREE.Mesh(bevelStoneGeo, stoneMat); bp.scale.set(28, 12, 28); bp.position.set(px, 6, 0); aGrp.add(bp);
            const cap = new THREE.Mesh(bevelStoneGeo, stoneMat); cap.scale.set(24, 8, 24); cap.position.set(px, 86, 0); aGrp.add(cap);
          });
          const ln = new THREE.Mesh(bevelStoneGeo, woodMat); ln.scale.set(168, 14, 24); ln.position.set(0, 92, 0); aGrp.add(ln);
          if (archRoofGeo) { const rf = new THREE.Mesh(archRoofGeo, woodMat); rf.position.set(0, 98, 0); aGrp.add(rf); }
          const brk = new THREE.Mesh(bevelStoneGeo, woodMat); brk.scale.set(3, 3, 14); brk.position.set(-68, 79, 8); aGrp.add(brk);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(5.5, 5, 6), stoneMat); cap.position.set(-68, 76, 13); aGrp.add(cap);
          const lt = new THREE.Mesh(lanFlameGeo, beaconFlameMat); lt.position.set(-68, 68, 13); aGrp.add(lt);
          staticGrp.add(aGrp);
        });
      }

      // Global Drifting High-Altitude Cloud Layer (multi-puff cloud clusters)
      if (!cloudParticlesMesh && typeof threeScene !== 'undefined' && threeScene) {
        const cGrp = new THREE.Group();
        cGrp.userData.isOutdoorSky = true;
        const mkPuff = () => {
          const p1 = new THREE.SphereGeometry(260, 10, 8); p1.scale(1.6, 0.35, 1.0);
          const p2 = new THREE.SphereGeometry(210, 10, 8); p2.scale(1.3, 0.32, 0.9); p2.translate(180, -18, 45);
          const p3 = new THREE.SphereGeometry(180, 10, 8); p3.scale(1.2, 0.30, 0.85); p3.translate(-165, -24, -35);
          return (window._sculptHelpers && window._sculptHelpers.merge) ? window._sculptHelpers.merge([p1, p2, p3]) : p1;
        };
        const puffGeo = mkPuff();
        const puffMat = new THREE.MeshBasicMaterial({
          color: 0xeef5fc,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          fog: true
        });
        for (let ci = 0; ci < 28; ci++) {
          const ang = (ci / 28) * Math.PI * 2;
          const dist = 2600 + ((ci * 733) % 4400);
          const puff = new THREE.Mesh(puffGeo, puffMat);
          puff.position.set(Math.cos(ang) * dist, 880 + (ci % 5) * 140, Math.sin(ang) * dist);
          puff.scale.set(2.4 + (ci % 3) * 0.8, 0.35, 1.3 + (ci % 2) * 0.6);
          puff.rotation.y = ang;
          cGrp.add(puff);
        }
        cloudParticlesMesh = cGrp;
        threeScene.add(cloudParticlesMesh);
      }
    }

    function update3DScene_static_p1(_B, data) {
      with (_B) {
        if (!_B.bgOnly) {
          lastBuilt3DRoomId = data.room_id;
          lastBuiltItemsKey = null;
          activeSwings.length = 0; // Clear active swings referencing disposed mounts

          // Preserve persistent party character meshes (950k-tri SkinnedMeshes) across room transitions!
          // Only remove previous room's static scenery group, ground items, monsters, and room-specific NPCs.
          for (let i = threeRoomGroup.children.length - 1; i >= 0; i--) {
            const obj = threeRoomGroup.children[i];
            if (obj.userData && obj.userData.isStaticRoomGroup) {
              threeRoomGroup.remove(obj);
            } else if (obj.userData && obj.userData.isGroundItem) {
              threeRoomGroup.remove(obj);
            } else if (obj.userData && obj.userData.entityId) {
              const isPartyHero = !obj.userData.isMonster && !String(obj.userData.entityId).toLowerCase().startsWith('npc');
              if (!isPartyHero) {
                threeRoomGroup.remove(obj);
                if (typeof unregisterDynamicEntity === 'function') unregisterDynamicEntity(obj);
              }
            } else {
              threeRoomGroup.remove(obj);
            }
          }
        }

        // Instant O(1) Static Room Scene Graph Cache lookup
        const staticCache = window.__DND_STATIC_ROOM_CACHE__ || (window.__DND_STATIC_ROOM_CACHE__ = {});
        const roomCacheKey = data.room_id || 'default_room';
        if (staticCache[roomCacheKey]) {
          if (_B.bgOnly) { cacheHit = true; return; }
          staticGrp = staticCache[roomCacheKey];
          staticGrp.traverse(c => {
            if (c.userData && c.userData.isGridOverlay) {
              c.visible = showGrid;
            }
          });
          if (typeof staticGrp.userData.getTerrainHeight === 'function') {
            window.getOpenWorldTerrainHeight = staticGrp.userData.getTerrainHeight;
            if (typeof _camTerrainRoom !== 'undefined') _camTerrainRoom = null;
          }
          window.__outdoorFaunaState = staticGrp.userData.outdoorFaunaState || null;
          threeRoomGroup.add(staticGrp);
          lastCamModeApplied = null;
          if (threeRenderer && threeRenderer.shadowMap && dirLight && dirLight.shadow) {
            dirLight.shadow.needsUpdate = true;
            threeRenderer.shadowMap.needsUpdate = true;
          }
          cacheHit = true;
          return;
        }

        staticGrp = new THREE.Group();
        staticGrp.userData.isStaticRoomGroup = true;
        staticGrp.matrixAutoUpdate = false;
        staticCache[roomCacheKey] = staticGrp;

      var theme = data.theme || { base: [40, 50, 60], alt: [30, 40, 50], type: 'dungeon' };
      var tType = theme.type || 'dungeon';

      // 1. Procedural 3D Floor Canvas Texture (Rich masonry/planks/organic stains/close-up grain)
      var floorCacheKey = `floor_v3_${tType}_${theme.base.join('_')}_${theme.alt.join('_')}`;
      var floorTex = cachedProcTex[floorCacheKey];
      if (!floorTex) {
        const cliCfgFloor = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
        const floorCfg = cliCfgFloor.floor_styles || {};
        const floorBmp = (typeof _workerBitmaps !== 'undefined') ? _workerBitmaps[floorCacheKey] : null;
        if (floorBmp) {
          delete _workerBitmaps[floorCacheKey];
          floorTex = new THREE.CanvasTexture(floorBmp);
        } else {
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 512; floorCanvas.height = 384;
        const fctx = floorCanvas.getContext('2d');
        fctx.scale(0.5, 0.5);
        const clampCh = (v) => Math.max(22, Math.min(224, v | 0));
        const bR = clampCh(theme.base[0]), bG = clampCh(theme.base[1]), bB = clampCh(theme.base[2]);
        const aR = clampCh(theme.alt[0]), aG = clampCh(theme.alt[1]), aB = clampCh(theme.alt[2]);
        fctx.fillStyle = `rgb(${bR}, ${bG}, ${bB})`;
        fctx.fillRect(0, 0, 1024, 768);

        const flKind = (floorCfg.presets && floorCfg.presets[tType]) ? tType : ((typeof classifyWithClientCCELM === 'function' && floorCfg.criteria) ? classifyWithClientCCELM(`${data.room_id || ''} ${tType}`, floorCfg.criteria, 0.35, tType) : tType);
        const fStyle = (floorCfg.presets && floorCfg.presets[flKind]) || {};

        // Macro organic dirt & moisture mottling so surfaces never look flat
        for (let m = 0; m < 28; m++) {
          const mx = (Math.sin(m * 149.7) * 0.5 + 0.5) * 1024, my = (Math.cos(m * 213.1) * 0.5 + 0.5) * 768;
          const mr = 55 + (m % 5) * 28;
          const mg = fctx.createRadialGradient(mx, my, 4, mx, my, mr);
          const dk = (m % 2 === 0);
          mg.addColorStop(0, dk ? `rgba(${clampCh(aR - 14)}, ${clampCh(aG - 14)}, ${clampCh(aB - 12)}, 0.34)` : `rgba(${clampCh(aR + 16)}, ${clampCh(aG + 14)}, ${clampCh(aB + 10)}, 0.24)`);
          mg.addColorStop(1, 'rgba(0,0,0,0)');
          fctx.fillStyle = mg; fctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        }

        if (fStyle.planks) {
          const plankH = 24;
          for (let row = 0; row * plankH < 768; row++) {
            const py = row * plankH;
            const tone = ((row * 37) % 19) - 9;
            fctx.fillStyle = `rgba(${clampCh(bR + tone)}, ${clampCh(bG + tone * 0.7)}, ${clampCh(bB + tone * 0.4)}, 0.75)`;
            fctx.fillRect(0, py + 1, 1024, plankH - 2);
            fctx.fillStyle = 'rgba(18, 12, 8, 0.55)';
            fctx.fillRect(0, py, 1024, 1.5);
            const seamX = ((row * 271 + 97) % 512);
            fctx.fillRect(seamX, py, 2, plankH);
            fctx.fillRect((seamX + 512) % 1024, py, 2, plankH);
          }
        } else if (fStyle.grass) {
          for (let i = 0; i < 240; i++) {
            const gx = (Math.sin(i * 179.3) * 0.5 + 0.5) * 1024, gy = (Math.cos(i * 263.1) * 0.5 + 0.5) * 768;
            if (fStyle.road && gy > 768 * 0.35 && gy < 768 * 0.55) continue;
            fctx.strokeStyle = (i % 3 === 0) ? '#3b6428' : (i % 2 === 0) ? '#26491e' : '#4e7932';
            fctx.lineWidth = 2.0; fctx.beginPath(); fctx.moveTo(gx, gy); fctx.lineTo(gx + Math.sin(i * 3.7) * 3.5, gy - 6 - (i % 4)); fctx.stroke();
          }
          for (let i = 0; i < 65; i++) {
            fctx.fillStyle = (i % 2 === 0) ? 'rgba(30, 48, 24, 0.40)' : 'rgba(96, 100, 92, 0.45)';
            fctx.beginPath(); fctx.arc((Math.sin(i * 431.7) * 0.5 + 0.5) * 1024, (Math.cos(i * 389.2) * 0.5 + 0.5) * 768, 2 + (i % 4), 0, Math.PI * 2); fctx.fill();
          }
        } else {
          // Staggered fitted flagstones / dungeon cobbles with mortar & edge wear (fallback for dungeon/vault/stone/cave)
          const tileH = 48, tileW = 64;
          for (let r = 0; r * tileH < 768; r++) {
            const off = (r % 2) * (tileW * 0.5);
            for (let c = -1; c * tileW < 1024; c++) {
              const x = c * tileW + off, y = r * tileH;
              const hsh = Math.abs(Math.sin(r * 73.1 + c * 151.7));
              const shade = Math.floor((hsh - 0.5) * 42);
              const warmMix = (hsh > 0.6) ? 6 : -4;
              fctx.fillStyle = `rgb(${clampCh(aR + shade + warmMix + 10)}, ${clampCh(aG + shade + 10)}, ${clampCh(aB + shade + 12)})`;
              fctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
              fctx.strokeStyle = `rgba(${clampCh(bR - 22)}, ${clampCh(bG - 22)}, ${clampCh(bB - 20)}, 0.72)`;
              fctx.lineWidth = 2.5; fctx.strokeRect(x + 1, y + 1, tileW - 2, tileH - 2);
              if (hsh > 0.80) {
                fctx.strokeStyle = 'rgba(18, 20, 24, 0.55)';
                fctx.lineWidth = 1.4; fctx.beginPath(); fctx.moveTo(x + 10, y + 10); fctx.lineTo(x + tileW - 14, y + tileH - 12); fctx.stroke();
              } else if (hsh < 0.16 && tType !== 'starforge') {
                fctx.fillStyle = 'rgba(46, 82, 38, 0.36)';
                fctx.fillRect(x + 2, y + tileH - 9, tileW * 0.48, 7);
              }
            }
          }
        }
        if (fStyle.road) {
          fctx.fillStyle = '#5c4a30'; fctx.fillRect(0, 768 * 0.32, 1024, 768 * 0.26);
          for (let x = 0; x < 1024; x += 16) { fctx.fillRect(x, 768 * 0.32 - Math.sin(x * 0.05) * 10, 18, Math.sin(x * 0.05) * 10 + 4); fctx.fillRect(x, 768 * 0.58, 18, Math.cos(x * 0.04) * 10 + 4); }
          for (let i = 0; i < 65; i++) {
            fctx.fillStyle = (i % 3 === 0) ? '#453522' : (i % 2 === 0) ? '#6e583b' : '#3a2b19';
            fctx.beginPath(); fctx.ellipse((Math.sin(i * 133.7) * 0.5 + 0.5) * 1024, 768 * 0.33 + (Math.cos(i * 97.3) * 0.5 + 0.5) * (768 * 0.24), 6 + (Math.sin(i * 23.1) * 0.5 + 0.5) * 16, 4 + (Math.cos(i * 47.9) * 0.5 + 0.5) * 10, 0, 0, Math.PI * 2); fctx.fill();
          }
          fctx.strokeStyle = '#3e2e1c'; fctx.lineWidth = 4; fctx.beginPath(); fctx.moveTo(0, 768 * 0.40); fctx.lineTo(1024, 768 * 0.40); fctx.moveTo(0, 768 * 0.50); fctx.lineTo(1024, 768 * 0.50); fctx.stroke();
        }
        if (fStyle.glow) {
          const radGrad = fctx.createRadialGradient(512, 384, 20, 512, 384, 240);
          radGrad.addColorStop(0, `${fStyle.glow}0.62)`); radGrad.addColorStop(1, `${fStyle.glow}0)`);
          fctx.fillStyle = radGrad; fctx.fillRect(0, 0, 1024, 768);
        }

        floorTex = new THREE.CanvasTexture(floorCanvas);
        if (window.__DND_PREBUILD_CACHE_STATS__) window.__DND_PREBUILD_CACHE_STATS__.floorMisses++;
        if (typeof savePrebuildCacheRecord === 'function' && typeof _getFloorPrebuildSig === 'function' && typeof floorCanvas.toBlob === 'function') {
          const fSig = _getFloorPrebuildSig(floorCfg);
          floorCanvas.toBlob(b => { if (b) savePrebuildCacheRecord(`tex:${floorCacheKey}`, fSig, 'tex', b); }, 'image/png');
        }
        }
        floorTex.wrapS = THREE.ClampToEdgeWrapping; floorTex.wrapT = THREE.ClampToEdgeWrapping;
        if (typeof THREE.SRGBColorSpace !== 'undefined') floorTex.colorSpace = THREE.SRGBColorSpace;
        applyTextureQuality(floorTex);
        cachedProcTex[floorCacheKey] = floorTex;
      }

      const isWoodRoom = (tType === 'tavern' || tType === 'inn' || tType === 'ship');
      var floorNormalTex = createProceduralNormalTexture(isWoodRoom ? 'wood' : 'stone');
      if (floorNormalTex) { floorNormalTex.wrapS = floorNormalTex.wrapT = THREE.RepeatWrapping; floorNormalTex.repeat.set(10, 8); }
      var floorRoughTex = createProceduralRoughnessTexture(isWoodRoom ? 185 : 208);
      if (floorRoughTex) { floorRoughTex.wrapS = floorRoughTex.wrapT = THREE.RepeatWrapping; floorRoughTex.repeat.set(10, 8); }
      const isOutdoorScene = (typeof isOutdoor !== 'undefined') ? Boolean(isOutdoor) : !(data.time_weather && data.time_weather.is_outdoor === false);

      var floorGeo = new THREE.PlaneGeometry(W, H);
      var floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        normalMap: floorNormalTex,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: floorRoughTex,
        roughness: isWoodRoom ? 0.72 : 0.84,
        metalness: 0.04,
        envMapIntensity: isOutdoorScene ? 0.65 : 0.42,
        alphaMap: isOutdoorScene ? getFloorEdgeAlphaTexture(cachedProcTex) : null,
        transparent: isOutdoorScene
      });
      var floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, 0, 0);
      floorMesh.receiveShadow = true;
      floorMesh.userData.isFloor = true;
      staticGrp.add(floorMesh);

      // Floor Grid Overlay (Crisp anti-aliased geometry lines)
      var gridHelper = new THREE.GridHelper(Math.max(W, H), Math.round(Math.max(W, H) / 64), 0x388bfd, 0x1f2937);
      gridHelper.position.y = 0.5;
      gridHelper.userData.isFloor = true;
      gridHelper.userData.isGridOverlay = true;
      gridHelper.visible = showGrid;
      if (gridHelper.material) {
        gridHelper.material.depthWrite = false;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.75;
      }
      staticGrp.add(gridHelper);

      // 2. 3D Architectural & Scenery Objects with rich procedural textures
      var barkTex = createBarkTexture();
      var woodPlankTex = (typeof createWoodTexture === 'function') ? createWoodTexture() : barkTex;
      var forestCanopyTex = createFoliageTexture('#1b4d24', '#2d6a36', '#102e15');
      var vibrantCanopyTex = createFoliageTexture('#266632', '#419650', '#184721');
      var pineCanopyTex = createFoliageTexture('#14351a', '#24522c', '#0c2111');
      var brambleTex1 = createFoliageTexture('#424f21', '#5e6e2a', '#293313');
      var brambleTex2 = createFoliageTexture('#526126', '#728533', '#333d17');
      var stoneTex = createStoneTexture();
      var waterTex = createWaterTexture();

      var stoneNormalTex = createProceduralNormalTexture('stone');
      var barkNormalTex = createProceduralNormalTexture('bark');
      var woodNormalTex = createProceduralNormalTexture('wood');
      var waterNormalTex = createProceduralNormalTexture('water');
      var foliageNormalTex = createProceduralNormalTexture('foliage');
      var stoneRoughTex = createProceduralRoughnessTexture(205);
      var woodRoughTex = createProceduralRoughnessTexture(190);

      var wallMat = getSharedMat('room_wall_v2', () => new THREE.MeshStandardMaterial({
        map: stoneTex,
        normalMap: stoneNormalTex,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughnessMap: stoneRoughTex,
        color: 0x86909c,
        roughness: 0.82,
        metalness: 0.08,
        envMapIntensity: 0.45
      }));
      var woodMat = getSharedMat('room_wood_v2', () => new THREE.MeshStandardMaterial({
        map: woodPlankTex,
        normalMap: woodNormalTex,
        normalScale: new THREE.Vector2(0.55, 0.55),
        color: 0xa07042,
        roughnessMap: woodRoughTex,
        roughness: 0.72,
        metalness: 0.04,
        envMapIntensity: 0.55
      }));
      var stoneMat = getSharedMat('room_stone_v2', () => new THREE.MeshStandardMaterial({
        map: stoneTex,
        normalMap: stoneNormalTex,
        normalScale: new THREE.Vector2(0.70, 0.70),
        roughnessMap: stoneRoughTex,
        color: 0x8b94a0,
        roughness: 0.85,
        metalness: 0.06,
        envMapIntensity: 0.55
      }));
      if (isOutdoorScene) {
        buildSkyrimOpenWorld(staticGrp, data, W, H, theme, data.time_weather || {}, stoneMat, woodMat, cachedProcTex, applyTextureQuality);
      } else {
        window.getOpenWorldTerrainHeight = () => 0;
      }
      staticGrp.userData.getTerrainHeight = window.getOpenWorldTerrainHeight;
      var waterMat = getSharedMat('room_water_v2', () => {
        if (typeof THREE.MeshPhysicalMaterial === 'function') {
          return new THREE.MeshPhysicalMaterial({
            map: waterTex,
            normalMap: waterNormalTex,
            normalScale: new THREE.Vector2(0.45, 0.45),
            color: 0x1b6eb8,
            roughness: 0.10,
            metalness: 0.12,
            transmission: 0.16,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            envMapIntensity: 1.45,
            transparent: true,
            opacity: 0.86
          });
        }
        return new THREE.MeshStandardMaterial({
          map: waterTex, normalMap: waterNormalTex, normalScale: new THREE.Vector2(0.45, 0.45),
          color: 0x1b6eb8, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.86
        });
      });
      var chasmMat = getSharedMat('room_chasm', () => new THREE.MeshBasicMaterial({ color: 0x101318 }));
      var relicMat = getSharedMat('room_relic', () => new THREE.MeshStandardMaterial({ color: 0x584379, roughness: 0.58, metalness: 0.25 }));
      var forgeMat = getSharedMat('room_forge', () => new THREE.MeshStandardMaterial({ color: 0x2ea043, emissive: 0x1f6feb, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.3 }));

      // Nature materials: Foliage translucency + leaf alpha cutouts (Tier 3 #6)
      var stumpTopTex = createStumpTopTexture();
      var stumpTopMat = getSharedMat('room_stumpTop', () => new THREE.MeshStandardMaterial({ map: stumpTopTex, roughness: 0.82, normalMap: woodRoughTex, normalScale: new THREE.Vector2(0.25, 0.25) }));
      var barkMat = getSharedMat('room_bark', () => new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.88, normalMap: barkNormalTex, normalScale: new THREE.Vector2(0.65, 0.65) }));
      const _mkFoliageMat = (key, tex, rough) => getSharedMat(key, () => {
        if (typeof THREE.MeshPhysicalMaterial === 'function') {
          return new THREE.MeshPhysicalMaterial({
            map: tex, normalMap: foliageNormalTex, normalScale: new THREE.Vector2(0.5, 0.5),
            roughness: rough, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide,
            sheen: 0.48, sheenRoughness: 0.65, sheenColor: new THREE.Color(0x8bc34a), envMapIntensity: 0.65
          });
        }
        return new THREE.MeshStandardMaterial({
          map: tex, normalMap: foliageNormalTex, normalScale: new THREE.Vector2(0.5, 0.5),
          roughness: rough, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide
        });
      });
      var treeCanopyMat1 = _mkFoliageMat('room_canopy1_v2', forestCanopyTex, 0.66);
      var treeCanopyMat2 = _mkFoliageMat('room_canopy2_v2', vibrantCanopyTex, 0.62);
      var treeCanopyMat3 = _mkFoliageMat('room_canopy3_v2', pineCanopyTex, 0.70);
      var brambleMat1 = _mkFoliageMat('room_bramble1_v2', brambleTex1, 0.80);
      var brambleMat2 = _mkFoliageMat('room_bramble2_v2', brambleTex2, 0.76);
      var brambleThornMat = getSharedMat('room_brambleThorn', () => new THREE.MeshStandardMaterial({ color: 0x362312, roughness: 0.9 }));

      const scPresets = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().scenery_presets) || {};
      const scCrit = scPresets.criteria || {};
      const _classifyObs = (obs) => {
        const nm = (obs.name || '').toLowerCase(), k = (obs.kind || '').toLowerCase();
        if (nm.includes('wall') || nm.includes('bastion') || nm.includes('meridian') || k === 'omit') return 'omit';
        if (k && ((scPresets.templates && scPresets.templates[k]) || ['pillar', 'wall', 'boulder', 'stump', 'tree', 'bramble', 'building'].includes(k))) return k;
        return (typeof classifyWithClientCCELM === 'function') ? classifyWithClientCCELM(`${k} ${nm}`, scCrit, 0.32, 'wall') : 'wall';
      };

      // Draw call optimization: Pre-group repetitive obstacles for InstancedMesh rendering
      var rawObstacles = data.obstacles || [];
      var instancedWalls = [];
      var instancedPillars = [];
      var nonInstancedObstacles = [];

      rawObstacles.forEach(obs => {
        const scKind = _classifyObs(obs);
        if (scKind === 'omit') return;
        obs._scKind = scKind;
        if (scKind === 'pillar') instancedPillars.push(obs);
        else if (scKind === 'wall') instancedWalls.push(obs);
        else nonInstancedObstacles.push(obs);
      });

      // Render all walls in instanced beveled masonry + baseboard plinths (Tier 4 #1 & #3)
      if (instancedWalls.length > 1 && typeof THREE.InstancedMesh === 'function') {
        const unitBoxGeo = getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05));
        const wallInstMesh = new THREE.InstancedMesh(unitBoxGeo, wallMat, instancedWalls.length);
        wallInstMesh.castShadow = true;
        wallInstMesh.receiveShadow = true;
        const plinthMat = getSharedMat('room_plinth_mat', () => new THREE.MeshStandardMaterial({ color: 0x383d46, roughness: 0.92, normalMap: stoneNormalTex }));
        const plinthInstMesh = new THREE.InstancedMesh(unitBoxGeo, plinthMat, instancedWalls.length);
        plinthInstMesh.receiveShadow = true;
        const dummy = new THREE.Object3D();

        const _wallTints = [0xffffff, 0xe8e0d4, 0xd8e0ea, 0xe2dcd4, 0xd4dad2];
        const _wCol = new THREE.Color();
        instancedWalls.forEach((obs, idx) => {
          const rect = obs.rect || obs;
          const [ox, oy, ow, oh] = rect;
          const h = obs.height || (String(obs.name || '').toLowerCase().includes('dense') ? 130 : 125);
          const wallHeight = Math.max(115, h);
          const cx = (ox + ow / 2) - W / 2;
          const cz = (oy + oh / 2) - H / 2;

          dummy.position.set(cx, wallHeight / 2, cz);
          dummy.scale.set(ow, wallHeight, oh);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          wallInstMesh.setMatrixAt(idx, dummy.matrix);
          _wCol.setHex(_wallTints[idx % _wallTints.length]);
          wallInstMesh.setColorAt(idx, _wCol);

          dummy.position.set(cx, 6, cz);
          dummy.scale.set(ow + 6, 12, oh + 6);
          dummy.updateMatrix();
          plinthInstMesh.setMatrixAt(idx, dummy.matrix);
        });

        wallInstMesh.instanceMatrix.needsUpdate = true;
        if (wallInstMesh.instanceColor) wallInstMesh.instanceColor.needsUpdate = true;
        plinthInstMesh.instanceMatrix.needsUpdate = true;
        wallInstMesh.userData.hoverInfo = {
          name: 'Masonry Dungeon Walls',
          detail: 'Solid Stone Wall Perimeter',
          tag: 'Scenery',
          tagClass: 'tag-obstacle'
        };
        staticGrp.add(wallInstMesh);
        staticGrp.add(plinthInstMesh);
      } else if (instancedWalls.length === 1) {
        nonInstancedObstacles.push(instancedWalls[0]);
      }

      // Render all pillars + carved stone plinths cleanly
      if (instancedPillars.length > 1 && typeof THREE.InstancedMesh === 'function') {
        const unitCylGeo = getSharedGeo('unit_pillar_cyl', () => new THREE.CylinderGeometry(0.85, 1.0, 1.0, 16));
        const unitBoxGeo = getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05));
        const pillarInstMesh = new THREE.InstancedMesh(unitCylGeo, stoneMat, instancedPillars.length);
        pillarInstMesh.castShadow = true;
        pillarInstMesh.receiveShadow = true;
        const pillarPlinthInst = new THREE.InstancedMesh(unitBoxGeo, stoneMat, instancedPillars.length);
        pillarPlinthInst.receiveShadow = true;
        const dummyP = new THREE.Object3D();

        const _pilTints = [0xffffff, 0xeae2d6, 0xd8dee6, 0xdfe2d8];
        const _pCol = new THREE.Color();
        instancedPillars.forEach((obs, idx) => {
          const rect = obs.rect || obs;
          const [ox, oy, ow, oh] = rect;
          const h = obs.height || 135;
          const cylRadius = Math.min(ow, oh) / 2;
          const cx = (ox + ow / 2) - W / 2;
          const cz = (oy + oh / 2) - H / 2;

          dummyP.position.set(cx, h / 2, cz);
          dummyP.scale.set(cylRadius, h, cylRadius);
          dummyP.rotation.set(0, 0, 0);
          dummyP.updateMatrix();
          pillarInstMesh.setMatrixAt(idx, dummyP.matrix);
          _pCol.setHex(_pilTints[idx % _pilTints.length]);
          pillarInstMesh.setColorAt(idx, _pCol);

          dummyP.position.set(cx, 5, cz);
          dummyP.scale.set(cylRadius * 2.35, 10, cylRadius * 2.35);
          dummyP.updateMatrix();
          pillarPlinthInst.setMatrixAt(idx, dummyP.matrix);
        });

        pillarInstMesh.instanceMatrix.needsUpdate = true;
        if (pillarInstMesh.instanceColor) pillarInstMesh.instanceColor.needsUpdate = true;
        pillarPlinthInst.instanceMatrix.needsUpdate = true;
        pillarInstMesh.userData.hoverInfo = {
          name: 'Ancient Stone Pillars',
          detail: 'Masterwork Carved Kharzadic Columns',
          tag: 'Scenery',
          tagClass: 'tag-obstacle'
        };
        staticGrp.add(pillarInstMesh);
        staticGrp.add(pillarPlinthInst);
      } else if (instancedPillars.length === 1) {
        nonInstancedObstacles.push(instancedPillars[0]);
      }
      }
    }

    function update3DScene_static_p2(_B, data) {
      with (_B) {

      nonInstancedObstacles.forEach(obs => {
        const startChildIdx = staticGrp.children.length;
        const rect = obs.rect || obs;
        const [ox, oy, ow, oh] = rect;
        const obsName = (obs.name || '').toLowerCase();
        const obsKind = obs.kind || '';
        const cx = (ox + ow / 2) - W / 2;
        const cz = (oy + oh / 2) - H / 2;
        const h = obs.height || (obsName.includes('wall') || obsName.includes('dense') ? 130 : obsName.includes('pillar') ? 135 : 24);

        const obstacleRules = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg().obstacle_models : null;
        const matchedModelUrl = (typeof resolveSkillModelUrl === 'function') ? resolveSkillModelUrl(`${obsKind} ${obsName}`, obstacleRules, null) : null;

        const gltfCache = window.__DND_MODEL_CACHE__ || (window.__DND_MODEL_CACHE__ = {});
        if (matchedModelUrl && gltfCache[matchedModelUrl]) {
          const clone = gltfCache[matchedModelUrl].scene.clone(true);
          clone.position.set(cx, 0, cz);
          const maxDim = Math.max(ow, oh);
          const sc = Math.max(0.6, Math.min(2.5, maxDim / 38.0));
          clone.scale.set(sc, sc, sc);
          clone.traverse(child => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
          });
          staticGrp.add(clone);
        } else if (obs.visual_spec && Array.isArray(obs.visual_spec.parts) && obs.visual_spec.parts.length > 0) {
          const obsGrp = new THREE.Group(); obsGrp.position.set(cx, 0, cz);
          if (typeof buildSkillPartMeshes === 'function') {
            buildSkillPartMeshes(obsGrp, obs.visual_spec.parts, { dims: [ow, h, oh], mats: { wood: woodMat, iron: ironMat, steel: ironMat, gold: goldMat, flame: forgeMat, arcane: forgeMat }, defaultMat: stoneMat });
          }
          staticGrp.add(obsGrp);
        } else {
          const scPresets = ((typeof getClientSkillClientCfg === 'function') && getClientSkillClientCfg().scenery_presets) || {};
          const scKind = obs._scKind || 'wall';
          const tpl = (scPresets.templates && scPresets.templates[scKind]) || null;
          if (tpl) {
            const th = tpl.fixed_h || (tpl.min_h ? Math.max(tpl.min_h, h) : h);
            const matLookup = { stone: stoneMat, wood: woodMat, forge: forgeMat, relic: relicMat, canopy: treeCanopyMat1, building: (obsName.includes('stone') || obsName.includes('castle') || obsName.includes('tower') || obsName.includes('manor')) ? stoneMat : wallMat, chasm_water: (obsName.includes('stream') || obsName.includes('pool') || obsName.includes('canal')) ? waterMat : chasmMat };
            const instances = (tpl.dual_when_wide && (ow > tpl.dual_when_wide[0] || oh > tpl.dual_when_wide[1]))
              ? [{ dx: -ow * 0.18, dz: -oh * 0.12, ry: 0.35 }, { dx: ow * 0.18, dz: oh * 0.14, ry: -2.4 }]
              : [{ dx: 0, dz: 0, ry: tpl.dual_when_wide ? 0.25 : 0 }];
            const rootGrp = new THREE.Group(); rootGrp.position.set(cx, 0, cz);
            if (tpl.shadow) {
              const sm = new THREE.Mesh(new THREE.PlaneGeometry(ow * 1.15, oh * 1.15), new THREE.MeshBasicMaterial({ map: createContactShadowTexture(), transparent: true, opacity: 0.8, depthWrite: false }));
              sm.rotation.x = -Math.PI / 2; sm.position.y = 0.4; rootGrp.add(sm);
            }
            instances.forEach(inst => {
              const sub = new THREE.Group(); sub.position.set(inst.dx, 0, inst.dz); sub.rotation.y = inst.ry;
              if (typeof buildSkillPartMeshes === 'function') buildSkillPartMeshes(sub, tpl.parts || [], { dims: [ow, th, oh], mats: matLookup, defaultMat: stoneMat });
              rootGrp.add(sub);
            });
            if (tpl.light) {
              const lt = new THREE.PointLight(tpl.light.color, (tpl.light.intensity || 1.5) * 2.2, (tpl.light.dist || 200) * 1.4, 1.0);
              lt.position.set(cx, th + (tpl.light.offset_y || 8), cz); staticGrp.add(lt);
            }
            staticGrp.add(rootGrp);
          } else if (scKind === 'boulder') {
            const bldGrp = new THREE.Group(); bldGrp.position.set(cx, 0, cz);
            const bOffsets = (ow > 60 || oh > 60)
              ? [{ x: 0, y: 0, z: 0, s: [ow * 0.44, h * 0.85, oh * 0.44], rot: [0.05, 0.4, -0.08] }, { x: -ow * 0.24, y: 0, z: oh * 0.18, s: [ow * 0.30, h * 0.62, oh * 0.30], rot: [-0.08, 0.9, 0.05] }, { x: ow * 0.22, y: 0, z: -oh * 0.16, s: [ow * 0.26, h * 0.52, oh * 0.26], rot: [0.06, -0.7, 0.08] }]
              : [{ x: 0, y: 0, z: 0, s: [ow * 0.46, h * 0.88, oh * 0.46], rot: [0.06, 0.35, 0.04] }];
            bOffsets.forEach((bo, idx) => {
              const rockGeo = getSharedGeo(`boulder_rock_v3_${idx}`, () => (window._sculptHelpers && window._sculptHelpers.rock) ? window._sculptHelpers.rock(1.0, 1.0, 1.0, idx + 2) : new THREE.DodecahedronGeometry(1.0, 1));
              const rm = new THREE.Mesh(rockGeo, stoneMat);
              rm.scale.set(bo.s[0], bo.s[1], bo.s[2]); rm.position.set(bo.x, bo.y, bo.z); rm.rotation.set(bo.rot[0], bo.rot[1], bo.rot[2]);
              rm.castShadow = true; rm.receiveShadow = true; bldGrp.add(rm);
            });
            for (let pi = 0; pi < 3; pi++) {
              const pa = (pi * 2.1) + 0.4, pd = Math.max(ow, oh) * 0.42;
              const pm = new THREE.Mesh(getSharedGeo('clutter_pebble_v2', () => new THREE.DodecahedronGeometry(2.6, 0)), stoneMat);
              pm.position.set(Math.cos(pa) * pd, 0.4, Math.sin(pa) * pd); pm.scale.set(1.1, 0.7, 0.9); bldGrp.add(pm);
            }
            staticGrp.add(bldGrp);
          } else if (scKind === 'stump') {
            const stumpGrp = new THREE.Group(); stumpGrp.position.set(cx, 0, cz);
            const stumpH = Math.min(Math.max(14, h * 0.45), 28), topR = Math.max(5.5, Math.min(ow, oh) * 0.38), baseR = topR * 1.45;
            const stumpGeo = (window._sculptHelpers && window._sculptHelpers.lathe)
              ? getSharedGeo(`stump_${Math.round(topR)}_${Math.round(stumpH)}`, () => window._sculptHelpers.lathe([[baseR, 0], [topR * 1.15, stumpH * 0.25], [topR, stumpH]], 18, 8, 0.14, 0.04))
              : new THREE.CylinderGeometry(topR, baseR, stumpH, 16).translate(0, stumpH * 0.5, 0);
            const body = new THREE.Mesh(stumpGeo, barkMat); body.castShadow = true; body.receiveShadow = true; stumpGrp.add(body);
            const cap = new THREE.Mesh(new THREE.CircleGeometry(topR * 0.97, 20), stumpTopMat); cap.rotation.x = -Math.PI / 2; cap.position.y = stumpH + 0.08; stumpGrp.add(cap);
            for (let ri = 0; ri < 6; ri++) {
              const rAng = ri * (Math.PI / 3), rm = new THREE.Mesh(new THREE.CylinderGeometry(topR * 0.18, topR * 0.38, baseR * 1.25, 8), barkMat);
              rm.rotation.set(0, rAng, Math.PI / 2.5); rm.position.set(Math.cos(rAng) * baseR * 0.78, 2.2, Math.sin(rAng) * baseR * 0.78); rm.castShadow = true; stumpGrp.add(rm);
            }
            staticGrp.add(stumpGrp);
          } else if (scKind === 'tree') {
            const treeGrp = new THREE.Group(); treeGrp.position.set(cx, 0, cz);
            const isGrove = (ow > 120 || oh > 120), spots = isGrove ? [[-ow / 4.4, -oh / 4.4, 0.92], [ow / 4.4, -oh / 4.4, 1.08], [-ow / 4.4, oh / 4.4, 1.08], [ow / 4.4, oh / 4.4, 0.92]] : [[0, 0, 1.05]];
            spots.forEach(([sx, sz, spScale]) => {
              const tSub = new THREE.Group(); tSub.position.set(sx, 0, sz);
              const treeH = Math.max(155, h) * spScale, trunkH = treeH * 0.62, trunkR = Math.max(6, Math.min(Math.min(ow, oh) * 0.22, 13)) * spScale;
              const trunkGeo = getSharedGeo(`tree_trunk_${Math.round(trunkR)}_${Math.round(trunkH)}`, () => (window._sculptHelpers && window._sculptHelpers.lathe)
                ? window._sculptHelpers.lathe([[trunkR * 1.45, 0], [trunkR * 1.02, trunkH * 0.14], [trunkR * 0.85, trunkH * 0.55], [trunkR * 0.58, trunkH]], 12, 7, 0.10, 0.02)
                : new THREE.CylinderGeometry(trunkR * 0.6, trunkR * 1.3, trunkH, 12).translate(0, trunkH * 0.5, 0));
              const trunk = new THREE.Mesh(trunkGeo, barkMat); trunk.castShadow = true; trunk.receiveShadow = true; tSub.add(trunk);
              for (let bi = 0; bi < 3; bi++) {
                const ba = (bi / 3) * Math.PI * 2 + 0.4;
                const br = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.24, trunkR * 0.46, treeH * 0.26, 7), barkMat);
                br.position.set(Math.cos(ba) * trunkR * 1.5, trunkH * 0.88, Math.sin(ba) * trunkR * 1.5);
                br.rotation.set(Math.sin(ba) * 0.55, 0, -Math.cos(ba) * 0.55); br.castShadow = true; tSub.add(br);
              }
              const canopyGrp = new THREE.Group(); canopyGrp.userData.isCanopy = true;
              const cR = Math.max(28, Math.min(Math.min(ow, oh) * 0.58, 46)) * spScale;
              [[0, 0.72, 0, 0.95, 0.82, treeCanopyMat1], [0, 0.92, 0, 0.68, 0.62, treeCanopyMat2], [-0.45, 0.66, 0.25, 0.62, 0.54, treeCanopyMat2], [0.45, 0.67, -0.25, 0.64, 0.54, treeCanopyMat3]].forEach(([ox, oy, oz, r1, r2, mat], ci) => {
                const fmGeo = getSharedGeo(`tree_lobe_v3_${ci}`, () => {
                  const ig = new THREE.IcosahedronGeometry(1.0, 2), pa = ig.attributes.position;
                  for (let vi = 0; vi < pa.count; vi++) {
                    const vx = pa.getX(vi), vy = pa.getY(vi), vz = pa.getZ(vi);
                    const sc = 0.88 + 0.20 * Math.sin(vx * 4.5 + ci) * Math.cos(vz * 4.2 - vy * 3.1);
                    pa.setXYZ(vi, vx * sc, vy * sc, vz * sc);
                  }
                  ig.computeVertexNormals(); return ig;
                });
                const fm = new THREE.Mesh(fmGeo, mat);
                fm.scale.set(cR * r1, cR * r2, cR * r1); fm.position.set(cR * ox, treeH * oy, cR * oz); fm.castShadow = true; fm.receiveShadow = true; canopyGrp.add(fm);
              });
              if (typeof createGoboTexture === 'function') {
                const goboTex = createGoboTexture('canopy');
                const goboMat = getSharedMat('gobo_canopy_decal', () => new THREE.MeshBasicMaterial({
                  map: goboTex, transparent: true, opacity: 0.42, depthWrite: false
                }));
                const goboPlane = new THREE.Mesh(getSharedGeo('unit_plane_1x1', () => new THREE.PlaneGeometry(1, 1)), goboMat);
                goboPlane.rotation.x = -Math.PI / 2; goboPlane.position.y = 0.28; goboPlane.scale.set(cR * 2.5, cR * 2.5, 1);
                tSub.add(goboPlane);
              }
              tSub.add(canopyGrp); treeGrp.add(tSub);
            });
            staticGrp.add(treeGrp);
          } else if (scKind === 'bramble') {
            const bGrp = new THREE.Group(); bGrp.position.set(cx, 0, cz);
            const bH = Math.min(h, 30);
            const cnt = Math.max(4, Math.min(10, Math.floor((ow * oh) / 900)));
            for (let bi = 0; bi < cnt; bi++) {
              const bx = ((Math.sin((cx + bi * 11.7) * 99) * 0.5) * 0.72) * ow, bz = ((Math.cos((cz + bi * 17.3) * 99) * 0.5) * 0.72) * oh, br = 7 + (bi % 4) * 2.5;
              const bc = new THREE.Mesh(getSharedGeo(`bramble_mound_${bi % 3}`, () => {
                const dg = new THREE.DodecahedronGeometry(1.0, 1), pa = dg.attributes.position;
                for (let vi = 0; vi < pa.count; vi++) {
                  const s = 0.85 + 0.25 * Math.sin(pa.getX(vi) * 4 + bi);
                  pa.setXYZ(vi, pa.getX(vi) * s, Math.max(-0.2, pa.getY(vi) * s * 0.65), pa.getZ(vi) * s);
                }
                dg.computeVertexNormals(); return dg;
              }), bi % 2 === 0 ? brambleMat2 : brambleMat1);
              bc.scale.set(br * 1.4, bH * 0.42, br * 1.4); bc.position.set(bx, bH * 0.16, bz); bc.castShadow = true; bc.receiveShadow = true; bGrp.add(bc);
            }
            for (let vi = 0; vi < 4; vi++) {
              const arch = new THREE.Mesh(new THREE.TorusGeometry(Math.min(ow, oh) * 0.35, 0.9, 6, 12, Math.PI), brambleThornMat);
              arch.rotation.y = (vi / 4) * Math.PI; arch.position.y = 1.5; arch.castShadow = true; bGrp.add(arch);
            }
            staticGrp.add(bGrp);
          }
        }

        // Attach hover metadata to all 3D meshes/groups created for this obstacle
        const obsHoverInfo = {
          name: obs.raw_name || obs.name || 'Terrain Obstacle',
          detail: obs.label || 'Scenery & Terrain',
          tag: 'Scenery',
          tagClass: 'tag-obstacle'
        };
        for (let ci = startChildIdx; ci < staticGrp.children.length; ci++) {
          staticGrp.children[ci].userData.hoverInfo = obsHoverInfo;
        }
      });
      }
    }

    function update3DScene_static_p3(_B, data) {
      with (_B) {

      // 3. 3D Portals & Gateways (Matching 2D floor gateway/stair marker without rotating rings)
      (data.portals || []).forEach(portal => {
        const [rx, ry, rw, rh] = portal.rect;
        const cx = (rx + rw / 2) - W / 2;
        const cz = (ry + rh / 2) - H / 2;
        const pName = (portal.name || '').toLowerCase();
        const isStair = pName.includes('stair') || portal.direction === 'up' || portal.direction === 'down';

        const pGrp = new THREE.Group();
        pGrp.position.set(cx, 0.6, cz);
        pGrp.userData.isPortal = true;
        pGrp.userData.portalData = portal;
        pGrp.userData.portalTargetX = rx + rw / 2;
        pGrp.userData.portalTargetY = ry + rh / 2;
        pGrp.userData.hoverInfo = {
          name: portal.display_name || portal.name || 'Passage',
          detail: `Exit / Gateway (${(portal.direction || 'travel').toUpperCase()})`,
          tag: 'Portal',
          tagClass: 'tag-portal'
        };

        // Ground area translucent glow pad + carved stone perimeter curb rails (no flat blue brick!)
        const padGeo = new THREE.PlaneGeometry(rw, rh);
        const padMat = new THREE.MeshStandardMaterial({
          color: isStair ? 0x7c52d6 : 0x2d6ec8,
          emissive: isStair ? 0x3a226c : 0x133868,
          emissiveIntensity: 0.45,
          roughness: 0.6,
          metalness: 0.1,
          transparent: true,
          opacity: 0.32,
          depthWrite: false
        });
        const padMesh = new THREE.Mesh(padGeo, padMat);
        padMesh.rotation.x = -Math.PI / 2;
        padMesh.receiveShadow = true;
        pGrp.add(padMesh);

        const railGeo = getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05));
        const railMat = (typeof window.createRichObjectMaterial === 'function')
          ? window.createRichObjectMaterial({ color: isStair ? 0x8964c8 : 0x5282b8, pbrKind: 'stone', roughness: 0.52, metalness: 0.25 })
          : getSharedMat(isStair ? 'portal_curb_stair' : 'portal_curb_gate', () => new THREE.MeshStandardMaterial({ color: isStair ? 0x8964c8 : 0x5282b8, roughness: 0.55, metalness: 0.25 }));
        const rwEdge = [[rw, 2.2, 4.5, 0, -rh / 2], [rw, 2.2, 4.5, 0, rh / 2], [4.5, 2.2, rh, -rw / 2, 0], [4.5, 2.2, rh, rw / 2, 0]];
        rwEdge.forEach(([sx, sy, sz, ex, ez]) => {
          const rMesh = new THREE.Mesh(railGeo, railMat);
          rMesh.scale.set(sx, sy, sz);
          rMesh.position.set(ex, 0.9, ez);
          rMesh.castShadow = true; rMesh.receiveShadow = true;
          pGrp.add(rMesh);
        });

        if (isStair) {
          // Render actual 3D stone stair steps matching 2D stairs
          const numSteps = 4;
          const stepDepth = rh / numSteps;
          for (let s = 0; s < numSteps; s++) {
            const stepH = 1.8 + s * 1.5;
            const stepMesh = new THREE.Mesh(borderGeo, stoneMat);
            stepMesh.scale.set(rw * 0.88, stepH, stepDepth * 0.85);
            stepMesh.position.set(0, stepH / 2, -rh / 2 + stepDepth * (s + 0.5));
            stepMesh.castShadow = true;
            stepMesh.receiveShadow = true;
            pGrp.add(stepMesh);
          }
        }

        staticGrp.add(pGrp);
      });

      // 4. Procedural Immersive 3D Surrounding Environment (Mountains, Forest, Caverns, Roof/Beams, Dungeon Vaults)
      buildSurroundingEnvironment3D(tType, theme, W, H, isOutdoor, tw, data.room_id || '', staticGrp);

      // Freeze static room geometry once when room is built
      freezeStaticHierarchy(staticGrp);
      if (!_B.bgOnly) {
        window.__outdoorFaunaState = staticGrp.userData.outdoorFaunaState || null;
        threeRoomGroup.add(staticGrp);
        lastCamModeApplied = null;

        if (threeRenderer.shadowMap && dirLight && dirLight.shadow) {
          dirLight.shadow.needsUpdate = true;
          threeRenderer.shadowMap.needsUpdate = true;
          dirLight.shadow.autoUpdate = true;
          threeRenderer.shadowMap.autoUpdate = true;
        }
      }
      }
    }

