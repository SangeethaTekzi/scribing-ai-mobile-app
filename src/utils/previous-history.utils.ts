import type { PreviousHistoryItem } from "@/types/session.types";
import type { Session } from "@/types/session.types";

type HistoryMedication = NonNullable<
  PreviousHistoryItem["aiNotes"]["medications"]
>[number];

export const isManualDraftSummary = (summary?: string) =>
  Boolean(
    summary?.includes("Manual draft") ||
      summary?.includes("AI generation unavailable"),
  );

export const formatHistoryMedicationLine = (
  med: HistoryMedication,
): string => {
  const name = med.medicine?.trim();
  if (!name) return "";
  const doses = [med.morning, med.afternoon, med.night]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("-");
  const days = med.days?.trim();
  const parts = [name];
  if (doses) parts.push(`(${doses})`);
  if (days) parts.push(`${days} days`);
  if (med.instructions?.trim()) parts.push(med.instructions.trim());
  return parts.join(" ");
};

export const extractMedicationLinesFromHistory = (
  history: PreviousHistoryItem[],
): string[] => {
  const lines: string[] = [];
  for (const visit of history) {
    for (const med of visit.aiNotes?.medications || []) {
      const line = formatHistoryMedicationLine(med);
      if (line) lines.push(line);
    }
  }
  return [...new Set(lines)];
};

export const buildPriorVisitHighlights = (
  history: PreviousHistoryItem[],
): string[] => {
  const bullets: string[] = [];
  const latest = history[0];
  if (!latest) return bullets;

  const assessment = latest.aiNotes?.assessment?.trim();
  const subjective = latest.aiNotes?.subjective?.trim();
  const summary = latest.aiNotes?.summary?.trim();
  const remarks = latest.aiNotes?.remarks?.trim();

  if (assessment) {
    bullets.push(
      ...assessment
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 2),
    );
  } else if (subjective) {
    bullets.push(
      ...subjective
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 2),
    );
  }

  if (summary && !isManualDraftSummary(summary)) {
    bullets.push(summary);
  } else if (remarks) {
    bullets.push(remarks);
  }

  const medLines = (latest.aiNotes?.medications || [])
    .map(formatHistoryMedicationLine)
    .filter(Boolean);
  if (medLines.length) {
    bullets.push(`Last prescription: ${medLines.slice(0, 3).join("; ")}`);
  }

  return bullets.slice(0, 4);
};

export const sessionToPreviousHistoryItem = (
  session: Session,
): PreviousHistoryItem => ({
  sessionId: String(session._id || session.id || ""),
  completedAt: session.completedAt || session.createdAt || null,
  title: session.title || "Consultation",
  aiNotes: {
    summary: session.aiNotes?.summary,
    subjective: session.aiNotes?.subjective,
    assessment: session.aiNotes?.assessment,
    plan: session.aiNotes?.plan,
    remarks: session.aiNotes?.remarks,
    medications: session.aiNotes?.medications,
  },
});

export const buildBriefVisitHistory = (
  session: Session | null | undefined,
  previousHistory: PreviousHistoryItem[] | undefined,
) => {
  const priorVisits = previousHistory ?? [];
  const sessionId = session ? String(session._id || session.id || "") : "";

  let displayVisits = [...priorVisits];
  if (session && sessionId && session.status === "completed") {
    const alreadyListed = priorVisits.some((v) => v.sessionId === sessionId);
    if (!alreadyListed) {
      displayVisits = [sessionToPreviousHistoryItem(session), ...priorVisits];
    }
  }

  const highlightVisits =
    priorVisits.length > 0
      ? priorVisits
      : displayVisits.length > 0
        ? [displayVisits[0]]
        : [];

  return { priorVisits, displayVisits, highlightVisits };
};

export const resolveActiveBriefVisit = (
  displayVisits: PreviousHistoryItem[],
  highlightVisits: PreviousHistoryItem[],
  selectedVisitId: string | null,
) => {
  const defaultVisit = highlightVisits[0] ?? displayVisits[0] ?? null;
  const defaultVisitId = defaultVisit?.sessionId ?? null;
  const activeVisit =
    (selectedVisitId
      ? displayVisits.find((v) => v.sessionId === selectedVisitId)
      : null) ?? defaultVisit;
  const isLatestPriorVisit = Boolean(
    activeVisit &&
      defaultVisitId &&
      activeVisit.sessionId === defaultVisitId,
  );
  return { activeVisit, defaultVisitId, isLatestPriorVisit };
};

export const briefVisitAsList = (
  visit: PreviousHistoryItem | null,
): PreviousHistoryItem[] => (visit ? [visit] : []);
