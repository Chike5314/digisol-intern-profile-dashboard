import { useEffect, useState } from "react";
import { signUp, signIn, confirmSignUp, resendSignUpCode, signInWithRedirect } from "aws-amplify/auth";
import { fetchPublicDepartments } from "../../api/departments";

const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40";
const primaryButtonClass =
  "w-full bg-[var(--ink)] text-white rounded-md py-2.5 font-medium text-sm hover:bg-[#2A3547] transition disabled:opacity-50";

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => signInWithRedirect({ provider: "Google" })}
      className="w-full flex items-center justify-center gap-3 bg-white border border-[var(--line)] text-[var(--ink)] rounded-md py-2.5 font-medium text-sm hover:bg-[var(--paper)] transition"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      Sign in with Google
    </button>
  );
}

function SignInForm({ onSwitchToSignUp, onNeedsConfirmation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn({ username: email, password });
      // On success, Amplify's Hub 'auth' channel fires 'signedIn' — the root
      // component listens for that and switches screens; nothing to do here.
    } catch (err) {
      if (err.name === "UserNotConfirmedException" || err.name === "UserUnAuthenticatedException") {
        onNeedsConfirmation(email);
      } else {
        setError(err.message || "Couldn't sign in — check your email and password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      {error && <p className="text-xs text-[#B5432F]">{error}</p>}
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
      <GoogleButton />
      <p className="text-center text-xs text-[var(--ink)]/55 pt-1">
        Don't have an account?{" "}
        <button type="button" onClick={onSwitchToSignUp} className="text-[var(--steel)] font-medium hover:underline">
          Sign up
        </button>
      </p>
    </form>
  );
}

function SignUpForm({ onSwitchToSignIn, onSignedUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [department, setDepartment] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [deptStatus, setDeptStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicDepartments()
      .then((names) => {
        if (cancelled) return;
        setDepartments(names);
        setDeptStatus("ready");
      })
      .catch(() => !cancelled && setDeptStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let finalDepartment = "";
    if (role === "MEMBER") {
      if (!department) {
        setError("Choose the department you're joining.");
        return;
      }
      finalDepartment = department;
    } else if (role === "LEAD") {
      if (!newDepartmentName.trim()) {
        setError("Name the department you're leading.");
        return;
      }
      finalDepartment = newDepartmentName.trim();
    }
    // VISITOR: finalDepartment stays "" — visitors don't belong to a department.

    setSubmitting(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            "custom:department": finalDepartment,
            "custom:role": role,
          },
        },
      });
      onSignedUp(email);
    } catch (err) {
      setError(err.message || "Couldn't create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      <input
        type="password"
        placeholder="Password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
        <option value="MEMBER">Member — join an existing department</option>
        <option value="LEAD">Lead — register a new department</option>
        <option value="VISITOR">Visitor — browse the public feed only</option>
      </select>

      {role === "MEMBER" && (
        <>
          {deptStatus === "loading" && <p className="text-xs text-[var(--ink)]/45">Loading departments...</p>}
          {deptStatus === "error" && <p className="text-xs text-[#B5432F]">Couldn't load departments — try again shortly.</p>}
          {deptStatus === "ready" && departments.length === 0 && (
            <p className="text-xs text-[var(--ink)]/55">
              No departments exist yet — ask a department lead to sign up first, or sign up as a Lead yourself.
            </p>
          )}
          {deptStatus === "ready" && departments.length > 0 && (
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
              <option value="">Choose a department...</option>
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-[var(--ink)]/45">
            A department lead will need to approve your request before you can access the workspace.
          </p>
        </>
      )}

      {role === "LEAD" && (
        <>
          <input
            type="text"
            placeholder="Department name (e.g. SoftwareEngineering)"
            required
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-[var(--ink)]/45">
            If this name is already taken by another lead, you'll be asked to choose a different one after signing in.
          </p>
        </>
      )}

      {role === "VISITOR" && (
        <p className="text-xs text-[var(--ink)]/45">
          Visitor accounts can browse the public feed but can't join a department workspace.
        </p>
      )}

      {error && <p className="text-xs text-[#B5432F]">{error}</p>}
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "Creating account..." : "Create account"}
      </button>
      <GoogleButton />
      <p className="text-center text-xs text-[var(--ink)]/55 pt-1">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToSignIn} className="text-[var(--steel)] font-medium hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}

function ConfirmForm({ email, onConfirmed }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      onConfirmed();
    } catch (err) {
      setError(err.message || "That code didn't work — check it and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await resendSignUpCode({ username: email });
      setInfo("A new code is on its way.");
    } catch (err) {
      setError(err.message || "Couldn't resend the code.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-[var(--ink)]/65">We sent a confirmation code to {email}.</p>
      <input
        type="text"
        placeholder="Confirmation code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={inputClass}
      />
      {error && <p className="text-xs text-[#B5432F]">{error}</p>}
      {info && <p className="text-xs text-[var(--moss)]">{info}</p>}
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "Confirming..." : "Confirm and continue"}
      </button>
      <button type="button" onClick={handleResend} className="w-full text-center text-xs text-[var(--steel)] hover:underline">
        Resend code
      </button>
    </form>
  );
}

export function AuthScreen() {
  const [screen, setScreen] = useState("signIn"); // signIn | signUp | confirm
  const [pendingEmail, setPendingEmail] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-md p-6 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-xl font-semibold text-[var(--ink)]">The Roster</h1>
          <p className="text-xs text-[var(--ink)]/55 mt-1">
            {screen === "confirm" ? "Confirm your account" : "Sign in with your workspace account"}
          </p>
        </div>

        {screen === "signIn" && (
          <SignInForm
            onSwitchToSignUp={() => setScreen("signUp")}
            onNeedsConfirmation={(email) => {
              setPendingEmail(email);
              setScreen("confirm");
            }}
          />
        )}
        {screen === "signUp" && (
          <SignUpForm
            onSwitchToSignIn={() => setScreen("signIn")}
            onSignedUp={(email) => {
              setPendingEmail(email);
              setScreen("confirm");
            }}
          />
        )}
        {screen === "confirm" && <ConfirmForm email={pendingEmail} onConfirmed={() => setScreen("signIn")} />}
      </div>
    </div>
  );
}
