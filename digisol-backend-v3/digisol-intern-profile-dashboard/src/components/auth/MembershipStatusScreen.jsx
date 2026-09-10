import { Clock, XCircle, AlertTriangle } from "lucide-react";

const COPY = {
  pending: {
    icon: Clock,
    title: "Waiting for approval",
    body: "Your request to join this department is pending. A department lead needs to approve it before you can access the workspace.",
  },
  rejected: {
    icon: XCircle,
    title: "Request declined",
    body: "Your request to join this department wasn't approved. Reach out to a department lead if you think this is a mistake.",
  },
  "department-taken": {
    icon: AlertTriangle,
    title: "Department name already taken",
    body: "Another lead has already registered this department name. Update your department in account settings, or contact them directly.",
  },
  error: {
    icon: AlertTriangle,
    title: "Something went wrong",
    body: "Couldn't check your account status. Try again in a moment.",
  },
};

export function MembershipStatusScreen({ status, onRecheck, signOut }) {
  const copy = COPY[status] || COPY.error;
  const Icon = copy.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-md p-6 shadow-sm text-center">
        <Icon size={28} className="mx-auto mb-3 text-[var(--ink)]/40" />
        <h2 className="font-display font-semibold text-[var(--ink)]">{copy.title}</h2>
        <p className="text-sm text-[var(--ink)]/60 mt-2">{copy.body}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onRecheck}
            className="w-full bg-[var(--ink)] text-white rounded-md py-2.5 font-medium text-sm hover:bg-[#2A3547] transition"
          >
            Check again
          </button>
          <button
            onClick={signOut}
            className="w-full text-sm text-[var(--ink)]/55 hover:text-[var(--ink)] py-1.5 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
