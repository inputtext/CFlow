const steps = [];

let stepId = 1;

let evenNum = 20;
let sum = 0;

const snapshot = (i) => ({
  evenNum,
  sum,
  i,
});


// ─────────────────────────────────────────────
// 1. INITIALIZATION
// ─────────────────────────────────────────────

steps.push({
  id: stepId++,
  line: 1,
  type: "assignment",
  target: "evenNum",
  before: null,
  after: 20,
  expression: "evenNum = 20",
  explanation: "evenNum is initialized with the value 20.",
  iteration: null,
  variables: snapshot(null),
});

steps.push({
  id: stepId++,
  line: 2,
  type: "assignment",
  target: "sum",
  before: null,
  after: 0,
  expression: "sum = 0",
  explanation: "sum starts at 0.",
  iteration: null,
  variables: snapshot(null),
});


// ─────────────────────────────────────────────
// 2. LOOP EXECUTION
// ─────────────────────────────────────────────

for (let i = 0; i <= 10; i++) {

  // Make the current loop index available
  const currentI = i;

  // CONDITION
  steps.push({
    id: stepId++,
    line: 4,
    type: "condition",
    expression: `${currentI} <= 10`,
    result: true,
    explanation: `${currentI} ≤ 10 is TRUE. The loop continues.`,
    iteration: currentI + 1,
    variables: {
      evenNum,
      sum,
      i: currentI,
    },
  });


  // ───────────────────────────────────────────
  // sum += evenNum
  // ───────────────────────────────────────────

  const previousSum = sum;
  const currentEvenNum = evenNum;

  sum += evenNum;

  steps.push({
    id: stepId++,
    line: 5,
    type: "compound_assignment",
    target: "sum",
    before: previousSum,
    operand: currentEvenNum,
    after: sum,
    expression: "sum += evenNum",
    math: `${previousSum} + ${currentEvenNum} → ${sum}`,
    explanation:
      `sum increases by ${currentEvenNum}, changing ${previousSum} → ${sum}.`,
    iteration: currentI + 1,
    variables: {
      evenNum,
      sum,
      i: currentI,
    },
  });


  // ───────────────────────────────────────────
  // evenNum += 2
  // ───────────────────────────────────────────

  const previousEvenNum = evenNum;

  evenNum += 2;

  steps.push({
    id: stepId++,
    line: 6,
    type: "compound_assignment",
    target: "evenNum",
    before: previousEvenNum,
    operand: 2,
    after: evenNum,
    expression: "evenNum += 2",
    math: `${previousEvenNum} + 2 → ${evenNum}`,
    explanation:
      `evenNum increases by 2, changing ${previousEvenNum} → ${evenNum}.`,
    iteration: currentI + 1,
    variables: {
      evenNum,
      sum,
      i: currentI,
    },
  });


  // ───────────────────────────────────────────
  // i++
  // ───────────────────────────────────────────

  steps.push({
    id: stepId++,
    line: 4,
    type: "increment",
    target: "i",
    before: currentI,
    operand: 1,
    after: currentI + 1,
    expression: "i++",
    math: `${currentI} + 1 → ${currentI + 1}`,
    explanation:
      `i increments from ${currentI} → ${currentI + 1}.`,
    iteration: currentI + 1,
    variables: {
      evenNum,
      sum,
      i: currentI + 1,
    },
  });
}


// ─────────────────────────────────────────────
// 3. FINAL CONDITION
// ─────────────────────────────────────────────

steps.push({
  id: stepId++,
  line: 4,
  type: "condition",
  expression: "11 <= 10",
  result: false,
  explanation: "11 ≤ 10 is FALSE. The loop exits.",
  iteration: 11,
  variables: {
    evenNum,
    sum,
    i: 11,
  },
});


// ─────────────────────────────────────────────
// 4. OUTPUT
// ─────────────────────────────────────────────

steps.push({
  id: stepId++,
  line: 9,
  type: "output",
  expression: 'printf("The sum ... %d", sum)',
  output: "The sum of even nums from 20 to 40 is: 330",
  explanation: "The loop has finished. The final sum is 330.",
  iteration: null,
  variables: {
    evenNum,
    sum,
    i: 11,
  },
});


export const executionSteps = steps;

export const initialState = {
  evenNum: 20,
  sum: 0,
  i: null,
};
