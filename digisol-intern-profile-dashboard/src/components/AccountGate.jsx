import { useUserAttrs } from "../hooks/useUserAttrs";
import { useApi } from "../hooks/useApi";
import { useMembership } from "../hooks/useMembership";
import { CompleteProfileModal } from "./modals/CompleteProfileModal";
import { MembershipStatusScreen } from "./auth/MembershipStatusScreen";
import { DashboardContent } from "./DashboardContent";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
      <p className="text-sm text-[var(--ink)]/45">Loading...</p>
    </div>
  );
}

export function AccountGate({ signOut }) {
  const { department, role, needsOnboarding, loading: attrsLoading, completeProfile } = useUserAttrs();
  const api = useApi(signOut);
  // Don't fire the department-register / membership-request calls until we
  // know onboarding is actually complete — otherwise a Google user mid-setup
  // would register/request against empty attributes.
  const membership = useMembership(api, role, !attrsLoading && !needsOnboarding);

  if (attrsLoading) return <LoadingScreen />;
  if (needsOnboarding) return <CompleteProfileModal onComplete={completeProfile} />;

  if (membership.status === "checking") return <LoadingScreen />;
  if (membership.status !== "ready") {
    return <MembershipStatusScreen status={membership.status} onRecheck={membership.recheck} signOut={signOut} />;
  }

  return <DashboardContent signOut={signOut} department={department} role={role} />;
}
