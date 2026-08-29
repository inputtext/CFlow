import { useEffect, useState } from "react";
import { executionSteps, initialState } from "./core/mockEngine";
import { animateVariableUpdate } from "./animations/animateVariableUpdate";
import { animateConditionEvaluation } from "./animations/animateConditionEvaluation";
import FlowGraph from "./components/FlowGraph";
import { playLoopSound } from "./animations/executionSound";

const codeLines = [
  { number: 1, text: "int evenNum = 20;" },
  { number: 2, text: "int sum = 0;" },
  { number: 3, text: "" },
  { number: 4, text: "for (int i = 0; i <= 10; i++) {" },
  { number: 5, text: "    sum += evenNum;" },
  { number: 6, text: "    evenNum += 2;" },
  { number: 7, text: "}" },
  { number: 8, text: "" },
  {
    number: 9,
    text: 'printf("The sum of even nums from 20 to 40 is: %d", sum);',
  },
  { number: 10, text: "cout << endl;" },
];

function App() {
  const [currentStep, setCurrentStep] = useState(0);

  const step = executionSteps[currentStep];

  const activeFlowNode =
    step?.type === "condition"
      ? "condition"
      : step?.target === "sum"
        ? "sum"
        : step?.target === "evenNum"
          ? "evenNum"
          : step?.target === "i"
            ? "increment"
            : step?.type === "output"
              ? "exit"
              : null;

  const variables = step?.variables ?? initialState;

  // ─────────────────────────────────────────────
  // EXECUTION ANIMATIONS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!step) return;

    // Variable update animation
    if (
      step.target &&
      (
        step.type === "compound_assignment" ||
        step.type === "increment" ||
        step.type === "assignment"
      )
    ) {
      animateVariableUpdate({
        sourceSelector: "[data-operation]",
        targetSelector: `[data-memory="${step.target}"]`,
        before: step.before,
        after: step.after,
      });
    }

    // Condition evaluation animation
    if (step.type === "condition") {
      animateConditionEvaluation({
        conditionSelector: "[data-condition]",
        result: step.result,
      });
    }
  }, [currentStep, step]);

  // ─────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────

  const goForward = () => {
    playLoopSound();

    setCurrentStep((current) =>
      Math.min(current + 1, executionSteps.length - 1)
    );
  };

  const goBack = () => {
    setCurrentStep((current) => Math.max(current - 1, 0));
  };

  const reset = () => {
    setCurrentStep(0);
  };

  const isAtEnd = currentStep === executionSteps.length - 1;
  const isAtStart = currentStep === 0;

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#FFF9F0] text-[#171717] flex flex-col">

      {/* HEADER */}
      <header className="h-16 shrink-0 border-b-2 border-[#171717] flex items-center justify-between px-6">

        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight">
            C·FLOW
          </h1>

          <span className="text-sm font-mono opacity-60">
            main.cpp
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm font-mono">

          <span className="px-3 py-1 bg-[#DDF4FF] border-2 border-[#171717]">
            C++
          </span>

          <span className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full border border-[#171717] ${
                isAtEnd ? "bg-[#FFD6E7]" : "bg-[#DFF7E8]"
              }`}
            />

            {isAtEnd ? "FINISHED" : "READY"}
          </span>

        </div>

      </header>


      {/* MAIN WORKSPACE */}
      <main className="flex-1 min-h-0 grid grid-cols-[1fr_1.35fr_0.9fr] gap-4 p-4">

        {/* CODE PANEL */}
        <section className="min-w-0 bg-[#DDF4FF] border-2 border-[#171717] shadow-[4px_4px_0_#171717] overflow-hidden flex flex-col">

          <div className="px-5 py-4 border-b-2 border-[#171717]">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Code
            </p>
          </div>

          <div className="p-5 font-mono text-sm overflow-auto">

            {codeLines.map((line) => {
              const active = step?.line === line.number;

              return (
                <div
                  key={line.number}
                  className={`flex gap-5 px-2 py-1 -mx-2 transition-all duration-200 ${
                    active
                      ? "bg-[#FFE3A3] border-l-4 border-[#171717]"
                      : ""
                  }`}
                >

                  <span className="w-6 text-right opacity-40 select-none">
                    {String(line.number).padStart(2, "0")}
                  </span>

                  <span className={active ? "font-bold" : ""}>
                    {line.text}
                  </span>

                </div>
              );
            })}

          </div>

        </section>


        {/* FLOW PANEL */}
        <section className="min-w-0 bg-[#E8DFFF] border-2 border-[#171717] shadow-[4px_4px_0_#171717] overflow-hidden flex flex-col">

          <div className="px-5 py-4 border-b-2 border-[#171717] flex items-center justify-between">

            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Flow
            </p>

            {step?.iteration && (
              <span className="text-xs font-mono font-bold">
                ITERATION {String(step.iteration).padStart(2, "0")}
              </span>
            )}

          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <FlowGraph activeNode={activeFlowNode} />
          </div>

        </section>


        {/* MEMORY PANEL */}
        <section className="min-w-0 bg-[#DFF7E8] border-2 border-[#171717] shadow-[4px_4px_0_#171717] overflow-hidden flex flex-col">

          <div className="px-5 py-4 border-b-2 border-[#171717]">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Memory
            </p>
          </div>


          <div className="p-5 space-y-4">

            {/* evenNum */}
            <div
              data-memory="evenNum"
              className={`bg-white border-2 border-[#171717] shadow-[3px_3px_0_#171717] p-4 ${
                step?.target === "evenNum"
                  ? "bg-[#FFE3A3]"
                  : ""
              }`}
            >

              <div className="text-xs uppercase tracking-wider opacity-50">
                int
              </div>

              <div className="flex items-end justify-between mt-3">

                <span className="font-mono font-bold">
                  evenNum
                </span>

                <span className="font-mono text-2xl font-black">
                  {variables.evenNum ?? "—"}
                </span>

              </div>

              {step?.target === "evenNum" && (
                <div className="mt-2 text-xs font-mono opacity-60">
                  {step.before} → {step.after}
                </div>
              )}

            </div>


            {/* sum */}
            <div
              data-memory="sum"
              className={`bg-white border-2 border-[#171717] shadow-[3px_3px_0_#171717] p-4 ${
                step?.target === "sum"
                  ? "bg-[#FFE3A3]"
                  : ""
              }`}
            >

              <div className="text-xs uppercase tracking-wider opacity-50">
                int
              </div>

              <div className="flex items-end justify-between mt-3">

                <span className="font-mono font-bold">
                  sum
                </span>

                <span className="font-mono text-2xl font-black">
                  {variables.sum}
                </span>

              </div>

              {step?.target === "sum" && (
                <div className="mt-2 text-xs font-mono opacity-60">
                  {step.before} → {step.after}
                </div>
              )}

            </div>


            {/* i */}
            <div
              data-memory="i"
              className={`bg-white border-2 border-[#171717] shadow-[3px_3px_0_#171717] p-4 ${
                step?.target === "i"
                  ? "bg-[#FFE3A3]"
                  : ""
              }`}
            >

              <div className="text-xs uppercase tracking-wider opacity-50">
                int
              </div>

              <div className="flex items-end justify-between mt-3">

                <span className="font-mono font-bold">
                  i
                </span>

                <span className="font-mono text-2xl font-black">
                  {variables.i ?? "—"}
                </span>

              </div>

              {step?.target === "i" && (
                <div className="mt-2 text-xs font-mono opacity-60">
                  {step.before} → {step.after}
                </div>
              )}

            </div>

          </div>

        </section>

      </main>


      {/* EXECUTION CONTROLS */}
      <footer className="shrink-0 border-t-2 border-[#171717] bg-white px-6 py-4">

        <div className="flex items-center justify-between gap-6">

          <button
            onClick={goBack}
            disabled={isAtStart}
            className="px-4 py-2 border-2 border-[#171717] shadow-[3px_3px_0_#171717] font-bold bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← STEP BACK
          </button>


          <button
            onClick={reset}
            className="px-6 py-2 border-2 border-[#171717] shadow-[3px_3px_0_#171717] font-bold bg-[#FFE3A3]"
          >
            ↻ RESET
          </button>


          <button
            onClick={goForward}
            disabled={isAtEnd}
            className="px-4 py-2 border-2 border-[#171717] shadow-[3px_3px_0_#171717] font-bold bg-[#FFF9F0] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            STEP FORWARD →
          </button>


          {/* TIMELINE */}
          <div className="flex-1 max-w-xl">

            <div className="relative h-2 bg-[#FFF9F0] border-2 border-[#171717]">

              <div
                className="absolute left-0 top-0 h-full bg-[#FFE3A3]"
                style={{
                  width: `${
                    executionSteps.length <= 1
                      ? 0
                      : (currentStep / (executionSteps.length - 1)) * 100
                  }%`,
                }}
              />

              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#171717] border-2 border-[#FFF9F0] transition-all duration-200"
                style={{
                  left: `calc(${
                    executionSteps.length <= 1
                      ? 0
                      : (currentStep / (executionSteps.length - 1)) * 100
                  }% - 8px)`,
                }}
              />

            </div>


            <div className="flex justify-between mt-2 text-xs font-mono opacity-60">

              <span>
                STEP {String(currentStep + 1).padStart(2, "0")}
              </span>

              <span>
                {step?.type?.toUpperCase() ?? "READY"}
              </span>

              <span>
                {executionSteps.length} STEPS
              </span>

            </div>

          </div>

        </div>


        {/* EXPLANATION */}
        {step?.explanation && (
          <div className="mt-4 border-t-2 border-[#171717] pt-3 flex items-center justify-center">

            <p className="font-mono text-sm">

              <span className="font-bold mr-3">
                WHY:
              </span>

              {step.explanation}

            </p>

          </div>
        )}

      </footer>

    </div>
  );
}

export default App;
