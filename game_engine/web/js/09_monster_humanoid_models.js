    function _classifyMonsterRig(lowName) {
      const cfg = (typeof getClientSkillClientCfg === 'function') ? getClientSkillClientCfg() : {};
      const skills = window.__DND_CLIENT_SKILLS__ || {};
      const rc = (cfg.rig_criteria && cfg.rig_criteria.monsters) || (skills.visual_classification && skills.visual_classification.monsters) || {};
      const shapeCrit = { spider: rc.spider, wolf: rc.wolf, skeleton: rc.skeleton, brute: rc.brute, raider: rc.raider };
      return (typeof classifyWithClientCCELM === 'function') ? classifyWithClientCCELM(lowName, shapeCrit, 0.32, 'raider') : 'raider';
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
            addLimb('lArm', -6.2, 20, 2.5, 10, 2.5, mSkin, 0, -5, 0);
            grp.userData.weaponMount = addLimb('rArm', 6.2, 20, 2.5, 10, 2.5, mSkin, 0, -5, 1.5, -0.4);
            if (typeof buildSkillPartMeshes === 'function') {
              buildSkillPartMeshes(charGrp, [...(hm.body || []), ...(isRanged ? (hm.ranged || []) : (hm.melee || []))], {
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

          const lArmPivot = new THREE.Group(), rArmPivot = new THREE.Group();
          lArmPivot.position.set(-7.0, 22, 0); rArmPivot.position.set(7.0, 22, 0);
          const armUpperGeo = _gg('hum_arm_v2', () => new THREE.CylinderGeometry(1.55, 1.25, 10.6, 10));
          const cuffGeo = _gg('hum_cuff_v2', () => new THREE.CylinderGeometry(1.48, 1.35, 3.2, 10));
          lArmPivot.add(_m(armUpperGeo, torsoMat, 0, -5.2, 0));
          lArmPivot.add(_m(cuffGeo, pauldronMat, 0, -8.5, 0));
          rArmPivot.add(_m(armUpperGeo, torsoMat, 0, -5.2, 1.5, -0.35));
          rArmPivot.add(_m(cuffGeo, pauldronMat, 0, -8.2, 2.6, -0.35));
          lArmPivot.add(_mb(2.3, 2.6, 2.4, skinMat, 0, -10.8, 0));
          rArmPivot.add(_mb(2.3, 2.6, 2.4, skinMat, 0, -10.2, 3.6));
          charGrp.add(lArmPivot); charGrp.add(rArmPivot);
          grp.userData.lArm = lArmPivot; grp.userData.rArm = rArmPivot;

          const weaponGrp = new THREE.Group();
          weaponGrp.name = 'weaponGroup';
          if (typeof _buildSkillWeaponMesh === 'function') {
            const mounts = cliCfg.weapon_mounts || {}, mc = mounts[st.weapon] || mounts.default || { pos: [7, 13.5, 5], rot: [0.7854, 0, 0] };
            const rMesh = _buildSkillWeaponMesh(st.weapon, 1.0, st);
            if (rMesh) { rMesh.position.set(...mc.pos); rMesh.rotation.set(...mc.rot); weaponGrp.add(rMesh); }
            if (mc.offhand) {
              const lMesh = _buildSkillWeaponMesh(mc.offhand, 1.0, st);
              if (lMesh) { lMesh.position.set(...mc.off_pos); if (mc.off_rot) lMesh.rotation.set(...mc.off_rot); weaponGrp.add(lMesh); }
            }
          }
          grp.userData.weaponMount = rArmPivot;
          charGrp.add(weaponGrp);
          grp.userData.weaponGroup = weaponGrp;
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


