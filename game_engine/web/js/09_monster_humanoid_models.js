    function _classifyMonsterRig(lowName) {
      const cfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const rc = (cfg.rig_criteria && cfg.rig_criteria.monsters) || (skills.visual_classification && skills.visual_classification.monsters) || {};
      const shapeCrit = { spider: rc.spider, wolf: rc.wolf, skeleton: rc.skeleton, brute: rc.brute, raider: rc.raider };
      return (typeof classifyWithClientCCELM === 'function') ? classifyWithClientCCELM(lowName, shapeCrit, 0.32, 'raider') : 'raider';
    }

    const _PROC_HAND_POSES = {
      none:   { thumb: [0.35, 0.28], fingers: [[0.24, 0.26], [0.30, 0.32], [0.36, 0.38], [0.42, 0.44]] },
      open:   { thumb: [0.12, 0.10], fingers: [[0.08, 0.10], [0.10, 0.12], [0.14, 0.16], [0.18, 0.20]] },
      tome:   { thumb: [0.38, 0.28], fingers: [[0.34, 0.42], [0.38, 0.46], [0.42, 0.50], [0.46, 0.54]] },
      grip:   { thumb: [0.85, 0.72], fingers: [[1.05, 1.18], [1.10, 1.22], [1.12, 1.22], [1.06, 1.14]] },
    };

    function _poseProcHand(handRec, poseKey) {
      if (!handRec) return;
      const spec = _PROC_HAND_POSES[poseKey] || (poseKey === 'none' ? _PROC_HAND_POSES.none : poseKey === 'open' ? _PROC_HAND_POSES.open : poseKey === 'tome' ? _PROC_HAND_POSES.tome : _PROC_HAND_POSES.grip);
      const xs = handRec.xSign;
      if (handRec.thumb) {
        handRec.thumb[0].rotation.z = -xs * (0.48 + spec.thumb[0]);
        handRec.thumb[0].rotation.y = xs * 0.34;
        if (handRec.thumb[1]) handRec.thumb[1].rotation.z = -xs * spec.thumb[1];
      }
      if (handRec.fingers) {
        for (let i = 0; i < handRec.fingers.length; i++) {
          const f = handRec.fingers[i];
          const a = spec.fingers[Math.min(i, spec.fingers.length - 1)];
          f[0].rotation.z = -xs * a[0];
          if (f[1]) f[1].rotation.z = -xs * a[1];
        }
      }
    }
    window._poseProceduralHand = _poseProcHand;

    function _buildArticulatedArmAndHand(opts) {
      const { grp, charGrp, isRight, sx, sy, bScale = 1.0, elbowPitch = -0.45, torsoMat, cuffMat, skinMat, heldKind = 'none', itemScale = 1.0, itemPreset = {}, defaultPoseKey } = opts;
      const xSign = isRight ? 1 : -1;
      const uLen = 5.4 * bScale, fLen = 5.2 * bScale;
      const _g = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
      const armGeo = _g(`proc_uarm_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(1.45 * bScale, 1.20 * bScale, uLen, 10));
      const foreGeo = _g(`proc_farm_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(1.22 * bScale, 0.96 * bScale, fLen, 10));
      const cuffGeo = _g(`proc_cuff_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(1.38 * bScale, 1.15 * bScale, 2.2 * bScale, 10));
      const palmGeo = _g(`proc_palm_${bScale.toFixed(2)}`, () => new THREE.BoxGeometry(1.05 * bScale, 1.85 * bScale, 1.95 * bScale));

      const armPivot = new THREE.Group();
      armPivot.position.set(xSign * sx * bScale, sy * bScale, 0);
      const uMesh = new THREE.Mesh(armGeo, torsoMat); uMesh.position.y = -uLen * 0.5;
      armPivot.add(uMesh);

      const foreArmPivot = new THREE.Group();
      foreArmPivot.position.set(0, -uLen, 0);
      foreArmPivot.rotation.x = elbowPitch;
      const fMesh = new THREE.Mesh(foreGeo, torsoMat); fMesh.position.y = -fLen * 0.5;
      const cMesh = new THREE.Mesh(cuffGeo, cuffMat || torsoMat); cMesh.position.y = -fLen * 0.72;
      foreArmPivot.add(fMesh); foreArmPivot.add(cMesh);

      const wristPivot = new THREE.Group();
      wristPivot.position.set(0, -fLen, 0);
      if (heldKind === 'tome') wristPivot.rotation.y = xSign * -0.95;

      const palmMesh = new THREE.Mesh(palmGeo, skinMat);
      palmMesh.position.set(0, -0.92 * bScale, 0.10 * bScale);
      wristPivot.add(palmMesh);

      const thumbChain = [];
      const tp0 = new THREE.Group(); tp0.position.set(-xSign * 0.28 * bScale, -0.45 * bScale, 0.88 * bScale); tp0.rotation.x = 0.42;
      const tm0 = new THREE.Mesh(_g(`proc_tp0_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(0.24 * bScale, 0.21 * bScale, 0.85 * bScale, 6)), skinMat);
      tm0.position.y = -0.42 * bScale; tp0.add(tm0);
      const tp1 = new THREE.Group(); tp1.position.set(0, -0.82 * bScale, 0);
      const tm1 = new THREE.Mesh(_g(`proc_tp1_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(0.20 * bScale, 0.16 * bScale, 0.72 * bScale, 6)), skinMat);
      tm1.position.y = -0.34 * bScale; tp1.add(tm1);
      tp0.add(tp1); wristPivot.add(tp0);
      thumbChain.push(tp0, tp1);

      const fingers = [];
      const zOffsets = [0.68, 0.24, -0.20, -0.62];
      const lenMults = [0.95, 1.05, 0.96, 0.78];
      for (let fi = 0; fi < 4; fi++) {
        const ls = lenMults[fi] * bScale;
        const p0 = new THREE.Group(); p0.position.set(0, -1.78 * bScale, zOffsets[fi] * bScale);
        const m0 = new THREE.Mesh(_g(`proc_fp0_${fi}_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(0.22 * bScale, 0.19 * bScale, 0.92 * ls, 6)), skinMat);
        m0.position.y = -0.44 * ls; p0.add(m0);
        const p1 = new THREE.Group(); p1.position.set(0, -0.86 * ls, 0);
        const m1 = new THREE.Mesh(_g(`proc_fp1_${fi}_${bScale.toFixed(2)}`, () => new THREE.CylinderGeometry(0.18 * bScale, 0.14 * bScale, 0.80 * ls, 6)), skinMat);
        m1.position.y = -0.38 * ls; p1.add(m1);
        p0.add(p1); wristPivot.add(p0);
        fingers.push([p0, p1]);
      }

      const handRec = { xSign, wrist: wristPivot, thumb: thumbChain, fingers };
      const poseKey = defaultPoseKey || (heldKind && heldKind !== 'none' ? heldKind : 'none');
      _poseProcHand(handRec, poseKey);
      if (!grp.userData.procHands) grp.userData.procHands = {};
      grp.userData.procHands[isRight ? 'right' : 'left'] = handRec;

      const sock = new THREE.Group();
      sock.position.set(-xSign * 0.68 * bScale, -2.02 * bScale, 0.16 * bScale);
      if (heldKind && heldKind !== 'none' && typeof _buildSkillWeaponMesh === 'function') {
        const itemMesh = _buildSkillWeaponMesh(heldKind, itemScale, itemPreset);
        if (itemMesh) {
          const hk = String(heldKind).toLowerCase();
          if (hk === 'staff') { itemMesh.rotation.set(-elbowPitch + 0.18, 0, -xSign * 0.08); }
          else if (hk === 'bow') { itemMesh.rotation.set(-elbowPitch, 0, -xSign * 0.16); }
          else if (hk === 'shield') { sock.position.set(-xSign * 0.55 * bScale, -1.65 * bScale, 0.25 * bScale); itemMesh.rotation.set(-elbowPitch, xSign * 1.42, 0); }
          else if (hk === 'tome') { sock.position.set(-xSign * 0.92 * bScale, -1.78 * bScale, 0.18 * bScale); itemMesh.rotation.set(-Math.PI * 0.38, 0, xSign * 0.15); }
          else if (hk === 'dagger' || hk === 'daggers') { itemMesh.rotation.set(-elbowPitch + 1.05, 0, 0); }
          else { itemMesh.rotation.set(-elbowPitch + 0.82, 0, -xSign * 0.08); }
          sock.add(itemMesh);
          grp.userData[isRight ? 'rightItemGrp' : 'leftItemGrp'] = itemMesh;
        }
      }
      wristPivot.add(sock);
      foreArmPivot.add(wristPivot);
      armPivot.add(foreArmPivot);
      charGrp.add(armPivot);
      armPivot.userData.baseQuat = armPivot.quaternion.clone();
      armPivot.userData.pitchAxis = new THREE.Vector3(1, 0, 0);
      foreArmPivot.userData.baseQuat = foreArmPivot.quaternion.clone();
      foreArmPivot.userData.pitchAxis = new THREE.Vector3(1, 0, 0);
      grp.userData[isRight ? 'rArm' : 'lArm'] = armPivot;
      grp.userData[isRight ? 'rForeArm' : 'lForeArm'] = foreArmPivot;
      grp.userData[isRight ? 'rHand' : 'lHand'] = wristPivot;
      return armPivot;
    }

    function addVolumetricEntity_monster(_E) {
      with (_E) {
          const rigKind = _classifyMonsterRig(lowName);
          const cfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
          const recipes = cfg.rig_recipes || {}, refs = {};
          const _bevelUnit = (typeof getSharedGeo === 'function' && typeof createBeveledBoxGeo === 'function')
            ? getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05))
            : null;
          if (rigKind === 'spider') {
            const chitin = (typeof window.createRichObjectMaterial === 'function')
              ? window.createRichObjectMaterial({ color: 0x3b3248, pbrKind: 'crystal', roughness: 0.30, metalness: 0.22 })
              : new THREE.MeshStandardMaterial({ color: 0x3b3248, roughness: 0.36, metalness: 0.25 });
            if (recipes.spider && typeof buildSkillPartMeshes === 'function') {
              buildSkillPartMeshes(charGrp, recipes.spider.body || [], { shadows: true, outRefs: refs });
              if (refs.spiderAbdomen) grp.userData.spiderAbdomen = refs.spiderAbdomen;
              (recipes.spider.eyes || []).forEach(([ox, oy, oz, r]) => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), eyeIrisMat); eye.position.set(ox, oy, oz); charGrp.add(eye);
              });
            }
            grp.userData.spiderPedipalps = [-1.8, 1.8].map(px => {
              const pg = new THREE.Group(); pg.position.set(px, 6, 10.5);
              [[0.5, 0.4, 4, px * 0.3, -1, 1.5, 0.8, px * 0.2], [0.35, 0.2, 3.5, px * 0.5, -2.8, 3.2, 1.3, 0]].forEach(([rt, rb, h, x, y, z, rx, ry]) => {
                const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 6), chitin); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); pg.add(m);
              });
              charGrp.add(pg); return pg;
            });
            const spiderLegs = [];
            [-1, 1].forEach((side, sideIdx) => {
              for (let i = 0; i < 4; i++) {
                const coxa = new THREE.Group(), femur = new THREE.Group(), tibia = new THREE.Group();
                coxa.position.set(side * 4.8, 7.2, (i - 1.5) * 4.2); femur.position.set(side * 3.0, 0.8, 0); tibia.position.set(side * 7.4, 6.6, 0);
                [[coxa, 0.9, 0.75, 3.5, side * 1.5, 0.4, -side * Math.PI / 2.8], [femur, 0.7, 0.55, 9.5, side * 3.8, 3.4, -side * 0.85], [tibia, 0.5, 0.22, 13, side * 2.5, -5.5, side * 0.45]].forEach(([p, rt, rb, h, px, py, rz]) => {
                  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 6), chitin); m.position.set(px, py, 0); m.rotation.z = rz; p.add(m);
                });
                femur.add(tibia); coxa.add(femur); coxa.rotation.y = (i - 1.5) * 0.32; charGrp.add(coxa);
                spiderLegs.push({ side, index: i, globalIndex: sideIdx * 4 + i, coxa, femur, tibia, baseYaw: (i - 1.5) * 0.32 });
              }
            });
            grp.userData.spiderLegs = spiderLegs;
          } else if (rigKind === 'wolf') {
            const furMat = (typeof window.createRichObjectMaterial === 'function')
              ? window.createRichObjectMaterial({ color: 0x6b5a50, pbrKind: 'fur', roughness: 0.82, sheen: 0.72 })
              : new THREE.MeshStandardMaterial({ color: 0x6b5a50, roughness: 0.78, metalness: 0.04 });
            if (recipes.wolf && typeof buildSkillPartMeshes === 'function') buildSkillPartMeshes(charGrp, recipes.wolf.body || [], { shadows: true });
            const wolfHead = new THREE.Group(); wolfHead.position.set(0, 16.5, 10);
            if (recipes.wolf && typeof buildSkillPartMeshes === 'function') buildSkillPartMeshes(wolfHead, recipes.wolf.head || [], { mats: { iris: eyeIrisMat }, shadows: true });
            charGrp.add(wolfHead); grp.userData.wolfHead = wolfHead;
            const tailGrp = new THREE.Group(); tailGrp.position.set(0, 10, -8.5);
            if (recipes.wolf && typeof buildSkillPartMeshes === 'function') buildSkillPartMeshes(tailGrp, recipes.wolf.tail || [], { shadows: true });
            charGrp.add(tailGrp); grp.userData.quadrupedTail = tailGrp;
            const quadLegs = {};
            [['fl', -3.4, 4.2, true], ['fr', 3.4, 4.2, true], ['bl', -3.2, -5.0, false], ['br', 3.2, -5.0, false]].forEach(([nm, lx, lz, isFront]) => {
              const hip = new THREE.Group(), lower = new THREE.Group(), uLen = isFront ? 5.5 : 6.0, lLen = 5.5;
              hip.position.set(lx, 10.5, lz); lower.position.set(0, -uLen, 0);
              const um = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.85, uLen, 6), furMat); um.position.y = -uLen / 2; hip.add(um);
              const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, lLen, 6), furMat); lm.position.y = -lLen / 2; lower.add(lm);
              const pm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.2), darkLeatherMat); pm.position.set(0, -lLen - 0.4, 0.6); lower.add(pm);
              hip.add(lower); charGrp.add(hip); quadLegs[nm] = { hip, lower, isFront };
            });
            grp.userData.quadrupedLegs = quadLegs;
          } else if (rigKind === 'skeleton') {
            if (recipes.skeleton && typeof buildSkillPartMeshes === 'function') {
              buildSkillPartMeshes(charGrp, recipes.skeleton.body || [], { mats: { bone: boneMat, dark: darkClothMat, steel: steelMat }, shadows: true, outRefs: refs });
              grp.userData.weaponMount = refs.weaponMount || charGrp;
            }
          } else {
            const isBrute = rigKind === 'brute', mSkin = isBrute ? darkSkinMat : orcSkinMat, bScale = isBrute ? 1.25 : 0.85;
            const rc = (cfg.rig_criteria && cfg.rig_criteria.monsters) || {}, hm = cfg.humanoid_monster_parts || {};
            const isRanged = (typeof classifyWithClientCCELM === 'function')
              ? classifyWithClientCCELM(lowName, { ranged: rc.bow_check_ranged || 'shortbow archer', melee: rc.bow_check_melee || 'sword blade club' }, 0.55, 'melee') === 'ranged'
              : false;
            const fangMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.45 }), mouthMat = new THREE.MeshStandardMaterial({ color: 0x24100d, roughness: 0.9 });
            const addLimb = (key, px, py, w, h, d, mat, mx, my, mz, rx=0) => {
              const g = new THREE.Group(); g.position.set(px * bScale, py * bScale, 0);
              const m = _bevelUnit ? new THREE.Mesh(_bevelUnit, mat) : new THREE.Mesh(new THREE.BoxGeometry(w * bScale, h * bScale, d * bScale), mat);
              if (_bevelUnit) m.scale.set(w * bScale, h * bScale, d * bScale);
              m.position.set(mx * bScale, my * bScale, mz * bScale); if (rx) m.rotation.x = rx;
              g.add(m); charGrp.add(g); grp.userData[key] = g; return m;
            };
            addLimb('lLeg', -3, 11, 3, 11, 3.5, leatherMat, 0, -5.5, 0);
            addLimb('rLeg', 3, 11, 3, 11, 3.5, leatherMat, 0, -5.5, 0);
            _buildArticulatedArmAndHand({
              grp, charGrp, isRight: false, sx: 6.4, sy: 20, bScale, elbowPitch: isRanged ? -0.62 : -0.35,
              torsoMat: darkLeatherMat, cuffMat: darkLeatherMat, skinMat: mSkin,
              heldKind: isRanged ? 'bow' : 'none', itemScale: bScale * 0.92, itemPreset: { key: rigKind }
            });
            grp.userData.weaponMount = _buildArticulatedArmAndHand({
              grp, charGrp, isRight: true, sx: 6.4, sy: 20, bScale, elbowPitch: isRanged ? -0.78 : -0.52,
              torsoMat: darkLeatherMat, cuffMat: darkLeatherMat, skinMat: mSkin,
              heldKind: isRanged ? 'none' : (isBrute ? 'hammer' : 'sword'), itemScale: bScale * 0.92, itemPreset: { key: rigKind },
              defaultPoseKey: isRanged ? 'draw' : undefined
            });
            if (typeof buildSkillPartMeshes === 'function') {
              buildSkillPartMeshes(charGrp, hm.body || [], {
                unitScale: bScale, shadows: true,
                mats: { armor: darkLeatherMat, skin: mSkin, iris: eyeIrisMat, pupil: eyePupilMat, fang: fangMat, mouth: mouthMat, wood: woodMat, weapon: isBrute ? woodMat : steelMat }
              });
            }
          }
      }
    }

    function addVolumetricEntity_humanoid(_E) {
      with (_E) {
          const { key: heroKey, st } = (typeof _resolveHeroPortraitEntry === 'function')
            ? _resolveHeroPortraitEntry(lowName, shortType)
            : { key: 'fighter', st: { torso: '#1f6feb', trim: '#f3ba2f', pauldron: '#dde4ed', headgear: 'helm', weapon: 'sword' } };
          const cliCfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
          const pInfo = (typeof current3DData !== 'undefined' && current3DData && Array.isArray(current3DData.players)) ? current3DData.players.find(pl => pl.id === entityId) : null;
          const app = (pInfo && pInfo.appearance) || null;
          const torsoColor = (app && app.primary_color) || st.torso || '#1f6feb';
          const trimColor = (app && app.trim_color) || st.trim || '#f3ba2f';
          const isHeavyArmored = (heroKey === 'fighter' || heroKey === 'cleric');
          const _pm = (typeof window.getProceduralObjectMaps === 'function') ? window.getProceduralObjectMaps : null;
          const _armorMaps = _pm ? _pm(isHeavyArmored ? 'metal' : 'cloth') : null;
          const _clothMaps = _pm ? _pm('cloth') : null;
          const torsoMat = (typeof THREE.MeshPhysicalMaterial === 'function')
            ? new THREE.MeshPhysicalMaterial({ color: torsoColor, map: _armorMaps ? _armorMaps.map : null, normalMap: _armorMaps ? _armorMaps.normalMap : null, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: _armorMaps ? _armorMaps.roughnessMap : null, roughness: isHeavyArmored ? 0.36 : 0.72, metalness: heroKey === 'fighter' ? 0.62 : 0.08, clearcoat: isHeavyArmored ? 0.35 : 0, sheen: isHeavyArmored ? 0 : 0.64, sheenRoughness: 0.72 })
            : new THREE.MeshStandardMaterial({ color: torsoColor, map: _armorMaps ? _armorMaps.map : null, roughness: 0.55, metalness: heroKey === 'fighter' ? 0.5 : 0.15 });
          const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, map: _clothMaps ? _clothMaps.map : null, normalMap: _clothMaps ? _clothMaps.normalMap : null, roughness: 0.45, metalness: 0.25 });
          const _paulMaps = _pm ? _pm(isHeavyArmored ? 'metal' : 'leather') : null;
          const pauldronMat = (typeof THREE.MeshPhysicalMaterial === 'function')
            ? new THREE.MeshPhysicalMaterial({ color: (app && app.pauldron_color) || st.pauldron || '#5a3825', map: _paulMaps ? _paulMaps.map : null, normalMap: _paulMaps ? _paulMaps.normalMap : null, roughnessMap: _paulMaps ? _paulMaps.roughnessMap : null, roughness: 0.40, metalness: isHeavyArmored ? 0.65 : 0.1, clearcoat: isHeavyArmored ? 0.4 : 0 })
            : new THREE.MeshStandardMaterial({ color: (app && app.pauldron_color) || st.pauldron || '#5a3825', map: _paulMaps ? _paulMaps.map : null, roughness: 0.45, metalness: isHeavyArmored ? 0.55 : 0.1 });
          grp.userData.lwMaterials = { torsoMat, trimMat, pauldronMat };
          const pantsMat = (heroKey === 'wizard' || heroKey === 'rogue') ? torsoMat : darkClothMat;
          const bootMat = isHeavyArmored ? steelMat : leatherMat;
          const _bevelUnit = (typeof getSharedGeo === 'function' && typeof createBeveledBoxGeo === 'function')
            ? getSharedGeo('unit_bevel_box_1x1', () => createBeveledBoxGeo(1, 1, 1, 0.05))
            : null;
          const _m = (geo, mat, x, y, z, rx=0, ry=0, rz=0) => {
            const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z);
            if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz;
            return o;
          };
          const _mb = (sx, sy, sz, mat, x, y, z, rx=0, ry=0, rz=0) => {
            const o = _bevelUnit ? new THREE.Mesh(_bevelUnit, mat) : new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
            if (_bevelUnit) o.scale.set(sx, sy, sz);
            o.position.set(x, y, z);
            if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz;
            return o;
          };

          const _gg = (typeof getSharedGeo === 'function') ? getSharedGeo : (_, fn) => fn();
          const _scH = window._sculptHelpers || {};
          const lLegGrp = new THREE.Group(), rLegGrp = new THREE.Group();
          lLegGrp.position.set(-3.4, 12.2, 0); rLegGrp.position.set(3.4, 12.2, 0);
          const legUpperGeo = _gg('hum_leg_up_v2', () => new THREE.CylinderGeometry(2.15, 1.65, 9.5, 10));
          const bootShaftGeo = _gg('hum_boot_shaft_v2', () => new THREE.CylinderGeometry(1.85, 1.55, 5.2, 10));
          const bootFootGeo = _gg('hum_boot_foot_v2', () => _bevelUnit ? (() => { const g = _bevelUnit.clone(); g.scale(3.6, 2.2, 5.2); return g; })() : new THREE.BoxGeometry(3.6, 2.2, 5.2));
          [lLegGrp, rLegGrp].forEach(lg => {
            lg.add(_m(legUpperGeo, pantsMat, 0, -4.6, 0));
            lg.add(_m(bootShaftGeo, bootMat, 0, -8.8, 0));
            lg.add(_m(bootFootGeo, bootMat, 0, -11.0, 0.85));
            charGrp.add(lg);
          });
          grp.userData.lLeg = lLegGrp; grp.userData.rLeg = rLegGrp;

          // Contoured athletic chest & tapered waist + flared tassets (tier-4 silhouette upgrade)
          const torsoGeo = _gg('hum_torso_v2', () => {
            if (_scH.lathe) {
              const g = _scH.lathe([[4.9, -6.2], [4.3, -2.5], [5.8, 3.0], [6.0, 5.4], [3.0, 6.6]], 14);
              g.scale(1.0, 1.0, 0.62); return g;
            }
            return new THREE.BoxGeometry(11, 13, 6.5);
          });
          charGrp.add(_m(torsoGeo, torsoMat, 0, 18.2, 0));
          charGrp.add(_mb(5.6, 11.5, 0.7, trimMat, 0, 18.0, 3.65));
          charGrp.add(_mb(10.8, 2.2, 6.6, leatherMat, 0, 12.6, 0));
          charGrp.add(_mb(3.2, 2.8, 7.2, goldMat, 0, 12.6, 0));
          // Flared curved hip tassets
          [-5.0, 5.0].forEach(px => charGrp.add(_mb(2.6, 5.2, 5.2, isHeavyArmored ? pauldronMat : torsoMat, px, 10.6, 0, 0, 0, px < 0 ? 0.14 : -0.14)));
          // Sculpted dome pauldrons arching smoothly over deltoids
          const paulGeo = _gg('hum_paul_v2', () => new THREE.SphereGeometry(3.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58));
          [-6.4, 6.4].forEach(px => charGrp.add(_m(paulGeo, pauldronMat, px, 22.8, 0, 0, 0, px < 0 ? 0.45 : -0.45)));

          // Oval anatomical head silhouette + sculpted jawline & hair crown
          const headGeo = _gg('hum_head_v2', () => {
            if (_scH.lathe) {
              const g = _scH.lathe([[2.2, -3.2], [3.3, -1.0], [3.4, 1.5], [2.5, 3.2], [0.2, 3.7]], 14);
              g.scale(0.95, 1.0, 1.04); return g;
            }
            return new THREE.BoxGeometry(6.5, 7, 6.5);
          });
          charGrp.add(_m(headGeo, skinMat, 0, 27.6, 0));
          const eyeParts = [];
          [-1.55, 1.55].forEach(ex => {
            const scM = _m(new THREE.BoxGeometry(1.5, 1.1, 0.18), eyeScleraMat, ex, 28.2, 3.22);
            const irM = _m(new THREE.BoxGeometry(0.95, 0.95, 0.22), eyeIrisMat, ex, 28.2, 3.28);
            const puM = _m(new THREE.BoxGeometry(0.52, 0.62, 0.26), eyePupilMat, ex, 28.2, 3.32);
            const glM = _m(new THREE.BoxGeometry(0.26, 0.26, 0.28), eyeGlintMat, ex + 0.2, 28.45, 3.35);
            charGrp.add(scM, irM, puM, glM);
            eyeParts.push(scM, irM, puM, glM);
            charGrp.add(_m(new THREE.BoxGeometry(1.65, 0.4, 0.3), darkClothMat, ex, 29.1, 3.24));
          });
          grp.userData.eyes = eyeParts;
          charGrp.add(_mb(0.9, 1.7, 1.1, skinMat, 0, 27.3, 3.55));
          charGrp.add(_m(new THREE.BoxGeometry(1.6, 0.35, 0.45), darkClothMat, 0, 25.4, 3.22));

          const hgKey = (app && app.headgear && app.headgear !== 'default') ? app.headgear : st.headgear;
          const hgParts = (cliCfg.headgear_recipes || {})[hgKey];
          if (hgParts && typeof buildSkillPartMeshes === 'function') {
            buildSkillPartMeshes(charGrp, hgParts, { shadows: true, mats: { steel: steelMat, dark: darkClothMat, torso: torsoMat, pauldron: pauldronMat, gold: goldMat } });
          } else {
            const hairGeo = _gg('hum_hair_v2', () => new THREE.SphereGeometry(3.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56));
            charGrp.add(_m(hairGeo, leatherMat, 0, 27.9, -0.2, -0.25, 0, 0));
          }
          if (!app || app.cloak !== false) {
            const cloakMat = (typeof THREE.MeshPhysicalMaterial === 'function')
              ? new THREE.MeshPhysicalMaterial({ color: trimColor, map: _clothMaps ? _clothMaps.map : null, normalMap: _clothMaps ? _clothMaps.normalMap : null, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: _clothMaps ? _clothMaps.roughnessMap : null, roughness: 0.80, sheen: 0.74, sheenRoughness: 0.72, side: THREE.DoubleSide })
              : new THREE.MeshStandardMaterial({ color: trimColor, map: _clothMaps ? _clothMaps.map : null, roughness: 0.76, side: THREE.DoubleSide });
            const cloakPivot = new THREE.Group();
            cloakPivot.position.set(0, 23.0, -3.2);
            cloakPivot.rotation.x = 0.16;
            const cloakGeo = _gg('hum_cloak_v2', () => new THREE.CylinderGeometry(4.2, 6.8, 17, 10, 1, true, Math.PI * 0.72, Math.PI * 0.56));
            const cloakMesh = new THREE.Mesh(cloakGeo, cloakMat);
            cloakMesh.position.set(0, -8.4, 2.2);
            cloakPivot.add(cloakMesh);
            charGrp.add(cloakPivot);
            grp.userData.cloakMesh = cloakPivot;
            if (grp.userData.lwMaterials) grp.userData.lwMaterials.cloakMat = cloakMat;
          }

          const hp = (cliCfg.hero_presets && cliCfg.hero_presets[heroKey]) || {};
          const mounts = cliCfg.weapon_mounts || {}, mc = mounts[st.weapon] || mounts.default || {};
          const rKind = hp.right_hand || (st.weapon === 'bow' ? 'none' : st.weapon) || 'sword';
          const lKind = hp.left_hand || (st.weapon === 'bow' ? 'bow' : (mc.offhand || 'none'));
          _buildArticulatedArmAndHand({
            grp, charGrp, isRight: false, sx: 6.9, sy: 22, bScale: 1.0,
            elbowPitch: lKind === 'tome' ? -0.78 : (lKind === 'bow' ? -0.35 : -0.48),
            torsoMat, cuffMat: pauldronMat, skinMat,
            heldKind: lKind, itemScale: 1.0, itemPreset: st
          });
          grp.userData.weaponMount = _buildArticulatedArmAndHand({
            grp, charGrp, isRight: true, sx: 6.9, sy: 22, bScale: 1.0,
            elbowPitch: rKind === 'none' && lKind === 'bow' ? -0.82 : -0.52,
            torsoMat, cuffMat: pauldronMat, skinMat,
            heldKind: rKind, itemScale: 1.0, itemPreset: st,
            defaultPoseKey: (rKind === 'none' && lKind === 'bow') ? 'draw' : undefined
          });
          grp.userData.defaultHandPoses = { left: lKind || 'none', right: rKind !== 'none' ? rKind : (lKind === 'bow' ? 'draw' : 'none') };
          grp.userData.leftHandKind = lKind;
          grp.userData.rightHandKind = rKind;
      }
    }

    function addVolumetricEntity_post_p1(_E) {
      with (_E) {

        var scaleFactor = size / 48.0;
        charGrp.scale.set(scaleFactor, scaleFactor, scaleFactor);
        charGrp.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        grp.add(charGrp);

        // 4. Floating Short Type Label (Transparent background, short character type only)
        var lblKey = `lbl_short_${isMonster ? 1 : 0}_${shortType}`;
        var labelTex = cachedProcTex[lblKey];
        if (!labelTex) {
          const labelCanvas = document.createElement('canvas');
          labelCanvas.width = 256; labelCanvas.height = 64;
          const lctx = labelCanvas.getContext('2d');
          lctx.clearRect(0, 0, 256, 64);
          lctx.textAlign = 'center';
          lctx.textBaseline = 'middle';
          lctx.lineJoin = 'round';
          lctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
          lctx.lineWidth = 4.5;
          lctx.font = 'bold 24px sans-serif';
          lctx.strokeText(shortType.slice(0, 16), 128, 34);
          lctx.fillStyle = isMonster ? '#ffb4b4' : '#ffffff';
          lctx.fillText(shortType.slice(0, 16), 128, 34);
          labelTex = new THREE.CanvasTexture(labelCanvas);
          cachedProcTex[lblKey] = labelTex;
        }
        var labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
        var labelSprite = new THREE.Sprite(labelMat);
        labelSprite.scale.set(size * 1.4, size * 0.38, 1);
        var initLblY = cameraMode === '2d' ? (size + 14) : (size * 0.85);
        labelSprite.position.set(0, initLblY, cameraMode === '2d' ? -(size * 0.65) : 0);
        grp.userData.labelSprite = labelSprite;
        grp.userData.entitySize = size;
        grp.add(labelSprite);

        threeRoomGroup.add(grp);
        if (typeof registerDynamicEntity === 'function') {
          registerDynamicEntity(grp);
        } else if (typeof threeDynamicEntities !== 'undefined' && Array.isArray(threeDynamicEntities) && !threeDynamicEntities.includes(grp)) {
          threeDynamicEntities.push(grp);
        }
        return grp;
      }
    }

    function addVolumetricEntity_impl(_S, x, y, category, tokenName, color, size, label, hp, maxHp, isMonster=false, facing='east', entityId='', visualSpec=null) {
      const _E = Object.create(_S);
      Object.assign(_E, {x: x, y: y, category: category, tokenName: tokenName, color: color, size: size, label: label, hp: hp, maxHp: maxHp, isMonster: isMonster, facing: facing, entityId: entityId, visualSpec: visualSpec});
      Object.assign(_E, {shortType: undefined, cx: undefined, cz: undefined, grp: undefined, catLow: undefined, isNpc: undefined, fStr: undefined, dx: undefined, dz: undefined, vLen: undefined, faceAngle: undefined, contactTex: undefined, contactShadowGeo: undefined, contactShadowMat: undefined, contactShadowMesh: undefined, ambShadowGeo: undefined, ambShadowMat: undefined, ambShadowMesh: undefined, charGrp: undefined, lowName: undefined, skinMat: undefined, darkSkinMat: undefined, orcSkinMat: undefined, steelMat: undefined, goldMat: undefined, leatherMat: undefined, darkLeatherMat: undefined, darkClothMat: undefined, royalBlueMat: undefined, royalBlueLightMat: undefined, purpleRobeMat: undefined, boneMat: undefined, woodMat: undefined, eyeScleraMat: undefined, eyeIrisMat: undefined, eyePupilMat: undefined, eyeGlintMat: undefined, entityStoneNormal: undefined, entityBarkNormal: undefined, entityFoliageNormal: undefined, scaleFactor: undefined, lblKey: undefined, labelTex: undefined, labelMat: undefined, labelSprite: undefined, initLblY: undefined});
      addVolumetricEntity_pre_p1(_E);
      with (_E) {
        if (visualSpec && visualSpec.model_asset && Array.isArray(visualSpec.parts) && visualSpec.parts.length > 0) {
          addVolumetricEntity_spec(_E);
        } else if (isMonster) {
          addVolumetricEntity_monster(_E);
        } else {
          addVolumetricEntity_humanoid(_E);
        }
      }
      return addVolumetricEntity_post_p1(_E);
    }


