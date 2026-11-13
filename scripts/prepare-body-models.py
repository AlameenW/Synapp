"""Prepare pinned CC0 MakeHuman exports and a CC BY-SA Z-Anatomy atlas.

Run with Python 3: python scripts/prepare-body-models.py
Only data assets are downloaded; no upstream generator or application code runs.
"""
from copy import deepcopy
from hashlib import sha256
import json
import math
from pathlib import Path
import struct
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'frontend/public/models'
LICENSES = DEST / 'licenses'
ATLAS = '4120ee68b6604b8f2f69105d6de6166fad4734c4'
BODY = '852e48f316b90a0937234886630e4fb4cdfd1f78'
ATHLETIC_MALE = {'gender_male': 1.0, 'muscle_max': 0.5, 'corr_gender_male__muscle_max': 0.5}


def read_accessor(model, binary, index):
    accessor = model['accessors'][index]
    sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    formats = {5120: ('b', 1, 127), 5121: ('B', 1, 255), 5122: ('h', 2, 32767),
               5123: ('H', 2, 65535), 5125: ('I', 4, 4294967295), 5126: ('f', 4, 1)}
    fmt, byte_size, maximum = formats[accessor['componentType']]
    width = sizes[accessor['type']]
    result = [[0.0] * width for _ in range(accessor['count'])]

    def values(view_index, offset, count, row_width=width, component=fmt, size=byte_size):
        view = model['bufferViews'][view_index]
        start = view.get('byteOffset', 0) + offset
        stride = view.get('byteStride', row_width * size)
        return [list(struct.unpack_from('<' + component * row_width, binary, start + row * stride)) for row in range(count)]

    if 'bufferView' in accessor:
        result = values(accessor['bufferView'], accessor.get('byteOffset', 0), accessor['count'])
    if 'sparse' in accessor:
        sparse = accessor['sparse']
        indices, replacements = sparse['indices'], sparse['values']
        index_fmt, index_size, _ = formats[indices['componentType']]
        offsets = values(indices['bufferView'], indices.get('byteOffset', 0), sparse['count'], 1, index_fmt, index_size)
        rows = values(replacements['bufferView'], replacements.get('byteOffset', 0), sparse['count'])
        for offset, row in zip(offsets, rows):
            result[offset[0]] = row
    if accessor.get('normalized'):
        result = [[max(-1, value / maximum) for value in row] for row in result]
    return result


def write_float_accessor(model, binary, index, values):
    accessor = model['accessors'][index]
    if accessor['componentType'] != 5126 or 'sparse' in accessor:
        raise ValueError('Source changed: bake destinations must be dense float accessors')
    view = model['bufferViews'][accessor['bufferView']]
    width = len(values[0])
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', width * 4)
    for row, value in enumerate(values):
        struct.pack_into('<' + 'f' * width, binary, offset + row * stride, *value)
    if 'min' in accessor or 'max' in accessor:
        accessor['min'] = [min(row[i] for row in values) for i in range(width)]
        accessor['max'] = [max(row[i] for row in values) for i in range(width)]


def bake_profile(model, binary, profile):
    for mesh in model['meshes']:
        names = mesh.get('extras', {}).get('targetNames', [])
        if not all(name in names for name in profile):
            raise ValueError(f'Source is missing profile targets: {mesh.get("name")}')
        for primitive in mesh['primitives']:
            has_normal_targets = False
            for attribute in ('POSITION', 'NORMAL'):
                base = primitive['attributes'].get(attribute)
                if base is None:
                    continue
                values = read_accessor(model, binary, base)
                for name, weight in profile.items():
                    target = primitive['targets'][names.index(name)].get(attribute)
                    if target is None:
                        continue
                    if attribute == 'NORMAL':
                        has_normal_targets = True
                    delta = read_accessor(model, binary, target)
                    values = [[a + weight * b for a, b in zip(row, change)] for row, change in zip(values, delta)]
                if attribute == 'NORMAL':
                    values = [[value / (math.sqrt(sum(x * x for x in row)) or 1) for value in row] for row in values]
                write_float_accessor(model, binary, base, values)
            # Garments/hair sometimes omit morph normals. Recompute their smooth
            # vertex normals from the deformed triangles instead of keeping stale ones.
            if not has_normal_targets and 'NORMAL' in primitive['attributes']:
                positions = read_accessor(model, binary, primitive['attributes']['POSITION'])
                indices = [int(row[0]) for row in read_accessor(model, binary, primitive['indices'])]
                normals = [[0.0, 0.0, 0.0] for _ in positions]
                for i in range(0, len(indices), 3):
                    a, b, c = indices[i:i + 3]
                    u = [positions[b][j] - positions[a][j] for j in range(3)]
                    v = [positions[c][j] - positions[a][j] for j in range(3)]
                    cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                    for vertex in (a, b, c):
                        normals[vertex] = [normals[vertex][j] + cross[j] for j in range(3)]
                normals = [[value / (math.sqrt(sum(x*x for x in row)) or 1) for value in row] for row in normals]
                write_float_accessor(model, binary, primitive['attributes']['NORMAL'], normals)


