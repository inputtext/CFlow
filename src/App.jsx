import { useEffect, useMemo, useRef, useState } from "react";
import { executionSteps as fallbackExecutionSteps, initialState as fallbackInitialState } from "./core/mockEngine";
import { animateVariableUpdate } from "./animations/animateVariableUpdate";
import { animateConditionEvaluation } from "./animations/animateConditionEvaluation";
import FlowGraph from "./components/FlowGraph";
import { playLoopSound } from "./animations/executionSound";

/* ============================================================
   STARTER CODE
============================================================ */

const STARTER_CODE = {
  C: `#include <stdio.h>

int main() {
    int evenNum = 20;
    int sum = 0;

    for (int i = 0; i <= 10; i++) {
        sum += evenNum;
        evenNum += 2;
    }

    printf("The sum of even nums from 20 to 40 is: %d", sum);

    return 0;
}`,

  "C++": `#include <iostream>
using namespace std;

int main() {
    int evenNum = 20;
    int sum = 0;

    for (int i = 0; i <= 10; i++) {
        sum += evenNum;
        evenNum += 2;
    }

    cout << "The sum of even nums from 20 to 40 is: "
         << sum << endl;

    return 0;
}`,
};

/* ============================================================
   FLOW NODE HELPERS
============================================================ */

function getFlowNode(flowStep) {
  if (!flowStep) return null;

  if (flowStep.type === "condition") {
    return "condition";
  }

  if (flowStep.target === "sum") {
    return "sum";
  }

  if (flowStep.target === "evenNum") {
    return "evenNum";
  }

  if (flowStep.target === "i") {
    return "increment";
  }

  if (flowStep.type === "output") {
    return "exit";
  }

  return null;
}

/* ============================================================
   APP
============================================================ */

