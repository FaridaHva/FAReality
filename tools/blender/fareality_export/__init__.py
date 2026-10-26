"""
FAReality Export: a sidebar panel (3D Viewport → N → FAReality) that checks
a furniture model against the platform standard and exports it as GLB with
the right settings.
"""

# Blender older than 4.2 reads this; 4.2+ reads blender_manifest.toml instead.
bl_info = {
    "name": "FAReality Export",
    "author": "FAReality",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "3D Viewport > Sidebar (N) > FAReality",
    "description": "Check and export furniture models for FAReality",
    "category": "Import-Export",
}

import os
import textwrap

import bpy
from bpy.props import FloatProperty, PointerProperty, StringProperty

from . import checks

ICONS = {checks.ERROR: "CANCEL", checks.WARNING: "ERROR", checks.INFO: "INFO", checks.OK: "CHECKMARK"}

# Latest check per scene. Deliberately not stored in the .blend file.
_reports: dict[str, list[checks.Issue]] = {}


class FAREALITY_Settings(bpy.types.PropertyGroup):
    width_cm: FloatProperty(name="En", description="Məhsulun real eni, sm (X oxu)", min=0, precision=1)
    depth_cm: FloatProperty(name="Dərinlik", description="Məhsulun real dərinliyi, sm (Y oxu)", min=0, precision=1)
    height_cm: FloatProperty(name="Hündürlük", description="Məhsulun real hündürlüyü, sm (Z oxu)", min=0, precision=1)
    output_dir: StringProperty(
        name="Qovluq", description="GLB faylının yazılacağı qovluq", subtype="DIR_PATH", default="//"
    )
    file_name: StringProperty(name="Fayl adı", description="Boş qalsa, .blend faylının adı götürülür")
    last_export: StringProperty()


def declared(settings) -> tuple[float, float, float]:
    return (settings.width_cm, settings.depth_cm, settings.height_cm)


def export_path(settings) -> str | None:
    if not bpy.data.filepath and settings.output_dir.startswith("//"):
        return None  # relative to an unsaved .blend: nowhere to resolve it
    folder = bpy.path.abspath(settings.output_dir)
    stem = settings.file_name or bpy.path.display_name_from_filepath(bpy.data.filepath) or "model"
    return os.path.join(folder, bpy.path.clean_name(stem) + ".glb")


class FAREALITY_OT_check(bpy.types.Operator):
    bl_idname = "fareality.check"
    bl_label = "Yoxla"
    bl_description = "Seçilmiş modeli FAReality standartına görə yoxla"

    def execute(self, context):
        settings = context.scene.fareality
        issues = checks.run_checks(context, context.selected_objects, declared(settings))
        _reports[context.scene.name] = issues
        errors = sum(i.level == checks.ERROR for i in issues)
        warnings = sum(i.level == checks.WARNING for i in issues)
        self.report({"WARNING" if errors else "INFO"}, f"{errors} xəta, {warnings} xəbərdarlıq")
        return {"FINISHED"}


class FAREALITY_OT_export(bpy.types.Operator):
    bl_idname = "fareality.export"
    bl_label = "GLB export"
    bl_description = "Yoxla və xəta yoxdursa, seçilmiş modeli GLB kimi export et"

    def execute(self, context):
        settings = context.scene.fareality
        issues = checks.run_checks(context, context.selected_objects, declared(settings))
        _reports[context.scene.name] = issues
        if checks.has_errors(issues):
            self.report({"ERROR"}, "Export dayandırıldı: əvvəlcə xətaları düzəldin.")
            return {"CANCELLED"}

        path = export_path(settings)
        if path is None:
            self.report({"ERROR"}, "Əvvəlcə .blend faylını yadda saxlayın və ya qovluq seçin.")
            return {"CANCELLED"}
        os.makedirs(os.path.dirname(path), exist_ok=True)

        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            use_selection=True,
            export_apply=True,  # modifiers, as checked above
            export_yup=True,  # Blender −Y front becomes glTF +Z front
            export_animations=False,
            export_cameras=False,
            export_lights=False,
            # The platform's pipeline compresses; doing it twice loses quality.
            export_draco_mesh_compression_enable=False,
        )
        settings.last_export = path
        self.report({"INFO"}, f"Export edildi: {path}")
        return {"FINISHED"}


class FAREALITY_OT_copy_command(bpy.types.Operator):
    bl_idname = "fareality.copy_command"
    bl_label = "Pipeline əmrini kopyala"
    bl_description = "Son export üçün asset pipeline əmrini buferə kopyala"

    def execute(self, context):
        s = context.scene.fareality
        out = s.last_export.removesuffix(".glb") + ".web.glb"
        context.window_manager.clipboard = (
            f'npm run assets -- "{s.last_export}" "{out}" '
            f"--width {s.width_cm:g} --depth {s.depth_cm:g} --height {s.height_cm:g}"
        )
        self.report({"INFO"}, "Kopyalandı")
        return {"FINISHED"}


def draw_wrapped(layout, text: str, icon: str, width_px: int):
    lines = textwrap.wrap(text, max(24, int(width_px / 7)))
    col = layout.column(align=True)
    for i, line in enumerate(lines):
        col.label(text=line, icon=icon if i == 0 else "BLANK1")


class FAREALITY_PT_panel(bpy.types.Panel):
    bl_label = "FAReality"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "FAReality"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.fareality

        box = layout.box()
        box.label(text="Məhsulun real ölçüləri (sm)")
        col = box.column(align=True)
        col.prop(settings, "width_cm")
        col.prop(settings, "depth_cm")
        col.prop(settings, "height_cm")

        layout.prop(settings, "output_dir")
        layout.prop(settings, "file_name")

        row = layout.row(align=True)
        row.scale_y = 1.4
        row.operator(FAREALITY_OT_check.bl_idname, icon="VIEWZOOM")
        row.operator(FAREALITY_OT_export.bl_idname, icon="EXPORT")

        issues = _reports.get(context.scene.name)
        if issues:
            box = layout.box()
            for issue in issues:
                draw_wrapped(box, issue.text, ICONS[issue.level], context.region.width)

        if settings.last_export:
            layout.label(text=os.path.basename(settings.last_export), icon="FILE_3D")
            layout.operator(FAREALITY_OT_copy_command.bl_idname, icon="COPYDOWN")


classes = (FAREALITY_Settings, FAREALITY_OT_check, FAREALITY_OT_export, FAREALITY_OT_copy_command, FAREALITY_PT_panel)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.fareality = PointerProperty(type=FAREALITY_Settings)


def unregister():
    del bpy.types.Scene.fareality
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
