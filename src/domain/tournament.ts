// ============================================================================
// Domain Model & Pure Logic: KASINO21 TOURNAMENTS 2.0 (Sit & Go + Scheduled)
// ============================================================================

/**
 * Feature flag global: mantiene pausados/ocultos los premios en efectivo ($ USD)
 * y el modo Championship de anuncios mientras se consolida la economía de
 * monedas, XP, trofeos y cosméticos exclusivos.
 */
export const CASH_PRIZES_ENABLED = false;

export type TournamentFormat = 'sit_and_go' | 'scheduled';

export const VALID_BRACKET_SIZES = [4, 8, 16, 32] as const;
export type ValidBracketSize = (typeof VALID_BRACKET_SIZES)[number];

export interface PrizeTier {
  place: number;
  percent: number;
}

export type PrizePresetKey = 'top2' | 'top4' | 'top8';
export type PrizeTierPresetKey = PrizePresetKey;

export const PRIZE_TIER_PRESETS: Record<PrizePresetKey, { label: string; description: string; tiers: PrizeTier[] }> = {
  top2: {
    label: 'Top 2 (Finalistas — 70% / 30%)',
    description: 'Ideal para Sit & Go rápidos de 4 jugadores.',
    tiers: [
      { place: 1, percent: 70 },
      { place: 2, percent: 30 },
    ],
  },
  top4: {
    label: 'Top 4 (Semifinalistas — 55% / 25% / 10% / 10%)',
    description: 'Equilibrio recomendado para torneos de 8 a 16 jugadores.',
    tiers: [
      { place: 1, percent: 55 },
      { place: 2, percent: 25 },
      { place: 3, percent: 10 },
      { place: 4, percent: 10 },
    ],
  },
  top8: {
    label: 'Top 8 (Cuartos — 45% / 23% / 10%×2 / 3%×4)',
    description: 'Mayor alcance de premios para cuadros grandes de 16 o 32 jugadores.',
    tiers: [
      { place: 1, percent: 45 },
      { place: 2, percent: 23 },
      { place: 3, percent: 10 },
      { place: 4, percent: 10 },
      { place: 5, percent: 3 },
      { place: 6, percent: 3 },
      { place: 7, percent: 3 },
      { place: 8, percent: 3 },
    ],
  },
};

export interface TournamentXpConfig {
  winner: number;
  podium: number;
  participation: number;
}

export const DEFAULT_TOURNAMENT_XP: TournamentXpConfig = {
  winner: 300,
  podium: 150,
  participation: 40,
};

export interface DynamicPotInput {
  guaranteedCoins: number;
  entryFee: number;
  participantsCount: number;
  maxParticipants?: number;
  entryPoolPercent?: number;
}

export interface DynamicPotSummary {
  guaranteedCoins: number;
  contributionPerEntry: number;
  entriesPotContribution: number;
  currentPot: number;
  maxProjectedPot: number;
  houseSinkPerEntry: number;
}

export interface CalculatedPrizeDisplayGroup {
  key: string;
  label: string;
  placeLabel: string;
  title: string;
  minPlace: number;
  maxPlace: number;
  count: number;
  percentEach: number;
  coinsEach: number;
  xpEach: number;
  includesExclusiveItem: boolean;
}

export interface SeedCandidate {
  id: string;
  elo?: number;
  checkedIn?: boolean;
}

export interface PlannedBracketMatch {
  round_number: number;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: 'pending' | 'completed';
  walkover_reason: string | null;
  best_of: number;
  series_game: number;
  series_key: string | null;
}

export interface SeededBracketPlan {
  bracketSize: ValidBracketSize;
  startRound: number;
  finalRound: number;
  seededPlayers: SeedCandidate[];
  matches: PlannedBracketMatch[];
  readyFirstMatches: Array<{ round_number: number; match_order: number; player1_id: string; player2_id: string }>;
}

/**
 * Devuelve la plantilla de premios por defecto según el tamaño del torneo.
 */
