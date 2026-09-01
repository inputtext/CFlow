import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";

const MAX_LINES = 1000;
const FREE_ATTEMPTS = 4;
const STORAGE_PREFIX = "cflow:analysis-usage:";
const ANALYZE_URL = "/api/analyze";

function readUsage(userId) {
  if (!userId || typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), FREE_ATTEMPTS) : 0;
  } catch {
    return 0;
  }
}

function writeUsage(userId, value) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, String(value));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

function getAdminStatus(user) {
  const role = user?.publicMetadata?.role;
  return typeof role === "string" && role.trim().toLowerCase() === "admin";
}

function isAnalysisRequest(input) {
  const url = typeof input === "string" ? input : input?.url;
  return typeof url === "string" && (url.endsWith(ANALYZE_URL) || url.includes(ANALYZE_URL));
}

export default function AnalysisUsageGuard({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = isSignedIn ? user?.id : null;

  const [isAdmin, setIsAdmin] = useState(() => getAdminStatus(user));
  const [used, setUsed] = useState(() => readUsage(userId));
  const [lineCount, setLineCount] = useState(0);
  const [guardError, setGuardError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshAdminStatus() {
      if (!isLoaded || !isSignedIn || !user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      setIsAdmin(getAdminStatus(user));

      try {
        await user.reload();
        if (cancelled) return;
        setIsAdmin(getAdminStatus(user));
      } catch {
        if (!cancelled) setIsAdmin(getAdminStatus(user));
      }
    }

    refreshAdminStatus();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    setUsed(readUsage(userId));
    setGuardError(null);
  }, [userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return undefined;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      if (!isAnalysisRequest(input)) {
        return originalFetch(input, init);
      }

      let payload = null;
      try {
        if (typeof init?.body === "string") payload = JSON.parse(init.body);
        else if (typeof input !== "string" && input?.body) payload = JSON.parse(input.body);
      } catch {
        payload = null;
      }

      const code = typeof payload?.code === "string" ? payload.code : "";
      const lines = code ? code.split(/\r?\n/).length : 0;
      setLineCount(lines);

      if (lines > MAX_LINES) {
        const message = `Code is ${lines} lines. C·FLOW currently supports a maximum of ${MAX_LINES} lines per analysis.`;
        setGuardError({ type: "limit", message });
        return new Response(JSON.stringify({ success: false, message }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (isAdmin) {
        setGuardError(null);
        return originalFetch(input, init);
      }

      const currentUsed = readUsage(userId);
      setUsed(currentUsed);

      if (currentUsed >= FREE_ATTEMPTS) {
        const message = "You have used all 4 free analyses. Upgrade access will be available here soon.";
        setGuardError({ type: "attempts", message });
        return new Response(JSON.stringify({ success: false, message }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      setGuardError(null);
      const response = await originalFetch(input, init);

      try {
        const data = await response.clone().json();
        const validAnalysis =
          response.ok &&
          data?.success &&
          Array.isArray(data.execution) &&
          Array.isArray(data.nodes) &&
          Array.isArray(data.edges);

        if (validAnalysis) {
          const nextUsed = Math.min(currentUsed + 1, FREE_ATTEMPTS);
          writeUsage(userId, nextUsed);
          setUsed(nextUsed);
          setGuardError(null);
        } else if (!response.ok || data?.success === false) {
          setGuardError({
            type: "analysis",
            message: data?.message || data?.error || `Analysis failed (${response.status}).`,
          });
        }
      } catch {
        if (!response.ok) {
          setGuardError({
            type: "analysis",
            message: `The analysis service returned an invalid response (${response.status}).`,
          });
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isLoaded, isSignedIn, userId, isAdmin]);

  useEffect(() => {
    const findEditor = () => document.querySelector('textarea[aria-label="C or C++ code editor"]');

    const sync = () => {
      const editor = findEditor();
      if (!editor) return false;
      setLineCount(editor.value ? editor.value.split(/\r?\n/).length : 0);
      return true;
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", sync, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", sync, true);
    };
  }, []);

  const remaining = Math.max(0, FREE_ATTEMPTS - used);
  const lineStatus = lineCount > MAX_LINES ? "danger" : lineCount >= 950 ? "warning" : "normal";
  const badgeText = isAdmin ? "ADMIN · UNLIMITED" : isSignedIn ? `${remaining}/4 FREE` : "SIGN IN";

  const badgeClass = useMemo(() => {
    if (isAdmin) return "bg-[#DFF7E8]";
    if (lineStatus === "danger") return "bg-[#FFD6E7]";
    if (lineStatus === "warning") return "bg-[#FFE3A3]";
    return "bg-[#FFF9F0]";
  }, [isAdmin, lineStatus]);

  return (
    <>
      {children}

      {isLoaded && isSignedIn && (
        <div className="cflow-usage-badges pointer-events-none fixed top-4 left-1/2 z-[80] flex -translate-x-1/2 flex-row items-center justify-center gap-2 whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-[0.12em]">
          <div className={`w-fit whitespace-nowrap border-2 border-[#171717] px-3 py-2 shadow-[3px_3px_0_#171717] ${badgeClass}`}>
            {badgeText}{!isAdmin && " ANALYSES"}
          </div>

          <div className="w-fit whitespace-nowrap border-2 border-[#171717] bg-white px-3 py-2 shadow-[3px_3px_0_#171717]">
            {lineCount} / {MAX_LINES} LINES
          </div>
        </div>
      )}

      {guardError && (
        <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-[720px] items-center justify-between gap-4 border-2 border-[#171717] bg-[#FFD6E7] px-4 py-3 font-mono shadow-[5px_5px_0_#171717]" role="alert" aria-live="assertive">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]">
              {guardError.type === "attempts" ? "FREE LIMIT REACHED" : guardError.type === "limit" ? "CODE LIMIT" : "ANALYSIS ERROR"}
            </div>
            <div className="mt-1 text-[11px] leading-5">{guardError.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setGuardError(null)}
            className="shrink-0 border-2 border-[#171717] bg-[#FFF9F0] px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0_#171717] transition-transform hover:-translate-y-0.5"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
