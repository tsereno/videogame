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
      const defR = isSnowBiome ? 0.42 : 0.24, defG = isSnowBiome ? 0.50 : 0.39, defB = isSnowBiome ? 0.58 : 0.21;

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
          const biomePatch = Math.sin(vx * 0.0022 + phaseX) * Math.cos(vz * 0.0021 - phaseZ);
          const microPatch = Math.sin(vx * 0.0075 - phaseZ) * Math.sin(vz * 0.0072 + phaseX);
          let r = defR + (isSnowBiome ? biomePatch * 0.03 : biomePatch * 0.065 + microPatch * 0.025);
          let g = defG + (isSnowBiome ? biomePatch * 0.04 : biomePatch * 0.045 - microPatch * 0.02);
          let b = defB + (isSnowBiome ? biomePatch * 0.06 : -biomePatch * 0.025 + Math.max(0, microPatch) * 0.04);
          if (vy > snowLine + 160) {
            r = 0.80; g = 0.86; b = 0.94;
          } else if (vy > snowLine) {
            const sMix = (vy - snowLine) / 160;
            r = 0.44 + 0.36 * sMix; g = 0.45 + 0.41 * sMix; b = 0.50 + 0.44 * sMix;
          } else if (vy > 155) {
            r = 0.44; g = 0.42; b = 0.44;
          } else if (vy > 40) {
            const hMix = (vy - 40) / 115;
            r = r + (0.40 - r) * hMix; g = g + (0.42 - g) * hMix; b = b + (0.28 - b) * hMix;
          }
          if (slope > 0.24) {
            const rockMix = Math.min(1.0, (slope - 0.24) * 1.45);
            const strata = 0.90 + Math.sin(vy * 0.22 + vx * 0.004) * 0.12;
            const ochre = Math.max(0, Math.sin(vy * 0.08 + phaseX)) * 0.12;
            r = r * (1 - rockMix) + (0.37 + ochre) * strata * rockMix;
            g = g * (1 - rockMix) + (0.34 + ochre * 0.5) * strata * rockMix;
            b = b * (1 - rockMix) + (0.39 - ochre * 0.2) * strata * rockMix;
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
        const treeSlope = Math.hypot(getHeight(tx + 18, tz) - getHeight(tx - 18, tz), getHeight(tx, tz + 18) - getHeight(tx, tz - 18)) / 36.0;
        if (treeSlope > 0.24) continue;

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
    function buildSkyrimOpenWorld(staticGrp, data, W, H, theme, tw, stoneMat, woodMat, cachedProcTex, applyQualityFn, fStyle) {
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
            const c = new THREE.ConeGeometry(rT, hT, 22, 3).toNonIndexed();
            const p = c.attributes.position;
            const cols = new Float32Array(p.count * 3);
            for (let i = 0; i < p.count; i++) {
              let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
              const ang = Math.atan2(z, x);
              const rNow = Math.hypot(x, z);
              const radialFrac = rNow / Math.max(0.1, rT);
              const bough = 1.0 + 0.11 * Math.cos(ang * 5 + t * 1.4) + 0.04 * Math.sin(ang * 9 - t);
              const droop = -(radialFrac * radialFrac) * 4.5;
              x *= bough; z *= bough; y += droop + yOff;
              p.setXYZ(i, x, y, z);
              const ly = Math.max(0, Math.min(1, (y + height * 0.5) / height));
              const sh = botShade + (topShade - botShade) * (ly * 0.75 + radialFrac * 0.25);
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
        const trunkGeo = _geo('pine_trunk_v4', () => new THREE.CylinderGeometry(3.0, 6.2, 36, 12));
        const lowCrownGeo = _geo('pine_low_v4', () => _mkPineTierGeo(25, 58, 3, 0.50, 1.08));
        const topCrownGeo = _geo('pine_top_v4', () => _mkPineTierGeo(17, 50, 3, 0.68, 1.18));
        const broadTrunkGeo = _geo('broad_trunk_v2', () => new THREE.CylinderGeometry(2.4, 5.2, 42, 12));
        const broadCrownGeo = _geo('broad_crown_v2', () => {
          const mergeFn = window._sculptHelpers && window._sculptHelpers.merge;
          const lobes = [[0, 6, 0, 22, 18], [-11, -1, 7, 15, 13], [11, 0, -6, 15, 13], [3, -2, 11, 13, 12]].map(([lx, ly, lz, rx, ry], li) => {
            const ig = new THREE.IcosahedronGeometry(1.0, 2).toNonIndexed();
            const pa = ig.attributes.position, cols = new Float32Array(pa.count * 3);
            for (let vi = 0; vi < pa.count; vi++) {
              const vx = pa.getX(vi), vy = pa.getY(vi), vz = pa.getZ(vi);
              const warp = 0.93 + 0.09 * Math.sin(vx * 3.1 + li) * Math.cos(vz * 3.3 - vy * 2.2);
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
        const _coniferCols = isSnowBiome ? [0x6e9890, 0x86a6a0, 0x56847c, 0x90b2a8, 0x628c7a] : [0x2e7d54, 0x429450, 0x266658, 0x629e44, 0x3b7684, 0x4c8842];
        const _broadCols = isSnowBiome ? [0x82a8a0, 0x9eb8b2, 0xb89668, 0x72968c] : [0x78b242, 0xe09f3e, 0xc84b31, 0x529b58, 0xf0bc42, 0x8f5cb8, 0xd46a4e];
        const _barkCols = [0x8c7056, 0xa47a58, 0x746458, 0x96887a, 0x6a5444];
        const _birchBarkCols = [0xd6d0c4, 0xc4bcb0, 0x9e7458, 0xb2aa98];
        const climbableTrees = [];
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
            if (Math.hypot(_tDum.position.x, _tDum.position.z) < 1600) {
              climbableTrees.push({ x: _tDum.position.x, y: groundY, z: _tDum.position.z, topY: groundY + Math.max(46, Math.min(82, 58 * origSc * yStret)) });
            }
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
            if (Math.hypot(_tDum.position.x, _tDum.position.z) < 1600) {
              climbableTrees.push({ x: _tDum.position.x, y: groundY, z: _tDum.position.z, topY: groundY + Math.max(42, Math.min(72, 48 * origSc * yStret)) });
            }
            brdIdx++;
          }
        }
        staticGrp.userData.climbableTrees = climbableTrees;
        window.__climbableTrees = climbableTrees;
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

        const rockGeo = _geo('outcrop_rock_v4', () => {
          const g = new THREE.IcosahedronGeometry(16, 2), pa = g.attributes.position;
          for (let v = 0; v < pa.count; v++) {
            const vx = pa.getX(v), vy = pa.getY(v), vz = pa.getZ(v);
            const d = 1.0 + Math.sin(vx * 0.19 + vy * 0.15) * 0.09 + Math.cos(vz * 0.21) * 0.07;
            pa.setXYZ(v, vx * d, vy * d * 0.86, vz * d);
          }
          g.computeVertexNormals(); return g;
        });
        const _stMaps = (typeof window.getProceduralObjectMaps === 'function') ? window.getProceduralObjectMaps('stone') : null;
        const rockMat = _mat('outcrop_rock_v3', () => new THREE.MeshStandardMaterial({ color: 0xb4bac2, map: _stMaps ? _stMaps.map : null, normalMap: wildNormTex, roughnessMap: _stMaps ? _stMaps.roughnessMap : null, roughness: 0.88 }));
        const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
        const _rockCols = [0x7d8ea3, 0xa89274, 0x6a7d68, 0x966e64, 0x768298, 0x9fa8a0];
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

        // Terrain substrate check: plants & organic ground cover grow only on natural soil/dirt/compost,
        // never on brick/cement/cobble plazas, wood planks, compacted roads, obstacles, boulders, or bare rock cliffs.
        const hasHardRoomCenter = !(fStyle && fStyle.grass);
        const obsList = (data && Array.isArray(data.obstacles)) ? data.obstacles : [];
        const portalList = (data && Array.isArray(data.portals)) ? data.portals : [];
        const _getRoadMaskLocal = (wx, wz) => {
          const dNS = (Math.abs(wz) > (H * 0.5 + 40) * 0.7) ? Math.abs(wx - Math.sin(wz * 0.0014) * 140) : 9999;
          const dEW = (Math.abs(wx) > (W * 0.5 + 40) * 0.7) ? Math.abs(wz - Math.cos(wx * 0.0014) * 140) : 9999;
          const dRoad = dNS < dEW ? dNS : dEW;
          return Math.max(0, 1.0 - Math.max(0, dRoad - 42) / 95);
        };
        const isHardTerrainAt = (wx, wz, yVal) => {
          if (hasHardRoomCenter && Math.hypot(wx / (W * 0.5), wz / (H * 0.5)) < 0.98) return true;
          if (fStyle && fStyle.road && Math.abs(wx) <= W * 0.5 && wz > -H * 0.22 && wz < H * 0.12) return true;
          if (_getRoadMaskLocal(wx, wz) > 0.26) return true;
          for (let oi = 0; oi < obsList.length; oi++) {
            const r = obsList[oi].rect || obsList[oi];
            if (!r || r.length < 4) continue;
            const ox = (r[0] + r[2] * 0.5) - W * 0.5, oz = (r[1] + r[3] * 0.5) - H * 0.5;
            if (Math.abs(wx - ox) <= r[2] * 0.5 + 14 && Math.abs(wz - oz) <= r[3] * 0.5 + 14) return true;
          }
          for (let pi = 0; pi < portalList.length; pi++) {
            const r = portalList[pi].rect;
            if (!r || r.length < 4) continue;
            const px = (r[0] + r[2] * 0.5) - W * 0.5, pz = (r[1] + r[3] * 0.5) - H * 0.5;
            if (Math.abs(wx - px) <= r[2] * 0.5 + 16 && Math.abs(wz - pz) <= r[3] * 0.5 + 16) return true;
          }
          for (let ri = 0; ri < placedRocks; ri++) {
            const ro = ri * 16;
            const dx = wx - rockMatrices[ro + 12], dz = wz - rockMatrices[ro + 14];
            if (dx * dx + dz * dz < 420) return true;
          }
          if (yVal > 148) return true;
          const sDx = Math.abs(getTerrainHeight(wx + 18, wz) - getTerrainHeight(wx - 18, wz));
          const sDz = Math.abs(getTerrainHeight(wx, wz + 18) - getTerrainHeight(wx, wz - 18));
          if (Math.hypot(sDx, sDz) / 36.0 > 0.22) return true;
          return false;
        };

        // Tier 4 #4 Three-Tier Micro-Clutter: Soft grass blade tufts & faceted pebbles around the clearing
        const grassGeo = _geo('clutter_grass_tuft_v4', () => (window._sculptHelpers && window._sculptHelpers.grassTuft) ? window._sculptHelpers.grassTuft(2.6, 8.2) : new THREE.ConeGeometry(1.4, 8.0, 4));
        const _grHasCol = Boolean(grassGeo.attributes && grassGeo.attributes.color);
        const grassMat = _mat(isSnowBiome ? 'clutter_grass_snow_v4' : 'clutter_grass_v4', () => (typeof THREE.MeshPhysicalMaterial === 'function')
          ? new THREE.MeshPhysicalMaterial({ color: isSnowBiome ? 0xb4c6ce : 0xc6d0b8, vertexColors: _grHasCol, roughness: 0.86, sheen: 0.48, sheenColor: new THREE.Color(isSnowBiome ? 0xd2e2ea : 0x96be66) })
          : new THREE.MeshStandardMaterial({ color: isSnowBiome ? 0xb4c6ce : 0xc6d0b8, vertexColors: _grHasCol, roughness: 0.86 }));
        const grassMax = 640;
        const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassMax);
        const pebbleGeo = _geo('clutter_pebble_v4', () => {
          const g = new THREE.IcosahedronGeometry(2.3, 2), pa = g.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            const vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i);
            const d = 1.0 + Math.sin(vx * 0.9 + vz * 0.7) * 0.08;
            pa.setXYZ(i, vx * d, vy * 0.65 * d, vz * d);
          }
          g.computeVertexNormals(); return g;
        });
        const pebbleMat = _mat('clutter_pebble_v3', () => new THREE.MeshStandardMaterial({ color: 0xb6bac2, map: _stMaps ? _stMaps.map : null, normalMap: wildNormTex, roughness: 0.90 }));
        const pebbleMax = 320;
        const pebbleInst = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleMax);
        const cdum = new THREE.Object3D();
        const _grassCols = isSnowBiome ? [0x6e8880, 0x829892, 0x8e8668, 0x627c74, 0x94a69c] : [0x58823c, 0x729842, 0x8e8648, 0x4a6e38, 0x6c8856, 0x7ca246];
        let gCount = 0, pCount = 0;
        for (let ci = 0; ci < grassMax * 4 && gCount < grassMax; ci++) {
          const ch = ((ci * 2654435761 + seedNum * 37) >>> 0);
          const ang = ((ci * 2.39996 + seedNum * 0.13) % (Math.PI * 2));
          const rad = 110 + ((ci * 173 + seedNum * 29) % 1450);
          const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
          const cy = getTerrainHeight(cx, cz);
          if (isHardTerrainAt(cx, cz, cy)) continue;
          cdum.position.set(cx, cy + 3.0, cz);
          cdum.rotation.set(Math.sin(ci * 1.9) * 0.18, ang, Math.cos(ci * 2.3) * 0.18);
          const gs = 0.55 + ((ch % 100) * 0.01);
          cdum.scale.set(gs * (0.95 + ((ch >> 7) % 35) * 0.01), gs * (0.78 + ((ch >> 13) % 45) * 0.01), gs * (0.95 + ((ch >> 19) % 35) * 0.01));
          cdum.updateMatrix();
          _tCol.setHex(_grassCols[((ci * 13 + seedNum) >>> 0) % _grassCols.length]);
          grassInst.setColorAt(gCount, _tCol);
          grassInst.setMatrixAt(gCount++, cdum.matrix);
        }
        for (let ci = grassMax; ci < grassMax + pebbleMax * 3 && pCount < pebbleMax; ci++) {
          const ch = ((ci * 2654435761 + seedNum * 37) >>> 0);
          const ang = ((ci * 2.39996 + seedNum * 0.13) % (Math.PI * 2));
          const rad = 110 + ((ci * 173 + seedNum * 29) % 1450);
          const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
          const cy = getTerrainHeight(cx, cz);
          if (isHardTerrainAt(cx, cz, cy)) continue;
          cdum.position.set(cx, cy + 0.65, cz);
          cdum.rotation.set(ci * 0.6, ci * 1.3, ci * 0.4);
          const ps = 0.40 + ((ch % 125) * 0.01);
          cdum.scale.set(ps * (1.05 + ((ch >> 8) % 45) * 0.01), ps * (0.45 + ((ch >> 14) % 35) * 0.01), ps * (0.85 + ((ch >> 20) % 40) * 0.01));
          cdum.updateMatrix();
          _tCol.setHex(_rockCols[((ci * 11 + seedNum) >>> 0) % _rockCols.length]);
          pebbleInst.setColorAt(pCount, _tCol);
          pebbleInst.setMatrixAt(pCount++, cdum.matrix);
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

        // 1. Smooth Realistic Wildflower Stems, Leaves & Cupped Teardrop Petals (180)
        const flStemGeo = _geo('land_fl_stem_v3', () => {
          const stk = new THREE.CylinderGeometry(0.20, 0.32, 7.8, 8, 3).translate(0, 3.9, 0).toNonIndexed();
          const sp = stk.attributes.position;
          for (let i = 0; i < sp.count; i++) {
            const y = sp.getY(i);
            sp.setX(i, sp.getX(i) + Math.sin(y * 0.42) * 0.32);
          }
          stk.computeVertexNormals();
          _tintVerts(stk, (_, y) => [0.28, 0.46 + y * 0.04, 0.20]);
          const _mkStemLeaf = (ry, yPos, sc) => {
            const lf = new THREE.PlaneGeometry(1.15 * sc, 3.4 * sc, 2, 4).toNonIndexed();
            const lp = lf.attributes.position;
            for (let i = 0; i < lp.count; i++) {
              const x = lp.getX(i), y = lp.getY(i) + 1.7 * sc;
              const t = Math.max(0, Math.min(1, y / (3.4 * sc)));
              const widthProfile = Math.sin(t * Math.PI) * (1.15 - t * 0.35);
              lp.setXYZ(i, x * widthProfile, y, Math.sin(t * Math.PI * 0.85) * 0.48 * sc + (x * x) * 0.22);
            }
            lf.rotateX(0.75); lf.rotateY(ry); lf.translate(0, yPos, 0); lf.computeVertexNormals();
            return _tintVerts(lf, () => [0.35, 0.62, 0.24]);
          };
          const lfL = _mkStemLeaf(-Math.PI * 0.5, 0.9, 1.0), lfR = _mkStemLeaf(Math.PI * 0.55, 1.5, 0.88);
          return _scMerge ? _scMerge([stk, lfL, lfR]) : stk;
        });
        const flBloomGeo = _geo('land_fl_bloom_v3', () => {
          const ctr = _tintVerts(new THREE.SphereGeometry(0.68, 10, 7).scale(1.0, 0.55, 1.0).translate(0, 7.95, 0), () => [0.98, 0.82, 0.26]);
          const pts = [ctr];
          for (let pi = 0; pi < 6; pi++) {
            const pa = (pi / 6) * Math.PI * 2;
            const pet = new THREE.PlaneGeometry(1.18, 2.05, 3, 4).toNonIndexed();
            const pp = pet.attributes.position;
            for (let vi = 0; vi < pp.count; vi++) {
              const x = pp.getX(vi), y = pp.getY(vi) + 1.025;
              const t = Math.max(0, Math.min(1, y / 2.05));
              const oval = Math.sin(Math.pow(t, 0.68) * Math.PI);
              const cup = (x * x) * 0.28 + Math.sin(t * Math.PI * 0.72) * 0.34;
              pp.setXYZ(vi, x * (0.28 + 0.95 * oval), cup, y + 0.35);
            }
            pet.rotateY(pa); pet.translate(0, 7.86, 0); pet.computeVertexNormals();
            pts.push(_tintVerts(pet, (x, _, z) => { const d = Math.min(1, Math.hypot(x, z) / 2.3); return [0.76 + d * 0.24, 0.74 + d * 0.24, 0.74 + d * 0.24]; }));
          }
          return _scMerge ? _scMerge(pts) : pts[0];
        });
        // 2. Smooth Arching Tapered Woodland Ferns (120)
        const fernGeo = _geo('land_fern_v3', () => {
          const pts = [];
          for (let fi = 0; fi < 9; fi++) {
            const ang = (fi / 9) * Math.PI * 2 + (fi % 2) * 0.22, inner = fi >= 5;
            const len = inner ? 6.4 : 9.4, maxW = inner ? 1.55 : 1.95;
            const fr = new THREE.PlaneGeometry(maxW, len, 2, 6).toNonIndexed();
            const fp = fr.attributes.position;
            for (let i = 0; i < fp.count; i++) {
              const x = fp.getX(i), zFrac = Math.max(0, Math.min(1, (fp.getY(i) + len * 0.5) / len));
              const taper = Math.sin(Math.pow(zFrac, 0.62) * Math.PI) * (1.0 - 0.15 * zFrac);
              const droopY = (inner ? 2.8 : 2.1) * Math.sin(zFrac * Math.PI * 0.76) - zFrac * zFrac * 0.85;
              const midribV = Math.abs(x) * 0.18;
              fp.setXYZ(i, x * Math.max(0.06, taper), droopY + midribV + 0.35, zFrac * len);
            }
            fr.rotateY(ang); fr.computeVertexNormals();
            pts.push(_tintVerts(fr, (x, _, z) => { const d = Math.min(1, Math.hypot(x, z) / 9.2); return [0.56 + d * 0.42, 0.68 + d * 0.42, 0.46 + d * 0.36]; }));
          }
          return _scMerge ? _scMerge(pts) : pts[0];
        });
        // 3. Smooth Organic Toadstool Mushroom Clumps (72)
        const shroomGeo = _geo('land_shroom_v3', () => {
          const mkOne = (sx, sz, h, r) => {
            const st = new THREE.CylinderGeometry(r * 0.24, r * 0.36, h, 10, 3).translate(sx, h * 0.5, sz).toNonIndexed();
            const sp = st.attributes.position;
            for (let i = 0; i < sp.count; i++) {
              const ly = Math.max(0, Math.min(1, sp.getY(i) / h));
              sp.setX(i, sp.getX(i) + Math.sin(ly * Math.PI) * r * 0.14);
            }
            st.computeVertexNormals();
            _tintVerts(st, () => [0.92, 0.88, 0.80]);
            const capRaw = _scLathe ? _scLathe([[r * 0.22, h * 0.84], [r * 0.96, h * 0.90], [r * 1.04, h * 1.04], [r * 0.82, h * 1.25], [r * 0.42, h * 1.36], [0.02, h * 1.40]], 16) : new THREE.SphereGeometry(r, 14, 10).scale(1, 0.55, 1).translate(0, h * 1.05, 0);
            const cap = _tintVerts(capRaw.translate(sx, 0, sz), (_, y) => [0.86 + Math.min(0.14, (y - h) * 0.10), 0.82, 0.80]);
            return [st, cap];
          };
          const parts = [...mkOne(0, 0, 4.4, 2.2), ...mkOne(2.0, 1.2, 2.9, 1.45), ...mkOne(-1.7, -1.0, 2.4, 1.2)];
          return _scMerge ? _scMerge(parts) : parts[0];
        });
        // 4. Smooth Sculpted Pine Cones (110)
        const coneGeo = _geo('land_pinecone_v3', () => {
          const cg = _scLathe
            ? _scLathe([[0.18, 0], [1.18, 0.65], [1.62, 1.65], [1.38, 2.85], [0.76, 3.85], [0.12, 4.35]], 14)
            : new THREE.SphereGeometry(1.5, 12, 10).scale(0.9, 1.45, 0.9);
          cg.rotateZ(1.48); cg.translate(0, 1.28, 0);
          return _tintVerts(cg, (x, y, z) => {
            const sc = 0.72 + Math.min(0.28, y * 0.16) + 0.06 * Math.sin(x * 4.5 + z * 4.5);
            return [sc * 1.04, sc * 0.94, sc * 0.84];
          });
        });
        // 5. Smooth Forked Fallen Twigs (110)
        const twigGeo = _geo('land_twig_v3', () => {
          const m = new THREE.CylinderGeometry(0.22, 0.40, 12.6, 8, 3).rotateZ(1.52).translate(0, 0.34, 0).toNonIndexed();
          const f1 = new THREE.CylinderGeometry(0.14, 0.24, 5.2, 7).rotateZ(1.48).rotateY(0.56).translate(2.0, 0.40, 1.6);
          const f2 = new THREE.CylinderGeometry(0.13, 0.22, 4.4, 7).rotateZ(1.50).rotateY(-0.52).translate(-1.6, 0.36, -1.3);
          const mrg = _scMerge ? _scMerge([m, f1, f2]) : m;
          return _tintVerts(mrg, (x) => { const s = 0.80 + Math.min(0.22, Math.abs(x) * 0.04); return [s, s * 0.96, s * 0.90]; });
        });
        // 6. Smooth Cupped Fallen Leaf Clusters (160 clusters = ~480 fallen leaves)
        const leafGeo = _geo('land_leaf_v3', () => {
          const mkLeaf = (ox, oz, ry, sc) => {
            const bl = new THREE.PlaneGeometry(2.3 * sc, 3.8 * sc, 4, 6).rotateX(-Math.PI * 0.5).toNonIndexed();
            const pa = bl.attributes.position;
            for (let i = 0; i < pa.count; i++) {
              const lx = pa.getX(i), lz = pa.getZ(i);
              const t = (lz / (1.9 * sc) + 1.0) * 0.5;
              const widthCurve = Math.sin(Math.pow(Math.max(0.02, Math.min(0.98, t)), 0.78) * Math.PI);
              pa.setXYZ(i, lx * widthCurve, Math.abs(lx) * 0.14 + Math.sin(t * Math.PI) * 0.12, lz);
            }
            bl.rotateY(ry); bl.translate(ox, 0.22, oz); bl.computeVertexNormals();
            return _tintVerts(bl, (x) => { const edge = Math.min(1, Math.abs(x) * 0.5); return [0.98 - edge * 0.14, 0.94 - edge * 0.16, 0.86 - edge * 0.18]; });
          };
          const parts = [mkLeaf(0, 0, 0.2, 1.0), mkLeaf(1.8, 1.4, 1.6, 0.82), mkLeaf(-1.6, 1.1, -0.9, 0.88)];
          return _scMerge ? _scMerge(parts) : parts[0];
        });
        // 7. Smooth Mossy Fallen Logs (36)
        const logGeo = _geo('land_log_v3', () => {
          const lg = _scLathe ? _scLathe([[2.6, 0], [3.1, 2.5], [2.85, 11], [2.95, 19], [2.5, 25.5], [2.0, 27]], 14) : new THREE.CylinderGeometry(2.6, 3.2, 27, 12);
          lg.rotateZ(1.54); lg.translate(13.5, 1.6, 0);
          const snag = new THREE.CylinderGeometry(0.55, 1.0, 5.2, 8).rotateZ(-0.55).translate(-2.0, 3.4, 0.8);
          const mrg = _scMerge ? _scMerge([lg, snag]) : lg;
          return _tintVerts(mrg, (_, y) => y > 3.0 ? [0.78, 0.92, 0.70] : [0.76, 0.72, 0.68]);
        });

        // Articulated Animal Cohort Geometries (+Z facing forward, smooth sculpting & independent moving head/limbs/tail/wings!)
        // A. Articulated Cottontail Rabbit (11): body + head/ears + fore/hind legs
        const rabbitBodyGeo = _geo('land_ani_rab_body_v3', () => {
          const torso = _tintVerts(new THREE.SphereGeometry(2.3, 12, 9).scale(0.84, 0.88, 1.32).translate(0, 2.1, -0.3), (_, y) => y > 2.2 ? [0.94, 0.92, 0.90] : [1.06, 1.02, 0.98]);
          const tail = _tintVerts(new THREE.SphereGeometry(0.95, 10, 8).translate(0, 2.2, -3.4), () => [1.22, 1.20, 1.18]);
          return _scMerge ? _scMerge([torso, tail]) : torso;
        });
        const rabbitHeadGeo = _geo('land_ani_rab_head_v3', () => {
          const cranium = _tintVerts(new THREE.SphereGeometry(1.48, 12, 9).scale(0.88, 0.92, 1.14).translate(0, 0.45, 0.65), () => [0.96, 0.94, 0.92]);
          const nose = _tintVerts(new THREE.SphereGeometry(0.36, 8, 6).translate(0, 0.25, 2.25), () => [0.98, 0.72, 0.72]);
          const earL = _tintVerts(new THREE.SphereGeometry(0.44, 9, 8).scale(0.55, 3.4, 0.45).rotateX(-0.22).rotateZ(0.18).translate(-0.52, 2.55, 0.15), () => [0.92, 0.80, 0.78]);
          const earR = _tintVerts(new THREE.SphereGeometry(0.44, 9, 8).scale(0.55, 3.4, 0.45).rotateX(-0.22).rotateZ(-0.18).translate(0.52, 2.55, 0.15), () => [0.92, 0.80, 0.78]);
          return _scMerge ? _scMerge([cranium, nose, earL, earR]) : cranium;
        });
        const rabbitLegFGeo = _geo('land_ani_rab_legf_v3', () => {
          const pL = _tintVerts(new THREE.CylinderGeometry(0.34, 0.24, 1.7, 8).translate(-0.78, -0.85, 0.1), () => [0.94, 0.90, 0.86]);
          const pR = _tintVerts(new THREE.CylinderGeometry(0.34, 0.24, 1.7, 8).translate(0.78, -0.85, 0.1), () => [0.94, 0.90, 0.86]);
          return _scMerge ? _scMerge([pL, pR]) : pL;
        });
        const rabbitLegHGeo = _geo('land_ani_rab_legh_v3', () => {
          const hL = _tintVerts(new THREE.SphereGeometry(0.88, 9, 7).scale(0.65, 1.15, 1.25).translate(-1.05, -0.45, -0.35), () => [0.90, 0.88, 0.84]);
          const hR = _tintVerts(new THREE.SphereGeometry(0.88, 9, 7).scale(0.65, 1.15, 1.25).translate(1.05, -0.45, -0.35), () => [0.90, 0.88, 0.84]);
          return _scMerge ? _scMerge([hL, hR]) : hL;
        });
        // B. Articulated Woodland Fox (8): sculpted torso + head/ears + bushy wagging tail + 4-leg diagonal trot pairs
        const foxBodyGeo = _geo('land_ani_fox_body_v3', () => {
          const raw = _scLathe ? _scLathe([[0.9, -4.2], [1.88, -2.5], [1.62, 0.2], [2.05, 2.6], [1.45, 4.4]], 14) : new THREE.CylinderGeometry(1.8, 2.0, 8.2, 12);
          return _tintVerts(raw.rotateX(Math.PI / 2).translate(0, 3.8, 0), (_, y) => y > 3.8 ? [0.98, 0.94, 0.90] : [1.10, 1.06, 1.0]);
        });
        const foxHeadGeo = _geo('land_ani_fox_head_v3', () => {
          const neck = _tintVerts(new THREE.CylinderGeometry(1.05, 1.45, 2.6, 10).rotateX(0.62).translate(0, 0.35, 0.4), () => [0.98, 0.95, 0.92]);
          const skull = _tintVerts(new THREE.SphereGeometry(1.38, 12, 9).scale(0.92, 0.86, 1.15).translate(0, 1.15, 1.25), () => [0.98, 0.95, 0.92]);
          const snout = _tintVerts(new THREE.CylinderGeometry(0.32, 0.78, 2.0, 10).rotateX(Math.PI * 0.52).translate(0, 0.92, 2.75), () => [0.94, 0.90, 0.86]);
          const nose = _tintVerts(new THREE.SphereGeometry(0.24, 7, 5).translate(0, 0.88, 3.75), () => [0.18, 0.16, 0.16]);
          const earL = _tintVerts(new THREE.ConeGeometry(0.52, 1.5, 8).scale(0.85, 1, 0.55).translate(-0.78, 2.45, 0.95), () => [0.36, 0.30, 0.28]);
          const earR = _tintVerts(new THREE.ConeGeometry(0.52, 1.5, 8).scale(0.85, 1, 0.55).translate(0.78, 2.45, 0.95), () => [0.36, 0.30, 0.28]);
          return _scMerge ? _scMerge([neck, skull, snout, nose, earL, earR]) : skull;
        });
        const foxTailGeo = _geo('land_ani_fox_tail_v3', () => {
          const tRaw = _scLathe ? _scLathe([[0.45, 0], [1.18, -2.2], [1.05, -4.6], [0.22, -6.6]], 12) : new THREE.ConeGeometry(1.1, 6.4, 10).rotateX(-Math.PI * 0.5).translate(0, 0, -3.2);
          if (_scLathe) tRaw.rotateX(-Math.PI * 0.5);
          return _tintVerts(tRaw, (_, __, z) => z < -4.5 ? [1.22, 1.20, 1.16] : [0.96, 0.92, 0.88]);
        });
        const _mkFoxLegPairGeo = (sideA) => _geo(`land_ani_fox_legs_${sideA ? 'a' : 'b'}_v3`, () => {
          const fX = sideA ? -1.05 : 1.05, bX = -fX;
          const lf = _tintVerts(new THREE.CylinderGeometry(0.42, 0.28, 3.4, 9).translate(fX, -1.7, 2.45), () => [0.36, 0.32, 0.30]);
          const lb = _tintVerts(new THREE.CylinderGeometry(0.48, 0.28, 3.4, 9).translate(bX, -1.7, -2.55), () => [0.36, 0.32, 0.30]);
          return _scMerge ? _scMerge([lf, lb]) : lf;
        });
        const foxLegAGeo = _mkFoxLegPairGeo(true), foxLegBGeo = _mkFoxLegPairGeo(false);

        // C. Articulated Real-Silhouette Soaring/Pecking Birds (16): aerodynamic chest/rump + fanned tail + articulated head/beak + cambered swept wings (NOT books!)
        const birdBodyGeo = _geo('land_ani_bird_body_v4', () => {
          const raw = _scLathe ? _scLathe([[0.18, -2.2], [0.76, -0.8], [0.94, 0.3], [0.72, 1.4], [0.22, 1.9]], 12) : new THREE.SphereGeometry(0.92, 12, 9).scale(0.85, 0.85, 2.0);
          if (_scLathe) raw.rotateX(Math.PI / 2);
          const torso = _tintVerts(raw, (_, y) => y > 0 ? [0.90, 0.88, 0.86] : [1.08, 1.04, 0.98]);
          // Fanned multi-feather swallowtail/raptor tail plane
          const tail = new THREE.PlaneGeometry(2.5, 2.6, 4, 2).rotateX(-Math.PI * 0.5).toNonIndexed();
          const tp = tail.attributes.position;
          for (let i = 0; i < tp.count; i++) {
            const tx = tp.getX(i), tz = tp.getZ(i);
            const tBack = (1.3 - tz) / 2.6; // 0 at base (z=+1.3), 1 at tip (z=-1.3)
            const fan = 0.28 + 0.85 * tBack;
            const notch = (1.0 - Math.abs(tx) / 1.25) * 0.42 * tBack;
            tp.setXYZ(i, tx * fan, tBack * 0.26, tz - 2.6 + notch);
          }
          tail.computeVertexNormals();
          _tintVerts(tail, () => [0.74, 0.72, 0.70]);
          const feet = _tintVerts(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 6).rotateX(-0.35).translate(0, -0.85, -0.35), () => [0.84, 0.64, 0.30]);
          return _scMerge ? _scMerge([torso, tail, feet]) : torso;
        });
        const birdHeadGeo = _geo('land_ani_bird_head_v4', () => {
          const neck = _tintVerts(new THREE.CylinderGeometry(0.42, 0.58, 0.95, 10).rotateX(0.35).translate(0, 0.25, 0.15), () => [0.94, 0.90, 0.86]);
          const cranium = _tintVerts(new THREE.SphereGeometry(0.58, 11, 9).scale(0.92, 0.92, 1.10).translate(0, 0.68, 0.42), () => [0.95, 0.92, 0.88]);
          const beak = _tintVerts(new THREE.ConeGeometry(0.18, 0.88, 8).rotateX(Math.PI * 0.52).translate(0, 0.58, 1.26), () => [0.98, 0.76, 0.28]);
          return _scMerge ? _scMerge([neck, cranium, beak]) : cranium;
        });
        const _mkBirdWingGeo = (sideSign) => _geo(`land_ani_bird_w_${sideSign > 0 ? 'r' : 'l'}_v4`, () => {
          const wg = new THREE.PlaneGeometry(6.8, 2.35, 8, 3).rotateX(-Math.PI * 0.5).toNonIndexed();
          const wp = wg.attributes.position;
          for (let i = 0; i < wp.count; i++) {
            const xBase = wp.getX(i) + 3.4; // 0..6.8 root to tip
            const u = Math.max(0, Math.min(1, xBase / 6.8));
            const vCord = wp.getZ(i) / 1.175; // +1 leading edge .. -1 trailing edge
            // Swept gull/falcon leading edge: bows forward smoothly toward wrist (u~0.35), sweeps back to sleek tip
            const leadZ = 0.85 + Math.sin(u * Math.PI * 0.82) * 0.55 - Math.pow(u, 1.7) * 2.05;
            const chord = 2.25 * (1.0 - Math.pow(u, 1.45) * 0.82);
            const zNew = leadZ - (1.0 - vCord) * 0.5 * chord;
            const dihedralY = Math.sin(u * Math.PI * 0.78) * 0.42 - u * 0.15;
            const camberY = Math.sin(((vCord + 1) * 0.5) * Math.PI) * 0.24 * (1 - u * 0.55);
            wp.setXYZ(i, xBase * sideSign, dihedralY + camberY, zNew);
          }
          wg.computeVertexNormals();
          return _tintVerts(wg, (x, _, z) => { const tip = Math.min(1, Math.abs(x) / 6.8); return [0.98 - tip * 0.24, 0.96 - tip * 0.24, 0.92 - tip * 0.20]; });
        });
        const birdWingLGeo = _mkBirdWingGeo(-1), birdWingRGeo = _mkBirdWingGeo(1);

        // D. Smooth Scalloped Swallowtail/Monarch Butterflies (18, curved shapes rather than rectangular book-boxes)
        const bflyBodyGeo = _geo('land_ani_bfly_body_v4', () => {
          const b = _tintVerts(new THREE.CylinderGeometry(0.16, 0.11, 2.1, 8).rotateX(Math.PI / 2), () => [0.22, 0.20, 0.20]);
          const antL = _tintVerts(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 5).rotateX(-0.5).rotateZ(0.32).translate(-0.18, 0.35, 1.15), () => [0.22, 0.20, 0.20]);
          const antR = _tintVerts(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 5).rotateX(-0.5).rotateZ(-0.32).translate(0.18, 0.35, 1.15), () => [0.22, 0.20, 0.20]);
          return _scMerge ? _scMerge([b, antL, antR]) : b;
        });
        const _mkBflyWingGeo = (sideSign) => _geo(`land_ani_bfly_w_${sideSign > 0 ? 'r' : 'l'}_v4`, () => {
          const sh = new THREE.Shape();
          sh.moveTo(0, 0.25);
          sh.bezierCurveTo(sideSign * 0.9, 1.55, sideSign * 2.45, 1.45, sideSign * 2.25, 0.35);
          sh.bezierCurveTo(sideSign * 2.15, -0.15, sideSign * 1.45, -0.15, sideSign * 1.15, -0.30);
          sh.bezierCurveTo(sideSign * 1.65, -0.65, sideSign * 1.40, -1.45, sideSign * 0.72, -1.55);
          sh.bezierCurveTo(sideSign * 0.35, -1.25, sideSign * 0.12, -0.75, 0, -0.35);
          sh.closePath();
          const wg = new THREE.ShapeGeometry(sh, 10).rotateX(-Math.PI * 0.5).toNonIndexed();
          wg.computeVertexNormals();
          return _tintVerts(wg, (x) => { const edge = Math.min(1, Math.abs(x) / 2.25); return [1.0 - edge * 0.16, 0.98 - edge * 0.14, 0.96 - edge * 0.10]; });
        });
        const bflyWingLGeo = _mkBflyWingGeo(-1), bflyWingRGeo = _mkBflyWingGeo(1);

        const flowerCols = isSnowBiome ? [0x82b4ff, 0xc792ea, 0xe6ecf5, 0x64dfdf, 0xff9ebb] : [0xf94144, 0xf9c74f, 0x277da1, 0x9b5de5, 0xf15bb5, 0x00bbf9, 0xf3722c, 0xffe66d];
        const fernCols = isSnowBiome ? [0x6e9088, 0x84a49c, 0x5e7d78] : [0x3d8c45, 0x68a347, 0x8ea646, 0x2f7443, 0x529258];
        const shroomCols = [0xe63946, 0xffb703, 0x4cc9f0, 0xb5179e, 0x80ed99, 0xe8d5b7];
        const woodScatterCols = [0x8c6442, 0x6c4e36, 0xa27e56, 0x787266, 0x5c422c];
        const leafCols = isSnowBiome ? [0x8c7256, 0x747e6c, 0xa29078] : [0xc84b31, 0xe08d38, 0xb0723e, 0x6ea042, 0x9e3b33, 0xd8b242];

        const flStemMat = _fMat('land_fl_stem_mat_v1', { color: 0xb6c6a4, pbrKind: 'foliage', roughness: 0.84, sheen: 0.45, vertexColors: true });
        const flBloomMat = _fMat('land_fl_bloom_mat_v1', { color: 0xf4f0ea, pbrKind: 'cloth', roughness: 0.54, sheen: 0.78, vertexColors: true });
        const fernMat = _fMat('land_fern_mat_v1', { color: 0xc8d4b2, pbrKind: 'foliage', roughness: 0.82, sheen: 0.56, vertexColors: true });
        const shroomMat = _mat('land_shroom_mat_v2', () => new THREE.MeshStandardMaterial({ color: 0xeae4dc, roughness: 0.56, emissive: 0x182630, emissiveIntensity: 0.28, vertexColors: true }));
        const woodObjMat = _fMat('land_wood_obj_mat_v1', { color: 0xb4a490, pbrKind: 'wood', roughness: 0.86, vertexColors: true });
        const leafMat = _fMat('land_leaf_mat_v1', { color: 0xdad2c4, pbrKind: 'cloth', roughness: 0.74, sheen: 0.48, side: THREE.DoubleSide, vertexColors: true });

        const _scatterStatic = (geo, mat, count, cols, minR, maxR, scMin, scMax, opts = {}) => {
          const im = new THREE.InstancedMesh(geo, mat, count);
          const dum = new THREE.Object3D(), cTmp = new THREE.Color();
          let placed = 0;
          for (let attempt = 0; attempt < count * 8 && placed < count; attempt++) {
            const hh = (((attempt + 1) * 2654435761 + seedNum * 193 + count * 17) >>> 0);
            const ang = ((hh % 6283) * 0.001);
            const closeZone = ((hh >> 4) % 100) < 68;
            const zoneMax = closeZone ? Math.min(maxR, 760) : maxR;
            const rad = minR + ((hh >> 6) % Math.max(10, zoneMax - minR));
            const sx = Math.cos(ang) * rad, sz = Math.sin(ang) * rad;
            if (Math.abs(sx) < 48 || Math.abs(sz) < 48) continue;
            if (opts.skipCenter && Math.hypot(sx, sz) < opts.skipCenter) continue;
            const rawGroundY = getTerrainHeight(sx, sz);
            if (isHardTerrainAt(sx, sz, rawGroundY)) continue;
            const sy = rawGroundY + (opts.yOff || 0);
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

        // Halved & Articulated Outdoor Animal Cohorts (11 Rabbits, 8 Foxes, 16 Birds, 18 Butterflies) + Fire-Breathing Sky Dragon
        const _outdoorFauna = [];
        const _spawnArticulatedFliers = (kind, bodyGeo, wLGeo, wRGeo, headGeo, mat, count, cols, scMin, scMax, perches) => {
          const bInst = new THREE.InstancedMesh(bodyGeo, mat, count);
          const wlInst = new THREE.InstancedMesh(wLGeo, mat, count);
          const wrInst = new THREE.InstancedMesh(wRGeo, mat, count);
          const hInst = headGeo ? new THREE.InstancedMesh(headGeo, mat, count) : null;
          [bInst, wlInst, wrInst, hInst].filter(Boolean).forEach(im => {
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
            const startPerched = (i % 10) < 3;
            const sc = scMin + (((h >> 12) % 100) * 0.01) * (scMax - scMin);
            const isBfly = kind === 'butterfly';
            const altOff = isBfly ? (flowerSpots.length ? 7.8 * (p0.sc || 1) : 4.5) : 0;
            const sx = startPerched ? p0.x : p0.x + Math.cos(i) * (isBfly ? 22 : 140);
            const sz = startPerched ? p0.z : p0.z + Math.sin(i) * (isBfly ? 22 : 140);
            const sy = startPerched ? (p0.y + altOff) : (p0.y + (isBfly ? 4 + (h % 7) : 42 + (h % 75)));
            items.push({
              x: sx, y: sy, z: sz,
              vx: 0, vz: 0, yaw: (h % 628) * 0.01,
              state: startPerched ? 'perched' : 'fly',
              timer: startPerched ? (2.0 + (h % 5)) : (3.0 + (h % 6)),
              tx: pTarget.x, ty: pTarget.y + (isBfly ? 7.8 * (pTarget.sc || 1) : 0), tz: pTarget.z,
              targetKind: pTarget.kind || 'flower',
              perchKind: p0.kind || 'flower',
              cruiseAlt: isBfly ? (4 + (h % 8)) : (36 + (h % 68)),
              speed: isBfly ? (18 + (h % 14)) : (62 + (h % 38)),
              sc, phase: (h % 100) * 0.1,
              nextTurnAt: 0.8 + (h % 20) * 0.1,
            });
            cTmp.setHex(cols[(h >> 3) % cols.length]);
            bInst.setColorAt(i, cTmp); wlInst.setColorAt(i, cTmp); wrInst.setColorAt(i, cTmp);
            if (hInst) hInst.setColorAt(i, cTmp);
          }
          [bInst, wlInst, wrInst, hInst].filter(Boolean).forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; staticGrp.add(im); });
          _outdoorFauna.push({ kind, inst: bInst, wingL: wlInst, wingR: wrInst, head: hInst, items, perches });
        };

        const _spawnArticulatedGround = (kind, partGeos, mat, count, cols, rMin, rMax, scMin, scMax) => {
          const mkIM = g => {
            const im = new THREE.InstancedMesh(g, mat, count);
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            im.castShadow = true; im.receiveShadow = true;
            im.frustumCulled = false; im.userData.isDynamic = true;
            return im;
          };
          const bInst = mkIM(partGeos.body);
          const partInsts = {};
          for (const [pk, pg] of Object.entries(partGeos)) {
            if (pk !== 'body' && pg) partInsts[pk] = mkIM(pg);
          }
          const items = [], cTmp = new THREE.Color();
          const allInsts = [bInst, ...Object.values(partInsts)];
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
            allInsts.forEach(im => im.setColorAt(i, cTmp));
          }
          allInsts.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; staticGrp.add(im); });
          _outdoorFauna.push({ kind, inst: bInst, parts: partInsts, items });
        };

        const _buildSkyDragon = () => {
          const dRoot = new THREE.Group();
          dRoot.userData.isDynamic = true;
          dRoot.userData.mountCommand = 'sky_dragon';
          dRoot.userData.hoverInfo = {
            name: 'Ignis-Vael, Sky Dragon',
            tag: 'Mountable',
            tagClass: 'tag-character',
            detail: "Ancient fire-breathing drake — Click or type 'mount dragon' to ride & unleash fire!",
          };
          const dHitbox = new THREE.Mesh(
            new THREE.SphereGeometry(14, 10, 8),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          dHitbox.position.set(0, 1.5, 1.5);
          dRoot.add(dHitbox);
          const scaleMat = _fMat('sky_dragon_scale_v2', { color: 0xb8241e, pbrKind: 'leather', roughness: 0.38, metalness: 0.28, sheen: 0.5, vertexColors: true });
          const bellyMat = _fMat('sky_dragon_belly_v2', { color: 0xeba834, pbrKind: 'leather', roughness: 0.44, metalness: 0.26, vertexColors: true });
          const hornMat = _fMat('sky_dragon_horn_v2', { color: 0x2e1f3a, pbrKind: 'stone', roughness: 0.38, metalness: 0.22 });
          const wingMemMat = _fMat('sky_dragon_wing_v2', { color: 0xe05224, pbrKind: 'cloth', roughness: 0.50, emissive: 0x3b0f05, emissiveIntensity: 0.35, side: THREE.DoubleSide, vertexColors: true });
          const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
          const throatMat = new THREE.MeshBasicMaterial({ color: 0xff9220 });

          const torsoGeo = _scLathe
            ? _scLathe([[1.8, -11], [4.6, -4], [5.8, 3], [5.0, 9], [2.4, 12]], 14).rotateX(Math.PI * 0.5)
            : new THREE.CylinderGeometry(3.8, 4.8, 22, 12).rotateX(Math.PI * 0.5);
          _tintVerts(torsoGeo, (_, y) => y < 0 ? [0.95, 0.72, 0.42] : [0.92, 0.86, 0.84]);
          const torsoM = new THREE.Mesh(torsoGeo, scaleMat);
          torsoM.scale.set(0.88, 0.92, 1.0); torsoM.castShadow = true;
          dRoot.add(torsoM);

          const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 8).scale(0.82, 0.75, 1.55), bellyMat);
          chestPlate.position.set(0, -1.6, 2.5);
          dRoot.add(chestPlate);

          for (let si = 0; si < 5; si++) {
            const sp = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 6), hornMat);
            sp.position.set(0, 4.6 - Math.abs(si - 2) * 0.35, 6.5 - si * 3.8);
            sp.rotation.x = -0.45; dRoot.add(sp);
          }

          // Sinuous 2-joint neck + horned skull + articulated fire jaw
          const neck0 = new THREE.Group(); neck0.position.set(0, 1.4, 10.2);
          const n0M = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.9, 9.0, 12).rotateX(Math.PI * 0.5).translate(0, 0, 4.2), scaleMat);
          neck0.add(n0M);
          const neck1 = new THREE.Group(); neck1.position.set(0, 0.8, 8.2);
          const n1M = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.25, 8.0, 12).rotateX(Math.PI * 0.5).translate(0, 0, 3.8), scaleMat);
          neck1.add(n1M);
          const headGrp = new THREE.Group(); headGrp.position.set(0, 0.4, 7.6);
          const cranium = new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 9).scale(0.95, 0.82, 1.45), scaleMat);
          cranium.position.set(0, 0.6, 1.5);
          const upperJaw = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.75, 4.8, 10).rotateX(Math.PI * 0.5), scaleMat);
          upperJaw.scale.set(0.95, 0.65, 1.0); upperJaw.position.set(0, 0.35, 4.4);
          headGrp.add(cranium, upperJaw);
          [-1, 1].forEach(s => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.58, 6.8, 8).rotateX(-1.12).rotateZ(-s * 0.35), hornMat);
            horn.position.set(s * 1.45, 2.2, -1.6); headGrp.add(horn);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), eyeMat);
            eye.position.set(s * 1.38, 1.05, 3.0); headGrp.add(eye);
          });
          const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.35, 1.6);
          const lowerJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.35, 4.2, 8).rotateX(Math.PI * 0.5), bellyMat);
          lowerJaw.scale.set(0.92, 0.52, 1.0); lowerJaw.position.set(0, -0.35, 2.4);
          const throatCore = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), throatMat);
          throatCore.position.set(0, 0.1, 1.5); throatCore.visible = false;
          const mouthEmit = new THREE.Object3D(); mouthEmit.position.set(0, 0.1, 4.5);
          const fireLight = new THREE.PointLight(0xff7220, 0, 440, 1.2);
          fireLight.position.set(0, -1.2, 5.5);
          jawPivot.add(lowerJaw, throatCore);
          headGrp.add(jawPivot, mouthEmit, fireLight);
          neck1.add(headGrp); neck0.add(neck1); dRoot.add(neck0);

          // 3-segment sinuous whip tail + spade fin
          const tailSegs = [];
          let tParent = dRoot;
          for (let ti = 0; ti < 3; ti++) {
            const tp = new THREE.Group();
            tp.position.set(0, ti === 0 ? 0.6 : 0, ti === 0 ? -10.5 : -9.2);
            const r1 = 2.1 - ti * 0.55, r2 = 1.5 - ti * 0.50;
            const tm = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 9.6, 10).rotateX(Math.PI * 0.5).translate(0, 0, -4.6), scaleMat);
            tp.add(tm);
            if (ti === 2) {
              const finSh = new THREE.Shape();
              finSh.moveTo(0, 0); finSh.quadraticCurveTo(3.2, -1.8, 0.4, -5.8); finSh.lineTo(0, -4.8);
              finSh.lineTo(-0.4, -5.8); finSh.quadraticCurveTo(-3.2, -1.8, 0, 0);
              const finM = new THREE.Mesh(new THREE.ShapeGeometry(finSh, 8).rotateX(-Math.PI * 0.5), wingMemMat);
              finM.position.set(0, 0.1, -8.5); tp.add(finM);
            }
            tParent.add(tp); tailSegs.push(tp); tParent = tp;
          }

          // Huge 2-joint swept bat-wings (~82u wingspan)
          const _mkDragonWing = (s) => {
            const wIn = new THREE.Group(); wIn.position.set(s * 3.8, 2.6, 4.0);
            const sparIn = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 17.5, 8).rotateZ(s * Math.PI * 0.5).translate(s * 8.6, 0, 0.6), scaleMat);
            const mInSh = new THREE.Shape();
            mInSh.moveTo(0, 0.6); mInSh.lineTo(s * 17.2, 1.4); mInSh.lineTo(s * 16.5, -10.5);
            mInSh.quadraticCurveTo(s * 8.0, -7.2, 0, -10.8); mInSh.closePath();
            const mInG = new THREE.ShapeGeometry(mInSh, 8).rotateX(-Math.PI * 0.5).toNonIndexed();
            _tintVerts(mInG, x => { const u = Math.min(1, Math.abs(x) / 18); return [0.95 - u * 0.15, 0.72 + u * 0.08, 0.62]; });
            const mIn = new THREE.Mesh(mInG, wingMemMat);
            wIn.add(sparIn, mIn);

            const wOut = new THREE.Group(); wOut.position.set(s * 17.0, 0, 1.2);
            const spur = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.8, 6).rotateX(Math.PI * 0.5), hornMat);
            spur.position.set(0, 0.2, 1.6); wOut.add(spur);
            const leadSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.72, 24.5, 8).rotateZ(s * Math.PI * 0.5).rotateY(s * -0.22).translate(s * 11.8, 0, -2.5), scaleMat);
            wOut.add(leadSpar);
            const mOutSh = new THREE.Shape();
            mOutSh.moveTo(0, 0.4); mOutSh.lineTo(s * 23.8, -5.2);
            mOutSh.quadraticCurveTo(s * 16.5, -10.5, s * 11.5, -14.8);
            mOutSh.quadraticCurveTo(s * 6.5, -10.5, 0, -11.5); mOutSh.closePath();
            const mOutG = new THREE.ShapeGeometry(mOutSh, 10).rotateX(-Math.PI * 0.5).toNonIndexed();
            _tintVerts(mOutG, x => { const u = Math.min(1, Math.abs(x) / 24); return [0.98 - u * 0.22, 0.76 - u * 0.10, 0.64]; });
            const mOut = new THREE.Mesh(mOutG, wingMemMat);
            wOut.add(mOut); wIn.add(wOut); dRoot.add(wIn);
            return { wIn, wOut };
          };
          const wL = _mkDragonWing(-1), wR = _mkDragonWing(1);

          // 4 Articulated clawed legs
          const dLegs = [[-3.2, 5.2], [3.2, 5.2], [-3.0, -5.4], [3.0, -5.4]].map(([lx, lz]) => {
            const lp = new THREE.Group(); lp.position.set(lx, -2.4, lz);
            const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.48, 5.8, 8).rotateX(-0.55).translate(0, -2.2, -1.2), scaleMat);
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 6).rotateX(-0.85).translate(0, -4.6, -2.4), hornMat);
            lp.add(lm, claw); dRoot.add(lp); return lp;
          });

          // Fire Breath Instanced Particle Pool (56 additive glow puffs)
          const fireCount = 56;
          const fireGeo = new THREE.IcosahedronGeometry(1.15, 1);
          const fireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false });
          const fireInst = new THREE.InstancedMesh(fireGeo, fireMat, fireCount);
          fireInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          fireInst.frustumCulled = false; fireInst.userData.isDynamic = true;
          const fireParts = [], fZero = new THREE.Matrix4().makeScale(0, 0, 0);
          for (let fi = 0; fi < fireCount; fi++) {
            fireInst.setMatrixAt(fi, fZero);
            fireInst.setColorAt(fi, new THREE.Color(0xff9a24));
            fireParts.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.9 });
          }
          if (fireInst.instanceColor) fireInst.instanceColor.needsUpdate = true;

          // Persistent Multi-Layer Fire Burning + Billowing Rising Smoke System (pooled zero-alloc)
          const maxSites = 8, flameCount = 96, smokeCount = 112;
          const emberGeo = new THREE.CylinderGeometry(1.0, 1.15, 0.35, 16);
          const emberMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false });
          const emberInst = new THREE.InstancedMesh(emberGeo, emberMat, maxSites);
          emberInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); emberInst.frustumCulled = false; emberInst.userData.isDynamic = true;

          const flameGeo = (window._sculptHelpers && window._sculptHelpers.flame)
            ? window._sculptHelpers.flame(1.0, 2.75, 5) : new THREE.ConeGeometry(0.95, 3.0, 7).translate(0, 1.4, 0);
          const flameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.90, blending: THREE.AdditiveBlending, depthWrite: false });
          const flameInst = new THREE.InstancedMesh(flameGeo, flameMat, flameCount);
          flameInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); flameInst.frustumCulled = false; flameInst.userData.isDynamic = true;

          const smokeGeo = new THREE.IcosahedronGeometry(1.35, 1);
          const smokeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0.0, transparent: true, opacity: 0.44, depthWrite: false });
          const smokeInst = new THREE.InstancedMesh(smokeGeo, smokeMat, smokeCount);
          smokeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); smokeInst.frustumCulled = false; smokeInst.userData.isDynamic = true;

          const fireSites = [];
          for (let si = 0; si < maxSites; si++) {
            emberInst.setMatrixAt(si, fZero);
            emberInst.setColorAt(si, new THREE.Color(0x2a140a));
            fireSites.push({ active: false, x: 0, y: 0, z: 0, age: 0, life: 18, radius: 14 });
          }
          const siteFlames = Array.from({ length: flameCount }, (_, i) => ({ phase: i * 1.37, ox: Math.cos(i * 2.4) * 0.65, oz: Math.sin(i * 2.4) * 0.65 }));
          const smokeParts = Array.from({ length: smokeCount }, () => { return { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 3.2, sc: 1 }; });
          for (let fi = 0; fi < flameCount; fi++) { flameInst.setMatrixAt(fi, fZero); flameInst.setColorAt(fi, new THREE.Color(0xff9224)); }
          for (let sm = 0; sm < smokeCount; sm++) { smokeInst.setMatrixAt(sm, fZero); smokeInst.setColorAt(sm, new THREE.Color(0x464a52)); }
          [emberInst, flameInst, smokeInst].forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; });
          const burnLight = new THREE.PointLight(0xff7420, 0, 320, 1.25);

          staticGrp.add(dRoot, fireInst, emberInst, flameInst, smokeInst, burnLight);
          return {
            root: dRoot, neck0, neck1, headGrp, jawPivot, throatCore, mouthEmit, fireLight, tailSegs, wL, wR, dLegs,
            fireInst, fireParts, fireIdx: 0, emitAcc: 0, t: (seedNum % 628) * 0.01,
            mode: 'soar', modeTimer: 0, cycleTime: 0, forcedBreathUntil: 0,
            posX: 0, posY: 145, posZ: 0, yaw: 0, landX: -145, landZ: 120,
            emberInst, flameInst, smokeInst, fireSites, siteFlames, smokeParts, smokeIdx: 0, smokeAcc: 0, burnLight,
          };
        };

        const rabCols = isSnowBiome ? [0xe8e6e2, 0xcad0d6, 0xb8a898] : [0x9c7656, 0x86847e, 0xc2a278, 0x76563c, 0xd4cec4];
        const foxCols = isSnowBiome ? [0xe4e8f0, 0xb8bec6, 0xc8a47c] : [0xd95f24, 0x8c8682, 0xe88d34, 0x6e442c];
        const birdCols = [0x3b82f6, 0xc95a38, 0xf3ba2f, 0x38bdf8, 0x8b5cf6, 0x475569];
        const bflyCols = [0xff7b25, 0x00bbf9, 0xfee440, 0xf15bb5, 0x9b5de5, 0x80ed99];
        const bflyPerches = flowerSpots.length ? flowerSpots : birdPerches;
        _spawnArticulatedGround('rabbit', { body: rabbitBodyGeo, head: rabbitHeadGeo, legF: rabbitLegFGeo, legH: rabbitLegHGeo }, _fMat('land_rab_mat_v2', { color: 0xe6ddd4, pbrKind: 'fur', roughness: 0.82, sheen: 0.74, vertexColors: true }), 11, rabCols, 145, 920, 0.78, 1.25);
        _spawnArticulatedGround('fox', { body: foxBodyGeo, head: foxHeadGeo, tail: foxTailGeo, legA: foxLegAGeo, legB: foxLegBGeo }, _fMat('land_fox_mat_v2', { color: 0xe6dcd2, pbrKind: 'fur', roughness: 0.78, sheen: 0.76, vertexColors: true }), 8, foxCols, 165, 1100, 0.80, 1.22);
        _spawnArticulatedFliers('bird', birdBodyGeo, birdWingLGeo, birdWingRGeo, birdHeadGeo, _fMat('land_bird_mat_v2', { color: 0xdcdad4, pbrKind: 'cloth', roughness: 0.74, sheen: 0.55, side: THREE.DoubleSide, vertexColors: true }), 16, birdCols, 0.92, 1.42, birdPerches);
        _spawnArticulatedFliers('butterfly', bflyBodyGeo, bflyWingLGeo, bflyWingRGeo, null, _fMat('land_bfly_mat_v2', { color: 0xf8f4ee, pbrKind: 'crystal', roughness: 0.30, side: THREE.DoubleSide, vertexColors: true }), 18, bflyCols, 0.70, 1.25, bflyPerches);

        // 4 Climbable 3D Wooden Lookout Ladders around the valley
        const climbableLadders = [];
        const _ladWood = _fMat('lad_wood_mat_v1', { color: 0x8c5c34, pbrKind: 'wood', roughness: 0.82 });
        const _ladTrim = _fMat('lad_brass_mat_v1', { color: 0xd9a83e, pbrKind: 'metal', roughness: 0.34, metalness: 0.82 });
        const _ladRailGeo = _geo('lad_rail_v1', () => new THREE.CylinderGeometry(0.45, 0.52, 46, 8));
        const _ladRungGeo = _geo('lad_rung_v1', () => new THREE.CylinderGeometry(0.32, 0.32, 8.6, 8).rotateZ(Math.PI * 0.5));
        const _ladCapGeo = _geo('lad_cap_v1', () => new THREE.SphereGeometry(0.72, 8, 6));
        [[142, 118, -0.5], [178, 134, -0.4], [-182, 138, 0.5], [195, -148, -2.4], [-158, -162, 2.5]].forEach(([lx, lz, lYaw], li) => {
          const gy = getTerrainHeight(lx, lz);
          if (li > 0 && hasHardRoomCenter && Math.hypot(lx / (W * 0.5), lz / (H * 0.5)) < 0.85) return;
          const lg = new THREE.Group();
          lg.position.set(lx, gy, lz);
          lg.rotation.set(0.08, lYaw, 0);
          [-3.8, 3.8].forEach(rx => {
            const rail = new THREE.Mesh(_ladRailGeo, _ladWood); rail.position.set(rx, 23, 0); rail.castShadow = true; lg.add(rail);
            const cap = new THREE.Mesh(_ladCapGeo, _ladTrim); cap.position.set(rx, 46.2, 0); lg.add(cap);
          });
          for (let ri = 0; ri < 9; ri++) {
            const rung = new THREE.Mesh(_ladRungGeo, ri % 3 === 0 ? _ladTrim : _ladWood);
            rung.position.set(0, 4.5 + ri * 4.8, 0); rung.castShadow = true; lg.add(rung);
          }
          lg.userData.hoverInfo = { name: `Timber Lookout Ladder #${li + 1}`, tag: 'Climbable', tagClass: 'tag-obstacle', detail: "Use action 'Climb Nearest Ladder' or type 'climb ladder' to ascend!" };
          staticGrp.add(lg);
          climbableLadders.push({ x: lx, y: gy, z: lz, topY: gy + 45, yaw: lYaw });
        });
        staticGrp.userData.ladders = climbableLadders;
        window.__climbableLadders = climbableLadders;

        const _skyDragon = _buildSkyDragon();

        const _faunaState = { cohorts: _outdoorFauna, dragon: _skyDragon, getTerrainHeight };
        staticGrp.userData.outdoorFaunaState = _faunaState;
        window.__outdoorFaunaState = _faunaState;
        {
          const _fDum = new THREE.Object3D(), _wDum = new THREE.Object3D(), _wMat = new THREE.Matrix4();
          const _dPos = new THREE.Vector3(), _dDir = new THREE.Vector3(), _dQuat = new THREE.Quaternion(), _dCol = new THREE.Color();
          const _pickNextPerch = (a, ch, isBfly) => {
            const pArr = ch.perches;
            const pick = pArr[Math.floor((a.phase * 137.5 + performance.now() * 0.017) % pArr.length)] || pArr[0];
            a.tx = pick.x + ((isBfly || pick.kind === 'ground') ? 0 : (Math.sin(a.phase * 5) * 3));
            a.tz = pick.z + ((isBfly || pick.kind === 'ground') ? 0 : (Math.cos(a.phase * 7) * 3));
            a.ty = pick.y + (isBfly ? 7.8 * (pick.sc || 1) : 0);
            a.targetKind = pick.kind || 'flower';
          };
          const _setPart = (im, i, px, py, pz, rx, ry, rz) => {
            _wDum.position.set(px, py, pz);
            _wDum.rotation.set(rx, ry, rz);
            _wDum.scale.setScalar(1);
            _wDum.updateMatrix();
            _wMat.multiplyMatrices(_fDum.matrix, _wDum.matrix);
            im.setMatrixAt(i, _wMat);
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
                    if (startled && pWorld) a.yaw = Math.atan2(a.x - pWorld.x, a.z - pWorld.z);
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

                  let rx = 0, rz = 0, wFlap = 0, wFoldY = 0, wDropZ = 0, hPitch = 0, hYaw = 0;
                  if (a.state === 'perched') {
                    a.x = a.tx; a.y = a.ty; a.z = a.tz;
                    if (isBfly) {
                      wFlap = 0.28 + Math.sin(p * 2.2) * 0.22;
                    } else {
                      wFoldY = 1.18; wDropZ = 0.55; wFlap = -0.35;
                      a.nextTurnAt -= dtSec;
                      if (a.nextTurnAt <= 0) {
                        a.nextTurnAt = 0.9 + ((i * 7) % 13) * 0.12;
                        a.yaw += (Math.sin(p * 3.7) * 0.85);
                      }
                      hYaw = Math.sin(p * 3.1) * 0.55;
                      if (a.perchKind === 'ground' || a.perchKind === 'log' || a.perchKind === 'rock') {
                        const cycle = p % 2.4;
                        if (cycle < 0.45) {
                          hPitch = Math.abs(Math.sin(cycle * Math.PI * 4.4)) * 0.72;
                          rx = hPitch * 0.35;
                        } else if (a.perchKind === 'ground' && cycle > 1.3 && cycle < 1.75) {
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
                      : Math.max((st.getTerrainHeight ? st.getTerrainHeight(a.x, a.z) : 0) + (isBfly ? 4 : 24), a.ty + a.cruiseAlt + (isBfly ? Math.sin(p * 3.0) * 2.5 : Math.sin(p * 0.9) * 8));
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
                      const glideCycle = (p * 0.35 + i * 0.4) % 1.0;
                      const isGliding = a.state === 'fly' && glideCycle > 0.58;
                      wFlap = a.state === 'takeoff'
                        ? Math.sin(p * 17.5) * 0.82 + 0.12
                        : isGliding ? (0.12 + Math.sin(p * 2.0) * 0.04) : (Math.sin(p * 12.0) * 0.65 + 0.08);
                      rx = a.state === 'takeoff' ? -0.34 : (a.state === 'land' ? -0.26 : Math.max(-0.22, Math.min(0.22, (a.y - tgtY) * 0.015)));
                      rz = Math.max(-0.45, Math.min(0.45, -turnAmt * 12.0));
                      hPitch = -rx * 0.55; hYaw = Math.sin(p * 1.4) * 0.18;
                    }
                  }
                  _fDum.position.set(a.x, a.y, a.z);
                  _fDum.rotation.set(rx, a.yaw, rz);
                  _fDum.scale.setScalar(a.sc);
                  _fDum.updateMatrix();
                  inst.setMatrixAt(i, _fDum.matrix);
                  if (ch.head) _setPart(ch.head, i, 0, 0.35, 1.45, hPitch, hYaw, 0);
                  const syOff = isBfly ? 0.05 : 0.32;
                  _setPart(ch.wingL, i, 0, syOff, 0.18, -wDropZ * 0.35, -wFoldY, -wFlap);
                  _setPart(ch.wingR, i, 0, syOff, 0.18, -wDropZ * 0.35, wFoldY, wFlap);
                }
                inst.instanceMatrix.needsUpdate = true;
                ch.wingL.instanceMatrix.needsUpdate = true;
                ch.wingR.instanceMatrix.needsUpdate = true;
                if (ch.head) ch.head.instanceMatrix.needsUpdate = true;
                continue;
              }
              const pts = ch.parts || {};
              for (let i = 0; i < items.length; i++) {
                const a = items[i];
                const isDead = a.deadUntil && nowMs < a.deadUntil;
                if (isDead) {
                  const sinceKill = (nowMs - (a.killedAt || nowMs)) * 0.001;
                  const fadeSc = sinceKill > 3.0 ? Math.max(0, 1.0 - (sinceKill - 3.0) * 0.8) : 1.0;
                  const gyD = st.getTerrainHeight ? st.getTerrainHeight(a.lastWx || a.cx, a.lastWz || a.cz) : 0;
                  _fDum.position.set(a.lastWx || a.cx, gyD + 0.6, a.lastWz || a.cz);
                  _fDum.rotation.set(0, a.lastYaw || 0, Math.PI * 0.48);
                  _fDum.scale.setScalar(a.sc * fadeSc);
                  _fDum.updateMatrix();
                  inst.setMatrixAt(i, _fDum.matrix);
                  Object.values(pts).forEach(pm => pm.setMatrixAt(i, _fDum.matrix));
                  continue;
                }
                const p = nowMs * 0.008 + a.phase;
                const rabPause = (kind === 'rabbit') && (((p * 0.14) % 1.0) > 0.72);
                if (!rabPause) a.a += a.speed * dtSec;
                const wx = a.cx + Math.cos(a.a) * a.loopR;
                const wz = a.cz + Math.sin(a.a) * a.loopR * 0.78;
                const dx = -Math.sin(a.a) * a.loopR * a.speed;
                const dz = Math.cos(a.a) * a.loopR * 0.78 * a.speed;
                const yaw = Math.atan2(dx, dz);
                a.lastWx = wx; a.lastWz = wz; a.lastYaw = yaw;
                const gy = st.getTerrainHeight ? st.getTerrainHeight(wx, wz) : 0;
                let y = gy, rx = 0, rz = 0;
                if (kind === 'rabbit') {
                  if (rabPause) { rx = Math.abs(Math.sin(p * 2.2)) * 0.16; }
                  else { const hop = Math.abs(Math.sin(p * 1.1)); y = gy + hop * 2.8; rx = -Math.cos(p * 1.1) * 0.22; }
                } else if (kind === 'fox') {
                  y = gy + Math.abs(Math.sin(p * 1.9)) * 0.70;
                }
                _fDum.position.set(wx, y, wz);
                _fDum.rotation.set(rx, yaw, rz);
                _fDum.scale.setScalar(a.sc);
                _fDum.updateMatrix();
                inst.setMatrixAt(i, _fDum.matrix);
                if (kind === 'rabbit') {
                  const hNod = rabPause ? (0.42 + Math.sin(p * 3.8) * 0.22) : (-0.10 + Math.sin(p * 1.1) * 0.14);
                  const hTurn = rabPause ? Math.sin(p * 1.6) * 0.45 : Math.sin(p * 0.7) * 0.12;
                  const fKick = rabPause ? 0 : Math.sin(p * 1.1) * 0.65;
                  if (pts.head) _setPart(pts.head, i, 0, 3.2, 1.8, hNod, hTurn, 0);
                  if (pts.legF) _setPart(pts.legF, i, 0, 1.7, 1.4, -fKick, 0, 0);
                  if (pts.legH) _setPart(pts.legH, i, 0, 1.6, -1.6, fKick * 1.1, 0, 0);
                } else if (kind === 'fox') {
                  const stride = Math.sin(p * 2.6) * 0.58;
                  if (pts.head) _setPart(pts.head, i, 0, 4.4, 3.6, 0.08 + Math.sin(p * 1.1) * 0.18, Math.sin(p * 0.85) * 0.32, 0);
                  if (pts.tail) _setPart(pts.tail, i, 0, 4.0, -4.1, -0.32 + Math.sin(p * 1.9) * 0.12, Math.sin(p * 2.3) * 0.45, 0);
                  if (pts.legA) _setPart(pts.legA, i, 0, 3.4, 0, stride, 0, 0);
                  if (pts.legB) _setPart(pts.legB, i, 0, 3.4, 0, -stride, 0, 0);
                }
              }
              inst.instanceMatrix.needsUpdate = true;
              Object.values(pts).forEach(pm => { pm.instanceMatrix.needsUpdate = true; });
            }
            // Step Landable / Mountable Fire-Breathing Dragon + Persistent Fire Burning & Smoke
            const dr = st.dragon;
            const _igniteSite = (ix, iz, rad = 14, dur = 18) => {
              if (!dr || !dr.fireSites) return;
              const igy = st.getTerrainHeight ? st.getTerrainHeight(ix, iz) : 0;
              let bestSlot = null, bestDist = 20;
              for (let si = 0; si < dr.fireSites.length; si++) {
                const fs = dr.fireSites[si];
                if (fs.active) {
                  const d = Math.hypot(fs.x - ix, fs.z - iz);
                  if (d < bestDist) { bestDist = d; bestSlot = fs; }
                }
              }
              if (bestSlot) {
                bestSlot.age = 0; bestSlot.life = Math.max(bestSlot.life, dur); bestSlot.radius = Math.max(bestSlot.radius, rad);
                return;
              }
              const freeSlot = dr.fireSites.find(s => !s.active) || dr.fireSites.reduce((a, b) => (a.age > b.age ? a : b));
              freeSlot.active = true; freeSlot.x = ix; freeSlot.y = igy; freeSlot.z = iz;
              freeSlot.age = 0; freeSlot.life = dur; freeSlot.radius = rad;
            };
            if (dr && dr.root && dr.root.parent) {
              const nowS = nowMs * 0.001;
              dr.cycleTime += dtSec;
              const _pathPos = tt => {
                const px = Math.sin(tt) * 320 + Math.cos(tt * 0.5) * 70;
                const pz = Math.sin(tt * 2.0) * 200;
                const gy = st.getTerrainHeight ? st.getTerrainHeight(px, pz) : 0;
                const py = Math.max(gy + 105, 128 + Math.sin(tt * 1.7) * 24);
                return [px, py, pz];
              };
              let rx = 0, rz = 0, beatSpeed = 3.8, wingFold = 0, isMovingFwd = true, isBreathing = nowMs < (dr.forcedBreathUntil || 0);
              if (dr.mode === 'ridden') {
                const curPx = (typeof renderPlayerPos !== 'undefined' && renderPlayerPos.initialized) ? (renderPlayerPos.x - 512) : ((typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.x - 512) : 0);
                const curPz = (typeof renderPlayerPos !== 'undefined' && renderPlayerPos.initialized) ? (renderPlayerPos.y - 384) : ((typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.y - 384) : 0);
                const gy = st.getTerrainHeight ? st.getTerrainHeight(curPx, curPz) : 0;
                const elev = (typeof window.__lwLocalElevation === 'number') ? window.__lwLocalElevation : 0;
                const airFrac = Math.min(1, elev / 14.0);
                const tgtY = gy + 5.6 + elev;
                const mvSpd = Math.hypot(curPx - dr.posX, curPz - dr.posZ) / Math.max(0.01, dtSec);
                isMovingFwd = mvSpd > 2.5;
                if (typeof cameraMode !== 'undefined' && cameraMode === 'tp' && typeof tpYawOffset === 'number' && isMovingFwd) {
                  dr.yaw = Math.atan2(curPx - dr.posX, curPz - dr.posZ);
                } else if (typeof facingToVec === 'function' && typeof lastFacing === 'string') {
                  const [fdx, fdz] = facingToVec(lastFacing);
                  dr.yaw = Math.atan2(fdx, fdz);
                }
                dr.posX = curPx; dr.posZ = curPz; dr.posY = tgtY;
                wingFold = (1.0 - airFrac) * 0.88;
                rx = airFrac * (isMovingFwd ? -0.10 : 0.04);
                rz = airFrac * (Math.sin(nowS * 2.0) * 0.08);
                beatSpeed = airFrac > 0.2 ? 4.4 : 0.9;
                dr.root.position.set(dr.posX, dr.posY, dr.posZ);
                dr.root.rotation.set(rx, dr.yaw, rz);
              } else if (dr.mode === 'soar') {
                dr.t += dtSec * 0.28;
                const [cx, cy, cz] = _pathPos(dr.t);
                const [nx, ny, nz] = _pathPos(dr.t + 0.02);
                dr.posX = cx; dr.posY = cy; dr.posZ = cz;
                dr.yaw = Math.atan2(nx - cx, nz - cz);
                rx = -Math.atan2(ny - cy, Math.hypot(nx - cx, nz - cz) || 1);
                rz = -Math.sin(dr.t * 2.0) * 0.34;
                isBreathing = isBreathing || ((dr.cycleTime % 7.5) >= 1.5 && (dr.cycleTime % 7.5) <= 4.1);
                if (dr.cycleTime >= 7.0) {
                  dr.mode = 'descend'; dr.modeTimer = 0;
                  const pX = (typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.x - 512) : 0;
                  const pZ = (typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.y - 384) : 0;
                  dr.landX = pX + Math.cos(nowS * 0.7) * 105; dr.landZ = pZ + Math.sin(nowS * 0.7) * 105;
                }
                dr.root.position.set(dr.posX, dr.posY, dr.posZ);
                dr.root.rotation.set(rx, dr.yaw, rz);
              } else if (dr.mode === 'descend') {
                dr.modeTimer += dtSec;
                const gy = st.getTerrainHeight ? st.getTerrainHeight(dr.landX, dr.landZ) : 0;
                const tgtY = gy + 5.6;
                const lerpK = 1 - Math.exp(-1.5 * dtSec);
                const odx = dr.landX - dr.posX, odz = dr.landZ - dr.posZ;
                if (Math.hypot(odx, odz) > 6) dr.yaw = Math.atan2(odx, odz);
                dr.posX += odx * lerpK; dr.posZ += odz * lerpK; dr.posY += (tgtY - dr.posY) * lerpK;
                const remainAlt = Math.max(0, dr.posY - tgtY);
                wingFold = Math.max(0, 1.0 - remainAlt / 28.0) * 0.92;
                rx = Math.min(0.26, remainAlt * 0.008);
                isMovingFwd = remainAlt > 4;
                dr.root.position.set(dr.posX, dr.posY, dr.posZ);
                dr.root.rotation.set(rx, dr.yaw, rz * 0.2);
                if (Math.hypot(odx, odz) < 12 && remainAlt < 1.6) {
                  dr.mode = 'landed'; dr.modeTimer = 0; dr.posY = tgtY;
                }
              } else if (dr.mode === 'landed') {
                dr.modeTimer += dtSec;
                const gy = st.getTerrainHeight ? st.getTerrainHeight(dr.landX, dr.landZ) : 0;
                dr.posY = gy + 5.6 + Math.sin(nowS * 1.9) * 0.25;
                wingFold = 0.96; isMovingFwd = false;
                dr.root.position.set(dr.posX, dr.posY, dr.posZ);
                dr.root.rotation.set(0, dr.yaw, 0);
                // Occasional gentle fire puff while landed (ignites a nearby campfire blaze once per landing)
                if (dr.modeTimer > 1.2 && dr.modeTimer < 2.2) isBreathing = true;
                if (dr.modeTimer > 18.0) { dr.mode = 'takeoff'; dr.modeTimer = 0; }
              } else if (dr.mode === 'takeoff') {
                dr.modeTimer += dtSec;
                const takeF = Math.min(1, dr.modeTimer / 2.6);
                dr.posY += 56 * dtSec;
                dr.posX += Math.sin(dr.yaw) * 75 * dtSec; dr.posZ += Math.cos(dr.yaw) * 75 * dtSec;
                wingFold = (1 - takeF) * 0.92; rx = -0.36; beatSpeed = 5.6;
                dr.root.position.set(dr.posX, dr.posY, dr.posZ);
                dr.root.rotation.set(rx, dr.yaw, 0);
                if (dr.modeTimer >= 2.6) { dr.mode = 'soar'; dr.cycleTime = 0; }
              }

              // Wings: blend smoothly between full aerial beat and folded landed posture
              const beat = nowS * beatSpeed;
              const flyIn = isBreathing ? (0.18 + Math.sin(beat * 0.8) * 0.25) : (0.14 + Math.sin(beat) * 0.56);
              const flyOut = isBreathing ? (-0.20 + Math.sin(beat * 0.8 - 0.8) * 0.28) : (-0.22 + Math.sin(beat - 0.85) * 0.62);
              const flapIn = flyIn * (1 - wingFold) + 1.05 * wingFold;
              const flapOut = flyOut * (1 - wingFold) - 0.88 * wingFold;
              dr.wL.wIn.rotation.z = flapIn; dr.wL.wOut.rotation.z = flapOut;
              dr.wR.wIn.rotation.z = -flapIn; dr.wR.wOut.rotation.z = -flapOut;

              const nSway = Math.sin(nowS * 2.2);
              dr.neck0.rotation.set(isBreathing ? 0.34 : Math.sin(nowS * 1.8) * (wingFold > 0.5 ? 0.06 : 0.12), nSway * (wingFold > 0.5 ? 0.28 : 0.16), 0);
              dr.neck1.rotation.set(isBreathing ? 0.26 : -Math.sin(nowS * 1.8) * 0.08, -nSway * 0.18, 0);
              dr.jawPivot.rotation.x = isBreathing ? (0.50 + Math.sin(nowS * 18) * 0.06) : (0.06 + Math.sin(nowS * 1.5) * 0.04);
              dr.throatCore.visible = isBreathing;
              dr.fireLight.intensity = isBreathing ? (6.5 + Math.sin(nowS * 24) * 2.0) : 0;
              dr.tailSegs.forEach((ts, idx) => {
                ts.rotation.set(Math.cos(nowS * 2.4 - idx * 0.7) * (wingFold > 0.5 ? 0.04 : 0.12), Math.sin(nowS * 2.8 - idx * 0.85) * 0.28, 0);
              });
              dr.dLegs.forEach((lp, li) => {
                if (wingFold > 0.55) {
                  const walkPh = isMovingFwd ? Math.sin(nowS * 11 + ((li === 0 || li === 3) ? 0 : Math.PI)) * 0.42 : 0;
                  lp.rotation.x = 0.22 + walkPh;
                } else {
                  lp.rotation.x = Math.sin(beat + li * 0.5) * 0.18;
                }
              });

              // Fire-breath emission & ground ignition
              if (isBreathing && dr.fireInst) {
                dr.root.updateMatrixWorld(true);
                dr.mouthEmit.getWorldPosition(_dPos);
                dr.headGrp.getWorldQuaternion(_dQuat);
                _dDir.set(0, dr.mode === 'landed' || dr.mode === 'ridden' ? -0.45 : -0.35, 1).applyQuaternion(_dQuat).normalize();
                dr.emitAcc += dtSec * 52;
                while (dr.emitAcc >= 1) {
                  dr.emitAcc -= 1;
                  const fp = dr.fireParts[dr.fireIdx % dr.fireParts.length];
                  dr.fireIdx++;
                  const jitterX = (Math.sin(dr.fireIdx * 9.3) * 0.14), jitterY = (Math.cos(dr.fireIdx * 7.1) * 0.14);
                  fp.active = true; fp.age = 0; fp.life = 0.85 + (dr.fireIdx % 5) * 0.08;
                  fp.x = _dPos.x; fp.y = _dPos.y; fp.z = _dPos.z;
                  fp.vx = (_dDir.x + jitterX) * 195;
                  fp.vy = (_dDir.y + jitterY) * 195;
                  fp.vz = (_dDir.z + Math.cos(dr.fireIdx * 5.7) * 0.14) * 195;
                }
              }
              if (dr.fireInst) {
                for (let fi = 0; fi < dr.fireParts.length; fi++) {
                  const fp = dr.fireParts[fi];
                  if (!fp.active) continue;
                  fp.age += dtSec;
                  if (fp.age >= fp.life) {
                    fp.active = false;
                    _fDum.scale.setScalar(0); _fDum.updateMatrix();
                    dr.fireInst.setMatrixAt(fi, _fDum.matrix);
                    continue;
                  }
                  const fNorm = fp.age / fp.life;
                  fp.x += fp.vx * dtSec; fp.y += (fp.vy + fNorm * 20) * dtSec; fp.z += fp.vz * dtSec;
                  const gyHit = st.getTerrainHeight ? st.getTerrainHeight(fp.x, fp.z) : 0;
                  if (fp.y <= gyHit + 6 && fi % 6 === 0) _igniteSite(fp.x, fp.z, 13, 18);
                  const fScale = (2.4 + fNorm * 9.6) * (1.0 - fNorm * 0.25);
                  _fDum.position.set(fp.x, fp.y, fp.z);
                  _fDum.rotation.set(fp.age * 3, fp.age * 2, 0);
                  _fDum.scale.setScalar(fScale);
                  _fDum.updateMatrix();
                  dr.fireInst.setMatrixAt(fi, _fDum.matrix);
                  if (fNorm < 0.25) _dCol.setHex(0xfff6be);
                  else if (fNorm < 0.62) _dCol.setHex(0xff8418);
                  else _dCol.setHex(0xc42208);
                  dr.fireInst.setColorAt(fi, _dCol);
                }
                dr.fireInst.instanceMatrix.needsUpdate = true;
                if (dr.fireInst.instanceColor) dr.fireInst.instanceColor.needsUpdate = true;
              }

              // Update Active Fire Burning Sites (charred ember bed + flickering flame tongues + billowing smoke)
              if (dr.fireSites && dr.flameInst && dr.smokeInst && dr.emberInst) {
                let flameCursor = 0, brightSite = null, brightPow = 0;
                for (let si = 0; si < dr.fireSites.length; si++) {
                  const fs = dr.fireSites[si];
                  if (!fs.active) {
                    _fDum.scale.setScalar(0); _fDum.updateMatrix();
                    dr.emberInst.setMatrixAt(si, _fDum.matrix);
                    continue;
                  }
                  fs.age += dtSec;
                  if (fs.age >= fs.life) {
                    fs.active = false;
                    _fDum.scale.setScalar(0); _fDum.updateMatrix();
                    dr.emberInst.setMatrixAt(si, _fDum.matrix);
                    continue;
                  }
                  const fade = fs.age < 0.6 ? (fs.age / 0.6) : (fs.age > fs.life - 3.0 ? Math.max(0, (fs.life - fs.age) / 3.0) : 1.0);
                  const pulse = (0.86 + Math.sin(nowS * 11 + si * 2.1) * 0.14) * fade;
                  if (pulse > brightPow) { brightPow = pulse; brightSite = fs; }
                  _fDum.position.set(fs.x, fs.y + 0.3, fs.z);
                  _fDum.rotation.set(0, si * 0.9, 0);
                  _fDum.scale.set(fs.radius * (0.9 + pulse * 0.15), 1, fs.radius * (0.9 + pulse * 0.15));
                  _fDum.updateMatrix();
                  dr.emberInst.setMatrixAt(si, _fDum.matrix);
                  _dCol.setRGB(0.22 + pulse * 0.55, 0.08 + pulse * 0.18, 0.03);
                  dr.emberInst.setColorAt(si, _dCol);

                  // 12 swirling multi-layer flame tongues per active fire site
                  for (let ti = 0; ti < 12 && flameCursor < dr.siteFlames.length; ti++) {
                    const sf = dr.siteFlames[flameCursor];
                    const ph = nowS * (9.5 + (ti % 4) * 2.1) + sf.phase;
                    const radFrac = (ti < 4) ? 0.25 : 0.72;
                    const fx = fs.x + sf.ox * fs.radius * radFrac + Math.sin(ph * 0.8) * 1.4;
                    const fz = fs.z + sf.oz * fs.radius * radFrac + Math.cos(ph * 0.9) * 1.4;
                    const fW = (ti < 4 ? 3.2 : 2.2) * fade * (0.8 + Math.sin(ph) * 0.25);
                    const fH = (ti < 4 ? 7.4 : 4.8) * pulse * (0.82 + Math.sin(ph * 1.3) * 0.28);
                    _fDum.position.set(fx, fs.y + 0.4, fz);
                    _fDum.rotation.set(Math.sin(ph) * 0.14, ph * 0.4, Math.cos(ph) * 0.14);
                    _fDum.scale.set(fW, Math.max(0.2, fH), fW);
                    _fDum.updateMatrix();
                    dr.flameInst.setMatrixAt(flameCursor, _fDum.matrix);
                    if (ti < 4) _dCol.setHex(0xfff1a8);
                    else if (ti < 8) _dCol.setHex(0xff8a18);
                    else _dCol.setHex(0xe03208);
                    dr.flameInst.setColorAt(flameCursor, _dCol);
                    flameCursor++;
                  }

                  // Spawn turbulent billowing smoke puffs
                  dr.smokeAcc += dtSec * 14 * pulse;
                  while (dr.smokeAcc >= 1) {
                    dr.smokeAcc -= 1;
                    const sp = dr.smokeParts[dr.smokeIdx % dr.smokeParts.length];
                    dr.smokeIdx++;
                    const ang = sp.age + dr.smokeIdx * 1.9;
                    sp.active = true; sp.age = 0; sp.life = 2.6 + (dr.smokeIdx % 5) * 0.42;
                    sp.x = fs.x + Math.cos(ang) * fs.radius * 0.42;
                    sp.y = fs.y + 5.5 + (dr.smokeIdx % 3) * 1.4;
                    sp.z = fs.z + Math.sin(ang) * fs.radius * 0.42;
                    sp.vx = 10 + Math.cos(ang) * 7;
                    sp.vy = 20 + (dr.smokeIdx % 4) * 4.5;
                    sp.vz = 5 + Math.sin(ang) * 7;
                    sp.sc = 1.6 + (dr.smokeIdx % 3) * 0.6;
                  }
                }
                while (flameCursor < dr.siteFlames.length) {
                  _fDum.scale.setScalar(0); _fDum.updateMatrix();
                  dr.flameInst.setMatrixAt(flameCursor++, _fDum.matrix);
                }
                for (let si = 0; si < dr.smokeParts.length; si++) {
                  const sp = dr.smokeParts[si];
                  if (!sp.active) continue;
                  sp.age += dtSec;
                  if (sp.age >= sp.life) {
                    sp.active = false;
                    _fDum.scale.setScalar(0); _fDum.updateMatrix();
                    dr.smokeInst.setMatrixAt(si, _fDum.matrix);
                    continue;
                  }
                  const sn = sp.age / sp.life;
                  sp.x += (sp.vx + Math.sin(nowS * 2 + si) * 5) * dtSec;
                  sp.y += sp.vy * (1.0 - sn * 0.28) * dtSec;
                  sp.z += (sp.vz + Math.cos(nowS * 1.8 + si) * 5) * dtSec;
                  const puffSc = sp.sc * (1.0 + sn * 3.1) * (sn > 0.72 ? Math.max(0.05, (1.0 - sn) / 0.28) : 1.0);
                  _fDum.position.set(sp.x, sp.y, sp.z);
                  _fDum.rotation.set(sp.age * 0.7, sp.age * 1.1, sp.age * 0.5);
                  _fDum.scale.setScalar(puffSc);
                  _fDum.updateMatrix();
                  dr.smokeInst.setMatrixAt(si, _fDum.matrix);
                  const shade = 0.16 + sn * 0.34;
                  _dCol.setRGB(shade + 0.06 * (1 - sn), shade, shade + 0.02);
                  dr.smokeInst.setColorAt(si, _dCol);
                }
                dr.emberInst.instanceMatrix.needsUpdate = true;
                if (dr.emberInst.instanceColor) dr.emberInst.instanceColor.needsUpdate = true;
                dr.flameInst.instanceMatrix.needsUpdate = true;
                if (dr.flameInst.instanceColor) dr.flameInst.instanceColor.needsUpdate = true;
                dr.smokeInst.instanceMatrix.needsUpdate = true;
                if (dr.smokeInst.instanceColor) dr.smokeInst.instanceColor.needsUpdate = true;
                if (dr.burnLight) {
                  if (brightSite) {
                    dr.burnLight.position.set(brightSite.x, brightSite.y + 12, brightSite.z);
                    dr.burnLight.intensity = 4.2 + Math.sin(nowS * 21) * 1.4;
                  } else {
                    dr.burnLight.intensity = 0;
                  }
                }
              }
            }
            st._igniteSite = _igniteSite;
          };
          window.__dragonCtrl = {
            getState: () => {
              const dr = (window.__outdoorFaunaState && window.__outdoorFaunaState.dragon) || null;
              return dr ? { mode: dr.mode, landed: dr.mode === 'landed', ridden: dr.mode === 'ridden', x: dr.posX, y: dr.posY, z: dr.posZ } : null;
            },
            land: () => {
              const dr = window.__outdoorFaunaState && window.__outdoorFaunaState.dragon;
              if (!dr) return false;
              const pX = (typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.x - 512) : 0;
              const pZ = (typeof lastPlayerPos !== 'undefined') ? (lastPlayerPos.y - 384) : 0;
              dr.landX = pX + 85; dr.landZ = pZ + 55;
              dr.mode = 'descend'; dr.modeTimer = 0;
              return true;
            },
            mount: () => {
              const dr = window.__outdoorFaunaState && window.__outdoorFaunaState.dragon;
              if (!dr) return false;
              dr.mode = 'ridden';
              window.__mountedSkyDragon = true;
              if (typeof lwShowToast === 'function') lwShowToast('🐉 Mounted Ignis-Vael! Move [WASD] • [J/Space] Soar High • breathe fire!');
              return true;
            },
            dismount: () => {
              const dr = window.__outdoorFaunaState && window.__outdoorFaunaState.dragon;
              window.__mountedSkyDragon = false;
              if (dr && dr.mode === 'ridden') { dr.landX = dr.posX; dr.landZ = dr.posZ; dr.mode = 'landed'; dr.modeTimer = 0; }
              return true;
            },
            breatheFire: (dur = 2.6) => {
              const st = window.__outdoorFaunaState;
              const dr = st && st.dragon;
              if (!dr) return false;
              dr.forcedBreathUntil = performance.now() + dur * 1000;
              if (st._igniteSite) {
                st._igniteSite(dr.posX + Math.sin(dr.yaw) * 30, dr.posZ + Math.cos(dr.yaw) * 30, 14, 20);
                st._igniteSite(dr.posX + Math.sin(dr.yaw) * 52, dr.posZ + Math.cos(dr.yaw) * 52, 16, 22);
              }
              return true;
            },
            igniteAt: (wx, wz, rad = 14, dur = 20) => {
              const st = window.__outdoorFaunaState;
              if (st && st._igniteSite) { st._igniteSite(wx, wz, rad, dur); return true; }
              return false;
            },
          };
          window.__outdoorWildlifeCtrl = {
            slayNearest: (wx, wz) => {
              const st = window.__outdoorFaunaState;
              if (!st || !Array.isArray(st.cohorts)) return null;
              let best = null, bestD = 9999, bestKind = 'rabbit';
              const now = performance.now();
              st.cohorts.forEach(ch => {
                if (ch.kind !== 'rabbit' && ch.kind !== 'fox') return;
                ch.items.forEach(it => {
                  if (it.deadUntil && now < it.deadUntil) return;
                  const ix = it.lastWx ?? it.cx, iz = it.lastWz ?? it.cz;
                  const d = Math.hypot(ix - wx, iz - wz);
                  if (d < bestD) { bestD = d; best = it; bestKind = ch.kind; }
                });
              });
              if (best && bestD < 2200) {
                best.killedAt = now;
                best.deadUntil = now + 45000;
                return { kind: bestKind, x: best.lastWx ?? best.cx, z: best.lastWz ?? best.cz };
              }
              return null;
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

      const cliCfgFloor = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const floorCfg = cliCfgFloor.floor_styles || {};
      const flKind = (floorCfg.presets && floorCfg.presets[tType]) ? tType : ((typeof classifyWithClientCCELM === 'function' && floorCfg.criteria) ? classifyWithClientCCELM(`${data.room_id || ''} ${tType}`, floorCfg.criteria, 0.35, tType) : tType);
      const fStyle = (floorCfg.presets && floorCfg.presets[flKind]) || {};

      // 1. Procedural 3D Floor Canvas Texture (Rich masonry/planks/organic stains/close-up grain)
      var floorCacheKey = `floor_v4_${tType}_${theme.base.join('_')}_${theme.alt.join('_')}`;
      var floorTex = cachedProcTex[floorCacheKey];
      if (!floorTex) {
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
                fctx.fillStyle = 'rgba(34, 36, 40, 0.22)';
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
        buildSkyrimOpenWorld(staticGrp, data, W, H, theme, data.time_weather || {}, stoneMat, woodMat, cachedProcTex, applyTextureQuality, fStyle);
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
              const rockGeo = getSharedGeo(`boulder_rock_v4_${idx}`, () => (window._sculptHelpers && window._sculptHelpers.rock) ? window._sculptHelpers.rock(1.0, 1.0, 1.0, idx + 2) : new THREE.IcosahedronGeometry(1.0, 2));
              const rm = new THREE.Mesh(rockGeo, stoneMat);
              rm.scale.set(bo.s[0], bo.s[1], bo.s[2]); rm.position.set(bo.x, bo.y, bo.z); rm.rotation.set(bo.rot[0], bo.rot[1], bo.rot[2]);
              rm.castShadow = true; rm.receiveShadow = true; bldGrp.add(rm);
            });
            for (let pi = 0; pi < 3; pi++) {
              const pa = (pi * 2.1) + 0.4, pd = Math.max(ow, oh) * 0.42;
              const pm = new THREE.Mesh(getSharedGeo('clutter_pebble_v4', () => new THREE.IcosahedronGeometry(2.3, 2)), stoneMat);
              pm.position.set(Math.cos(pa) * pd, 0.4, Math.sin(pa) * pd); pm.scale.set(1.1, 0.62, 0.9); bldGrp.add(pm);
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
              const bc = new THREE.Mesh(getSharedGeo(`bramble_mound_v2_${bi % 3}`, () => {
                const dg = new THREE.IcosahedronGeometry(1.0, 2), pa = dg.attributes.position;
                for (let vi = 0; vi < pa.count; vi++) {
                  const s = 0.90 + 0.14 * Math.sin(pa.getX(vi) * 3.5 + bi);
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

