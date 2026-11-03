# Source assets

Runtime models, reproducible source revisions and license notices are now bundled in `frontend/public/models/`. See that directory's README and `manifest.json` for the MakeHuman surface and Z-Anatomy muscle atlas. The notices live beside the shipped assets so production builds include them. The frontend also exposes credits below the viewer.

To reproduce the prepared assets, run `python scripts/prepare-body-models.py` from the repository root. Source model downloads are hash checked. No Blender installation is required to run Synapp or regenerate these particular static exports.

