"""
High-Fidelity Procedural 3D GLTF/GLB Asset Generator for Aeonward Game Engine
Implements 3d-graphics-and-realism Tiers 3-4:
- Physically bounded albedos, Sobel tangent-space normal maps, and roughness/AO maps
- Beveled/chamfered edges on crates, chests, tables, altars, sarcophagi, and pedestals
- Multi-part sculpted geometry with structural trim, rivets/bands, and organic asymmetry
"""

import math
import io
import struct
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def pad_space(b: bytes, n: int = 4) -> bytes:
    pad_len = (n - (len(b) % n)) % n
    return b + b' ' * pad_len


def pad_zero(b: bytes, n: int = 4) -> bytes:
    pad_len = (n - (len(b) % n)) % n
    return b + b'\x00' * pad_len


class GLTFModel:
    def __init__(self, name="DND_Model"):
        self.name = name
        self.images = []      # list of PNG bytes
        self.textures = []    # list of {'source': int}
        self.materials = []   # list of PBR materials
        self.primitives = []  # list of dicts with pos, norm, uv, ind, material

    def add_texture_image(self, pil_img: Image.Image) -> int:
        bio = io.BytesIO()
        pil_img.save(bio, format='PNG', optimize=True)
        png_bytes = bio.getvalue()
        img_idx = len(self.images)
        self.images.append(png_bytes)
        tex_idx = len(self.textures)
        self.textures.append({'source': img_idx})
        return tex_idx

    def add_pbr_material(self, name: str, base_tex: int = None, color_factor: list = None,
                         metallic: float = 0.08, roughness: float = 0.78,
                         emissive_factor: list = None, normal_tex: int = None,
                         normal_scale: float = 0.85, mr_tex: int = None,
                         ao_tex: int = None, double_sided: bool = False) -> int:
        mat = {
            'name': name,
            'pbrMetallicRoughness': {
                'metallicFactor': float(metallic),
                'roughnessFactor': float(roughness)
            }
        }
        if base_tex is not None:
            mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': base_tex}
        if mr_tex is not None:
            mat['pbrMetallicRoughness']['metallicRoughnessTexture'] = {'index': mr_tex}
        if color_factor is not None:
            mat['pbrMetallicRoughness']['baseColorFactor'] = [float(x) for x in color_factor]
        if normal_tex is not None:
            mat['normalTexture'] = {'index': normal_tex, 'scale': float(normal_scale)}
        if ao_tex is not None:
            mat['occlusionTexture'] = {'index': ao_tex, 'strength': 0.75}
        if emissive_factor is not None:
            mat['emissiveFactor'] = [float(x) for x in emissive_factor]
        if double_sided:
            mat['doubleSided'] = True
        mat_idx = len(self.materials)
        self.materials.append(mat)
        return mat_idx

    def add_mesh_primitive(self, pos, norm, uv, ind, mat_idx: int):
        p_arr = np.array(pos, dtype=np.float32)
        n_arr = np.array(norm, dtype=np.float32)
        # Re-normalize normals safely
        lens = np.linalg.norm(n_arr, axis=1, keepdims=True)
        n_arr = np.where(lens > 1e-6, n_arr / np.maximum(lens, 1e-6), np.array([[0.0, 1.0, 0.0]], dtype=np.float32))
        y_min = float(p_arr[:, 1].min()) if len(p_arr) else 0.0
        y_span = max(1.0, float(p_arr[:, 1].max()) - y_min) if len(p_arr) else 1.0
        ty = np.clip((p_arr[:, 1] - y_min) / y_span, 0.0, 1.0)
        ao_v = np.clip(0.76 + ty * 0.22 + np.clip(n_arr[:, 1], -0.5, 0.5) * 0.10, 0.62, 1.0)
        c_arr = np.stack([
            np.clip(ao_v * (0.98 + ty * 0.04), 0.58, 1.0),
            ao_v,
            np.clip(ao_v * (1.02 - ty * 0.04), 0.58, 1.0),
        ], axis=-1).astype(np.float32)
        self.primitives.append({
            'pos': p_arr,
            'norm': n_arr.astype(np.float32),
            'uv': np.array(uv, dtype=np.float32),
            'col': c_arr,
            'ind': np.array(ind, dtype=np.uint16),
            'material': mat_idx
        })

    def export_glb(self, output_path: str):
        bin_data = b''
        buffer_views = []
        accessors = []
        mesh_primitives = []

        for prim in self.primitives:
            p_ind = prim['ind']
            p_pos = prim['pos']
            p_norm = prim['norm']
            p_uv = prim['uv']

            ind_bv = len(buffer_views)
            ind_off = len(bin_data)
            ind_bytes = p_ind.tobytes()
            bin_data += pad_zero(ind_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': ind_off, 'byteLength': len(ind_bytes), 'target': 34963})

            pos_bv = len(buffer_views)
            pos_off = len(bin_data)
            pos_bytes = p_pos.tobytes()
            bin_data += pad_zero(pos_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': pos_off, 'byteLength': len(pos_bytes), 'target': 34962})

            norm_bv = len(buffer_views)
            norm_off = len(bin_data)
            norm_bytes = p_norm.tobytes()
            bin_data += pad_zero(norm_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': norm_off, 'byteLength': len(norm_bytes), 'target': 34962})

            uv_bv = len(buffer_views)
            uv_off = len(bin_data)
            uv_bytes = p_uv.tobytes()
            bin_data += pad_zero(uv_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': uv_off, 'byteLength': len(uv_bytes), 'target': 34962})

            p_col = prim['col']
            col_bv = len(buffer_views)
            col_off = len(bin_data)
            col_bytes = p_col.tobytes()
            bin_data += pad_zero(col_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': col_off, 'byteLength': len(col_bytes), 'target': 34962})

            ind_acc = len(accessors)
            accessors.append({
                'bufferView': ind_bv, 'componentType': 5123, 'count': len(p_ind),
                'type': 'SCALAR', 'max': [int(p_ind.max())], 'min': [int(p_ind.min())]
            })
            pos_acc = len(accessors)
            accessors.append({
                'bufferView': pos_bv, 'componentType': 5126, 'count': len(p_pos),
                'type': 'VEC3', 'max': p_pos.max(axis=0).tolist(), 'min': p_pos.min(axis=0).tolist()
            })
            norm_acc = len(accessors)
            accessors.append({
                'bufferView': norm_bv, 'componentType': 5126, 'count': len(p_norm),
                'type': 'VEC3', 'max': p_norm.max(axis=0).tolist(), 'min': p_norm.min(axis=0).tolist()
            })
            uv_acc = len(accessors)
            accessors.append({
                'bufferView': uv_bv, 'componentType': 5126, 'count': len(p_uv),
                'type': 'VEC2', 'max': p_uv.max(axis=0).tolist(), 'min': p_uv.min(axis=0).tolist()
            })
            col_acc = len(accessors)
            accessors.append({
                'bufferView': col_bv, 'componentType': 5126, 'count': len(p_col),
                'type': 'VEC3', 'max': p_col.max(axis=0).tolist(), 'min': p_col.min(axis=0).tolist()
            })

            mesh_primitives.append({
                'attributes': {'POSITION': pos_acc, 'NORMAL': norm_acc, 'TEXCOORD_0': uv_acc, 'COLOR_0': col_acc},
                'indices': ind_acc,
                'material': prim['material']
            })

        gltf_images = []
        for img_bytes in self.images:
            img_bv = len(buffer_views)
            img_off = len(bin_data)
            bin_data += pad_zero(img_bytes)
            buffer_views.append({'buffer': 0, 'byteOffset': img_off, 'byteLength': len(img_bytes)})
            gltf_images.append({'bufferView': img_bv, 'mimeType': 'image/png'})

        gltf = {
            'asset': {'version': '2.0', 'generator': 'Aeonward PBR Realistic GLTF Generator v2'},
            'buffers': [{'byteLength': len(bin_data)}],
            'bufferViews': buffer_views,
            'accessors': accessors,
            'materials': self.materials,
            'meshes': [{'name': self.name, 'primitives': mesh_primitives}],
            'nodes': [{'mesh': 0, 'name': self.name}],
            'scenes': [{'nodes': [0]}],
            'scene': 0
        }
        if gltf_images:
            gltf['images'] = gltf_images
            gltf['textures'] = self.textures

        json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
        json_pad = pad_space(json_bytes, 4)
        bin_pad = pad_zero(bin_data, 4)

        total_length = 12 + 8 + len(json_pad) + 8 + len(bin_pad)
        header = struct.pack('<4sII', b'glTF', 2, total_length)
        chunk0 = struct.pack('<I4s', len(json_pad), b'JSON') + json_pad
        chunk1 = struct.pack('<I4s', len(bin_pad), b'BIN\x00') + bin_pad

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(header + chunk0 + chunk1)
        print(f"Exported: {output_path} ({len(header) + len(chunk0) + len(chunk1)} bytes)")


# =========================================================================
# REALISTIC HEIGHTFIELD-TO-PBR TEXTURE GENERATION (Tier 3)
# =========================================================================

def _heightfield_to_normal_img(h: np.ndarray, strength: float = 3.2) -> Image.Image:
    """Sobel tangent-space normal map computed directly from surface heightfield."""
    gx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    gy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    nz = np.ones_like(h)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + nz * nz + 1e-8)
    nx = (-gx * inv * 0.5 + 0.5) * 255.0
    ny = (-gy * inv * 0.5 + 0.5) * 255.0
    nzz = (nz * inv * 0.5 + 0.5) * 255.0
    rgb = np.stack([nx, ny, nzz], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgb, 'RGB')


def _make_mr_ao_imgs(rough_arr: np.ndarray, metal_val: float, ao_arr: np.ndarray):
    """glTF metallicRoughnessTexture (G=roughness, B=metalness) and occlusionTexture."""
    h, w = rough_arr.shape
    mr = np.zeros((h, w, 3), dtype=np.uint8)
    mr[:, :, 0] = 255
    mr[:, :, 1] = np.clip(rough_arr * 255.0, 25, 250).astype(np.uint8)
    mr[:, :, 2] = int(np.clip(metal_val * 255.0, 0, 255))
    ao_u8 = np.clip(ao_arr * 255.0, 45, 255).astype(np.uint8)
    return Image.fromarray(mr, 'RGB'), Image.fromarray(np.stack([ao_u8, ao_u8, ao_u8], axis=-1), 'RGB')


def create_wood_texture(w=256, h=256, base_rgb=(132, 88, 46), dark_rgb=(70, 44, 22)) -> Image.Image:
    return create_pbr_wood_maps(w, h, base_rgb, dark_rgb)[0]


def create_pbr_wood_maps(w=256, h=256, base_rgb=(132, 88, 46), dark_rgb=(70, 44, 22)):
    """Produces weathered oak/timber albedo + correlated normal + roughness + AO maps."""
    rng = np.random.default_rng(101)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    plank_w = max(24.0, w / 6.0)
    plank_idx = np.floor(xx / plank_w)
    plank_u = (xx % plank_w) / plank_w
    seam = np.minimum(plank_u, 1.0 - plank_u)
    seam_groove = np.clip((0.065 - seam) / 0.065, 0.0, 1.0)

    knot = 7.0 * np.exp(-(((xx - w * 0.35) ** 2 + (yy - h * 0.48) ** 2) / 380.0))
    wave = np.sin(yy * 0.055 + plank_idx * 2.1) * 5.5 + np.sin(xx * 0.04) * 2.8 + knot
    rings = np.sin((xx + wave) * 0.46 + plank_idx * 0.7) * 0.5 + 0.5
    pores = np.sin(yy * 1.45 + rng.uniform(-0.35, 0.35, (h, w))) * 0.14 + rng.normal(0.0, 0.07, (h, w))
    height = np.clip((0.66 + 0.28 * rings + pores * 0.24) * (1.0 - 0.72 * seam_groove), 0.05, 1.0)

    # Localized edge dirt, oiled wear & per-plank warm/walnut variety
    wear = np.sin(xx * 0.035) * np.cos(yy * 0.035) * 0.5 + 0.5
    plank_tint = 0.84 + 0.28 * ((plank_idx * 0.618) % 1.0)
    arr = np.zeros((h, w, 3), dtype=np.float32)
    warm_bias = (1.04, 1.00, 0.94)
    for c in range(3):
        col = (base_rgb[c] * (1.0 - rings * 0.44) + dark_rgb[c] * (rings * 0.44)) * plank_tint * warm_bias[c]
        col *= (1.0 - seam_groove * 0.66)
        col = np.clip(col + pores * 22.0, 26, 224)
        arr[:, :, c] = col

    rough = np.clip(0.84 - wear * 0.30 + seam_groove * 0.16 - rings * 0.10, 0.34, 0.96)
    ao = np.clip(1.0 - seam_groove * 0.62 - (1.0 - rings) * 0.10, 0.32, 1.0)
    albedo_img = Image.fromarray(arr.astype(np.uint8), 'RGB')
    norm_img = _heightfield_to_normal_img(height, strength=3.8)
    mr_img, ao_img = _make_mr_ao_imgs(rough, 0.04, ao)
    return albedo_img, norm_img, mr_img, ao_img


def create_stone_texture(w=256, h=256, base_rgb=(105, 110, 118), dark_rgb=(54, 58, 64)) -> Image.Image:
    return create_pbr_stone_maps(w, h, base_rgb, dark_rgb)[0]


def create_pbr_stone_maps(w=256, h=256, base_rgb=(105, 110, 118), dark_rgb=(54, 58, 64), moss=True):
    """Chiseled ashlar/granite stone with mortar seams, mineral grain, moss, and height normals."""
    rng = np.random.default_rng(202)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    row_h, col_w = h / 4.0, w / 2.0
    row_i = np.floor(yy / row_h)
    x_shift = xx + (row_i % 2) * (col_w * 0.5)
    u = (x_shift % col_w) / col_w
    v = (yy % row_h) / row_h
    edge = np.minimum(np.minimum(u, 1.0 - u), np.minimum(v, 1.0 - v))
    mortar = np.clip((0.065 - edge) / 0.065, 0.0, 1.0)

    multi_noise = (
        np.sin(xx * 0.07) * np.cos(yy * 0.08) * 0.25
        + np.sin((xx + yy) * 0.19) * 0.15
        + rng.uniform(-0.18, 0.18, (h, w))
    )
    height = np.clip((0.72 + multi_noise * 0.35) * (1.0 - 0.72 * mortar), 0.05, 1.0)
    block_var = 0.90 + 0.18 * (((row_i * 3.0 + np.floor(x_shift / col_w)) * 0.37) % 1.0)

    arr = np.zeros((h, w, 3), dtype=np.float32)
    fleck = np.clip(0.55 + multi_noise, 0.0, 1.0)
    for c in range(3):
        col = (dark_rgb[c] + (base_rgb[c] - dark_rgb[c]) * fleck) * block_var
        col = col * (1.0 - mortar * 0.52) + dark_rgb[c] * 0.45 * mortar
        arr[:, :, c] = np.clip(col, 24, 220)

    if moss:
        moss_mask = np.clip(mortar * 0.85 + np.sin(xx * 0.05 + yy * 0.04) * 0.35 - 0.35, 0.0, 0.75)
        arr[:, :, 0] = arr[:, :, 0] * (1.0 - moss_mask) + 48.0 * moss_mask
        arr[:, :, 1] = arr[:, :, 1] * (1.0 - moss_mask) + 74.0 * moss_mask
        arr[:, :, 2] = arr[:, :, 2] * (1.0 - moss_mask) + 40.0 * moss_mask

    rough = np.clip(0.76 + mortar * 0.20 - multi_noise * 0.18, 0.45, 0.96)
    ao = np.clip(1.0 - mortar * 0.58 - (1.0 - fleck) * 0.12, 0.30, 1.0)
    return Image.fromarray(arr.astype(np.uint8), 'RGB'), _heightfield_to_normal_img(height, 4.2), *_make_mr_ao_imgs(rough, 0.03, ao)


def create_metal_texture(w=256, h=256, metal_type="steel") -> Image.Image:
    return create_pbr_metal_maps(w, h, metal_type)[0]


def create_pbr_metal_maps(w=256, h=256, metal_type="steel"):
    """Brushed/forged metal with anisotropic grain, hammered relief, and crevice patina."""
    rng = np.random.default_rng(303)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    brush = np.sin(yy * 1.15 + np.sin(xx * 0.045) * 2.2) * 0.5 + 0.5
    hammer = np.sin(xx * 0.22) * np.sin(yy * 0.22 + 0.6) * 0.5 + 0.5
    pit = rng.normal(0.0, 0.09, (h, w))
    grime = np.clip(np.sin(xx * 0.045) * np.cos(yy * 0.045) * 0.5 + 0.38, 0.0, 1.0)

    if metal_type == "gold":
        base = (212, 164, 58)
        r_base, m_val = 0.22, 0.94
    elif metal_type == "iron":
        base = (64, 67, 74)
        r_base, m_val = 0.44, 0.88
    else:
        base = (178, 186, 198)
        r_base, m_val = 0.26, 0.93

    height = np.clip(0.54 + brush * 0.18 + hammer * 0.14 + pit * 0.24, 0.0, 1.0)
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = np.clip(base[c] * (0.82 + brush * 0.24 + hammer * 0.10 + pit * 0.15) - grime * 16.0, 28, 226)
    rough = np.clip(r_base + grime * 0.28 + (1.0 - brush) * 0.12 - hammer * 0.06, 0.14, 0.85)
    ao = np.clip(1.0 - grime * 0.34, 0.50, 1.0)
    return Image.fromarray(arr.astype(np.uint8), 'RGB'), _heightfield_to_normal_img(height, 2.8), *_make_mr_ao_imgs(rough, m_val, ao)


def create_gem_texture(w=128, h=128, rgb=(46, 210, 85)) -> Image.Image:
    """Produces faceted crystalline refraction shards with internal veins and specular ridges."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    f1 = np.abs(np.sin(xx * 0.14 + yy * 0.19))
    f2 = np.abs(np.sin(-xx * 0.18 + yy * 0.13 + 1.2))
    vein = np.clip(1.0 - np.abs(f1 - f2) * 8.0, 0.0, 1.0)
    core = 0.62 + 0.32 * f1 + 0.18 * f2 + 0.38 * vein
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = np.clip(rgb[c] * core + vein * 55.0, 26, 228)
    return Image.fromarray(arr.astype(np.uint8), 'RGB')


# =========================================================================
# 3D GEOMETRY PRIMITIVE BUILDERS (WITH BEVELED EDGES - TIER 4 #1)
# =========================================================================

def _merge_parts(parts_list):
    """Combines multiple (pos, norm, uv, ind) tuples into one clean primitive."""
    all_p, all_n, all_u, all_i = [], [], [], []
    off = 0
    for p, n, u, ind in parts_list:
        all_p.append(p)
        all_n.append(n)
        all_u.append(u)
        all_i.append(ind.astype(np.uint32) + off)
        off += len(p)
    return (
        np.vstack(all_p).astype(np.float32),
        np.vstack(all_n).astype(np.float32),
        np.vstack(all_u).astype(np.float32),
        np.concatenate(all_i).astype(np.uint16),
    )


def build_box_mesh(dx, dy, dz, cx=0, cy=0, cz=0):
    """Generates standard 6-face box with normals and UV coordinates."""
    hx, hy, hz = dx / 2, dy / 2, dz / 2
    v = [
        cx - hx, cy - hy, cz + hz,   cx + hx, cy - hy, cz + hz,   cx + hx, cy + hy, cz + hz,   cx - hx, cy + hy, cz + hz,
        cx + hx, cy - hy, cz - hz,   cx - hx, cy - hy, cz - hz,   cx - hx, cy + hy, cz - hz,   cx + hx, cy + hy, cz - hz,
        cx - hx, cy + hy, cz + hz,   cx + hx, cy + hy, cz + hz,   cx + hx, cy + hy, cz - hz,   cx - hx, cy + hy, cz - hz,
        cx - hx, cy - hy, cz - hz,   cx + hx, cy - hy, cz - hz,   cx + hx, cy - hy, cz + hz,   cx - hx, cy - hy, cz + hz,
        cx + hx, cy - hy, cz + hz,   cx + hx, cy - hy, cz - hz,   cx + hx, cy + hy, cz - hz,   cx + hx, cy + hy, cz + hz,
        cx - hx, cy - hy, cz - hz,   cx - hx, cy - hy, cz + hz,   cx - hx, cy + hy, cz + hz,   cx - hx, cy + hy, cz - hz,
    ]
    n = [
        0,0,1, 0,0,1, 0,0,1, 0,0,1,
        0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
        0,1,0, 0,1,0, 0,1,0, 0,1,0,
        0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
    ]
    uv = [0,1, 1,1, 1,0, 0,0] * 6
    ind = []
    for f in range(6):
        b = f * 4
        ind.extend([b, b+1, b+2, b, b+2, b+3])
    return (np.array(v, dtype=np.float32).reshape(-1, 3),
            np.array(n, dtype=np.float32).reshape(-1, 3),
            np.array(uv, dtype=np.float32).reshape(-1, 2),
            np.array(ind, dtype=np.uint16))


def build_beveled_box_mesh(dx, dy, dz, bevel=None, cx=0, cy=0, cz=0):
    """Generates a chamfered/beveled box so edges catch crisp specular rim highlights."""
    b = min(dx, dy, dz) * 0.14 if bevel is None else min(bevel, min(dx, dy, dz) * 0.35)
    if b <= 0.05:
        return build_box_mesh(dx, dy, dz, cx, cy, cz)
    ix, iy, iz = max(0.05, dx * 0.5 - b), max(0.05, dy * 0.5 - b), max(0.05, dz * 0.5 - b)
    # Build subdivided cube (3x3x3 grid on surface) and project corners onto rounded box envelope
    # Clean closed-manifold beveled cube via subdivided sphere-like cube projection:
    segs = 3  # 0..3 -> creates 1 bevel ring near every edge
    coords = [-1.0, -(ix / (dx * 0.5)), (ix / (dx * 0.5)), 1.0]
    pos, norm, uvs, ind = [], [], [], []
    faces = [
        ((0, 0, 1), (1, 0, 0), (0, 1, 0)),   # +Z
        ((0, 0, -1), (-1, 0, 0), (0, 1, 0)), # -Z
        ((0, 1, 0), (1, 0, 0), (0, 0, -1)),  # +Y
        ((0, -1, 0), (1, 0, 0), (0, 0, 1)),  # -Y
        ((1, 0, 0), (0, 0, -1), (0, 1, 0)),  # +X
        ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),  # -X
    ]
    hx, hy, hz = dx * 0.5, dy * 0.5, dz * 0.5
    for fn, fu, fv in faces:
        base_v = len(pos)
        for j in range(segs + 1):
            tv = coords[j]
            for i in range(segs + 1):
                tu = coords[i]
                px = fn[0] * hx + fu[0] * tu * hx + fv[0] * tv * hx
                py = fn[1] * hy + fu[1] * tu * hy + fv[1] * tv * hy
                pz = fn[2] * hz + fu[2] * tu * hz + fv[2] * tv * hz
                # Clamp to inner core & push outward along corner normal by bevel radius b
                qx = max(-ix, min(ix, px))
                qy = max(-iy, min(iy, py))
                qz = max(-iz, min(iz, pz))
                ox, oy, oz = px - qx, py - qy, pz - qz
                olen = math.sqrt(ox * ox + oy * oy + oz * oz)
                if olen > 1e-6:
                    nx, ny, nz = ox / olen, oy / olen, oz / olen
                    px, py, pz = qx + nx * b, qy + ny * b, qz + nz * b
                else:
                    nx, ny, nz = fn
                pos.append([cx + px, cy + py, cz + pz])
                norm.append([nx, ny, nz])
                uvs.append([i / segs, 1.0 - j / segs])
        stride = segs + 1
        for j in range(segs):
            for i in range(segs):
                a = base_v + j * stride + i
                b_i = a + 1
                c_i = a + stride
                d_i = c_i + 1
                ind.extend([a, b_i, d_i, a, d_i, c_i])
    return (np.array(pos, dtype=np.float32),
            np.array(norm, dtype=np.float32),
            np.array(uvs, dtype=np.float32),
            np.array(ind, dtype=np.uint16))


def build_cylinder_mesh(r_top, r_bottom, height, segments=16, cx=0, cy=0, cz=0):
    """Generates cylinder with caps, normals, and UVs."""
    pos, norm, uvs, ind = [], [], [], []
    half_h = height / 2
    slope_r = r_bottom - r_top
    slope_len = math.hypot(height, slope_r) or 1.0
    ny_slope = slope_r / slope_len
    nr_slope = height / slope_len

    for s in range(segments + 1):
        ang = (s / segments) * 2 * math.pi
        cos_a, sin_a = math.cos(ang), math.sin(ang)
        u = s / segments
        pos.append([cx + r_bottom * cos_a, cy - half_h, cz + r_bottom * sin_a])
        norm.append([cos_a * nr_slope, ny_slope, sin_a * nr_slope])
        uvs.append([u, 1.0])
        pos.append([cx + r_top * cos_a, cy + half_h, cz + r_top * sin_a])
        norm.append([cos_a * nr_slope, ny_slope, sin_a * nr_slope])
        uvs.append([u, 0.0])

    for s in range(segments):
        b = s * 2
        ind.extend([b, b+1, b+3, b, b+3, b+2])

    top_center_idx = len(pos)
    pos.append([cx, cy + half_h, cz]); norm.append([0, 1, 0]); uvs.append([0.5, 0.5])
    for s in range(segments + 1):
        ang = (s / segments) * 2 * math.pi
        pos.append([cx + r_top * math.cos(ang), cy + half_h, cz + r_top * math.sin(ang)])
        norm.append([0, 1, 0]); uvs.append([0.5 + 0.5 * math.cos(ang), 0.5 + 0.5 * math.sin(ang)])
    for s in range(segments):
        curr = top_center_idx + 1 + s
        ind.extend([top_center_idx, curr + 1, curr])

    bot_center_idx = len(pos)
    pos.append([cx, cy - half_h, cz]); norm.append([0, -1, 0]); uvs.append([0.5, 0.5])
    for s in range(segments + 1):
        ang = (s / segments) * 2 * math.pi
        pos.append([cx + r_bottom * math.cos(ang), cy - half_h, cz + r_bottom * math.sin(ang)])
        norm.append([0, -1, 0]); uvs.append([0.5 + 0.5 * math.cos(ang), 0.5 + 0.5 * math.sin(ang)])
    for s in range(segments):
        curr = bot_center_idx + 1 + s
        ind.extend([bot_center_idx, curr, curr + 1])

    return (np.array(pos, dtype=np.float32),
            np.array(norm, dtype=np.float32),
            np.array(uvs, dtype=np.float32),
            np.array(ind, dtype=np.uint16))


def build_sphere_mesh(radius, lat_segs=12, lon_segs=16, cx=0, cy=0, cz=0):
    """Generates smooth UV sphere."""
    pos, norm, uvs, ind = [], [], [], []
    for lat in range(lat_segs + 1):
        theta = (lat / lat_segs) * math.pi
        sin_t, cos_t = math.sin(theta), math.cos(theta)
        for lon in range(lon_segs + 1):
            phi = (lon / lon_segs) * 2 * math.pi
            sin_p, cos_p = math.sin(phi), math.cos(phi)
            nx, ny, nz = sin_t * cos_p, cos_t, sin_t * sin_p
            pos.append([cx + radius * nx, cy + radius * ny, cz + radius * nz])
            norm.append([nx, ny, nz])
            uvs.append([lon / lon_segs, lat / lat_segs])
    for lat in range(lat_segs):
        for lon in range(lon_segs):
            first = lat * (lon_segs + 1) + lon
            second = first + lon_segs + 1
            ind.extend([first, second, first + 1, second, second + 1, first + 1])
    return (np.array(pos, dtype=np.float32),
            np.array(norm, dtype=np.float32),
            np.array(uvs, dtype=np.float32),
            np.array(ind, dtype=np.uint16))


def build_torus_mesh(major_r, minor_r, maj_segs=18, min_segs=10, cx=0, cy=0, cz=0, axis='y'):
    """Generates torus ring for rims, collars, and key bows."""
    pos, norm, uvs, ind = [], [], [], []
    for i in range(maj_segs + 1):
        u = i / maj_segs * 2 * math.pi
        cu, su = math.cos(u), math.sin(u)
        for j in range(min_segs + 1):
            v = j / min_segs * 2 * math.pi
            cv, sv = math.cos(v), math.sin(v)
            r = major_r + minor_r * cv
            px, py, pz = r * cu, minor_r * sv, r * su
            nx, ny, nz = cv * cu, sv, cv * su
            if axis == 'x':
                px, py, pz = py, px, pz
                nx, ny, nz = ny, nx, nz
            elif axis == 'z':
                px, py, pz = px, pz, py
                nx, ny, nz = nx, nz, ny
            pos.append([cx + px, cy + py, cz + pz])
            norm.append([nx, ny, nz])
            uvs.append([i / maj_segs, j / min_segs])
    for i in range(maj_segs):
        for j in range(min_segs):
            a = i * (min_segs + 1) + j
            b = a + min_segs + 1
            ind.extend([a, b, a + 1, b, b + 1, a + 1])
    return (np.array(pos, dtype=np.float32),
            np.array(norm, dtype=np.float32),
            np.array(uvs, dtype=np.float32),
            np.array(ind, dtype=np.uint16))


def _compute_normals(p, ind):
    """Computes smooth area-weighted vertex normals from positions and triangle indices."""
    norms = np.zeros_like(p, dtype=np.float32)
    i0, i1, i2 = ind[0::3], ind[1::3], ind[2::3]
    fn = np.cross(p[i1] - p[i0], p[i2] - p[i0])
    np.add.at(norms, i0, fn)
    np.add.at(norms, i1, fn)
    np.add.at(norms, i2, fn)
    lens = np.linalg.norm(norms, axis=1, keepdims=True)
    lens = np.where(lens > 1e-6, lens, 1.0)
    return (norms / lens).astype(np.float32)


def _facet_part(part):
    """Unwelds triangles for crisp flat-shaded facets (crystals, fractured stone)."""
    p, _, uv, ind = part
    fp = p[ind]
    fuv = uv[ind]
    v0, v1, v2 = fp[0::3], fp[1::3], fp[2::3]
    fn = np.cross(v1 - v0, v2 - v0)
    lens = np.linalg.norm(fn, axis=1, keepdims=True)
    fn = fn / np.where(lens > 1e-6, lens, 1.0)
    fnorm = np.repeat(fn, 3, axis=0).astype(np.float32)
    find = np.arange(len(fp), dtype=np.uint16)
    return fp.astype(np.float32), fnorm, fuv.astype(np.float32), find


def build_lathe_mesh(profile_ry, segments=22, flutes=0, flute_amp=0.0, twist=0.0,
                     cx=0, cy=0, cz=0, cap_bottom=True, cap_top=True):
    """Revolves a (radius, y) silhouette profile into a closed sculpted 3D form."""
    pos, uvs, ind = [], [], []
    rows = len(profile_ry)
    y_min = profile_ry[0][1]
    y_span = max(0.01, profile_ry[-1][1] - y_min)
    for j, (r_base, y) in enumerate(profile_ry):
        v_coord = (y - y_min) / y_span
        for i in range(segments + 1):
            ang = (i / segments) * 2.0 * math.pi
            flute = 1.0 + flute_amp * math.cos(flutes * (ang + twist * v_coord)) if flutes > 0 and r_base > 0.2 else 1.0
            r = max(0.0, r_base * flute)
            pos.append([cx + r * math.cos(ang), cy + y, cz + r * math.sin(ang)])
            uvs.append([i / segments, v_coord])
    stride = segments + 1
    for j in range(rows - 1):
        for i in range(segments):
            a = j * stride + i
            b = a + stride
            ind.extend([a, a + 1, b, a + 1, b + 1, b])
    if cap_bottom and profile_ry[0][0] > 0.05:
        c_idx = len(pos)
        pos.append([cx, cy + profile_ry[0][1], cz])
        uvs.append([0.5, 0.0])
        for i in range(segments):
            ind.extend([c_idx, i + 1, i])
    if cap_top and profile_ry[-1][0] > 0.05:
        c_idx = len(pos)
        pos.append([cx, cy + profile_ry[-1][1], cz])
        uvs.append([0.5, 1.0])
        top_off = (rows - 1) * stride
        for i in range(segments):
            ind.extend([c_idx, top_off + i, top_off + i + 1])
    pa = np.array(pos, dtype=np.float32)
    ia = np.array(ind, dtype=np.uint16)
    return pa, _compute_normals(pa, ia), np.array(uvs, dtype=np.float32), ia


def build_crystal_shard_mesh(height=16.0, base_r=3.2, tip_h=5.2, cx=0, cy=0, cz=0):
    """Generates a razor-faceted hexagonal quartz prism with pyramidal termination."""
    shaft_h = max(1.0, height - tip_h)
    prof = [(base_r * 0.85, 0.0), (base_r, shaft_h * 0.35), (base_r * 0.92, shaft_h), (0.01, height)]
    return _facet_part(build_lathe_mesh(prof, segments=6, cap_bottom=True, cap_top=False, cx=cx, cy=cy, cz=cz))


def build_crystal_cluster_mesh(count=7, max_h=19.0, base_r=3.2, seed=1, cx=0, cy=0, cz=0):
    """Generates an asymmetric radial geode cluster of pointed hexagonal crystals."""
    parts = [build_crystal_shard_mesh(max_h, base_r * 1.15, tip_h=max_h * 0.32, cx=cx, cy=cy, cz=cz)]
    for i in range(1, count):
        ang = (i / (count - 1)) * 2.0 * math.pi + seed * 0.73
        tilt = 0.28 + 0.14 * ((i * 7 + seed) % 3)
        h_i = max_h * (0.48 + 0.36 * math.sin(i * 1.9 + seed))
        r_i = base_r * (0.55 + 0.25 * math.cos(i * 2.3))
        shard = build_crystal_shard_mesh(h_i, r_i, tip_h=h_i * 0.34)
        off_r = base_r * 0.95
        shard = _rot_part(shard, rx=tilt, ry=ang,
                          tx=cx + math.cos(ang) * off_r, ty=cy + 0.4, tz=cz + math.sin(ang) * off_r)
        parts.append(shard)
    return _merge_parts(parts)


def build_sculpted_flame_mesh(height=15.0, radius=6.5, tongues=6, seed=1, cx=0, cy=0, cz=0):
    """Generates dynamic multi-tongue undulating fire plumes instead of sphere blobs."""
    parts = []
    # Inner ember heart
    core = build_lathe_mesh([(radius * 0.72, 0.0), (radius * 0.62, height * 0.24), (radius * 0.28, height * 0.62), (0.01, height * 0.95)], segments=10, flutes=5, flute_amp=0.22, twist=2.2)
    parts.append(_rot_part(core, tx=cx, ty=cy, tz=cz))
    for i in range(tongues):
        ang = (i / tongues) * 2.0 * math.pi + seed * 0.5
        h_i = height * (0.68 + 0.32 * math.sin(i * 2.1 + seed))
        r_i = radius * (0.28 + 0.12 * (i % 2))
        rows = 6
        prof = []
        for k in range(rows):
            t = k / (rows - 1)
            rk = r_i * math.sin((1.0 - t) * math.pi * 0.65) * (1.0 - 0.55 * t)
            prof.append((max(0.02, rk), t * h_i))
        tongue = build_lathe_mesh(prof, segments=7, flutes=3, flute_amp=0.25, twist=1.6)
        rad_off = radius * 0.42
        parts.append(_rot_part(tongue, rx=0.22, rz=-0.18 + 0.12 * math.sin(i), ry=ang,
                               tx=cx + math.cos(ang) * rad_off, ty=cy, tz=cz + math.sin(ang) * rad_off))
    return _merge_parts(parts)


def build_faceted_rock_mesh(rx=16.0, ry=12.0, rz=15.0, seed=1, cx=0, cy=0, cz=0):
    """Generates a craggy cleavage-fractured flat-shaded rock mass with planted base."""
    p, _, uv, ind = build_sphere_mesh(1.0, lat_segs=9, lon_segs=12)
    planes = [
        (0.58, 0.72, 0.38, 0.68), (-0.65, 0.55, 0.52, 0.66), (0.25, 0.40, -0.88, 0.64),
        (0.75, -0.25, -0.61, 0.72), (-0.70, 0.68, -0.22, 0.70), (0.0, 0.96, 0.28, 0.74),
    ]
    out_p = p.copy()
    for v_idx in range(len(out_p)):
        x, y, z = out_p[v_idx]
        ridge = 0.86 + 0.18 * math.sin(x * 3.8 + seed) * math.cos(z * 4.1 - seed)
        vx, vy, vz = x * ridge, y * ridge, z * ridge
        for a, b, c, lim in planes:
            d = vx * a + vy * b + vz * c
            if d > lim:
                excess = (d - lim) * 0.75
                vx -= a * excess; vy -= b * excess; vz -= c * excess
        out_p[v_idx] = [cx + vx * rx, cy + max(0.0, (vy + 0.52) * ry * 0.68), cz + vz * rz]
    return _facet_part((out_p, None, uv, ind))


def build_spoked_wheel_mesh(radius=10.0, rim_w=2.4, spokes=8, cx=0, cy=0, cz=0):
    """Generates a realistic open-spoked carriage wheel oriented in the XY plane."""
    parts = [
        build_torus_mesh(radius - 0.85, 0.95, 20, 8, cx=cx, cy=cy, cz=cz, axis='z'),
        _rot_part(build_cylinder_mesh(2.3, 2.3, rim_w + 1.2, segments=12), rx=math.pi * 0.5, tx=cx, ty=cy, tz=cz),
    ]
    spoke_len = max(1.0, radius - 2.4)
    for si in range(spokes):
        ang = (si / spokes) * 2.0 * math.pi
        sp = build_cylinder_mesh(0.55, 0.68, spoke_len, segments=6)
        parts.append(_rot_part(sp, rz=ang, tx=cx - math.sin(ang) * (1.2 + spoke_len * 0.5),
                               ty=cy + math.cos(ang) * (1.2 + spoke_len * 0.5), tz=cz))
    return _merge_parts(parts)


def _rot_part(part, rx=0.0, ry=0.0, rz=0.0, tx=0.0, ty=0.0, tz=0.0):
    p, n, uv, ind = part
    p = p.copy(); n = n.copy()
    if rx:
        c, s = math.cos(rx), math.sin(rx)
        R = np.array([[1,0,0],[0,c,-s],[0,s,c]], dtype=np.float32)
        p = p @ R.T; n = n @ R.T
    if ry:
        c, s = math.cos(ry), math.sin(ry)
        R = np.array([[c,0,s],[0,1,0],[-s,0,c]], dtype=np.float32)
        p = p @ R.T; n = n @ R.T
    if rz:
        c, s = math.cos(rz), math.sin(rz)
        R = np.array([[c,-s,0],[s,c,0],[0,0,1]], dtype=np.float32)
        p = p @ R.T; n = n @ R.T
    p[:, 0] += tx; p[:, 1] += ty; p[:, 2] += tz
    return p, n, uv, ind


# =========================================================================
# ASSET GENERATION FACTORY
# =========================================================================

def _add_wood_mat(m: GLTFModel, name: str, base=(132, 88, 46), dark=(68, 42, 22)):
    alb, nrm, mr, ao = create_pbr_wood_maps(256, 256, base, dark)
    return m.add_pbr_material(name, m.add_texture_image(alb), normal_tex=m.add_texture_image(nrm),
                              mr_tex=m.add_texture_image(mr), ao_tex=m.add_texture_image(ao),
                              roughness=1.0, metallic=1.0)


def _add_stone_mat(m: GLTFModel, name: str, base=(110, 114, 122), dark=(54, 58, 64), moss=True):
    alb, nrm, mr, ao = create_pbr_stone_maps(256, 256, base, dark, moss=moss)
    return m.add_pbr_material(name, m.add_texture_image(alb), normal_tex=m.add_texture_image(nrm),
                              mr_tex=m.add_texture_image(mr), ao_tex=m.add_texture_image(ao),
                              roughness=1.0, metallic=1.0)


def _add_metal_mat(m: GLTFModel, name: str, kind="iron"):
    alb, nrm, mr, ao = create_pbr_metal_maps(256, 256, kind)
    return m.add_pbr_material(name, m.add_texture_image(alb), normal_tex=m.add_texture_image(nrm),
                              mr_tex=m.add_texture_image(mr), ao_tex=m.add_texture_image(ao),
                              roughness=1.0, metallic=1.0)


def generate_chest_glb(path: str):
    m = GLTFModel("TreasureChest")
    wood_mat = _add_wood_mat(m, "Wood_Oak", (138, 92, 46), (62, 36, 16))
    iron_mat = _add_metal_mat(m, "Iron_Reinforced", "iron")
    gold_mat = _add_metal_mat(m, "Gold_Lock", "gold")

    # Stepped corner feet + slatted chest body + vaulted arched stave barrel lid
    wood_parts = [
        build_beveled_box_mesh(24.0, 12.2, 16.0, bevel=0.8, cy=7.4),
        _rot_part(build_cylinder_mesh(7.8, 7.8, 23.4, segments=18), rz=math.pi * 0.5, ty=13.5),
    ]
    for fx in (-10.6, 10.6):
        for fz in (-6.8, 6.8):
            wood_parts.append(build_beveled_box_mesh(3.2, 2.2, 3.0, bevel=0.4, cx=fx, cy=1.1, cz=fz))
    m.add_mesh_primitive(*_merge_parts(wood_parts), wood_mat)

    bands = [
        build_beveled_box_mesh(24.8, 1.5, 16.8, bevel=0.3, cy=13.2),
        build_beveled_box_mesh(24.6, 1.4, 16.6, bevel=0.3, cy=2.4),
        build_beveled_box_mesh(1.8, 13.0, 16.8, bevel=0.3, cx=-8.6, cy=7.8),
        build_beveled_box_mesh(1.8, 13.0, 16.8, bevel=0.3, cx=8.6, cy=7.8),
        _rot_part(build_cylinder_mesh(8.15, 8.15, 1.9, segments=18), rz=math.pi * 0.5, tx=-8.6, ty=13.5),
        _rot_part(build_cylinder_mesh(8.15, 8.15, 1.9, segments=18), rz=math.pi * 0.5, tx=8.6, ty=13.5),
    ]
    m.add_mesh_primitive(*_merge_parts(bands), iron_mat)

    lock = [
        build_beveled_box_mesh(4.2, 5.2, 1.4, bevel=0.35, cy=11.0, cz=8.5),
        build_torus_mesh(1.2, 0.3, 12, 8, cx=0, cy=9.6, cz=9.2, axis='z'),
        build_beveled_box_mesh(1.2, 1.2, 0.8, bevel=0.15, cx=-9.2, cy=12.6, cz=8.3),
        build_beveled_box_mesh(1.2, 1.2, 0.8, bevel=0.15, cx=9.2, cy=12.6, cz=8.3),
    ]
    m.add_mesh_primitive(*_merge_parts(lock), gold_mat)
    m.export_glb(path)


def generate_forge_glb(path: str):
    m = GLTFModel("ForgeOfSpells")
    stone_mat = _add_stone_mat(m, "Stone_Furnace", (96, 100, 108), (44, 48, 54), moss=False)
    iron_mat = _add_metal_mat(m, "Iron_Crucible", "iron")
    gold_mat = _add_metal_mat(m, "Brass_Runes", "gold")
    flame_tex = m.add_texture_image(create_gem_texture(128, 128, (58, 224, 126)))
    flame_mat = m.add_pbr_material("Arcane_Flame", base_tex=flame_tex, roughness=0.22, metallic=0.04,
                                   emissive_factor=[0.24, 0.96, 0.45])

    # Stepped masonry base, arched kiln walls, cantilevered hood & fluted flue chimney
    stone_parts = [
        build_beveled_box_mesh(46, 5.0, 44, bevel=1.0, cy=2.5),
        build_beveled_box_mesh(38, 12.0, 36, bevel=1.0, cy=11.0),
        build_beveled_box_mesh(10, 16.0, 26, bevel=0.8, cx=-13.0, cy=23.0, cz=-4),
        build_beveled_box_mesh(10, 16.0, 26, bevel=0.8, cx=13.0, cy=23.0, cz=-4),
        build_beveled_box_mesh(34, 15.0, 12, bevel=0.8, cx=0, cy=23.0, cz=-11),
        build_lathe_mesh([(17.0, 0.0), (14.5, 6.0), (8.5, 16.0), (9.5, 19.0)], segments=12, cy=30.0, cz=-5.0),
    ]
    m.add_mesh_primitive(*_merge_parts(stone_parts), stone_mat)
    # Sculpted crucible basin, bellows frame & horned blacksmith anvil in front
    iron_parts = [
        build_lathe_mesh([(8.5, 0.0), (13.5, 4.0), (14.5, 9.5), (12.8, 10.5)], segments=20, cy=14.0, cz=4.0),
        build_torus_mesh(14.2, 1.15, 20, 8, cy=24.2, cz=4.0),
        build_beveled_box_mesh(7.5, 5.5, 5.5, bevel=0.5, cx=16.5, cy=8.0, cz=14.0),
        build_beveled_box_mesh(12.5, 3.2, 5.2, bevel=0.45, cx=16.5, cy=12.0, cz=14.0),
        _rot_part(build_cylinder_mesh(0.2, 2.4, 5.5, segments=8), rz=-math.pi * 0.5, tx=10.5, ty=12.2, tz=14.0),
    ]
    m.add_mesh_primitive(*_merge_parts(iron_parts), iron_mat)
    # Gold rune collar & sculpted multi-tongue arcane fire plume (zero sphere!)
    m.add_mesh_primitive(*_merge_parts([
        build_torus_mesh(13.2, 0.75, 20, 8, cy=18.5, cz=4.0),
        build_crystal_cluster_mesh(count=4, max_h=8.0, base_r=1.8, cx=-14.0, cy=17.0, cz=12.0),
    ]), gold_mat)
    m.add_mesh_primitive(*build_sculpted_flame_mesh(height=16.5, radius=7.5, tongues=6, seed=3, cy=18.5, cz=4.0), flame_mat)
    m.export_glb(path)


def generate_altar_glb(path: str):
    m = GLTFModel("AncientStoneAltar")
    stone_mat = _add_stone_mat(m, "Stone_Chiseled", (126, 130, 138), (60, 64, 72))
    gold_mat = _add_metal_mat(m, "Altar_Inlay", "gold")
    parts = [
        build_beveled_box_mesh(44, 4.5, 30, bevel=0.9, cy=2.25),
        build_beveled_box_mesh(38, 3.8, 25, bevel=0.8, cy=6.4),
        build_beveled_box_mesh(32, 13.5, 19, bevel=0.9, cy=15.0),
        build_beveled_box_mesh(41, 4.2, 26, bevel=1.0, cy=23.6),
    ]
    for px in (-14.5, 14.5):
        for pz in (-8.2, 8.2):
            parts.append(build_lathe_mesh([(2.8, 0.0), (2.2, 2.0), (2.0, 11.5), (2.7, 13.5)], segments=12, flutes=8, flute_amp=0.10, cx=px, cy=8.3, cz=pz))
    m.add_mesh_primitive(*_merge_parts(parts), stone_mat)
    chalice = build_lathe_mesh([(3.2, 0.0), (1.0, 1.5), (1.1, 4.2), (3.8, 7.2), (3.4, 9.2)], segments=18, cy=25.7)
    gold_parts = [
        build_beveled_box_mesh(32, 0.9, 17.5, bevel=0.25, cy=26.0),
        chalice,
        build_lathe_mesh([(1.6, 0.0), (0.8, 1.4), (0.8, 5.0), (1.3, 5.6)], segments=12, cx=-13.0, cy=25.7),
        build_lathe_mesh([(1.6, 0.0), (0.8, 1.4), (0.8, 5.0), (1.3, 5.6)], segments=12, cx=13.0, cy=25.7),
    ]
    m.add_mesh_primitive(*_merge_parts(gold_parts), gold_mat)
    m.export_glb(path)


def generate_pillar_glb(path: str):
    m = GLTFModel("DwarvenPillar")
    stone_mat = _add_stone_mat(m, "Stone_Ashlar", (128, 132, 140), (60, 64, 72))
    gold_mat = _add_metal_mat(m, "Brass_Filigree", "gold")
    shaft_prof = [
        (13.8, 8.0), (12.2, 11.5), (13.0, 14.0), (12.2, 17.0),
        (11.6, 66.0), (10.6, 115.0), (12.4, 118.5), (14.2, 123.5),
    ]
    parts = [
        build_beveled_box_mesh(32, 5.5, 32, bevel=1.0, cy=2.75),
        build_beveled_box_mesh(28, 3.0, 28, bevel=0.8, cy=6.8),
        build_lathe_mesh(shaft_prof, segments=28, flutes=14, flute_amp=0.075),
        build_beveled_box_mesh(31, 6.0, 31, bevel=1.0, cy=126.5),
        build_beveled_box_mesh(34, 3.5, 34, bevel=0.8, cy=131.0),
    ]
    m.add_mesh_primitive(*_merge_parts(parts), stone_mat)
    m.add_mesh_primitive(*_merge_parts([
        build_torus_mesh(12.2, 0.85, 22, 8, cy=15.0),
        build_torus_mesh(11.3, 0.85, 22, 8, cy=117.5),
    ]), gold_mat)
    m.export_glb(path)


def generate_brazier_glb(path: str):
    m = GLTFModel("StoneBrazier")
    stone_mat = _add_stone_mat(m, "Stone_Granite", (90, 94, 102), (42, 46, 52), moss=False)
    iron_mat = _add_metal_mat(m, "Iron_Bowl", "iron")
    fire_tex = m.add_texture_image(create_gem_texture(128, 128, (238, 120, 28)))
    fire_mat = m.add_pbr_material("Blazing_Fire", base_tex=fire_tex, roughness=0.22, metallic=0.04,
                                  emissive_factor=[0.96, 0.42, 0.06])
    stone_parts = [
        build_beveled_box_mesh(26, 4.0, 26, bevel=0.8, cy=2.0),
        build_lathe_mesh([(12.5, 4.0), (9.2, 9.5), (8.6, 15.5), (11.5, 18.0)], segments=16, flutes=8, flute_amp=0.10),
    ]
    for bi in range(4):
        ang = bi * math.pi * 0.5 + 0.7854
        stone_parts.append(_rot_part(build_beveled_box_mesh(4.0, 12.0, 6.5, bevel=0.5),
                                     ry=ang, tx=math.cos(ang) * 9.5, ty=8.0, tz=math.sin(ang) * 9.5))
    m.add_mesh_primitive(*_merge_parts(stone_parts), stone_mat)

    iron_parts = [
        build_lathe_mesh([(9.8, 18.0), (14.8, 21.5), (15.6, 24.5), (14.4, 25.0)], segments=20),
        build_torus_mesh(15.2, 1.0, 20, 8, cy=24.6),
    ]
    for si in range(6):
        ang = (si / 6.0) * 2.0 * math.pi
        iron_parts.append(build_beveled_box_mesh(1.8, 3.8, 1.8, bevel=0.3, cx=math.cos(ang) * 14.8, cy=26.2, cz=math.sin(ang) * 14.8))
    m.add_mesh_primitive(*_merge_parts(iron_parts), iron_mat)
    # Multi-tongue twisted fire plume inside iron bowl (zero sphere!)
    m.add_mesh_primitive(*build_sculpted_flame_mesh(height=15.0, radius=7.6, tongues=6, seed=7, cy=22.5), fire_mat)
    m.export_glb(path)


def generate_boulder_glb(path: str):
    m = GLTFModel("GraniteBoulder")
    stone_mat = _add_stone_mat(m, "Granite_Rock", (114, 118, 112), (54, 58, 52))
    rocks = [
        build_faceted_rock_mesh(16.5, 14.0, 15.0, seed=2),
        build_faceted_rock_mesh(10.5, 8.5, 11.0, seed=5, cx=11.0, cy=-0.5, cz=6.0),
        build_faceted_rock_mesh(9.0, 7.2, 8.5, seed=9, cx=-10.0, cy=-0.5, cz=-5.5),
    ]
    m.add_mesh_primitive(*_merge_parts(rocks), stone_mat)
    m.export_glb(path)


def generate_tree_stump_glb(path: str):
    m = GLTFModel("WeatheredTreeStump")
    bark_mat = _add_wood_mat(m, "Wood_Bark", (86, 56, 30), (42, 26, 14))
    top_mat = _add_wood_mat(m, "Wood_Rings", (162, 126, 84), (104, 76, 44))
    bark_parts = [
        build_lathe_mesh([(20.5, 0.0), (16.5, 5.5), (14.2, 14.0), (13.4, 22.0)], segments=20, flutes=9, flute_amp=0.14, twist=0.25),
    ]
    for ri in range(6):
        ang = ri * (2.0 * math.pi / 6.0) + 0.15
        bark_parts.append(_rot_part(build_cylinder_mesh(3.6, 6.4, 15.0, segments=8), rz=0.98, ry=ang,
                                    tx=math.cos(ang) * 15.0, ty=3.8, tz=math.sin(ang) * 15.0))
    m.add_mesh_primitive(*_merge_parts(bark_parts), bark_mat)
    m.add_mesh_primitive(*build_cylinder_mesh(13.0, 13.0, 1.0, segments=20, cy=22.0), top_mat)
    m.export_glb(path)


def generate_overturned_wagon_glb(path: str):
    m = GLTFModel("OverturnedWagon")
    wood_mat = _add_wood_mat(m, "Weathered_Planks", (122, 82, 42), (62, 40, 20))
    iron_mat = _add_metal_mat(m, "Iron_Axle", "iron")
    cloth_mat = _add_wood_mat(m, "Canvas_Ribs", (202, 188, 158), (148, 134, 108))

    wood_parts = [
        build_beveled_box_mesh(44, 4.0, 24, bevel=0.5, cy=10.5),
        build_beveled_box_mesh(44, 9.0, 1.8, bevel=0.3, cy=16.0, cz=11.0),
        build_beveled_box_mesh(44, 9.0, 1.8, bevel=0.3, cy=16.0, cz=-11.0),
        build_beveled_box_mesh(1.8, 9.0, 22.0, bevel=0.3, cx=-21.0, cy=16.0),
        build_beveled_box_mesh(14.0, 1.8, 2.0, bevel=0.25, cx=27.0, cy=9.8, cz=-4.5),
        build_beveled_box_mesh(14.0, 1.8, 2.0, bevel=0.25, cx=27.0, cy=9.8, cz=4.5),
    ]
    iron_parts = [
        _rot_part(build_cylinder_mesh(1.2, 1.2, 31.0, segments=10), rx=math.pi * 0.5, tx=-15, ty=10.2),
        _rot_part(build_cylinder_mesh(1.2, 1.2, 31.0, segments=10), rx=math.pi * 0.5, tx=15, ty=10.2),
    ]
    for wx in (-15.0, 15.0):
        for wz in (-14.0, 14.0):
            wood_parts.append(build_spoked_wheel_mesh(radius=9.8, rim_w=2.0, spokes=8, cx=wx, cy=10.2, cz=wz))
            iron_parts.append(build_torus_mesh(9.9, 0.55, 20, 8, cx=wx, cy=10.2, cz=wz, axis='z'))
    hoops = [
        _rot_part(build_torus_mesh(12.2, 0.8, 16, 8, axis='x'), tx=hx, ty=20.0)
        for hx in (-15.0, 0.0, 15.0)
    ]
    m.add_mesh_primitive(*_merge_parts(wood_parts), wood_mat)
    m.add_mesh_primitive(*_merge_parts(iron_parts), iron_mat)
    m.add_mesh_primitive(*_merge_parts(hoops), cloth_mat)
    m.export_glb(path)


def generate_table_glb(path: str):
    m = GLTFModel("TavernTable")
    wood_mat = _add_wood_mat(m, "Sturdy_Oak", (136, 90, 46), (70, 44, 20))
    iron_mat = _add_metal_mat(m, "Iron_Brackets", "iron")
    gold_mat = _add_metal_mat(m, "Brass_Tankard", "gold")
    parts = [
        build_beveled_box_mesh(40, 3.0, 24, bevel=0.75, cy=17.4),
        build_beveled_box_mesh(3.2, 3.8, 24.4, bevel=0.5, cx=-19.0, cy=17.4),
        build_beveled_box_mesh(3.2, 3.8, 24.4, bevel=0.5, cx=19.0, cy=17.4),
        build_beveled_box_mesh(32, 2.4, 2.6, bevel=0.35, cy=6.5),
    ]
    for lx in (-14.5, 14.5):
        parts.append(build_beveled_box_mesh(3.4, 2.2, 20.5, bevel=0.4, cx=lx, cy=1.1))
        parts.append(_rot_part(build_beveled_box_mesh(3.0, 16.5, 3.2, bevel=0.4), rx=0.22, tx=lx, ty=9.2, tz=-3.8))
        parts.append(_rot_part(build_beveled_box_mesh(3.0, 16.5, 3.2, bevel=0.4), rx=-0.22, tx=lx, ty=9.2, tz=3.8))
    m.add_mesh_primitive(*_merge_parts(parts), wood_mat)
    m.add_mesh_primitive(*_merge_parts([
        build_beveled_box_mesh(4.2, 1.8, 4.2, bevel=0.25, cx=lx, cy=16.0, cz=lz)
        for lx in (-14.5, 14.5) for lz in (-7.2, 7.2)
    ]), iron_mat)
    tankard = build_lathe_mesh([(2.2, 0.0), (2.4, 1.5), (2.0, 4.8), (2.3, 5.2)], segments=14, cx=-8.0, cy=18.9, cz=3.5)
    m.add_mesh_primitive(*tankard, gold_mat)
    m.export_glb(path)


def generate_town_well_glb(path: str):
    m = GLTFModel("TownWell")
    stone_mat = _add_stone_mat(m, "Cobblestone_Wall", (116, 120, 128), (54, 58, 66))
    wood_mat = _add_wood_mat(m, "Roof_Timber", (118, 80, 42), (62, 40, 20))
    iron_mat = _add_metal_mat(m, "Iron_Windlass", "iron")

    stone_parts = [
        build_lathe_mesh([(23.0, 0.0), (21.5, 8.0), (20.8, 15.5), (23.2, 16.5), (23.2, 18.5)], segments=16, flutes=16, flute_amp=0.03),
    ]
    for ci in range(8):
        ang = (ci / 8.0) * 2.0 * math.pi
        stone_parts.append(_rot_part(build_beveled_box_mesh(12.5, 3.0, 5.5, bevel=0.5), ry=-ang,
                                     tx=math.cos(ang) * 19.5, ty=17.5, tz=math.sin(ang) * 19.5))
    m.add_mesh_primitive(*_merge_parts(stone_parts), stone_mat)

    roof_l = _rot_part(build_beveled_box_mesh(44, 2.6, 20.0, bevel=0.5), rx=0.54, ty=44.5, tz=-7.5)
    roof_r = _rot_part(build_beveled_box_mesh(44, 2.6, 20.0, bevel=0.5), rx=-0.54, ty=44.5, tz=7.5)
    wood_parts = [
        build_beveled_box_mesh(3.8, 32, 3.8, bevel=0.45, cx=-17.5, cy=25.5),
        build_beveled_box_mesh(3.8, 32, 3.8, bevel=0.45, cx=17.5, cy=25.5),
        build_beveled_box_mesh(46, 3.2, 3.2, bevel=0.4, cy=50.5),
        _rot_part(build_cylinder_mesh(2.6, 2.6, 36.0, segments=12), rz=math.pi * 0.5, ty=29.0),
        build_lathe_mesh([(3.4, 0.0), (4.2, 6.0), (4.5, 6.6)], segments=12, cy=14.0),
        roof_l, roof_r,
    ]
    for sx in (-17.5, 17.5):
        wood_parts.append(_rot_part(build_beveled_box_mesh(2.4, 11.0, 2.4, bevel=0.3), rz=0.72 * (-1 if sx < 0 else 1), tx=sx * 0.78, ty=38.0))
    m.add_mesh_primitive(*_merge_parts(wood_parts), wood_mat)
    m.add_mesh_primitive(*_merge_parts([
        build_cylinder_mesh(0.5, 0.5, 10.0, segments=8, cy=24.0),
        build_torus_mesh(4.2, 0.45, 12, 6, cy=20.0),
    ]), iron_mat)
    m.export_glb(path)


def generate_sarcophagus_glb(path: str):
    m = GLTFModel("TresendarSarcophagus")
    stone_mat = _add_stone_mat(m, "Carved_Limestone", (126, 130, 138), (62, 66, 72))
    gold_mat = _add_metal_mat(m, "Gilded_Trim", "gold")
    parts = [
        build_beveled_box_mesh(46, 4.2, 26, bevel=0.8, cy=2.1),
        build_beveled_box_mesh(41, 13.5, 21.5, bevel=1.0, cy=10.8),
        build_beveled_box_mesh(44, 3.6, 24.5, bevel=0.9, cy=19.2),
        build_beveled_box_mesh(38, 3.2, 18.0, bevel=1.2, cy=22.2),
        build_beveled_box_mesh(32, 2.4, 12.0, bevel=0.9, cy=24.6),
    ]
    for px in (-19.5, 0.0, 19.5):
        for pz in (-10.8, 10.8):
            parts.append(build_beveled_box_mesh(3.0, 14.0, 2.4, bevel=0.4, cx=px, cy=11.0, cz=pz))
    m.add_mesh_primitive(*_merge_parts(parts), stone_mat)
    gold_parts = [
        build_beveled_box_mesh(26, 1.0, 2.4, bevel=0.2, cy=26.1),
        build_beveled_box_mesh(2.4, 1.0, 9.6, bevel=0.2, cx=7.5, cy=26.1),
    ]
    m.add_mesh_primitive(*_merge_parts(gold_parts), gold_mat)
    m.export_glb(path)


def generate_key_glb(path: str):
    m = GLTFModel("PlatinumSealKey")
    gold_mat = _add_metal_mat(m, "Polished_Gold", "gold")
    parts = [
        build_torus_mesh(3.4, 0.9, 16, 8, cx=-2.4, cy=16.0, axis='z'),
        build_torus_mesh(3.4, 0.9, 16, 8, cx=2.4, cy=16.0, axis='z'),
        build_torus_mesh(3.4, 0.9, 16, 8, cx=0.0, cy=18.8, axis='z'),
        build_lathe_mesh([(2.2, 11.8), (1.4, 12.8), (1.1, 13.6), (1.2, 2.0), (0.3, 0.4)], segments=12),
        build_beveled_box_mesh(4.8, 2.8, 1.2, bevel=0.25, cx=2.6, cy=3.2),
        build_beveled_box_mesh(3.6, 1.6, 1.2, bevel=0.2, cx=2.0, cy=6.2),
        build_beveled_box_mesh(2.4, 1.2, 1.2, bevel=0.2, cx=1.5, cy=8.6),
    ]
    m.add_mesh_primitive(*_merge_parts(parts), gold_mat)
    m.export_glb(path)


def generate_potion_glb(path: str):
    m = GLTFModel("HealingPotionFlask")
    red_tex = m.add_texture_image(create_gem_texture(128, 128, (220, 44, 52)))
    potion_mat = m.add_pbr_material("Ruby_Elixir", base_tex=red_tex, roughness=0.08, metallic=0.10,
                                    emissive_factor=[0.48, 0.06, 0.08])
    cork_mat = _add_wood_mat(m, "Cork_Stopper", (158, 112, 66), (98, 66, 32))
    gold_mat = _add_metal_mat(m, "Flask_Collar", "gold")
    # Faceted fluted apothecary decanter silhouette (foot, ribs, waist, tall neck & lip)
    flask_prof = [
        (4.4, 0.0), (4.8, 1.2), (3.6, 2.2), (6.6, 5.2), (6.9, 8.2),
        (4.6, 11.2), (2.3, 12.8), (2.2, 15.8), (3.1, 16.8), (2.5, 17.2),
    ]
    m.add_mesh_primitive(*build_lathe_mesh(flask_prof, segments=16, flutes=8, flute_amp=0.08), potion_mat)
    gold_parts = [
        build_torus_mesh(4.7, 0.45, 16, 8, cy=1.2),
        build_torus_mesh(2.45, 0.42, 14, 8, cy=15.0),
        build_torus_mesh(3.0, 0.35, 14, 8, cy=16.8),
    ]
    m.add_mesh_primitive(*_merge_parts(gold_parts), gold_mat)
    m.add_mesh_primitive(*build_lathe_mesh([(1.8, 16.8), (2.1, 19.6), (1.7, 20.0)], segments=12), cork_mat)
    m.export_glb(path)


def generate_core_crystal_glb(path: str):
    m = GLTFModel("SpellForgeCrystal")
    gem_tex = m.add_texture_image(create_gem_texture(128, 128, (54, 192, 240)))
    gem_mat = m.add_pbr_material("Arcane_Core", base_tex=gem_tex, roughness=0.08, metallic=0.14,
                                 emissive_factor=[0.20, 0.72, 0.96])
    stone_mat = _add_stone_mat(m, "Crystal_Base", (68, 72, 84), (36, 38, 46), moss=False)
    # 7-shard asymmetric crystalline prism cluster emerging from fractured basalt matrix
    m.add_mesh_primitive(*build_crystal_cluster_mesh(count=7, max_h=21.0, base_r=3.6, seed=4, cy=2.5), gem_mat)
    m.add_mesh_primitive(*build_faceted_rock_mesh(9.5, 4.5, 9.0, seed=7, cy=0.0), stone_mat)
    m.export_glb(path)


def generate_scroll_glb(path: str):
    m = GLTFModel("ArcaneScroll")
    parch_mat = _add_wood_mat(m, "Parchment_Roll", (216, 198, 166), (168, 148, 118))
    wood_mat = _add_wood_mat(m, "Scroll_Dowels", (110, 68, 34), (58, 34, 16))
    gold_mat = _add_metal_mat(m, "Brass_Finials", "gold")
    wax_tex = m.add_texture_image(create_gem_texture(64, 64, (176, 32, 34)))
    wax_mat = m.add_pbr_material("Sealing_Wax", base_tex=wax_tex, roughness=0.35, metallic=0.08)

    # Twin rolled scroll cylinders joined by draped unrolled sheet & ribbon/wax seal
    parch_parts = [
        _rot_part(build_cylinder_mesh(2.5, 2.5, 14.5, segments=16), rz=math.pi * 0.5, ty=2.5, tz=-3.6),
        _rot_part(build_cylinder_mesh(2.2, 2.2, 14.5, segments=16), rz=math.pi * 0.5, ty=2.2, tz=3.8),
        build_beveled_box_mesh(14.0, 0.5, 7.6, bevel=0.15, cy=1.4, cz=0.2),
    ]
    m.add_mesh_primitive(*_merge_parts(parch_parts), parch_mat)
    dowel_parts = [
        _rot_part(build_cylinder_mesh(0.95, 0.95, 18.0, segments=10), rz=math.pi * 0.5, ty=2.5, tz=-3.6),
        _rot_part(build_cylinder_mesh(0.95, 0.95, 18.0, segments=10), rz=math.pi * 0.5, ty=2.2, tz=3.8),
    ]
    m.add_mesh_primitive(*_merge_parts(dowel_parts), wood_mat)
    finials = []
    for sx in (-9.2, 9.2):
        for tz in (-3.6, 3.8):
            finials.append(build_sphere_mesh(1.25, lat_segs=8, lon_segs=10, cx=sx, cy=2.4, cz=tz))
    m.add_mesh_primitive(*_merge_parts(finials), gold_mat)
    wax_parts = [
        build_beveled_box_mesh(1.8, 0.7, 8.2, bevel=0.1, cy=1.7, cz=0.2),
        build_cylinder_mesh(1.9, 2.1, 0.9, segments=10, cy=2.1, cz=0.6),
    ]
    m.add_mesh_primitive(*_merge_parts(wax_parts), wax_mat)
    m.export_glb(path)


# =========================================================================
# MAIN BATCH EXECUTION
# =========================================================================

def build_all_gltf_models():
    builder_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(builder_dir)
    out_dirs = [
        os.path.join(repo_root, "game_engine", "web", "models", "props"),
        os.path.join(repo_root, "game_engine", "web", "models"),
        os.path.join(repo_root, "games", "aeonward", "assets", "models"),
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)
    print(f"Generating PBR beveled GLTF (.glb) assets into {out_dirs}...")

    models = [
        ("chest.glb", generate_chest_glb),
        ("forge.glb", generate_forge_glb),
        ("altar.glb", generate_altar_glb),
        ("pillar.glb", generate_pillar_glb),
        ("brazier.glb", generate_brazier_glb),
        ("boulder.glb", generate_boulder_glb),
        ("stump.glb", generate_tree_stump_glb),
        ("wagon.glb", generate_overturned_wagon_glb),
        ("table.glb", generate_table_glb),
        ("town_well.glb", generate_town_well_glb),
        ("sarcophagus.glb", generate_sarcophagus_glb),
        ("key.glb", generate_key_glb),
        ("potion.glb", generate_potion_glb),
        ("crystal.glb", generate_core_crystal_glb),
        ("scroll.glb", generate_scroll_glb)
    ]

    primary_dir = out_dirs[0]
    for fname, func in models:
        src = os.path.join(primary_dir, fname)
        func(src)
        with open(src, 'rb') as f_in:
            blob = f_in.read()
        for dst_dir in out_dirs[1:]:
            dst = os.path.join(dst_dir, fname)
            with open(dst, 'wb') as f_out:
                f_out.write(blob)

    print("Successfully generated all realistic PBR GLTF/GLB models!")


if __name__ == '__main__':
    build_all_gltf_models()
