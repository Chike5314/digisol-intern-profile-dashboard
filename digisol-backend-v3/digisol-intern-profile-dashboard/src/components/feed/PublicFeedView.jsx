import { useMemo, useState } from "react";
import { ProfileCard } from "./ProfileCard";
import { PhotoCard } from "./PhotoCard";
import { EmptyState } from "./EmptyState";
import { CardGridSkeleton } from "./CardGridSkeleton";
import { FilterBar } from "./FilterBar";
import { filterItems } from "../../utils/filterItems";

const TABS = [
  { key: "interns", label: "Interns", type: "PROFILE" },
  { key: "gallery", label: "Gallery", type: "PHOTO" },
];

export function PublicFeedView({ feed, status }) {
  const [tab, setTab] = useState("interns");
  const [query, setQuery] = useState("");

  const activeType = TABS.find((t) => t.key === tab).type;
  const scoped = useMemo(() => feed.filter((i) => i.type === activeType), [feed, activeType]);
  const visible = filterItems(scoped, { query });

  const counts = useMemo(
    () => ({
      interns: feed.filter((i) => i.type === "PROFILE").length,
      gallery: feed.filter((i) => i.type === "PHOTO").length,
    }),
    [feed]
  );

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[var(--ink)] mb-1">Public feed</h2>
      <p className="text-sm text-[var(--ink)]/55 mb-6">Profiles and photos published across every department.</p>

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

      <FilterBar query={query} onQueryChange={setQuery} showVisibilityFilter={false} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {status === "loading" && <CardGridSkeleton />}
        {status === "error" && <EmptyState title="Couldn't load the feed" subtitle="Check your connection and try again." />}
        {status === "ready" && visible.length === 0 && (
          <EmptyState
            title={scoped.length === 0 ? `No ${tab} published yet` : "No matches"}
            subtitle={scoped.length === 0 ? "Check back once departments publish something." : "Try a different search."}
          />
        )}
        {status === "ready" &&
          visible.map((item) => (
            <div
              key={item.id}
              className={
                item.type === "PROFILE"
                  ? "bg-[var(--surface)] border border-[var(--ink)] rounded-md p-5"
                  : "bg-[var(--surface)] border border-[var(--line)] p-3"
              }
            >
              {item.type === "PHOTO" ? <PhotoCard item={item} /> : <ProfileCard item={item} />}
              <span className="mt-4 inline-block text-[11px] font-medium border border-[var(--line)] text-[var(--steel)] px-2 py-1 rounded-sm">
                {item.department}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
