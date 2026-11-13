"""Convert the user's MakeHuman OBJ export and fit the existing shorts to it.

Requires numpy and Pillow. Geometry for the body, hair, eyes and eyebrows is
preserved from the export. Shorts follow a UV-corresponded body displacement
field; the source .mhm and OBJ are never edited.
"""
from collections import OrderedDict
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image


def read_obj(path):
    positions, uvs, normals = [], [], []
    groups = OrderedDict()
    name = 'Body'
    for line in path.read_text(encoding='utf-8').splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == 'v':
            positions.append([float(x) for x in parts[1:4]])
        elif parts[0] == 'vt':
            uvs.append([float(parts[1]), 1 - float(parts[2])])
        elif parts[0] == 'vn':
            normals.append([float(x) for x in parts[1:4]])
        elif parts[0] == 'g':
            name = parts[1]
        elif parts[0] == 'f':
            group = groups.setdefault(name, {'corners': OrderedDict(), 'indices': []})
            face = []
            for point in parts[1:]:
                corner = tuple(int(x) - 1 for x in point.split('/'))
                if corner not in group['corners']:
                    group['corners'][corner] = len(group['corners'])
                face.append(group['corners'][corner])
            for i in range(1, len(face) - 1):
                group['indices'].extend([face[0], face[i], face[i + 1]])
    result = {}
    for name, group in groups.items():
        corners = list(group['corners'])
        result[name] = {
            'positions': np.array([positions[v] for v, t, n in corners], dtype=np.float32),
            'uvs': np.array([uvs[t] for v, t, n in corners], dtype=np.float32),
            'normals': np.array([normals[n] for v, t, n in corners], dtype=np.float32),
            'indices': np.array(group['indices'], dtype=np.uint32),
        }
    return result


def read_glb_mesh(data, accessor_reader):
    size = struct.unpack_from('<I', data, 12)[0]
    model = json.loads(data[20:20 + size])
    binary = data[28 + size:]
    primitive = model['meshes'][0]['primitives'][0]
    output = {}
    for attribute, key in [('POSITION', 'positions'), ('NORMAL', 'normals'), ('TEXCOORD_0', 'uvs')]:
        output[key] = np.array(accessor_reader(model, binary, primitive['attributes'][attribute]), dtype=np.float32)
    output['indices'] = np.array(accessor_reader(model, binary, primitive['indices']), dtype=np.uint32).ravel()
    return output


def matched_body(template, reference):
    lookup = {}
    for uv, position in zip(reference['uvs'], reference['positions']):
        lookup[tuple(np.round(uv, 5))] = position
    mapped = []
    misses = 0
    for uv in template['uvs']:
        position = lookup.get(tuple(np.round(uv, 5)))
        if position is None:
            misses += 1
            distance = np.sum((reference['uvs'] - uv) ** 2, axis=1)
            closest = int(np.argmin(distance))
            if distance[closest] > .00001:
                raise ValueError('Reference export uses incompatible UV topology')
            position = reference['positions'][closest]
        mapped.append(position)
    print(f'Body UV correspondence: {len(mapped) - misses}/{len(mapped)} exact, {misses} nearby matches')
    return np.array(mapped, dtype=np.float32)


def displace(points, template, target, extra=0):
    result = []
    for start in range(0, len(points), 64):
        batch = points[start:start + 64]
        distances = np.sum((batch[:, None, :] - template['positions'][None, :, :]) ** 2, axis=2)
        closest = np.argpartition(distances, 7, axis=1)[:, :8]
        squared = np.take_along_axis(distances, closest, axis=1)
        weights = 1 / np.maximum(squared, .000001)
        weights /= weights.sum(axis=1, keepdims=True)
        delta = target[closest] - template['positions'][closest]
        moved = batch + np.sum(weights[:, :, None] * delta, axis=1)
        # Leave a small cloth clearance, preserving the loose source silhouette.
        outward = np.sum(weights[:, :, None] * template['normals'][closest], axis=1)
        outward /= np.maximum(np.linalg.norm(outward, axis=1, keepdims=True), .000001)
        result.append(moved + outward * extra)
    return np.concatenate(result).astype(np.float32)