def fetch(repo, commit, path, expected=None):
    url = f'https://raw.githubusercontent.com/{repo}/{commit}/{path}'
    with urlopen(url, timeout=60) as response:
        data = response.read()
    if expected and sha256(data).hexdigest() != expected:
        raise ValueError(f'Unexpected source hash: {path}')
    return data


def static_export(data, profile=None):
    """Bake chosen relative shape targets and retain textures, then strip rig/morphs.

    These source mesh nodes have identity world transforms. No joint transforms
    or default Blender morph weights are applied. Profile targets are explicit.
    Accessors, images, and their binary views are repacked to remove unused bytes.
    """
    magic, version, length = struct.unpack_from('<III', data)
    if magic != 0x46546C67 or version != 2 or length != len(data):
        raise ValueError('Invalid GLB')
    json_length = struct.unpack_from('<I', data, 12)[0]
    model = json.loads(data[20:20 + json_length])
    binary_start = 20 + json_length + 8
    binary = bytearray(data[binary_start:])
    if profile:
        bake_profile(model, binary, profile)
    kept_nodes = []
    for node in model['nodes']:
        if 'mesh' in node:
            if any(key in node for key in ('translation', 'rotation', 'scale', 'matrix')):
                raise ValueError('Source changed: mesh transforms need baking')
            kept_nodes.append({'name': node['name'], 'mesh': node['mesh']})
    model['nodes'] = kept_nodes
    model['scenes'] = [{'name': 'MakeHuman athletic male surface' if profile else 'MakeHuman neutral surface', 'nodes': list(range(len(kept_nodes)))}]
    model['scene'] = 0
    model.pop('skins', None)
    model.pop('animations', None)
    for material in model['materials']:
        material.pop('extras', None)
    used_accessors = set()
    for mesh in model['meshes']:
        mesh.pop('weights', None)
        mesh.pop('extras', None)
        for primitive in mesh['primitives']:
            primitive.pop('targets', None)
            primitive['attributes'] = {k: v for k, v in primitive['attributes'].items()
                                       if k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'TANGENT')}
            used_accessors.update(primitive['attributes'].values())
            used_accessors.add(primitive['indices'])
    accessor_map = {old: new for new, old in enumerate(sorted(used_accessors))}
    accessors = [deepcopy(model['accessors'][old]) for old in sorted(used_accessors)]
    used_views = set(image['bufferView'] for image in model.get('images', []))
    for accessor in accessors:
        if 'bufferView' in accessor:
            used_views.add(accessor['bufferView'])
        if 'sparse' in accessor:
            used_views.update(accessor['sparse'][part]['bufferView'] for part in ('indices', 'values'))
    view_map = {old: new for new, old in enumerate(sorted(used_views))}
    output_binary = bytearray()
    views = []
    for old in sorted(used_views):
        view = deepcopy(model['bufferViews'][old])
        offset = view.get('byteOffset', 0)
        content = binary[offset:offset + view['byteLength']]
        output_binary.extend(b'\0' * (-len(output_binary) % 4))
        view['byteOffset'] = len(output_binary)
        view['buffer'] = 0
        output_binary.extend(content)
        views.append(view)
    for accessor in accessors:
        if 'bufferView' in accessor:
            accessor['bufferView'] = view_map[accessor['bufferView']]
        if 'sparse' in accessor:
            for part in ('indices', 'values'):
                accessor['sparse'][part]['bufferView'] = view_map[accessor['sparse'][part]['bufferView']]
    for mesh in model['meshes']:
        for primitive in mesh['primitives']:
            primitive['indices'] = accessor_map[primitive['indices']]
            primitive['attributes'] = {k: accessor_map[v] for k, v in primitive['attributes'].items()}
    for image in model.get('images', []):
        image['bufferView'] = view_map[image['bufferView']]
    model['accessors'], model['bufferViews'] = accessors, views
    model['buffers'] = [{'byteLength': len(output_binary)}]
    model['asset']['extras'] = {'license': 'CC0-1.0', 'profile': profile or {}, 'changes': 'Explicit body profile baked; unused rig and morph data removed by Synapp.'}
    encoded = json.dumps(model, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    output_binary.extend(b'\0' * (-len(output_binary) % 4))
    total = 12 + 8 + len(encoded) + 8 + len(output_binary)
    return (struct.pack('<III', magic, 2, total) + struct.pack('<II', len(encoded), 0x4E4F534A)
            + encoded + struct.pack('<II', len(output_binary), 0x004E4942) + output_binary)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    LICENSES.mkdir(exist_ok=True)
    files = [
        ('base_body.glb', 'makehuman-body.glb', 'b5b450af89f6fbf8debf387eda8da40cd0a8c3253a2d59871c730ce7e7f46469'),
        ('clothing_shorts.glb', 'makehuman-shorts.glb', '505d9a6ae140c16a8694d628e65ed7a681dc7410b08631212d6121d4b88d2dfe'),
        ('hair_short02.glb', 'makehuman-hair.glb', 'eb341c197acf3948dac1f41f7722e9dad31018149541504a13ebcc8b6aa9d5aa'),
    ]
    manifest = []
    for source, target, expected in files:
        original = fetch('kblood/CharacterCreator', BODY, 'output/' + source, expected)
        output = static_export(original, ATHLETIC_MALE)
        (DEST / target).write_bytes(output)
        manifest.append({'file': target, 'license': 'CC0-1.0', 'sourceCommit': BODY,
                         'sourcePath': 'output/' + source, 'sourceSha256': expected,
                         'sha256': sha256(output).hexdigest(), 'bytes': len(output), 'profile': ATHLETIC_MALE})
    if (ROOT / 'assets/john-doe-source/reference.obj').exists():
        from reference_body import build_reference
        manifest = build_reference(ROOT, (DEST / 'makehuman-body.glb').read_bytes(),
                                   (DEST / 'makehuman-shorts.glb').read_bytes(), read_accessor)
    original = fetch('slfresh/fitmitwith-anatomy-atlas', ATLAS, 'models/full-body-male-mobile.glb',
                     'd80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54')
    (DEST / 'z-anatomy-muscles.glb').write_bytes(original)
    manifest.append({'file': 'z-anatomy-muscles.glb', 'license': 'CC-BY-SA-4.0', 'sourceCommit': ATLAS,
                     'sha256': sha256(original).hexdigest(), 'bytes': len(original), 'changes': 'File unchanged'})
    for source, target in [('ATTRIBUTION.txt', 'Z-Anatomy-ATTRIBUTION.txt'), ('LICENSE', 'CC-BY-SA-4.0.txt'),
                           ('upstream/Z-Anatomy-LICENSE.txt', 'Z-Anatomy-UPSTREAM.txt')]:
        (LICENSES / target).write_bytes(fetch('slfresh/fitmitwith-anatomy-atlas', ATLAS, source))
    (LICENSES / 'MakeHuman-export-license.md').write_bytes(fetch('kblood/CharacterCreator', BODY, 'LICENSE-NOTES.md'))
    (LICENSES / 'MakeHuman-LICENSE.md').write_bytes(fetch('makehumancommunity/makehuman', 'master', 'LICENSE.md'))
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    for item in manifest:
        print(item['file'], item['bytes'])


if __name__ == '__main__':
    main()
