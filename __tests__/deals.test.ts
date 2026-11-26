import { describe, expect, it } from "vitest";
import { stageTransition } from "../lib/crm/deals";

const open = { id: 1 };
const nextOpen = { id: 2 };
const won = { id: 3, is_won: true };
const lost = { id: 4, is_lost: true };

describe("stageTransition", () => {
  it("does nothing for the stage the deal is already in", () => {
    expect(stageTransition({ stage: 1, status: "open" }, open)).toBe("none");
    expect(stageTransition({ stage: 4, status: "lost" }, lost)).toBe("none");
  });

  it("moves an open deal between open stages without asking", () => {
    expect(stageTransition({ stage: 1, status: "open" }, nextOpen)).toBe("move");
  });

  it("asks for a reason before any lost stage, open or closed", () => {
    expect(stageTransition({ stage: 1, status: "open" }, lost)).toBe("lost");
    expect(stageTransition({ stage: 3, status: "won" }, lost)).toBe("lost");
  });

  it("asks to confirm a won stage, open or closed", () => {
    expect(stageTransition({ stage: 1, status: "open" }, won)).toBe("won");
    expect(stageTransition({ stage: 4, status: "lost" }, won)).toBe("won");
  });

  it("treats a closed deal dropped on an open stage as a reopen", () => {
    expect(stageTransition({ stage: 3, status: "won" }, open)).toBe("reopen");
    expect(stageTransition({ stage: 4, status: "lost" }, nextOpen)).toBe("reopen");
  });
});