def recalculate_normals(mesh):
    triangles = mesh['indices'].reshape(-1, 3)
    points = mesh['positions'][triangles]
    face_normals = np.cross(points[:, 1] - points[:, 0], points[:, 2] - points[:, 0])
    normals = np.zeros_like(mesh['positions'])
    for corner in range(3):
        np.add.at(normals, triangles[:, corner], face_normals)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), .000001)
    mesh['normals'] = normals


class GLB:
    def __init__(self):
        self.binary = bytearray()
        self.model = {'asset': {'version': '2.0', 'generator': 'Synapp MakeHuman reference importer',
                                'extras': {'license': 'CC0-1.0', 'reference': 'johnDoeSynapp.mhm'}},
                      'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
                      'materials': [], 'textures': [], 'images': [], 'accessors': [], 'bufferViews': []}

    def view(self, data):
        self.binary.extend(b'\0' * (-len(self.binary) % 4))
        view = {'buffer': 0, 'byteOffset': len(self.binary), 'byteLength': len(data)}
        self.binary.extend(data)
        self.model['bufferViews'].append(view)
        return len(self.model['bufferViews']) - 1

    def accessor(self, array, kind, component=5126):
        array = np.asarray(array, dtype='<f4' if component == 5126 else '<u4')
        index = len(self.model['accessors'])
        accessor = {'bufferView': self.view(array.tobytes()), 'componentType': component,
                    'count': len(array), 'type': kind}
        if kind == 'VEC3':
            accessor['min'] = array.min(axis=0).tolist()
            accessor['max'] = array.max(axis=0).tolist()
        self.model['accessors'].append(accessor)
        return index

    def material(self, name, texture=None, alpha=False):
        pbr = {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .68}
        if texture:
            with Image.open(texture) as image:
                image.thumbnail((2048, 2048) if name == 'Skin' else (1024, 1024))
                output = BytesIO()
                image.convert('RGBA' if alpha else 'RGB').save(output, format='PNG' if alpha else 'JPEG', **({} if alpha else {'quality': 93}))
            self.model['images'].append({'bufferView': self.view(output.getvalue()), 'mimeType': 'image/png' if alpha else 'image/jpeg'})
            self.model['textures'].append({'source': len(self.model['images']) - 1})
            pbr['baseColorTexture'] = {'index': len(self.model['textures']) - 1}
        material = {'name': name, 'pbrMetallicRoughness': pbr, 'doubleSided': True}
        if alpha:
            material.update(alphaMode='MASK', alphaCutoff=.35)
        self.model['materials'].append(material)
        return len(self.model['materials']) - 1

    def mesh(self, name, mesh, material):
        primitive = {'attributes': {name: self.accessor(mesh[key], kind) for name, key, kind in
                                   [('POSITION', 'positions', 'VEC3'), ('NORMAL', 'normals', 'VEC3'), ('TEXCOORD_0', 'uvs', 'VEC2')]},
                     'indices': self.accessor(mesh['indices'], 'SCALAR', 5125), 'material': material}
        index = len(self.model['meshes'])
        self.model['meshes'].append({'name': name, 'primitives': [primitive]})
        self.model['nodes'].append({'name': name, 'mesh': index})
        self.model['scenes'][0]['nodes'].append(index)

    def finish(self):
        self.model['buffers'] = [{'byteLength': len(self.binary)}]
        encoded = json.dumps(self.model, separators=(',', ':')).encode()
        encoded += b' ' * (-len(encoded) % 4)
        self.binary.extend(b'\0' * (-len(self.binary) % 4))
        length = 12 + 8 + len(encoded) + 8 + len(self.binary)
        return struct.pack('<III', 0x46546C67, 2, length) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(self.binary), 0x004E4942) + self.binary


