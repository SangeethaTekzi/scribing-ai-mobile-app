import { aiNotesService } from "@/services/ai-notes.service";
import { sessionService } from "@/services/session.service";
import type { AiNotes } from "@/types/ai-notes.types";

export const EMPTY_AI_NOTES: AiNotes = {
  status: "completed",
  summary: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  remarks: "",
  medications: [],
};

export const MANUAL_DRAFT_SUMMARY =
  "Manual draft — AI generation unavailable.";

export const createLocalManualDraft = (): AiNotes => ({
  ...EMPTY_AI_NOTES,
  summary: MANUAL_DRAFT_SUMMARY,
});

/** AI off or transcript unavailable — still advance to editable notes + prescription. */
export async function bootstrapManualConsultationDraft(
  sessionId: string,
): Promise<void> {
  await aiNotesService.update(sessionId, {
    summary: MANUAL_DRAFT_SUMMARY,
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    remarks: "",
    medications: [],
  });
  await sessionService.updateStatus(sessionId, "ready_for_review");
}
