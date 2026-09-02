import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const EMPTY_STACK = [];

function normalizeFrames(detail) {
  if (!Array.isArray(detail)) return EMPTY_STACK;
  return detail.map((frame, index) => ({
    id: frame?.id ?? `${frame?.name ?? "frame"}-${index}`,
    name: frame?.name ?? frame?.function ?? "frame",
    variables: frame?.variables && typeof frame.variables === "object" ? frame.variables : {},
    args: Array.isArray(frame?.args) ? frame.args : [],
    active: frame?.active ?? index === detail.length - 1,
  }));
}

function readMemoryFrames() {
  if (typeof document === "undefined") return EMPTY_STACK;
  const cards = [...document.querySelectorAll("[data-memory]")];
  if (!cards.length) return EMPTY_STACK;

  const variables = {};
  cards.forEach((card) => {
    const name = card.getAttribute("data-memory");
    if (!name) return;
    const valueNode = card.querySelector(".font-mono.text-\\[24px\\]");
    variables[name] = valueNode?.textContent?.trim() ?? "—";
  });

  return [{ id: "main", name: "main()", variables, args: [], active: true }];
}

function frameSignature(frames) {
  return JSON.stringify(frames.map((frame) => ({
    id: frame.id,
    name: frame.name,
    args: frame.args,
    variables: frame.variables,
    active: frame.active,
  })));
}

function CallStack() {
  const [frames, setFrames] = useState(EMPTY_STACK);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const previousIdsRef = useRef([]);
  const signatureRef = useRef("");
  const hideTimerRef = useRef(null);

  useEffect(() => {
    let observer;
    let retryTimer;

    const restartAutoHide = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setOpen(false), 3000);
    };

    const applyFrames = (nextFrames, autoOpen = false) => {
      if (!nextFrames.length) return;
      const signature = frameSignature(nextFrames);
      if (signature === signatureRef.current) return;

      signatureRef.current = signature;
      setFrames(nextFrames);

      if (autoOpen) {
        setOpen(true);
        restartAutoHide();
      }
    };

    const syncFromMemory = () => {
      const nextFrames = readMemoryFrames();
      if (nextFrames.length) applyFrames(nextFrames, true);
    };

    const attachMemoryObserver = () => {
      const card = document.querySelector("[data-memory]");
      if (!card) {
        retryTimer = window.setTimeout(attachMemoryObserver, 400);
        return;
      }

      const memorySection = card.closest("section") || card.parentElement;
      if (!memorySection) return;

      observer = new MutationObserver(syncFromMemory);
      observer.observe(memorySection, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      syncFromMemory();
    };

    const handleStackEvent = (event) => {
      const nextFrames = normalizeFrames(event?.detail?.frames ?? event?.detail);
      applyFrames(nextFrames, true);
    };

    attachMemoryObserver();
    window.addEventListener("cflow:callstack", handleStackEvent);
    window.addEventListener("cflow:memory", syncFromMemory);

    return () => {
      if (observer) observer.disconnect();
      if (retryTimer) window.clearTimeout(retryTimer);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      window.removeEventListener("cflow:callstack", handleStackEvent);
      window.removeEventListener("cflow:memory", syncFromMemory);
    };
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;

    gsap.killTweensOf(panelRef.current);

    if (open) {
      gsap.fromTo(
        panelRef.current,
        { x: 42, opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 0.42, ease: "power3.out" }
      );
    } else {
      gsap.to(panelRef.current, {
        x: 42,
        opacity: 0,
        scale: 0.98,
        duration: 0.28,
        ease: "power2.in",
      });
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;

    const cards = listRef.current.querySelectorAll("[data-call-frame]");
    const currentIds = [...cards].map((card) => card.getAttribute("data-call-frame"));
    const previousIds = previousIdsRef.current;

    gsap.killTweensOf(cards);

    if (currentIds.join("|") !== previousIds.join("|")) {
      gsap.fromTo(
        cards,
        { y: 14, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.38, stagger: 0.055, ease: "power3.out" }
      );
    } else {
      gsap.fromTo(
        cards,
        { opacity: 0.65 },
        { opacity: 1, duration: 0.24, stagger: 0.025, ease: "power2.out" }
      );
    }

    previousIdsRef.current = currentIds;
  }, [frames]);

  if (!frames.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) {
            if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = window.setTimeout(() => setOpen(false), 3000);
          }
        }}
        aria-expanded={open}
        aria-label="Toggle call stack"
        className="fixed right-0 top-1/2 z-[950] -translate-y-1/2 border-2 border-r-0 border-[#171717] bg-[#FFE3A3] px-2 py-3 font-mono text-[9px] font-black uppercase tracking-[0.16em] shadow-[-3px_3px_0_#171717] transition-transform duration-200 hover:-translate-x-1"
      >
        <span className="block [writing-mode:vertical-rl]">CALL STACK</span>
      </button>

      <aside
        ref={panelRef}
        aria-label="Call stack"
        className="pointer-events-auto fixed bottom-[112px] right-4 z-[940] w-[260px] max-w-[calc(100vw-32px)] border-2 border-[#171717] bg-[#FFF9F0] shadow-[7px_7px_0_#171717]"
        style={{ opacity: 0 }}
      >
        <div className="flex items-center justify-between border-b-2 border-[#171717] bg-[#E8DFFF] px-4 py-3">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.22em] opacity-55">Runtime</div>
            <h2 className="mt-1 font-mono text-[14px] font-black uppercase tracking-wider">Call Stack</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
              setOpen(false);
            }}
            className="border-2 border-[#171717] bg-[#FFF9F0] px-2 py-1 font-mono text-[11px] font-black shadow-[2px_2px_0_#171717] transition-transform hover:-translate-y-0.5"
          >
            ×
          </button>
        </div>

        <div ref={listRef} className="max-h-[38vh] space-y-2 overflow-y-auto p-3">
          {frames.map((frame, index) => {
            const entries = Object.entries(frame.variables || {});

            return (
              <div
                key={frame.id}
                data-call-frame={frame.id}
                className={`border-2 border-[#171717] p-3 shadow-[3px_3px_0_#171717] ${frame.active ? "bg-[#FFE3A3]" : "bg-white"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-black">{frame.name}</span>
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider opacity-45">#{index + 1}</span>
                </div>

                {frame.args.length > 0 && (
                  <div className="mt-1 font-mono text-[9px] opacity-55">({frame.args.join(", ")})</div>
                )}

                {entries.length > 0 ? (
                  <div className="mt-2 space-y-1 border-t border-[#171717]/25 pt-2">
                    {entries.map(([name, value]) => (
                      <div key={name} className="flex items-center justify-between gap-3 font-mono text-[10px]">
                        <span className="font-bold">{name}</span>
                        <span className="font-black">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-wider opacity-45">No local variables</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-[#171717] bg-white px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] opacity-50">
          Top frame = currently executing function
        </div>
      </aside>
    </>
  );
}

export default CallStack;
