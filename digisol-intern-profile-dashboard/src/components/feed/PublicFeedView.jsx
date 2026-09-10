import { useState } from "react";
import { ProfileCard } from "./ProfileCard";
import { PhotoCard } from "./PhotoCard";
import { EmptyState } from "./EmptyState";
import { CardGridSkeleton } from "./CardGridSkeleton";
import { FilterBar } from "./FilterBar";
import { filterItems } from "../../utils/filterItems";

export function PublicFeedView({ feed, status }) {
  const [query, setQuery] = useState("");
  const visible = filterItems(feed, { query });

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[var(--ink)] mb-1">Public feed</h2>
      <p className="text-sm text-[var(--ink)]/55 mb-7">Profiles and photos published across every department.</p>

      <FilterBar query={query} onQueryChange={setQuery} showVisibilityFilter={false} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {status === "loading" && <CardGridSkeleton />}
        {status === "error" && <EmptyState title="Couldn't load the feed" subtitle="Check your connection and try again." />}
        {status === "ready" && visible.length === 0 && (
          <EmptyState
            title={feed.length === 0 ? "Nothing published yet" : "No matches"}
            subtitle={feed.length === 0 ? "Public profiles and photos will show up here." : "Try a different search."}
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
