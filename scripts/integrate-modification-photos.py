from pathlib import Path

path = Path("src/app/profile/cars/[id]/page.tsx")
text = path.read_text()

if "@/components/ModificationPhotoManager" in text:
    print("Modification photo UI is already integrated.")
    raise SystemExit(0)

nav_import = 'import { useParams, useRouter } from "next/navigation";\n'
component_import = 'import ModificationPhotoManager from "@/components/ModificationPhotoManager";\n'
if nav_import not in text:
    raise SystemExit("navigation import anchor not found")
text = text.replace(nav_import, nav_import + component_import, 1)

type_anchor = "type VehicleModification = {\n"
type_replacement = '''type VehicleModification = {
  photos?: {
    id: string;
    modificationId: string;
    url: string;
    createdAt: string;
  }[];
'''
if type_anchor not in text:
    raise SystemExit("VehicleModification type anchor not found")
text = text.replace(type_anchor, type_replacement, 1)

old = '''      if (isEditing) {
        setModifications((current) =>
          current.map((item) =>
            item.id ===
            editingModificationId
              ? data.modification
              : item
          )
        );
      } else {
        setModifications((current) => [
          data.modification,
          ...current,
        ]);
      }

      closeModificationForm();
'''
new = '''      if (isEditing) {
        setModifications((current) =>
          current.map((item) =>
            item.id ===
            editingModificationId
              ? data.modification
              : item
          )
        );

        closeModificationForm();
      } else {
        setModifications((current) => [
          data.modification,
          ...current,
        ]);

        setEditingModificationId(data.modification.id);
        setModificationForm({
          title: data.modification.title,
          category: data.modification.category,
          description: data.modification.description || "",
          cost: data.modification.cost !== null ? String(data.modification.cost) : "",
          installedAt: data.modification.installedAt ? data.modification.installedAt.slice(0, 10) : "",
          notes: data.modification.notes || "",
        });
        setModificationError(
          "Modification saved. Add photos below, then close when you are done."
        );
      }
'''
if old not in text:
    raise SystemExit("save modification block not found")
text = text.replace(old, new, 1)

notes_anchor = "                      {modification.notes && (\n"
card_gallery = '''                      {modification.photos &&
                        modification.photos.length > 0 && (
                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {modification.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.07] bg-black"
                            >
                              <img
                                src={photo.url}
                                alt={`${modification.title} photo`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

'''
if notes_anchor not in text:
    raise SystemExit("modification notes anchor not found")
text = text.replace(notes_anchor, card_gallery + notes_anchor, 1)

modal_anchor = """                </div>\n              </div>\n\n              {/* Buttons */}\n"""
modal_block = '''                </div>

                {editingModificationId && (
                  <div className="sm:col-span-2">
                    <ModificationPhotoManager
                      vehicleId={vehicleId}
                      modificationId={editingModificationId}
                      photos={
                        modifications.find(
                          (item) =>
                            item.id ===
                            editingModificationId
                        )?.photos || []
                      }
                      onPhotosChange={(nextPhotos) => {
                        setModifications((current) =>
                          current.map((item) =>
                            item.id === editingModificationId
                              ? {
                                  ...item,
                                  photos: nextPhotos,
                                }
                              : item
                          )
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
'''
if modal_anchor not in text:
    raise SystemExit("modal buttons anchor not found")
text = text.replace(modal_anchor, modal_block, 1)

path.write_text(text)
print("Integrated modification photo upload UI.")
