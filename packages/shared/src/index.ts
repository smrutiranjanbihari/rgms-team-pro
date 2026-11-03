export type PlatformRole = "SUPER_ADMIN" | "STATE_ADMIN" | "DISTRICT_ADMIN" | "BLOCK_ADMIN" | "GP_ADMIN" | "VILLAGE_ADMIN";
export type VillageRole = "VILLAGE_ADMIN" | "TOURNAMENT_ADMIN" | "SCORER" | "TEAM_MANAGER" | "PLAYER" | "VIEWER";

export interface Principal {
  userId: string;
  platformRole?: PlatformRole;
  villageScopes: Array<{ villageId: string; role: VillageRole }>;
}

export interface ScoringEvent {
  eventId: string;          // UUID generated on device; idempotency key
  matchId: string;
  villageId: string;
  inningsNo: number;
  sequenceNo: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsBat: number;
  extrasType?: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY";
  extrasRuns: number;
  wicket?: {
    kind: "BOWLED" | "CAUGHT" | "LBW" | "STUMPED" | "RUN_OUT" | "HIT_WICKET" | "RETIRED_OUT" | "OBSTRUCTING_FIELD";
    playerOutId: string;
    fielderIds?: string[];
  };
  occurredAt: string;
}

export interface ScoreSummary {
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  overs: string;
}

export function isLegalDelivery(event: Pick<ScoringEvent, "extrasType">): boolean {
  return event.extrasType !== "WIDE" && event.extrasType !== "NO_BALL";
}

export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function summarizeEvents(events: ScoringEvent[]): ScoreSummary {
  const totalRuns = events.reduce((sum, e) => sum + e.runsBat + e.extrasRuns, 0);
  const wickets = events.filter(e => Boolean(e.wicket)).length;
  const legalBalls = events.filter(isLegalDelivery).length;
  return { totalRuns, wickets, legalBalls, overs: formatOvers(legalBalls) };
}
