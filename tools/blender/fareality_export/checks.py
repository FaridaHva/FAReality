"""
Checks a furniture model against the FAReality model standard, in Blender
terms: Z is up, the front faces −Y (what Numpad 1 shows), 1 unit = 1 metre.
The glTF exporter turns that into the platform's Y-up, front-facing-+Z.

Kept free of UI code so tests can run it headless.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import bpy
from mathutils import Vector

# Mirrors packages/asset-pipeline, so a model passing here passes there.
PROPORTION_TOLERANCE = 0.05
MAX_TRIANGLES = 150_000
MAX_TEXTURE_SIZE = 2048
FLOOR_TOLERANCE_M = 0.01

# Texture nodes computed by Blender at render time; glTF can't carry them.
PROCEDURAL_NODES = {
    "ShaderNodeTexNoise",
    "ShaderNodeTexWave",
    "ShaderNodeTexVoronoi",
    "ShaderNodeTexMusgrave",
    "ShaderNodeTexMagic",
    "ShaderNodeTexGradient",
    "ShaderNodeTexChecker",
    "ShaderNodeTexBrick",
    "ShaderNodeTexWhiteNoise",
    "ShaderNodeTexGabor",
}

GEOMETRY_TYPES = {"MESH", "CURVE", "SURFACE", "META", "FONT"}

ERROR, WARNING, INFO, OK = "ERROR", "WARNING", "INFO", "OK"


@dataclass
class Issue:
    level: str  # ERROR blocks export; WARNING should be fixed; INFO and OK are notes
    text: str


def cm(metres: float) -> str:
    return f"{metres * 100:.0f}"


def names(items, limit: int = 3) -> str:
    items = list(items)
    shown = ", ".join(items[:limit])
    return shown + (f" (+{len(items) - limit})" if len(items) > limit else "")


def world_bounds(objects, depsgraph) -> tuple[Vector, Vector]:
    """Bounding box of everything, with modifiers applied, in world space."""
    lo = Vector((float("inf"),) * 3)
    hi = Vector((float("-inf"),) * 3)
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            p = evaluated.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


def count_triangles(objects, depsgraph) -> int:
    total = 0
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        if mesh is not None:
            total += sum(len(poly.vertices) - 2 for poly in mesh.polygons)
        evaluated.to_mesh_clear()
    return total


def deviation(size, target) -> float:
    return max(abs(s / t - 1) for s, t in zip(size, target))


def check_size(size: Vector, declared: tuple[float, float, float] | None) -> list[Issue]:
    measured = f"{cm(size.x)} × {cm(size.y)} × {cm(size.z)} sm"
    if not declared or min(declared) <= 0:
        return [
            Issue(INFO, f"Modelin ölçüsü (en × dərinlik × hündürlük): {measured}"),
            Issue(WARNING, "Məhsulun real ölçülərini daxil edin, onsuz ölçü yoxlanmır."),
        ]

    target = tuple(v / 100 for v in declared)
    declared_text = f"{declared[0]:.0f} × {declared[1]:.0f} × {declared[2]:.0f} sm"
    if deviation(size, target) <= PROPORTION_TOLERANCE:
        return [Issue(OK, f"Ölçülər uyğundur: {measured}")]

    turned = (size.y, size.x, size.z)
    if deviation(turned, target) <= PROPORTION_TOLERANCE:
        return [
            Issue(
                ERROR,
                "Model yana dönükdür: eni Y oxu boyunca gedir. Z ətrafında 90° çevirin ki, "
                "ön tərəf −Y-ə baxsın (Numpad 1), sonra Ctrl+A → All Transforms.",
            )
        ]

    ratio = size.z / target[2]
    if 80 < ratio < 120:
        hint = " Model santimetrlə qurulub, 1 unit 1 metr olmalıdır."
    elif 800 < ratio < 1200:
        hint = " Model millimetrlə qurulub, 1 unit 1 metr olmalıdır."
    else:
        hint = ""
    return [
        Issue(
            ERROR,
            f"Ölçülər uyğun deyil: model {measured}, məhsul {declared_text} "
            f"(fərq {deviation(size, target) * 100:.0f}%).{hint}",
        )
    ]


def check_placement(lo: Vector, hi: Vector) -> list[Issue]:
    issues = []
    if abs(lo.z) > FLOOR_TOLERANCE_M:
        issues.append(
            Issue(WARNING, f"Model zəmində dayanmır: ən aşağı nöqtə Z = {lo.z * 100:.1f} sm. Ayaqlar Z = 0-da olmalıdır.")
        )
    center = (lo + hi) / 2
    if abs(center.x) > FLOOR_TOLERANCE_M or abs(center.y) > FLOOR_TOLERANCE_M:
        issues.append(Issue(INFO, "Model mərkəzdə deyil. Problem deyil, saytda avtomatik mərkəzləşdirilir."))
    return issues


def check_scene_units(scene) -> list[Issue]:
    units = scene.unit_settings
    if units.system != "METRIC" or abs(units.scale_length - 1.0) > 1e-6:
        return [Issue(WARNING, "Səhnə vahidləri: Metric və Unit Scale 1.0 olmalıdır.")]
    return []


def check_transforms(objects) -> list[Issue]:
    flipped = [o.name for o in objects if any(s < 0 for s in o.scale)]
    scaled = [o.name for o in objects if o.name not in flipped and any(abs(s - 1) > 1e-4 for s in o.scale)]
    issues = []
    if flipped:
        issues.append(Issue(WARNING, f"Mənfi miqyas ({names(flipped)}): üzlər tərs görünə bilər. Ctrl+A → Scale."))
    if scaled:
        issues.append(Issue(WARNING, f"Tətbiq edilməmiş miqyas ({names(scaled)}): Ctrl+A → Scale."))
    return issues


def check_triangles(count: int) -> list[Issue]:
    if count > MAX_TRIANGLES:
        return [
            Issue(
                WARNING,
                f"{count:,} üçbucaq, limit 150 000. Saytda avtomatik sadələşdiriləcək, "
                "ayaq və qulp kimi incə hissələr pozula bilər.".replace(",", " "),
            )
        ]
    return [Issue(OK, f"{count:,} üçbucaq".replace(",", " "))]


def surface_shader(material):
    output = next(
        (n for n in material.node_tree.nodes if n.bl_idname == "ShaderNodeOutputMaterial" and n.is_active_output),
        None,
    )
    if output is None or not output.inputs["Surface"].is_linked:
        return None
    return output.inputs["Surface"].links[0].from_node


def check_materials(objects) -> list[Issue]:
    materials = {slot.material for o in objects for slot in o.material_slots if slot.material}
    bare = [o.name for o in objects if not any(slot.material for slot in o.material_slots)]

    procedural, not_principled, missing, oversized = [], [], [], []
    for mat in sorted(materials, key=lambda m: m.name):
        # Blender 5 dropped node-less materials; before that, use_nodes could be off.
        if mat.node_tree is None or (bpy.app.version < (5, 0, 0) and not mat.use_nodes):
            not_principled.append(mat.name)
            continue
        nodes = mat.node_tree.nodes
        if any(n.bl_idname in PROCEDURAL_NODES for n in nodes):
            procedural.append(mat.name)
        shader = surface_shader(mat)
        if shader is None or shader.bl_idname != "ShaderNodeBsdfPrincipled":
            not_principled.append(mat.name)
        for node in nodes:
            image = getattr(node, "image", None) if node.bl_idname == "ShaderNodeTexImage" else None
            if image is None:
                continue
            if not image.has_data and image.packed_file is None and not os.path.exists(bpy.path.abspath(image.filepath)):
                missing.append(image.name)
            elif max(image.size) > MAX_TEXTURE_SIZE:
                oversized.append(image.name)

    issues = []
    if procedural:
        issues.append(
            Issue(ERROR, f"Prosedural tekstura ({names(procedural)}): glTF-ə keçmir, teksturaya bake edin.")
        )
    if missing:
        issues.append(Issue(ERROR, f"Tekstura faylı tapılmadı: {names(missing)}. File → External Data → Pack Resources."))
    if not_principled:
        issues.append(
            Issue(WARNING, f"Principled BSDF deyil ({names(not_principled)}): saytda rəng və parlaqlıq fərqli görünə bilər.")
        )
    if bare:
        issues.append(Issue(WARNING, f"Materialı yoxdur: {names(bare)}."))
    if oversized:
        issues.append(Issue(INFO, f"2048 px-dən böyük tekstura ({names(oversized)}): saytda kiçildiləcək."))
    if materials and not (procedural or missing or not_principled or bare):
        issues.append(Issue(OK, f"{len(materials)} material, hamısı export oluna bilər"))
    return issues


def check_animation(objects) -> list[Issue]:
    if any(o.animation_data and o.animation_data.action for o in objects):
        return [Issue(INFO, "Animasiya export edilməyəcək.")]
    return []


def run_checks(context, objects, declared: tuple[float, float, float] | None) -> list[Issue]:
    """All checks for the given objects. `declared` is the product's (width, depth, height) in cm."""
    objects = [o for o in objects if o.type in GEOMETRY_TYPES]
    if not objects:
        return [Issue(ERROR, "Heç bir model seçilməyib. Məhsula aid obyektləri seçin.")]

    depsgraph = context.evaluated_depsgraph_get()
    lo, hi = world_bounds(objects, depsgraph)
    issues = [
        *check_size(hi - lo, declared),
        *check_placement(lo, hi),
        *check_scene_units(context.scene),
        *check_transforms(objects),
        *check_triangles(count_triangles(objects, depsgraph)),
        *check_materials(objects),
        *check_animation(objects),
        # 90° is caught above; 180° (back to front) only a human can see.
        Issue(INFO, "Numpad 1 ilə yoxlayın: məhsulun ön tərəfi görünməlidir."),
    ]
    return sorted(issues, key=lambda i: [ERROR, WARNING, OK, INFO].index(i.level))


def has_errors(issues: list[Issue]) -> bool:
    return any(i.level == ERROR for i in issues)