export function getDefaultPrizeTiers(maxParticipants: number): PrizeTier[] {
  if (maxParticipants <= 4) {
    return PRIZE_TIER_PRESETS.top2.tiers.map(t => ({ ...t }));
  }
  if (maxParticipants >= 32) {
    return PRIZE_TIER_PRESETS.top8.tiers.map(t => ({ ...t }));
  }
  return PRIZE_TIER_PRESETS.top4.tiers.map(t => ({ ...t }));
}

/**
 * Valida que los tramos de premios sean coherentes y no excedan el 100% del pozo.
 */
export function validatePrizeTiers(tiers: PrizeTier[]): { valid: boolean; totalPercent: number; error?: string } {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { valid: false, totalPercent: 0, error: 'Debe existir al menos un puesto premiado.' };
  }

  const seenPlaces = new Set<number>();
  let totalPercent = 0;

  for (const tier of tiers) {
    if (!Number.isInteger(tier.place) || tier.place < 1) {
      return { valid: false, totalPercent, error: 'Las posiciones de premio deben ser enteros positivos.' };
    }
    if (seenPlaces.has(tier.place)) {
      return { valid: false, totalPercent, error: `La posición ${tier.place} está duplicada.` };
    }
    if (typeof tier.percent !== 'number' || Number.isNaN(tier.percent) || tier.percent < 0) {
      return { valid: false, totalPercent, error: 'Los porcentajes deben ser mayores o iguales a 0.' };
    }
    seenPlaces.add(tier.place);
    totalPercent += tier.percent;
  }

  const roundedTotal = Math.round(totalPercent * 100) / 100;
  if (roundedTotal > 100) {
    return { valid: false, totalPercent: roundedTotal, error: `La suma de porcentajes (${roundedTotal}%) supera el 100%.` };
  }

  return { valid: true, totalPercent: roundedTotal };
}

function computeDynamicPotSummary(input: DynamicPotInput): DynamicPotSummary {
  const guaranteed = Math.max(0, Math.floor(input.guaranteedCoins || 0));
  const fee = Math.max(0, Math.floor(input.entryFee || 0));
  const count = Math.max(0, Math.floor(input.participantsCount || 0));
  const maxCount = Math.max(count, Math.floor(input.maxParticipants ?? count));
  const poolPct = Math.min(100, Math.max(0, input.entryPoolPercent ?? 90));

  const contributionPerEntry = Math.floor(fee * (poolPct / 100));
  const houseSinkPerEntry = Math.max(0, fee - contributionPerEntry);
  const entriesPotContribution = count * contributionPerEntry;
  const currentPot = guaranteed + entriesPotContribution;
  const maxProjectedPot = guaranteed + maxCount * contributionPerEntry;

  return {
    guaranteedCoins: guaranteed,
    contributionPerEntry,
    entriesPotContribution,
    currentPot,
    maxProjectedPot,
    houseSinkPerEntry,
  };
}

/**
 * Calcula el pozo dinámico actual y proyectado al llenarse el torneo.
 * Soporta tanto el objeto `DynamicPotInput` (retorna `DynamicPotSummary` completo)
 * como argumentos numéricos posicionales (retorna el `currentPot` numérico directo).
 */
export function calculateDynamicPot(input: DynamicPotInput): DynamicPotSummary;
export function calculateDynamicPot(
  guaranteedCoins: number,
  entryFee: number,
  participantsCount: number,
  entryPoolPercent?: number
): number;
export function calculateDynamicPot(
  inputOrGuaranteed: DynamicPotInput | number,
  entryFee: number = 0,
  participantsCount: number = 0,
  entryPoolPercent: number = 90
): DynamicPotSummary | number {
  if (typeof inputOrGuaranteed === 'number') {
    return computeDynamicPotSummary({
      guaranteedCoins: inputOrGuaranteed,
      entryFee,
      participantsCount,
      entryPoolPercent,
    }).currentPot;
  }
  return computeDynamicPotSummary(inputOrGuaranteed);
}

/**
 * Extrae un monto numérico limpio en monedas si solo se dispone del string legacy `prize_pool`.
 */
