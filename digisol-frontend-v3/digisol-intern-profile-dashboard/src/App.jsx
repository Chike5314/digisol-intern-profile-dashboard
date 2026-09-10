import { useEffect, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/ToastProvider";
import { AccountGate } from "./components/AccountGate";
import { AuthScreen } from "./components/auth/AuthScreen";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
      <p className="text-sm text-[var(--ink)]/45">Loading...</p>
    </div>
  );
}

function App() {
  const [authState, setAuthState] = useState("loading"); // loading | signedOut | signedIn

  useEffect(() => {
    let cancelled = false;

    const checkUser = () => {
      getCurrentUser()
        .then(() => !cancelled && setAuthState("signedIn"))
        .catch(() => !cancelled && setAuthState("signedOut"));
    };

    checkUser();

    // Handles both email/password sign-in and the Google OAuth redirect
    // completing — both fire 'signedIn' on Amplify's auth Hub channel.
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") setAuthState("signedIn");
      if (payload.event === "signedOut") setAuthState("signedOut");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (authState === "loading") return <LoadingScreen />;
  if (authState === "signedOut") return <AuthScreen />;

  return (
    <ToastProvider>
      <BrowserRouter>
        <AccountGate signOut={amplifySignOut} />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
