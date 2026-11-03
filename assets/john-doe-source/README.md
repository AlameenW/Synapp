# John Doe Synapp reference character

The project owner supplied `johnDoeSynapp.mhm` and three MakeHuman screenshots as the desired appearance. `reference.obj`, `exports.mtl` and `textures/` are the model's MakeHuman 1.3.0 Wavefront export, in meters, with normals and feet on ground, without helper geometry. The body, face, short04 hairstyle, eyebrows and brown eyes are preserved in the runtime GLBs. The original saved file is not modified.

The geometry and textures come from MakeHuman core assets, released under CC0 in September 2020. Character settings are supplied by the project owner. See `frontend/public/models/licenses/MakeHuman-LICENSE.md` and `source-material-notices/` for the upstream notices. The source model was exported without clothing. Synapp adds a fitted derivative of the existing CC0 shorts, with a matte purple material.

Run `python scripts/prepare-body-models.py` from the root to rebuild. The reference converter uses NumPy and Pillow (`pip install -r scripts/requirements-models.txt`). It finds body vertex correspondence using the common MakeHuman UV layout, then uses a local displacement field to fit the shorts to this character with a small clearance. Source body, hair, eye and eyebrow vertex positions are retained. Texture images are resized and embedded for browser use. No generator application code is shipped in the GLBs.

For a changed source character, export its OBJ with normals, in meters, no helper geometry, and place its matching MTL/textures here. Recheck garment fit, body-region markers and source asset licenses after rebuilding. Never infer matched internal anatomy from the independently sourced Z-Anatomy view.
