"""
Headless tests for the FAReality Blender add-on:

    blender -b --factory-startup --python-exit-code 1 --python tools/blender/tests/test_checks.py
"""

import os
import sys
import tempfile
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import fareality_export  # noqa: E402
from fareality_export import checks  # noqa: E402

SOFA = (165.0, 62.0, 65.0)  # width, depth, height in cm
failures = []
fareality_export.register()


def fresh_scene():
    # Resets data only; the add-on's registered classes survive it.
    bpy.ops.wm.read_factory_settings(use_empty=True)


def principled(name="Fabric"):
    mat = bpy.data.materials.new(name)
    if bpy.app.version < (5, 0, 0):
        mat.use_nodes = True  # Blender 5 materials always use nodes
    return mat


def box(width=1.65, depth=0.62, height=0.65, z=0.0, material=None, apply_scale=True):
    """A box standing on the floor (Z = 0 + z), front facing −Y."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, height / 2 + z))
    obj = bpy.context.active_object
    obj.scale = (width, depth, height)
    if apply_scale:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material or principled())
    return obj


def issues_for(*objects, declared=SOFA):
    return checks.run_checks(bpy.context, list(objects), declared)


def case(name, issues, expect_level, expect_text):
    hit = any(i.level == expect_level and expect_text in i.text for i in issues)
    print(("PASS" if hit else "FAIL"), name)
    if not hit:
        failures.append(name)
        for i in issues:
            print("   ", i.level, i.text)


fresh_scene()
case("good model passes size check", issues_for(box()), checks.OK, "Ölçülər uyğundur")
good = issues_for(box())
print("PASS" if not checks.has_errors(good) else "FAIL", "good model has no errors")
if checks.has_errors(good):
    failures.append("good model has no errors")

fresh_scene()
case("sideways model is caught", issues_for(box(width=0.62, depth=1.65)), checks.ERROR, "yana dönükdür")

fresh_scene()
case("model built in centimetres gets a unit hint", issues_for(box(165, 62, 65)), checks.ERROR, "santimetr")

fresh_scene()
case("floating model is flagged", issues_for(box(z=0.1)), checks.WARNING, "zəmində dayanmır")

fresh_scene()
case("unapplied scale is flagged", issues_for(box(apply_scale=False)), checks.WARNING, "miqyas")

fresh_scene()
noisy = principled("Noisy")
noisy.node_tree.nodes.new("ShaderNodeTexNoise")
case("procedural texture blocks export", issues_for(box(material=noisy)), checks.ERROR, "Prosedural")

fresh_scene()
case("missing dimensions is a warning", issues_for(box(), declared=None), checks.WARNING, "real ölçülərini")

fresh_scene()
case("nothing selected is an error", checks.run_checks(bpy.context, [], SOFA), checks.ERROR, "seçilməyib")

# Operators: export writes a GLB for a good model and refuses a bad one.
with tempfile.TemporaryDirectory() as out:
    fresh_scene()
    settings = bpy.context.scene.fareality
    settings.width_cm, settings.depth_cm, settings.height_cm = SOFA
    settings.output_dir = out
    settings.file_name = "sofa"
    good_box = box()
    bpy.ops.object.select_all(action="DESELECT")
    good_box.select_set(True)
    result = bpy.ops.fareality.export()
    path = os.path.join(out, "sofa.glb")
    ok = result == {"FINISHED"} and os.path.getsize(path) > 0
    print("PASS" if ok else "FAIL", "export writes a GLB")
    if not ok:
        failures.append("export writes a GLB")
    if os.environ.get("FAREALITY_KEEP_EXPORT"):
        import shutil

        shutil.copy(path, os.environ["FAREALITY_KEEP_EXPORT"])

    fresh_scene()
    settings = bpy.context.scene.fareality
    settings.width_cm, settings.depth_cm, settings.height_cm = SOFA
    settings.output_dir = out
    settings.file_name = "sideways"
    bad = box(width=0.62, depth=1.65)
    bpy.ops.object.select_all(action="DESELECT")
    bad.select_set(True)
    try:
        result = bpy.ops.fareality.export()
    except RuntimeError:  # operators that report ERROR raise in background mode
        result = {"CANCELLED"}
    refused = result == {"CANCELLED"} and not os.path.exists(os.path.join(out, "sideways.glb"))
    print("PASS" if refused else "FAIL", "export refuses a model with errors")
    if not refused:
        failures.append("export refuses a model with errors")

print(f"\n{len(failures)} failed" if failures else "\nall passed")
sys.exit(1 if failures else 0)