def build_reference(root, body_data, shorts_data, accessor_reader):
    source = root / 'assets/john-doe-source'
    reference = read_obj(source / 'reference.obj')
    print('Reference objects:', ', '.join(reference))
    template = read_glb_mesh(body_data, accessor_reader)
    target = matched_body(template, reference['base.obj'])
    shorts = read_glb_mesh(shorts_data, accessor_reader)
    shorts['positions'] = displace(shorts['positions'], template, target, extra=.012)
    # Correct any remaining vertex penetrations against the exact reference skin.
    # Use the skin normals, not the older fitting-template normals, at this stage.
    skin = reference['base.obj']
    for _ in range(3):
        for start in range(0, len(shorts['positions']), 64):
            points = shorts['positions'][start:start + 64]
            distances = np.sum((points[:, None, :] - skin['positions'][None, :, :]) ** 2, axis=2)
            nearest = distances.argmin(axis=1)
            normal = skin['normals'][nearest]
            normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), .000001)
            signed = np.sum((points - skin['positions'][nearest]) * normal, axis=1)
            points += normal * np.maximum(.005 - signed, 0)[:, None]
    recalculate_normals(shorts)
    textures = source / 'textures'
    body = GLB()
    body.mesh('Body', reference['base.obj'], body.material('Skin', textures / 'young_lightskinned_male_diffuse.png'))
    # The eye atlas includes a fully transparent cornea patch. Keeping its alpha
    # avoids an opaque blue outer shell hiding the brown iris underneath.
    body.mesh('Eyes', reference['high-poly.obj'], body.material('Eyes', textures / 'brown_eye.png', True))
    body.mesh('Eyebrows', reference['eyebrow001.obj'], body.material('Eyebrows', textures / 'eyebrow001.png', True))
    hair = GLB()
    hair.mesh('Hair_short04', reference['short04.obj'], hair.material('Hair', textures / 'short04_diffuse.png', True))
    garment = GLB()
    garment.mesh('Cloth_shorts', shorts, garment.material('Cloth_shorts'))
    outputs = {'makehuman-body.glb': body.finish(), 'makehuman-hair.glb': hair.finish(), 'makehuman-shorts.glb': garment.finish()}
    manifest = []
    for name, data in outputs.items():
        (root / 'frontend/public/models' / name).write_bytes(data)
        manifest.append({'file': name, 'license': 'CC0-1.0', 'referenceModel': 'assets/john-doe-source/johnDoeSynapp.mhm',
                         'referenceSha256': sha256((source / 'johnDoeSynapp.mhm').read_bytes()).hexdigest(),
                         'sourceObjSha256': sha256((source / 'reference.obj').read_bytes()).hexdigest(),
                         'sha256': sha256(data).hexdigest(), 'bytes': len(data)})
    # Surface landmark estimates follow the exact same deformation as the shorts.
    points = np.array([[.35, .93, -.02], [.66, .56, .02], [.90, .32, .28], [.28, -.76, .03], [.36, -1.55, -.02], [0, .35, -.32]], dtype=np.float32)
    # Previous athletic template included short02 hair (1.74447 m tall).
    old_height, old_center_z = 1.7444706317703, .1413
    raw = points / (3.3 / old_height)
    raw[:, 1] += 1.7 / (3.3 / old_height)
    raw[:, 2] += old_center_z
    deformed = displace(raw, template, target)
    combined = np.concatenate([part['positions'] for part in reference.values()])
    low, high = combined.min(axis=0), combined.max(axis=0)
    scale = 3.3 / (high[1] - low[1])
    normalized = (deformed - (low + high) / 2) * scale
    normalized[:, 1] -= .05
    print('Suggested reference landmarks (shoulder, elbow, wrist, knee, ankle, lower back):', np.round(normalized, 3).tolist())
    return manifest
