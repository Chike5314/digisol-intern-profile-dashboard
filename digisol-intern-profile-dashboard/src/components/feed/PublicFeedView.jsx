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
      <h2 className="text-2xl font-bold mb-1">Public Gallery Feed</h2>
      <p className="text-sm text-slate-500 mb-6">Shared internship photos and profiles from all departments.</p>

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
            <div key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              {item.type === "PHOTO" ? <PhotoCard item={item} /> : <ProfileCard item={item} />}
              <span className="mt-4 inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                Dept: {item.department}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
