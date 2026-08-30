function FlowNode({
  id,
  label,
  type,
  active,
  conditionResult,
}) {
  const background =
    type === "condition"
      ? "bg-[#FFE3A3]"
      : type === "exit"
        ? "bg-[#FFD6E7]"
        : "bg-white";

  const isCondition = type === "condition";

  const conditionState =
    isCondition && active
      ? conditionResult === true
        ? "true"
        : conditionResult === false
          ? "false"
          : "checking"
      : "idle";

  return (
    <div
      data-flow-node={id}
      className={`
        absolute
        z-10

        w-[220px]
        max-w-[220px]

        -translate-x-1/2

        border-2
        border-[#171717]

        px-6
        py-4

        text-center
        font-mono
        font-bold

        ${background}

        shadow-[4px_4px_0_#171717]

        transition-all
        duration-300
        ease-out

        ${
          active
            ? `
              translate-y-[-2px]
              scale-[1.035]
              shadow-[6px_6px_0_#171717]
            `
            : ""
        }

        ${
          conditionState === "true"
            ? `
              ring-2
              ring-[#171717]
              ring-offset-2
              ring-offset-[#E8DFFF]
            `
            : ""
        }

        ${
          conditionState === "false"
            ? `
              ring-2
              ring-[#171717]
              ring-offset-2
              ring-offset-[#E8DFFF]
            `
            : ""
        }
      `}
    >
      {/* ======================================================
          NODE LABEL
      ====================================================== */}

      <span
        className={`
          transition-all
          duration-300

          ${active ? "opacity-100" : "opacity-90"}

          ${
            active
              ? "tracking-[0.01em]"
              : ""
          }
        `}
      >
        {label}
      </span>

      {/* ======================================================
          CONDITION RESULT
      ====================================================== */}

      {isCondition && active && (
        <div
          className="
            mt-2
            flex
            items-center
            justify-center
            gap-2
            animate-[conditionResultIn_0.3s_ease-out]
          "
        >
          {conditionState === "checking" && (
            <>
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  border
                  border-[#171717]
                  bg-[#171717]
                  animate-[conditionChecking_0.8s_ease-in-out_infinite]
                "
              />

              <span
                className="
                  text-[9px]
                  uppercase
                  tracking-[0.18em]
                  opacity-65
                "
              >
                evaluating
              </span>
            </>
          )}

          {conditionState === "true" && (
            <>
              <span className="text-sm leading-none">
                ✓
              </span>

              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.18em]
                "
              >
                TRUE
              </span>
            </>
          )}

          {conditionState === "false" && (
            <>
              <span className="text-sm leading-none">
                ×
              </span>

              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.18em]
                "
              >
                FALSE
              </span>
            </>
          )}
        </div>
      )}

      {/* ======================================================
          ACTIVE NODE PULSE
      ====================================================== */}

      {active && (
        <span
          className="
            pointer-events-none
            absolute
            inset-0
            border-2
            border-[#171717]
            animate-[nodePulse_1.2s_ease-out]
          "
        />
      )}

      {/* ======================================================
          CONDITION STATE MARKER
      ====================================================== */}

      {isCondition &&
        active &&
        conditionResult !== null && (
          <span
            className="
              pointer-events-none
              absolute
              -right-[7px]
              -top-[7px]

              flex
              h-4
              w-4

              items-center
              justify-center

              border-2
              border-[#171717]
              bg-[#FFF9F0]

              font-mono
              text-[9px]
              font-black

              animate-[conditionBadgeIn_0.3s_ease-out]
            "
          >
            {conditionResult ? "T" : "F"}
          </span>
        )}
    </div>
  );
}


/* ============================================================
   CONNECTION
============================================================ */

function FlowPath({
  d,
  active = false,
  loop = false,
  conditionPath = false,
}) {
  return (
    <>
      {/* ======================================================
          BASE PATH
      ====================================================== */}

      <path
        d={d}
        fill="none"
        stroke="#171717"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#cflow-arrow)"
        className="
          transition-opacity
          duration-300
        "
        opacity={active ? "1" : "0.8"}
      />

      {/* ======================================================
          ACTIVE EXECUTION PATH
      ====================================================== */}

      {active && (
        <>
          <path
            d={d}
            fill="none"
            stroke="#FFE3A3"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="12 18"
            markerEnd="url(#cflow-arrow-active)"
            className="
              opacity-90
              animate-[flowTravel_0.8s_linear_infinite]
            "
          />

          <path
            d={d}
            fill="none"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 15"
            className="
              animate-[flowTravelDark_0.8s_linear_infinite]
            "
          />

          {!loop && (
            <circle
              r="5"
              fill="#171717"
              className="
                animate-[flowDot_0.8s_ease-in-out_infinite]
              "
            >
              <animateMotion
                dur="0.9s"
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          )}

          {loop && (
            <circle
              r="4"
              fill="#171717"
              className="
                animate-[loopDot_1.1s_ease-in-out_infinite]
              "
            >
              <animateMotion
                dur="1.1s"
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          )}
        </>
      )}

      {/* ======================================================
          CONDITION PATH INDICATOR
      ====================================================== */}

      {active && conditionPath && (
        <circle
          r="3"
          fill="#171717"
          className="
            animate-[conditionPathPulse_0.8s_ease-in-out_infinite]
          "
        >
          <animateMotion
            dur="0.9s"
            repeatCount="indefinite"
            path={d}
          />
        </circle>
      )}
    </>
  );
}


/* ============================================================
   FLOW GRAPH
============================================================ */

export default function FlowGraph({
  activeNode,
  activeEdge,
  conditionResult = null,
}) {
  const conditionIsActive =
    activeNode === "condition";

  const trueIsActive =
    conditionIsActive &&
    conditionResult === true;

  const falseIsActive =
    conditionIsActive &&
    conditionResult === false;

  return (
    <div
      className="
        relative

        h-[620px]
        min-h-[620px]

        w-full
        min-w-[760px]

        overflow-visible
      "
    >
      {/* ======================================================
          NODES
      ====================================================== */}

      {/* INITIALIZE */}

      <div
        className="
          absolute
          left-1/2
          top-[24px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="initialize"
          label="INITIALIZE"
          type="operation"
          active={activeNode === "initialize"}
          conditionResult={conditionResult}
        />
      </div>


      {/* CONDITION */}

      <div
        className="
          absolute
          left-1/2
          top-[125px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="condition"
          label="i <= 10 ?"
          type="condition"
          active={activeNode === "condition"}
          conditionResult={conditionResult}
        />
      </div>


      {/* SUM */}

      <div
        className="
          absolute
          left-1/2
          top-[230px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="sum"
          label="sum += evenNum"
          type="operation"
          active={activeNode === "sum"}
          conditionResult={conditionResult}
        />
      </div>


      {/* EVEN NUM */}

      <div
        className="
          absolute
          left-1/2
          top-[335px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="evenNum"
          label="evenNum += 2"
          type="operation"
          active={activeNode === "evenNum"}
          conditionResult={conditionResult}
        />
      </div>


      {/* INCREMENT */}

      <div
        className="
          absolute
          left-1/2
          top-[440px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="increment"
          label="i++"
          type="operation"
          active={activeNode === "increment"}
          conditionResult={conditionResult}
        />
      </div>


      {/* EXIT */}

      <div
        className="
          absolute
          left-[82%]
          top-[500px]
          -translate-x-1/2
        "
      >
        <FlowNode
          id="exit"
          label="EXIT"
          type="exit"
          active={activeNode === "exit"}
          conditionResult={conditionResult}
        />
      </div>


      {/* ======================================================
          CONNECTIONS
      ====================================================== */}

      <svg
        className="
          pointer-events-none
          absolute
          inset-0
          h-full
          w-full
        "
        viewBox="0 0 1000 620"
        preserveAspectRatio="none"
      >
        <defs>

          {/* NORMAL ARROW */}

          <marker
            id="cflow-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path
              d="M0,0 L8,4 L0,8 Z"
              fill="#171717"
            />
          </marker>


          {/* ACTIVE ARROW */}

          <marker
            id="cflow-arrow-active"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path
              d="M0,0 L8,4 L0,8 Z"
              fill="#171717"
            />
          </marker>

        </defs>


        {/* ====================================================
            INITIALIZE → CONDITION
        ==================================================== */}

        <FlowPath
          d="M500 89 L500 125"
          active={
            activeEdge ===
            "initializeToCondition"
          }
        />


        {/* ====================================================
            CONDITION → SUM
            TRUE
        ==================================================== */}

        <FlowPath
          d="M500 190 L500 230"
          active={
            activeEdge ===
            "conditionToSum"
          }
          conditionPath
        />


        {/* ====================================================
            SUM → EVEN NUM
        ==================================================== */}

        <FlowPath
          d="M500 295 L500 335"
          active={
            activeEdge ===
            "sumToEven"
          }
        />


        {/* ====================================================
            EVEN NUM → i++
        ==================================================== */}

        <FlowPath
          d="M500 400 L500 440"
          active={
            activeEdge ===
            "evenToIncrement"
          }
        />


        {/* ====================================================
            i++ → CONDITION
            LOOP BACK
        ==================================================== */}

        <FlowPath
          d="
            M610 472
            C760 472 820 400 820 310
            C820 210 750 157 610 157
          "
          active={
            activeEdge ===
            "incrementToCondition"
          }
          loop
        />


        {/* ====================================================
            CONDITION → EXIT
            FALSE
        ==================================================== */}

        <FlowPath
          d="
            M610 157
            C680 157 760 200 760 280
            L760 532
            L710 532
          "
          active={
            activeEdge ===
            "conditionToExit"
          }
          conditionPath
        />

      </svg>


      {/* ======================================================
          TRUE LABEL
      ====================================================== */}

      <span
        className={`
          absolute
          left-[calc(50%+125px)]
          top-[192px]

          font-mono
          text-[10px]
          font-bold

          transition-all
          duration-300

          ${
            trueIsActive
              ? `
                translate-x-1
                font-black
                opacity-100
              `
              : "opacity-65"
          }
        `}
      >
        TRUE
      </span>


      {/* ======================================================
          FALSE LABEL
      ====================================================== */}

      <span
        className={`
          absolute
          left-[68%]
          top-[142px]

          font-mono
          text-[10px]
          font-bold

          transition-all
          duration-300

          ${
            falseIsActive
              ? `
                translate-x-1
                font-black
                opacity-100
              `
              : "opacity-65"
          }
        `}
      >
        FALSE
      </span>


      {/* ======================================================
          LOOP BACK LABEL
      ====================================================== */}

      <span
        className={`
          absolute
          right-[2%]
          top-[37%]

          rotate-[-78deg]

          font-mono
          text-[10px]
          font-bold

          transition-all
          duration-300

          ${
            activeEdge ===
            "incrementToCondition"
              ? `
                font-black
                opacity-100
                animate-[loopLabelPulse_1s_ease-in-out_infinite]
              `
              : "opacity-70"
          }
        `}
      >
        LOOP BACK
      </span>


      {/* ======================================================
          CONDITION STATUS
      ====================================================== */}

      {conditionIsActive &&
        conditionResult !== null && (
          <div
            className="
              absolute
              left-1/2
              top-[205px]
              -translate-x-1/2

              font-mono
              text-[9px]
              font-black
              uppercase
              tracking-[0.16em]
              opacity-60

              animate-[conditionStatusIn_0.3s_ease-out]
            "
          >
            {conditionResult
              ? "condition passed"
              : "condition failed"}
          </div>
        )}


      {/* ======================================================
          ANIMATION KEYFRAMES
      ====================================================== */}

      <style>
        {`

          @keyframes nodePulse {

            0% {
              opacity: 0;
              transform: scale(1);
            }

            35% {
              opacity: 1;
              transform: scale(1.02);
            }

            100% {
              opacity: 0;
              transform: scale(1.08);
            }

          }


          @keyframes flowTravel {

            from {
              stroke-dashoffset: 30;
            }

            to {
              stroke-dashoffset: 0;
            }

          }


          @keyframes flowTravelDark {

            from {
              stroke-dashoffset: 22;
            }

            to {
              stroke-dashoffset: 0;
            }

          }


          @keyframes flowDot {

            0% {
              opacity: 0;
              transform: scale(0.7);
            }

            30% {
              opacity: 1;
              transform: scale(1);
            }

            70% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0;
              transform: scale(0.7);
            }

          }


          @keyframes loopDot {

            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            20% {
              opacity: 1;
              transform: scale(1);
            }

            80% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0;
              transform: scale(0.65);
            }

          }


          @keyframes loopLabelPulse {

            0% {
              opacity: 0.7;
            }

            50% {
              opacity: 1;
            }

            100% {
              opacity: 0.7;
            }

          }


          @keyframes conditionResultIn {

            0% {
              opacity: 0;
              transform: translateY(-3px);
            }

            100% {
              opacity: 1;
              transform: translateY(0);
            }

          }


          @keyframes conditionChecking {

            0% {
              opacity: 0.35;
              transform: scale(0.8);
            }

            50% {
              opacity: 1;
              transform: scale(1.15);
            }

            100% {
              opacity: 0.35;
              transform: scale(0.8);
            }

          }


          @keyframes conditionBadgeIn {

            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            70% {
              opacity: 1;
              transform: scale(1.08);
            }

            100% {
              opacity: 1;
              transform: scale(1);
            }

          }


          @keyframes conditionPathPulse {

            0% {
              opacity: 0.2;
              transform: scale(0.75);
            }

            50% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0.2;
              transform: scale(0.75);
            }

          }


          @keyframes conditionStatusIn {

            from {
              opacity: 0;
              transform:
                translate(-50%, -3px);
            }

            to {
              opacity: 0.6;
              transform:
                translate(-50%, 0);
            }

          }

        `}
      </style>
    </div>
  );
}