export function parseLegacyCoinPool(prizePool?: string | null): number {
  if (!prizePool) return 0;
  if (prizePool.toUpperCase().includes('USD')) return 0;
  const firstToken = prizePool.trim().split(/\s+/)[0] || '';
  const digits = firstToken.replace(/[^0-9]/g, '');
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Construye las filas agrupadas de recompensas exactas para mostrar en `RewardsCard` y modales.
 */
export function buildPrizeDisplayGroups(
  totalPotCoins: number,
  tiers?: PrizeTier[] | null,
  xpOrMaxParticipants?: TournamentXpConfig | number,
  hasExclusiveItem: boolean = false
): CalculatedPrizeDisplayGroup[] {
  const safePot = Math.max(0, Math.floor(totalPotCoins || 0));
  const fallbackMax = typeof xpOrMaxParticipants === 'number' ? xpOrMaxParticipants : 8;
  const xpConfig: TournamentXpConfig =
    typeof xpOrMaxParticipants === 'object' && xpOrMaxParticipants !== null
      ? xpOrMaxParticipants
      : DEFAULT_TOURNAMENT_XP;

  const activeTiers = (Array.isArray(tiers) && tiers.length > 0 ? tiers : getDefaultPrizeTiers(fallbackMax))
    .slice()
    .sort((a, b) => a.place - b.place);

  const getTierPct = (place: number) => activeTiers.find(t => t.place === place)?.percent ?? 0;
  const groups: CalculatedPrizeDisplayGroup[] = [];

  // 1er Lugar
  const p1Pct = getTierPct(1);
  if (p1Pct > 0 || hasExclusiveItem) {
    groups.push({
      key: 'place-1',
      label: '1er Lugar',
      placeLabel: '1er Lugar',
      title: 'Campeón del Torneo',
      minPlace: 1,
      maxPlace: 1,
      count: 1,
      percentEach: p1Pct,
      coinsEach: Math.floor(safePot * (p1Pct / 100)),
      xpEach: xpConfig.winner,
      includesExclusiveItem: hasExclusiveItem,
    });
  }

  // 2do Lugar
  const p2Pct = getTierPct(2);
  if (p2Pct > 0) {
    groups.push({
      key: 'place-2',
      label: '2do Lugar',
      placeLabel: '2do Lugar',
      title: 'Subcampeón',
      minPlace: 2,
      maxPlace: 2,
      count: 1,
      percentEach: p2Pct,
      coinsEach: Math.floor(safePot * (p2Pct / 100)),
      xpEach: xpConfig.podium,
      includesExclusiveItem: false,
    });
  }

  // 3er - 4to Lugar
  const p3Pct = getTierPct(3);
  const p4Pct = getTierPct(4);
  if (p3Pct > 0 || p4Pct > 0) {
    if (p3Pct === p4Pct) {
      groups.push({
        key: 'place-3-4',
        label: '3er - 4to Lugar',
        placeLabel: '3er - 4to Lugar',
        title: 'Semifinalistas',
        minPlace: 3,
        maxPlace: 4,
        count: 2,
        percentEach: p3Pct,
        coinsEach: Math.floor(safePot * (p3Pct / 100)),
        xpEach: xpConfig.podium,
        includesExclusiveItem: false,
      });
    } else {
      if (p3Pct > 0) {
        groups.push({
          key: 'place-3',
          label: '3er Lugar',
          placeLabel: '3er Lugar',
          title: 'Semifinalista',
          minPlace: 3,
          maxPlace: 3,
          count: 1,
          percentEach: p3Pct,
          coinsEach: Math.floor(safePot * (p3Pct / 100)),
          xpEach: xpConfig.podium,
          includesExclusiveItem: false,
        });
      }
      if (p4Pct > 0) {
        groups.push({
          key: 'place-4',
          label: '4to Lugar',
          placeLabel: '4to Lugar',
          title: 'Semifinalista',
          minPlace: 4,
          maxPlace: 4,
          count: 1,
          percentEach: p4Pct,
          coinsEach: Math.floor(safePot * (p4Pct / 100)),
          xpEach: xpConfig.podium,
          includesExclusiveItem: false,
        });
      }
    }
  }

  // 5to - 8vo Lugar (Cuartos de Final)
  const p5Pct = getTierPct(5);
  if (p5Pct > 0) {
    groups.push({
      key: 'place-5-8',
      label: '5to - 8vo Lugar',
      placeLabel: '5to - 8vo Lugar',
      title: 'Cuartofinalistas',
      minPlace: 5,
      maxPlace: 8,
      count: 4,
      percentEach: p5Pct,
      coinsEach: Math.floor(safePot * (p5Pct / 100)),
      xpEach: xpConfig.participation,
      includesExclusiveItem: false,
    });
  }

  return groups;
}

/**
 * Resuelve la potencia de 2 válida más ajustada para la cantidad real de jugadores activos.
 * Ej.: 3 jugadores -> cuadro de 4 (1 bye); 5..8 jugadores -> cuadro de 8; 9..16 -> 16; 17..32 -> 32.
 */
export function resolveBracketSize(activePlayerCount: number, maxCap: number = 32): ValidBracketSize {
  const cappedCount = Math.min(Math.max(2, activePlayerCount), Math.min(32, Math.max(4, maxCap)));
  for (const size of VALID_BRACKET_SIZES) {
    if (size >= cappedCount) {
      return size;
    }
  }
  return 32;
}

/**
 * Convención de rondas anclada a Gran Final = 4 para total compatibilidad con `tournament_matches`:
 * - 32 jugadores -> rondas 0..4 (5 rondas)
 * - 16 jugadores -> rondas 1..4 (4 rondas)
 * -  8 jugadores -> rondas 2..4 (3 rondas)
 * -  4 jugadores -> rondas 3..4 (2 rondas)
 */
export const FINAL_ROUND_NUMBER = 4;

export function getInitialRoundNumber(bracketSize: ValidBracketSize | number): number {
  const normalized = resolveBracketSize(bracketSize, 32);
  const totalRounds = Math.round(Math.log2(normalized)); // 2, 3, 4 o 5
  return FINAL_ROUND_NUMBER - totalRounds + 1;
}

export function getRoundDisplayName(roundNumber: number, finalRound: number = FINAL_ROUND_NUMBER): string {
  const distanceToFinal = finalRound - roundNumber;
  switch (distanceToFinal) {
    case 0:
      return 'Gran Final';
    case 1:
      return 'Semifinales';
    case 2:
      return 'Cuartos';
    case 3:
      return 'Octavos';
    case 4:
      return '16avos';
    default:
      return `Ronda ${roundNumber + 1}`;
  }
}

/**
 * Parejas estándar por semillas (seeding) para cuadros de 4, 8, 16 o 32 jugadores.
 * Garantiza que Seed #1 y Seed #2 solo puedan encontrarse en la Gran Final,
 * y que los mejores seeds reciban los Byes cuando el cuadro no está lleno.
 */
export function getTournamentSeedPairs(bracketSize: number): [number, number][] {
  if (bracketSize <= 4) {
    return [
      [1, 4],
      [2, 3],
    ];
  }
  if (bracketSize === 8) {
    return [
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ];
  }
  if (bracketSize === 16) {
    return [
      [1, 16],
      [8, 9],
      [4, 13],
      [5, 12],
      [2, 15],
      [7, 10],
      [3, 14],
      [6, 11],
    ];
  }
  return [
    [1, 32],
    [16, 17],
    [9, 24],
    [8, 25],
    [4, 29],
    [13, 20],
    [12, 21],
    [5, 28],
    [2, 31],
    [15, 18],
    [10, 23],
    [7, 26],
    [3, 30],
    [14, 19],
    [11, 22],
    [6, 27],
  ];
}

/**
 * Construye el plan completo de llaves con seeding por ELO, resolución automática de Byes
 * en la ronda inicial y propagación inmediata de ganadores por Bye a la siguiente ronda.
 */
export function buildSeededBracketPlan(
  candidates: SeedCandidate[],
  maxParticipantsCap: number = 32,
  finalBestOf: 1 | 3 = 1
): SeededBracketPlan {
  if (candidates.length < 2) {
    throw new Error('Se requieren al menos 2 jugadores activos para generar una llave de torneo.');
  }

  // Ordenar por ELO descendente para asignar seeds #1..#N
  const seededPlayers = candidates
    .slice(0, Math.min(32, Math.max(4, maxParticipantsCap)))
    .sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));

  const bracketSize = resolveBracketSize(seededPlayers.length, maxParticipantsCap);
  const startRound = getInitialRoundNumber(bracketSize);
  const seedPairs = getTournamentSeedPairs(bracketSize);

  // Mapa por ronda -> lista de partidos
  const roundsMap = new Map<number, PlannedBracketMatch[]>();

  // 1. Construir todas las rondas desde `startRound` hasta `FINAL_ROUND_NUMBER`
  let matchesInRound = bracketSize / 2;
  for (let r = startRound; r <= FINAL_ROUND_NUMBER; r++) {
    const roundMatches: PlannedBracketMatch[] = [];
    const isFinal = r === FINAL_ROUND_NUMBER;

    if (isFinal && finalBestOf === 3) {
      const seriesKey = 'final-bo3';
      for (let g = 1; g <= 3; g++) {
        roundMatches.push({
          round_number: r,
          match_order: g,
          player1_id: null,
          player2_id: null,
          winner_id: null,
          status: 'pending',
          walkover_reason: null,
          best_of: 3,
          series_game: g,
          series_key: seriesKey,
        });
      }
    } else {
      for (let order = 1; order <= matchesInRound; order++) {
        roundMatches.push({
          round_number: r,
          match_order: order,
          player1_id: null,
          player2_id: null,
          winner_id: null,
          status: 'pending',
          walkover_reason: null,
          best_of: 1,
          series_game: 1,
          series_key: null,
        });
      }
    }

    roundsMap.set(r, roundMatches);
    matchesInRound = Math.max(1, Math.floor(matchesInRound / 2));
  }

  // 2. Poblar la ronda inicial con las parejas por seed y resolver Byes
  const firstRoundMatches = roundsMap.get(startRound)!;
  for (let i = 0; i < seedPairs.length; i++) {
    const [seedA, seedB] = seedPairs[i];
    const p1 = seededPlayers[seedA - 1]?.id ?? null;
    const p2 = seededPlayers[seedB - 1]?.id ?? null;
    const match = firstRoundMatches[i];

    match.player1_id = p1;
    match.player2_id = p2;

    if (p1 && !p2) {
      match.winner_id = p1;
      match.status = 'completed';
      match.walkover_reason = 'bye';
    } else if (!p1 && p2) {
      match.winner_id = p2;
      match.status = 'completed';
      match.walkover_reason = 'bye';
    }
  }

  // 3. Propagar cualquier partido completado por Bye hacia las rondas siguientes
  for (let r = startRound; r < FINAL_ROUND_NUMBER; r++) {
    const currentMatches = roundsMap.get(r)!;
    const nextMatches = roundsMap.get(r + 1)!;

    for (const m of currentMatches) {
      if (m.status === 'completed' && m.winner_id) {
        const nextOrder = Math.ceil(m.match_order / 2);
        // En caso de final Bo3, el juego 1 de la serie tiene match_order = 1
        const targetNext = nextMatches.find(nm => nm.match_order === nextOrder);
        if (targetNext) {
          if (m.match_order % 2 !== 0) {
            targetNext.player1_id = m.winner_id;
          } else {
            targetNext.player2_id = m.winner_id;
          }
        }
      }
    }
  }

  // 4. Recolectar todos los partidos y los encuentros que ya tienen ambos rivales listos para jugar
  const allMatches: PlannedBracketMatch[] = [];
  const readyFirstMatches: Array<{ round_number: number; match_order: number; player1_id: string; player2_id: string }> = [];

  for (let r = startRound; r <= FINAL_ROUND_NUMBER; r++) {
    const list = roundsMap.get(r)!;
    for (const m of list) {
      allMatches.push(m);
      if (m.status === 'pending' && m.player1_id && m.player2_id && m.series_game === 1) {
        readyFirstMatches.push({
          round_number: m.round_number,
          match_order: m.match_order,
          player1_id: m.player1_id,
          player2_id: m.player2_id,
        });
      }
    }
  }

  return {
    bracketSize,
    startRound,
    finalRound: FINAL_ROUND_NUMBER,
    seededPlayers,
    matches: allMatches,
    readyFirstMatches,
  };
}