function App() {
  /* ============================================================
     LANGUAGE / WORKSPACE
  ============================================================ */

  const [language, setLanguage] = useState(null);
  const [showWorkspace, setShowWorkspace] = useState(false);

  /* ============================================================
     CODE EDITOR
  ============================================================ */

  const [code, setCode] = useState("");

  const [analyzedCode, setAnalyzedCode] = useState("");

  /* ============================================================
     BACKEND ANALYSIS
  ============================================================ */

  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const textareaRef = useRef(null);
  const lineNumberRef = useRef(null);

  /* ============================================================
     EXECUTION
  ============================================================ */

  const [currentStep, setCurrentStep] = useState(0);

  const [updatedVariable, setUpdatedVariable] =
    useState(null);

  const [animationPhase, setAnimationPhase] =
    useState("idle");

  const flowScrollRef = useRef(null);

  /*
   * Backend execution is the source of truth after Analyze.
   * The old mock engine remains only as a safe fallback so the
   * visualizer does not become empty before the first analysis.
   */
  const activeExecutionSteps =
    analysisResult?.execution?.length
      ? analysisResult.execution
      : fallbackExecutionSteps;

  const step = activeExecutionSteps[currentStep];

  const previousStep =
    currentStep > 0
      ? activeExecutionSteps[currentStep - 1]
      : null;

  const variables =
    step?.variables && Object.keys(step.variables).length > 0
      ? step.variables
      : fallbackInitialState;

  /* ============================================================
     CODE LINES
  ============================================================ */

  const codeLines = useMemo(() => {
    return code.split("\n").map((text, index) => ({
      number: index + 1,
      text,
    }));
  }, [code]);

  /* ============================================================
     INITIALIZE EDITOR WHEN LANGUAGE CHANGES
  ============================================================ */

  useEffect(() => {
    if (!language) return;

    const starter = STARTER_CODE[language];

    setCode(starter);
    setAnalyzedCode(starter);
    setAnalysisResult(null);
    setAnalysisError(null);

    setCurrentStep(0);
    setUpdatedVariable(null);
    setAnimationPhase("idle");
  }, [language]);

  /* ============================================================
     FLOW NODE
  ============================================================ */

  const currentFlowNode =
    getFlowNode(step);

  const previousFlowNode =
    getFlowNode(previousStep);

  /* ============================================================
     CONDITION RESULT
  ============================================================ */

  const conditionResult =
    step?.type === "condition" &&
    typeof step?.result === "boolean"
      ? step.result
      : null;

  /* ============================================================
     ACTIVE FLOW EDGE
  ============================================================ */

  const activeFlowEdge =
    previousFlowNode === null &&
    currentFlowNode === "initialize"
      ? "initializeToCondition"

      : previousFlowNode === "initialize" &&
          currentFlowNode === "condition"
        ? "initializeToCondition"

      : previousFlowNode === "condition" &&
          currentFlowNode === "sum"
        ? "conditionToSum"

      : previousFlowNode === "sum" &&
          currentFlowNode === "evenNum"
        ? "sumToEven"

      : previousFlowNode === "evenNum" &&
          currentFlowNode === "increment"
        ? "evenToIncrement"

      : previousFlowNode === "increment" &&
          currentFlowNode === "condition"
        ? "incrementToCondition"

      : previousFlowNode === "condition" &&
          currentFlowNode === "exit"
        ? "conditionToExit"

      : null;

  /* ============================================================
     FLOW AUTO SCROLL
  ============================================================ */

  useEffect(() => {
    if (!currentFlowNode) return;

    const container =
      flowScrollRef.current;

    if (!container) return;

    const node =
      container.querySelector(
        `[data-flow-node="${currentFlowNode}"]`
      );

    if (!node) return;

    const containerRect =
      container.getBoundingClientRect();

    const nodeRect =
      node.getBoundingClientRect();

    const topSafeZone =
      containerRect.top + 90;

    const bottomSafeZone =
      containerRect.bottom - 90;

    const nodeIsAbove =
      nodeRect.top < topSafeZone;

    const nodeIsBelow =
      nodeRect.bottom > bottomSafeZone;

    if (nodeIsAbove || nodeIsBelow) {
      const targetScroll =
        container.scrollTop +
        (nodeRect.top -
          containerRect.top) -
        container.clientHeight / 2 +
        nodeRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, [currentFlowNode]);

  /* ============================================================
     EXECUTION CHOREOGRAPHY
  ============================================================ */

  useEffect(() => {
    if (!step) {
      setAnimationPhase("idle");
      setUpdatedVariable(null);
      return;
    }

    let flowTimer;
    let memoryTimer;
    let settleTimer;

    setAnimationPhase("code");
    setUpdatedVariable(null);

    flowTimer = setTimeout(() => {
      setAnimationPhase("flow");
    }, 300);

    const isMemoryUpdate =
      step.target &&
      (
        step.type === "compound_assignment" ||
        step.type === "increment" ||
        step.type === "assignment"
      );

    if (isMemoryUpdate) {
      memoryTimer = setTimeout(() => {
        setAnimationPhase("memory");
        setUpdatedVariable(step.target);
      }, 850);
    }

    settleTimer = setTimeout(() => {
      if (isMemoryUpdate) {
        setAnimationPhase("memory");
      } else {
        setAnimationPhase("flow");
      }
    }, 1300);

    return () => {
      clearTimeout(flowTimer);
      clearTimeout(memoryTimer);
      clearTimeout(settleTimer);
    };
  }, [currentStep, step]);

  /* ============================================================
     EXISTING ANIMATION ENGINE
  ============================================================ */

  useEffect(() => {
    if (!step) return;

    if (
      step.target &&
      (
        step.type === "compound_assignment" ||
        step.type === "increment" ||
        step.type === "assignment"
      )
    ) {
      animateVariableUpdate({
        sourceSelector:
          "[data-operation]",

        targetSelector:
          `[data-memory="${step.target}"]`,

        before: step.before,
        after: step.after,
      });
    }

    if (step.type === "condition") {
      animateConditionEvaluation({
        conditionSelector:
          "[data-condition]",

        result: step.result,
      });
    }
  }, [currentStep, step]);

  /* ============================================================
     CODE EDITOR SCROLL SYNC
  ============================================================ */

  const handleCodeScroll = () => {
    if (!textareaRef.current) return;
    if (!lineNumberRef.current) return;

    lineNumberRef.current.scrollTop =
      textareaRef.current.scrollTop;
  };

  /* ============================================================
     ANALYZE CODE
  ============================================================ */

  const analyzeCode = async () => {
    if (!code.trim() || !language || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const backendLanguage =
        language === "C++" ? "cpp" : "c";

      const response = await fetch(
        "http://localhost:5000/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language: backendLanguage,
            code,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response."
        );
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Analysis failed (${response.status}).`
        );
      }

      if (
        !Array.isArray(data.execution) ||
        !Array.isArray(data.nodes) ||
        !Array.isArray(data.edges)
      ) {
        throw new Error(
          "The backend response is missing execution, nodes, or edges."
        );
      }

      /*
       * Keep the backend format intact, but guarantee that every
       * execution item has a stable id for React/animation use.
       */
      const normalizedExecution =
        data.execution.map((executionStep, index) => ({
          ...executionStep,
          id:
            executionStep.id ??
            executionStep.node ??
            `backend-step-${index}`,
          step:
            executionStep.step ?? index,
        }));

      setAnalysisResult({
        ...data,
        execution: normalizedExecution,
      });

      setAnalyzedCode(code);
      setCurrentStep(0);
      setUpdatedVariable(null);
      setAnimationPhase("idle");

      if (flowScrollRef.current) {
        flowScrollRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error("C·FLOW analysis error:", error);

      setAnalysisError(
        error?.message ||
          "Could not connect to the analysis backend."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ============================================================
     EXECUTION CONTROLS
  ============================================================ */

  const goForward = () => {
    if (
      currentStep >=
      activeExecutionSteps.length - 1
    ) {
      return;
    }

    playLoopSound();

    setCurrentStep((current) =>
      Math.min(
        current + 1,
        activeExecutionSteps.length - 1
      )
    );
  };

  const goBack = () => {
    setCurrentStep((current) =>
      Math.max(current - 1, 0)
    );
  };

  const reset = () => {
    setCurrentStep(0);
    setUpdatedVariable(null);
    setAnimationPhase("idle");

    if (flowScrollRef.current) {
      flowScrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const isAtEnd =
    currentStep ===
    activeExecutionSteps.length - 1;

  const isAtStart =
    currentStep === 0;

  /* ============================================================
     MEMORY CARD
  ============================================================ */

  const MemoryCard = ({
    name,
    value,
    type = "int",
  }) => {
    const isUpdated =
      updatedVariable === name &&
      animationPhase === "memory";

    return (
      <div
        data-memory={name}
        className={`
          relative
          overflow-visible
          border-2
          border-[#171717]
          px-4
          py-3.5
          transition-all
          duration-500
          ease-out

          ${
            isUpdated
              ? "translate-x-1 bg-[#FFE3A3] shadow-[7px_7px_0_#171717]"
              : "bg-white shadow-[3px_3px_0_#171717]"
          }
        `}
      >
        {isUpdated && (
          <div
            className="
              absolute
              -left-[88px]
              top-1/2
              flex
              -translate-y-1/2
              items-center
              gap-2
              whitespace-nowrap
              font-mono
              text-[9px]
              font-black
              tracking-wider
              animate-[memoryUpdateIn_0.35s_ease-out]
            "
          >
            <span>
              UPDATED
            </span>

            <span
              className="
                text-base
                leading-none
                animate-[arrowMove_0.5s_ease-out]
              "
            >
              →
            </span>
          </div>
        )}

        <div
          className="
            text-[11px]
            uppercase
            tracking-wider
            opacity-50
          "
        >
          {type}
        </div>

        <div
          className="
            mt-2.5
            flex
            items-end
            justify-between
            gap-4
          "
        >
          <span
            className="
              font-mono
              text-[15px]
              font-bold
            "
          >
            {name}
          </span>

          <div className="relative">
            {isUpdated &&
              step?.before !== undefined && (
                <span
                  key={`old-${currentStep}`}
                  className="
                    pointer-events-none
                    absolute
                    right-0
                    top-1/2
                    font-mono
                    text-[24px]
                    font-black
                    opacity-45
                    animate-[oldValueOut_0.45s_ease-out_forwards]
                  "
                >
                  {step.before}
                </span>
              )}

            <span
              key={`value-${currentStep}`}
              className={`
                relative
                block
                font-mono
                text-[24px]
                font-black
                transition-all
                duration-300

                ${
                  isUpdated
                    ? "scale-110 animate-[newValueIn_0.45s_cubic-bezier(.22,1,.36,1)]"
                    : "scale-100"
                }
              `}
            >
              {value ?? "—"}
            </span>
          </div>
        </div>

        {isUpdated &&
          step?.before !== undefined && (
            <div
              key={`change-${currentStep}`}
              className="
                mt-1.5
                font-mono
                text-[11px]
                opacity-60
                animate-[changeTextIn_0.35s_ease-out]
              "
            >
              {step.before} → {step.after}
            </div>
          )}

        {isUpdated && (
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              border-2
              border-[#171717]
              opacity-0
              animate-[memoryBorderPulse_0.7s_ease-out]
            "
          />
        )}
      </div>
    );
  };

  /* ============================================================
     LANGUAGE SELECTION
  ============================================================ */

  if (!showWorkspace) {
    return (
      <div
        className="
          fixed
          inset-0
          overflow-x-hidden
          overflow-y-auto
          bg-[#FFF9F0]
          text-[#171717]
        "
      >
        <div
          className="
            mx-auto
            min-h-full
            w-full
            max-w-[900px]
            px-6
            py-8
            pb-10
            sm:py-12
            sm:pb-14
          "
        >
          <div
            className="
              mb-12
              flex
              items-end
              justify-between
              border-b-2
              border-[#171717]
              pb-5
            "
          >
            <div>
              <div
                className="
                  font-mono
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.28em]
                  opacity-50
                "
              >
                Interactive execution visualizer
              </div>

              <h1
                className="
                  mt-2
                  text-[46px]
                  font-black
                  tracking-[-0.055em]
                  sm:text-[58px]
                "
              >
                C·FLOW
              </h1>
            </div>

            <div
              className="
                hidden
                border-2
                border-[#171717]
                bg-white
                px-3
                py-2
                font-mono
                text-[10px]
                font-bold
                shadow-[3px_3px_0_#171717]
                sm:block
              "
            >
              C / C++
            </div>
          </div>

          <div className="mb-9 max-w-[620px]">
            <p
              className="
                font-mono
                text-[11px]
                font-bold
                uppercase
                tracking-[0.2em]
                opacity-50
              "
            >
              Step 01 / Choose your language
            </p>

            <h2
              className="
                mt-3
                text-[30px]
                font-black
                tracking-[-0.035em]
                sm:text-[38px]
              "
            >
              What are we visualizing?
            </h2>

            <p
              className="
                mt-3
                max-w-[560px]
                font-mono
                text-sm
                leading-6
                opacity-60
              "
            >
              Choose a language first. Your editor and
              analysis pipeline will use this choice to
              understand the code you write.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">

            {/* C */}

            <button
              type="button"
              onClick={() => setLanguage("C")}
              className={`
                group
                relative
                min-h-[250px]
                border-2
                border-[#171717]
                p-7
                text-left
                transition-all
                duration-300
                ease-out

                ${
                  language === "C"
                    ? "translate-y-[-4px] bg-[#DDF4FF] shadow-[8px_8px_0_#171717]"
                    : "bg-white shadow-[4px_4px_0_#171717] hover:-translate-y-1 hover:shadow-[6px_6px_0_#171717]"
                }
              `}
            >
              <div className="flex items-start justify-between">
                <span
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    border-2
                    border-[#171717]
                    bg-[#FFF9F0]
                    font-mono
                    text-xl
                    font-black
                    shadow-[2px_2px_0_#171717]
                    transition-transform
                    duration-300
                    group-hover:rotate-[-4deg]
                  "
                >
                  C
                </span>

                <span
                  className={`
                    border-2
                    border-[#171717]
                    px-2.5
                    py-1
                    font-mono
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    transition-all
                    duration-300

                    ${
                      language === "C"
                        ? "bg-[#FFE3A3] opacity-100"
                        : "bg-[#FFF9F0] opacity-0"
                    }
                  `}
                >
                  Selected
                </span>
              </div>

              <h3 className="mt-10 text-[26px] font-black">
                C
              </h3>

              <p
                className="
                  mt-2
                  max-w-[330px]
                  font-mono
                  text-[12px]
                  leading-5
                  opacity-55
                "
              >
                Procedural programming with direct,
                low-level control.
              </p>

              <div
                className="
                  absolute
                  bottom-6
                  right-7
                  font-mono
                  text-[10px]
                  font-bold
                  opacity-40
                "
              >
                .c
              </div>
            </button>

            {/* C++ */}

            <button
              type="button"
              onClick={() => setLanguage("C++")}
              className={`
                group
                relative
                min-h-[250px]
                border-2
                border-[#171717]
                p-7
                text-left
                transition-all
                duration-300
                ease-out

                ${
                  language === "C++"
                    ? "translate-y-[-4px] bg-[#E8DFFF] shadow-[8px_8px_0_#171717]"
                    : "bg-white shadow-[4px_4px_0_#171717] hover:-translate-y-1 hover:shadow-[6px_6px_0_#171717]"
                }
              `}
            >
              <div className="flex items-start justify-between">
                <span
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    border-2
                    border-[#171717]
                    bg-[#FFF9F0]
                    font-mono
                    text-[17px]
                    font-black
                    shadow-[2px_2px_0_#171717]
                    transition-transform
                    duration-300
                    group-hover:rotate-[4deg]
                  "
                >
                  C++
                </span>

                <span
                  className={`
                    border-2
                    border-[#171717]
                    px-2.5
                    py-1
                    font-mono
                    text-[9px]
                    font-black
                    uppercase
                    tracking-wider
                    transition-all
                    duration-300

                    ${
                      language === "C++"
                        ? "bg-[#FFE3A3] opacity-100"
                        : "bg-[#FFF9F0] opacity-0"
                    }
                  `}
                >
                  Selected
                </span>
              </div>

              <h3 className="mt-10 text-[26px] font-black">
                C++
              </h3>

              <p
                className="
                  mt-2
                  max-w-[330px]
                  font-mono
                  text-[12px]
                  leading-5
                  opacity-55
                "
              >
                Modern C++ with classes, STL,
                and object-oriented patterns.
              </p>

              <div
                className="
                  absolute
                  bottom-6
                  right-7
                  font-mono
                  text-[10px]
                  font-bold
                  opacity-40
                "
              >
                .cpp
              </div>
            </button>
          </div>

          {/* CONTINUE */}

          <div
            className="
              mt-8
              flex
              items-center
              justify-between
              gap-4
              border-t-2
              border-[#171717]
              bg-[#FFF9F0]
              pt-5
              pb-4
            "
          >
            <div
              className="
                font-mono
                text-[10px]
                font-bold
                uppercase
                tracking-[0.15em]
                opacity-45
              "
            >
              {language
                ? `${language} selected`
                : "Select a language to continue"}
            </div>

            <button
              type="button"
              disabled={!language}
              onClick={() =>
                setShowWorkspace(true)
              }
              className="
                group
                border-2
                border-[#171717]
                bg-[#171717]
                px-6
                py-3
                font-mono
                text-[12px]
                font-black
                uppercase
                tracking-wider
                text-white
                shadow-[4px_4px_0_#FFE3A3]
                transition-all
                duration-200
                hover:-translate-y-1
                hover:shadow-[6px_6px_0_#FFE3A3]
                active:translate-y-0
                active:shadow-[2px_2px_0_#FFE3A3]
                disabled:pointer-events-none
                disabled:opacity-25
              "
            >
              Continue

              <span
                className="
                  ml-3
                  inline-block
                  transition-transform
                  duration-200
                  group-hover:translate-x-1
                "
              >
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     WORKSPACE
  ============================================================ */

  return (
    <div
      className="
        flex
        h-dvh
        min-h-0
        flex-col
        overflow-hidden
        bg-[#FFF9F0]
        text-[#171717]
      "
    >

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header
        className="
          flex
          h-[74px]
          shrink-0
          items-center
          justify-between
          border-b-2
          border-[#171717]
          bg-[#FFF9F0]
          px-8
        "
      >
        <div
          className="
            flex
            items-baseline
            gap-5
          "
        >
          <h1
            className="
              text-[28px]
              font-black
              tracking-[-0.04em]
            "
          >
            C·FLOW
          </h1>

          <span
            className="
              font-mono
              text-[15px]
              opacity-55
            "
          >
            {language === "C"
              ? "main.c"
              : "main.cpp"}
          </span>
        </div>

        <div
          className="
            flex
            items-center
            gap-5
          "
        >
          <span
            className="
              border-2
              border-[#171717]
              bg-[#DDF4FF]
              px-4
              py-2
              font-mono
              text-sm
              font-bold
              shadow-[2px_2px_0_#171717]
            "
          >
            {language}
          </span>

          <span
            className="
              flex
              items-center
              gap-2
              font-mono
              text-sm
            "
          >
            <span
              className={`
                h-3
                w-3
                rounded-full
                border
                border-[#171717]
                transition-all
                duration-500

                ${
                  animationPhase === "code"
                    ? "scale-110 bg-[#FFE3A3]"
                    : animationPhase === "flow"
                      ? "scale-110 bg-[#E8DFFF]"
                      : animationPhase === "memory"
                        ? "scale-125 bg-[#DFF7E8]"
                        : isAtEnd
                          ? "scale-125 bg-[#FFD6E7]"
                          : "bg-[#DFF7E8]"
                }
              `}
            />

            {animationPhase === "code"
              ? "EXECUTING"
              : animationPhase === "flow"
                ? "TRAVERSING"
                : animationPhase === "memory"
                  ? "UPDATING"
                  : isAtEnd
                    ? "FINISHED"
                    : "READY"}
          </span>
        </div>
      </header>

      {/* ========================================================
          WORKSPACE
      ======================================================== */}

      <main
        className="
          grid
          min-h-0
          flex-1
          grid-cols-[minmax(260px,0.95fr)_minmax(360px,1.35fr)_minmax(260px,0.9fr)]
          gap-4
          overflow-hidden
          p-5
        "
      >

        {/* ======================================================
            CODE EDITOR
        ====================================================== */}

        <section
          className={`
            flex
            min-h-0
            min-w-0
            flex-col
            overflow-hidden
            border-2
            border-[#171717]
            bg-[#DDF4FF]
            shadow-[4px_4px_0_#171717]
            transition-all
            duration-500
            ease-out

            ${
              animationPhase === "code"
                ? "translate-y-[-1px] shadow-[6px_6px_0_#171717] ring-2 ring-[#171717] ring-offset-2 ring-offset-[#FFF9F0]"
                : "opacity-90"
            }
          `}
        >

          {/* HEADER */}

          <div
            className="
              flex
              h-[62px]
              shrink-0
              items-center
              justify-between
              border-b-2
              border-[#171717]
              px-6
            "
          >
            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.22em]
              "
            >
              Code
            </p>

            <span
              className="
                font-mono
                text-[10px]
                font-bold
                uppercase
                opacity-45
              "
            >
              {analysisResult
                ? "backend analysis"
                : `${codeLines.length} lines`}
            </span>
          </div>

          {/* EDITOR */}

          <div
            className="
              relative
              min-h-0
              flex-1
              overflow-hidden
            "
          >

            <div
              className="
                absolute
                inset-0
                overflow-hidden
              "
            >

              {/* LINE NUMBERS */}

              <div
                ref={lineNumberRef}
                className="
                  pointer-events-none
                  absolute
                  bottom-0
                  left-0
                  top-0
                  z-10
                  w-[54px]
                  overflow-hidden
                  bg-[#DDF4FF]
                  px-3
                  py-6
                  font-mono
                  text-[14px]
                  leading-7
                  text-right
                  select-none
                "
              >
                {codeLines.map((line) => {
                  const active =
                    step?.line === line.number;

                  return (
                    <div
                      key={line.number}
                      className={`
                        h-7
                        transition-all
                        duration-300

                        ${
                          active
                            ? "font-bold text-[#171717]"
                            : "opacity-35"
                        }
                      `}
                    >
                      {String(
                        line.number
                      ).padStart(2, "0")}
                    </div>
                  );
                })}
              </div>

              {/* EDITABLE TEXTAREA */}

              <textarea
                ref={textareaRef}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
                onScroll={handleCodeScroll}
                spellCheck={false}
                wrap="off"
                aria-label="C or C++ code editor"
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  resize-none
                  overflow-auto
                  border-0
                  bg-transparent
                  px-0
                  py-6
                  pl-[69px]
                  pr-6
                  font-mono
                  text-[14px]
                  leading-7
                  text-[#171717]
                  outline-none
                  selection:bg-[#FFE3A3]
                  selection:text-[#171717]
                "
              />

            </div>

          </div>

          {/* EDITOR FOOTER */}

          <div
            className="
              flex
              shrink-0
              items-center
              justify-between
              gap-3
              border-t-2
              border-[#171717]
              bg-[#DDF4FF]
              px-4
              py-3
            "
          >
            <span
              className="
                font-mono
                text-[9px]
                font-bold
                uppercase
                tracking-wider
                opacity-45
              "
            >
              {language} source
            </span>

            {analysisError && (
              <div
                className="
                  max-w-[45%]
                  font-mono
                  text-[9px]
                  font-bold
                  leading-4
                  text-[#8B1E1E]
                "
                title={analysisError}
              >
                ERROR: {analysisError}
              </div>
            )}

            <button
              type="button"
              onClick={analyzeCode}
              disabled={!code.trim() || isAnalyzing}
              className="
                group
                shrink-0
                border-2
                border-[#171717]
                bg-[#171717]
                px-4
                py-2
                font-mono
                text-[10px]
                font-black
                uppercase
                tracking-wider
                text-white
                shadow-[3px_3px_0_#FFE3A3]
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:shadow-[4px_4px_0_#FFE3A3]
                active:translate-y-0
                disabled:pointer-events-none
                disabled:opacity-30
              "
            >
              {isAnalyzing
                ? "Analyzing..."
                : "Analyze & Visualize"}
              <span
                className="
                  ml-2
                  inline-block
                  transition-transform
                  duration-200
                  group-hover:translate-x-1
                "
              >
                →
              </span>
            </button>
          </div>
        </section>

        {/* ======================================================
            FLOW
        ====================================================== */}

        <section
          className={`
            flex
            min-h-0
            min-w-0
            flex-col
            overflow-hidden
            border-2
            border-[#171717]
            bg-[#E8DFFF]
            shadow-[4px_4px_0_#171717]
            transition-all
            duration-500
            ease-out

            ${
              animationPhase === "flow"
                ? "translate-y-[-1px] shadow-[6px_6px_0_#171717] ring-2 ring-[#171717] ring-offset-2 ring-offset-[#FFF9F0]"
                : "opacity-90"
            }
          `}
        >
          <div
            className="
              flex
              h-[62px]
              shrink-0
              items-center
              justify-between
              border-b-2
              border-[#171717]
              px-6
            "
          >
            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.22em]
              "
            >
              Flow
            </p>

            <span
              className="
                font-mono
                text-xs
                font-bold
                opacity-75
              "
            >
              STEP{" "}
              {String(
                currentStep + 1
              ).padStart(2, "0")}
            </span>
          </div>

          <div
            ref={flowScrollRef}
            className="
              min-h-0
              flex-1
              overflow-x-hidden
              overflow-y-auto
              scroll-smooth
            "
          >
            <div
              className="
                flex
                min-h-full
                min-w-full
                justify-center
              "
            >
              <FlowGraph
                activeNode={
                  animationPhase === "flow" ||
                  animationPhase === "memory"
                    ? currentFlowNode
                    : null
                }

                activeEdge={
                  animationPhase === "flow" ||
                  animationPhase === "memory"
                    ? activeFlowEdge
                    : null
                }

                conditionResult={
                  conditionResult
                }
              />
            </div>
          </div>
        </section>

        {/* ======================================================
            MEMORY
        ====================================================== */}

        <section
          className={`
            flex
            min-h-0
            min-w-0
            flex-col
            overflow-hidden
            border-2
            border-[#171717]
            bg-[#DFF7E8]
            shadow-[4px_4px_0_#171717]
            transition-all
            duration-500
            ease-out

            ${
              animationPhase === "memory"
                ? "translate-y-[-1px] shadow-[6px_6px_0_#171717] ring-2 ring-[#171717] ring-offset-2 ring-offset-[#FFF9F0]"
                : "opacity-90"
            }
          `}
        >
          <div
            className="
              flex
              h-[62px]
              shrink-0
              items-center
              justify-between
              border-b-2
              border-[#171717]
              px-6
            "
          >
            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.22em]
              "
            >
              Memory
            </p>
          </div>

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              overflow-x-visible
              px-5
              py-6
            "
          >
            <div className="space-y-5">
              {Object.entries(variables || {}).length > 0 ? (
                Object.entries(variables).map(
                  ([name, value]) => (
                    <MemoryCard
                      key={name}
                      name={name}
                      value={value}
                    />
                  )
                )
              ) : (
                <div
                  className="
                    border-2
                    border-[#171717]
                    bg-white
                    p-5
                    font-mono
                    text-[11px]
                    uppercase
                    tracking-wider
                    opacity-50
                    shadow-[3px_3px_0_#171717]
                  "
                >
                  No variables yet
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          EXECUTION BAR
      ======================================================== */}

      <footer
        className="
          shrink-0
          border-t-2
          border-[#171717]
          bg-white
        "
      >
        <div
          className="
            flex
            min-h-[72px]
            items-center
            gap-3
            px-6
            py-3
          "
        >

          {/* BACK */}

          <button
            onClick={goBack}
            disabled={isAtStart}
            aria-label="Go to previous execution step"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2
              border-2
              border-[#171717]
              bg-[#FFF9F0]
              px-4
              py-2
              font-mono
              text-[12px]
              font-bold
              shadow-[3px_3px_0_#171717]
              transition-all
              duration-150
              hover:-translate-y-0.5
              hover:shadow-[4px_4px_0_#171717]
              active:translate-y-0
              active:shadow-[2px_2px_0_#171717]
              disabled:pointer-events-none
              disabled:opacity-25
            "
          >
            <span
              className="
                text-base
                leading-none
                transition-transform
                duration-150
                group-hover:-translate-x-0.5
              "
            >
              ←
            </span>

            <span className="hidden sm:inline">
              BACK
            </span>
          </button>

          {/* RESET */}

          <button
            onClick={reset}
            aria-label="Reset execution"
            className="
              flex
              shrink-0
              items-center
              gap-2
              border-2
              border-[#171717]
              bg-[#FFE3A3]
              px-4
              py-2
              font-mono
              text-[12px]
              font-bold
              shadow-[3px_3px_0_#171717]
              transition-all
              duration-150
              hover:-translate-y-0.5
              hover:shadow-[4px_4px_0_#171717]
              active:translate-y-0
              active:shadow-[2px_2px_0_#171717]
            "
          >
            <span className="text-base leading-none">
              ↻
            </span>

            <span className="hidden sm:inline">
              RESET
            </span>
          </button>

          {/* NEXT */}

          <button
            onClick={goForward}
            disabled={isAtEnd}
            aria-label="Go to next execution step"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2
              border-2
              border-[#171717]
              bg-[#171717]
              px-5
              py-2
              font-mono
              text-[12px]
              font-bold
              text-white
              shadow-[3px_3px_0_#FFE3A3]
              transition-all
              duration-150
              hover:-translate-y-0.5
              hover:shadow-[4px_4px_0_#FFE3A3]
              active:translate-y-0
              active:shadow-[2px_2px_0_#FFE3A3]
              disabled:pointer-events-none
              disabled:opacity-25
            "
          >
            <span className="hidden sm:inline">
              NEXT
            </span>

            <span
              className="
                text-base
                leading-none
                transition-transform
                duration-150
                group-hover:translate-x-0.5
              "
            >
              →
            </span>
          </button>

          {/* PROGRESS */}

          <div
            className="
              ml-2
              min-w-0
              flex-1
            "
          >
            <div
              className="
                mb-1.5
                flex
                items-center
                justify-between
                font-mono
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                opacity-55
              "
            >
              <span>
                EXECUTION
              </span>

              <span>
                {String(
                  currentStep + 1
                ).padStart(2, "0")}
                /
                {String(
                  activeExecutionSteps.length
                ).padStart(2, "0")}
              </span>
            </div>

            <div
              className="
                relative
                h-[8px]
                w-full
                border-2
                border-[#171717]
                bg-[#FFF9F0]
              "
            >
              <div
                className="
                  absolute
                  left-0
                  top-0
                  h-full
                  bg-[#FFE3A3]
                  transition-[width]
                  duration-500
                  ease-out
                "
                style={{
                  width: `${
                    activeExecutionSteps.length <= 1
                      ? 0
                      : (
                          currentStep /
                          (activeExecutionSteps.length - 1)
                        ) * 100
                  }%`,
                }}
              />

              <div
                className="
                  absolute
                  top-1/2
                  h-[14px]
                  w-[14px]
                  -translate-y-1/2
                  border-2
                  border-[#FFF9F0]
                  bg-[#171717]
                  shadow-[0_0_0_1px_#171717]
                  transition-[left]
                  duration-500
                  ease-out
                "
                style={{
                  left: `calc(${
                    activeExecutionSteps.length <= 1
                      ? 0
                      : (
                          currentStep /
                          (activeExecutionSteps.length - 1)
                        ) * 100
                  }% - 7px)`,
                }}
              />
            </div>
          </div>

          {/* CURRENT STATE */}

          <div
            className="
              hidden
              min-w-[125px]
              shrink-0
              border-l-2
              border-[#171717]
              pl-4
              md:block
            "
          >
            <div
              className="
                font-mono
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                opacity-45
              "
            >
              CURRENT
            </div>

            <div
              key={`${currentStep}-${animationPhase}`}
              className="
                mt-1
                font-mono
                text-[11px]
                font-black
                uppercase
                animate-[executionStateIn_0.25s_ease-out]
              "
            >
              {animationPhase === "code"
                ? "CODE"
                : animationPhase === "flow"
                  ? "FLOW"
                  : animationPhase === "memory"
                    ? "MEMORY"
                    : isAtEnd
                      ? "FINISHED"
                      : step?.type ??
                        "READY"}
            </div>
          </div>
        </div>

        {/* ======================================================
            WHY
        ====================================================== */}

        <div
          className="
            border-t
            border-[#171717]/30
            bg-[#FFF9F0]
            px-6
            py-2.5
          "
        >
          <p
            key={currentStep}
            className="
              text-center
              font-mono
              text-[12px]
              leading-5
              animate-[explanationIn_0.3s_ease-out]
            "
          >
            <span className="mr-2 font-black">
              WHY:
            </span>

            {step?.explanation ||
              "Execution is ready."}
          </p>
        </div>
      </footer>

      {/* ========================================================
          ANIMATION KEYFRAMES
      ======================================================== */}

      <style>
        {`

          @keyframes memoryUpdateIn {
            0% {
              opacity: 0;
              transform:
                translate(-10px, -50%);
            }

            100% {
              opacity: 1;
              transform:
                translate(0, -50%);
            }
          }

          @keyframes arrowMove {
            0% {
              opacity: 0;
              transform:
                translateX(-5px);
            }

            60% {
              opacity: 1;
              transform:
                translateX(2px);
            }

            100% {
              opacity: 1;
              transform:
                translateX(0);
            }
          }

          @keyframes oldValueOut {
            0% {
              opacity: 0.45;
              transform:
                translateY(0);
            }

            100% {
              opacity: 0;
              transform:
                translateY(-13px);
            }
          }

          @keyframes newValueIn {
            0% {
              opacity: 0;
              transform:
                translateY(13px)
                scale(0.9);
            }

            100% {
              opacity: 1;
              transform:
                translateY(0)
                scale(1.1);
            }
          }

          @keyframes changeTextIn {
            0% {
              opacity: 0;
              transform:
                translateY(-4px);
            }

            100% {
              opacity: 0.6;
              transform:
                translateY(0);
            }
          }

          @keyframes memoryBorderPulse {
            0% {
              opacity: 0;
              transform:
                scale(1);
            }

            30% {
              opacity: 0.8;
              transform:
                scale(1.015);
            }

            100% {
              opacity: 0;
              transform:
                scale(1.035);
            }
          }

          @keyframes explanationIn {
            0% {
              opacity: 0;
              transform:
                translateY(4px);
            }

            100% {
              opacity: 1;
              transform:
                translateY(0);
            }
          }

          @keyframes executionStateIn {
            0% {
              opacity: 0;
              transform:
                translateY(3px);
            }

            100% {
              opacity: 1;
              transform:
                translateY(0);
            }
          }

        `}
      </style>
    </div>
  );
}

export default App;
