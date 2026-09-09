import { useMemo, useState } from "react";
import { Upload, UserPlus, Eye, EyeOff, Trash2, Pencil, Lock } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { PhotoCard } from "./PhotoCard";
import { EmptyState } from "./EmptyState";
import { CardGridSkeleton } from "./CardGridSkeleton";
import { FilterBar } from "./FilterBar";
import { VisibilityBadge } from "../ui/Badge";
import { ConfirmDialog } from "../modals/ConfirmDialog";
import { filterItems } from "../../utils/filterItems";

const TABS = [
  { key: "interns", label: "Interns", type: "PROFILE" },
  { key: "gallery", label: "Gallery", type: "PHOTO" },
];

export function WorkspaceView({
  department,
  role,
  items,
  status,
  onOpenAddIntern,
  onOpenUploadPhoto,
  onToggleVisibility,
  onDeleteItem,
  onEditItem,
}) {
  const [tab, setTab] = useState("interns");
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("ALL");
  const [pendingDelete, setPendingDelete] = useState(null);

  const isLead = role === "LEAD";

  const activeType = TABS.find((t) => t.key === tab).type;
  const scoped = useMemo(() => items.filter((i) => i.type === activeType), [items, activeType]);
  const visible = filterItems(scoped, { query, visibility });

  const counts = useMemo(
    () => ({
      interns: items.filter((i) => i.type === "PROFILE").length,
      gallery: items.filter((i) => i.type === "PHOTO").length,
    }),
    [items]
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">{department} Workspace</h2>
          <p className="text-sm text-slate-500">
            {isLead
              ? "Manage intern profiles, gallery photos, and visibility settings."
              : "Upload photos and manage your own uploads. Only department leads can add or edit intern profiles."}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onOpenUploadPhoto}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800"
          >
            <Upload size={16} /> Upload Photo
          </button>
          {/* Only LEADs can add intern profiles — enforced server-side too, this just avoids a round-trip 403. */}
          {isLead && (
            <button
              onClick={onOpenAddIntern}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              <UserPlus size={16} /> Add Intern
            </button>
          )}
        </div>
      </div>

      {/* Interns / Gallery tabs — real separation, not one mixed grid */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label} <span className="ml-1 text-xs text-slate-400">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      <FilterBar
        query={query}
        onQueryChange={setQuery}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        showVisibilityFilter
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {status === "loading" && <CardGridSkeleton />}
        {status === "error" && <EmptyState title="Couldn't load your workspace" subtitle="Check your connection and try again." />}
        {status === "ready" && visible.length === 0 && (
          <EmptyState
            title={scoped.length === 0 ? `No ${tab} yet` : "No matches"}
            subtitle={
              scoped.length === 0
                ? tab === "interns"
                  ? isLead
                    ? "Add an intern profile to get started."
                    : "Nothing here yet — ask a department lead to add one."
                  : "Upload a photo to get started."
                : "Try a different search or filter."
            }
          />
        )}

        {status === "ready" &&
          visible.map((item) => {
            // Backend already tells us whether the caller owns this item — LEADs can
            // manage anything in the department, MEMBERs only their own uploads.
            const canManage = isLead || item.isOwner;
            return (
              <div key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col justify-between">
                {item.type === "PHOTO" ? <PhotoCard item={item} /> : <ProfileCard item={item} />}

                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <VisibilityBadge visibility={item.visibility} />

                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleVisibility(item)}
                        aria-label={item.visibility === "PUBLIC" ? "Make private" : "Publish"}
                        className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-semibold"
                      >
                        {item.visibility === "PUBLIC" ? <EyeOff size={14} /> : <Eye size={14} />}
                        {item.visibility === "PUBLIC" ? "Make Private" : "Publish"}
                      </button>
                      <button
                        onClick={() => onEditItem(item)}
                        aria-label="Edit item"
                        className="p-1.5 text-slate-400 hover:text-indigo-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(item)}
                        aria-label="Delete item"
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock size={12} /> View only
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          message="Are you sure you want to delete this item? This can't be undone."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteItem(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
