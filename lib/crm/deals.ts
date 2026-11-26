import type { Deal, PipelineStage } from "@/lib/crm/types";

/** What putting a deal in a stage takes; the board and the deal page both switch on it. */
export type StageTransition = "none" | "move" | "lost" | "won" | "reopen";

/**
 * A lost stage asks for the reason `lost/` requires; a won stage or a closed
 * deal leaving its stage asks to confirm; anything else just moves.
 */
export function stageTransition(
  deal: Pick<Deal, "stage" | "status">,
  target: Pick<PipelineStage, "id" | "is_won" | "is_lost">,
): StageTransition {
  if (target.id === deal.stage) return "none";
  if (target.is_lost) return "lost";
  if (target.is_won) return "won";
  return deal.status === "open" ? "move" : "reopen";
}
