# Runtime models

Synapp bundles two independent illustrative views. No model download from an external service is needed at runtime.

| File | Use | License |
| --- | --- | --- |
| `makehuman-body.glb` | Project owner's johnDoeSynapp body, skin, eyes and eyebrows | MakeHuman core assets CC0-1.0 |
| `makehuman-shorts.glb` | Shorts fitted to the reference body | CC0-1.0 |
| `makehuman-hair.glb` | Reference character's short04 hairstyle | MakeHuman core assets CC0-1.0 |
| `z-anatomy-muscles.glb` | 221 meshes with muscles, supporting skeleton and connective tissue | CC BY-SA 4.0 |

The current surface is exported from the project owner's `johnDoeSynapp.mhm`, matching the supplied screenshots. Its exact body and face geometry, male skin texture, short04 hairstyle, eyebrows and brown eyes are retained. The source export is versioned in `assets/john-doe-source/` and the saved source model remains unchanged. Core assets are MakeHuman CC0 data; character settings were supplied by the project owner. Skin/eye images are resized and compressed, and hair/brow transparency is retained.

The fitted shorts and the body fitting template originate from CC0 output assets in [Kasper Olesen's CharacterCreator](https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78/output). Only data assets are used, not that project's GPL application or generator code. The preparation script constructs an intermediate athletic body template and transfers its displacement to the exact reference through corresponding UVs. Shorts follow that displacement with added cloth clearance; their normals are recalculated. At runtime, the shorts use a matte purple material. The old generic preset is used only as a fitting template when the reference export is present.

The muscle model is an unchanged copy from [Fit Mit With's public atlas](https://github.com/slfresh/fitmitwith-anatomy-atlas/tree/4120ee68b6604b8f2f69105d6de6166fad4734c4), adapted from Z-Anatomy and BodyParts3D. Its authors excluded the atlas's separately licensed organs/inner-ear content. Synapp applies display colors and selection highlights at runtime. Preserve the source credits and ShareAlike license when redistributing/adapting this model. These assets are separate from the application code's license.

Full upstream notices are in `licenses/` and `assets/john-doe-source/source-material-notices/`. `manifest.json` records source and output SHA-256 hashes. Regenerate with `python scripts/prepare-body-models.py` (Python 3, NumPy, Pillow and internet access for the pinned fitting template/anatomy sources). Install the converter packages using `pip install -r scripts/requirements-models.txt`. The original source model and OBJ are never edited.

Both models face +Z with anatomical left at +X. They have different bodies and rest poses: each is independently fitted to the stage and has its own region landmarks. They are alternative views, not aligned skin/muscle layers of one person. Selection areas are approximate. Neither model is clinically validated.

