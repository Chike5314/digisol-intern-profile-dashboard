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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">{department} workspace</h2>
          <p className="text-sm text-[var(--ink)]/55 mt-0.5">
            {isLead
              ? "Manage intern profiles, gallery photos, and visibility."
              : "Upload photos and manage your own uploads. Only leads can add or edit intern profiles."}
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onOpenUploadPhoto}
            className="flex items-center gap-2 border border-[var(--ink)] text-[var(--ink)] px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--ink)] hover:text-white transition"
          >
            <Upload size={15} /> Upload photo
          </button>
          {/* Only LEADs can add intern profiles — enforced server-side too, this just avoids a round-trip 403. */}
          {isLead && (
            <button
              onClick={onOpenAddIntern}
              className="flex items-center gap-2 bg-[var(--amber)] text-[var(--amber-ink)] px-4 py-2 rounded-md text-sm font-semibold hover:brightness-95 transition"
            >
              <UserPlus size={15} /> Add intern
            </button>
          )}
        </div>
      </div>

      {/* Interns / Gallery tabs — real separation, not one mixed grid */}
      <div className="flex gap-1 mb-7 border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key ? "border-[var(--amber)] text-[var(--ink)]" : "border-transparent text-[var(--ink)]/45 hover:text-[var(--ink)]/75"
            }`}
          >
            {t.label} <span className="ml-1 text-xs text-[var(--ink)]/40">({counts[t.key]})</span>
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
              <div
                key={item.id}
                className={`flex flex-col justify-between ${
                  item.type === "PROFILE"
                    ? "bg-[var(--surface)] border border-[var(--ink)] rounded-md p-5"
                    : "bg-[var(--surface)] border border-[var(--line)] p-3"
                }`}
              >
                {item.type === "PHOTO" ? <PhotoCard item={item} /> : <ProfileCard item={item} />}

                <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-between items-center">
                  <VisibilityBadge visibility={item.visibility} />

                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleVisibility(item)}
                        aria-label={item.visibility === "PUBLIC" ? "Make private" : "Publish"}
                        className="flex items-center gap-1 text-xs text-[var(--steel)] px-2 py-1.5 rounded-md hover:bg-[var(--paper)] font-medium transition"
                      >
                        {item.visibility === "PUBLIC" ? <EyeOff size={13} /> : <Eye size={13} />}
                        {item.visibility === "PUBLIC" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => onEditItem(item)}
                        aria-label="Edit item"
                        className="p-1.5 text-[var(--ink)]/40 hover:text-[var(--steel)] transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setPendingDelete(item)}
                        aria-label="Delete item"
                        className="p-1.5 text-[var(--ink)]/40 hover:text-[#B5432F] transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[var(--ink)]/40">
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
