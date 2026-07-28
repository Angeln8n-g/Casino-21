// ============================================================
// Domain Types: KASINO21 CHAMPIONSHIP (Liga Patrocinada de Ads)
// ============================================================

import { BrandTheme, PrizeClaimStatus } from './sponsored-tournament';

// ─── Championship Phases ────────────────────────────────────
export type ChampionshipPhase = 'league' | 'cut' | 'final' | 'completed';

// ─── KYC Status ─────────────────────────────────────────────
export type KycStatus = 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected';

// ─── Ad Activity Type ───────────────────────────────────────
export type AdActivityType = 'view' | 'click';

// ─── Championship Event Extension ───────────────────────────
export interface ChampionshipEvent {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  start_date: string;
  end_date: string;
  
  // Championship-specific fields
  is_championship: boolean;
  championship_phase: ChampionshipPhase;
  base_prize_usd: number;
  current_prize_usd: number;
  max_prize_usd: number;
  global_ad_views: number;
  views_per_prize_step: number;
  prize_step_usd: number;
  daily_ad_cap: number;
  qualified_count: number;
  final_datetime?: string;
  is_final_paused: boolean;

  // Sponsor branding (reuse from existing)
  is_sponsored: boolean;
  sponsor_name?: string;
  sponsor_logo_url?: string;
  sponsor_banner_url?: string;
  brand_theme?: BrandTheme;
  
  // Metadata
  participants_count: number;
  max_participants: number;
  image_url?: string;
}

// ─── Championship Participant ───────────────────────────────
export interface ChampionshipParticipant {
  id: string;
  event_id: string;
  user_id: string;

  // Scoring
  points: number;
  ads_watched: number;
  ad_clicks: number;
  referrals_count: number;

  // Daily anti-cheat
  ads_today: number;
  last_ad_date?: string;
  points_frozen: boolean;

  // Ranking
  rank_position?: number;
  is_qualified: boolean;

  // KYC
  kyc_status: KycStatus;
  kyc_id_url?: string;
  kyc_selfie_url?: string;
  kyc_reject_reason?: string;
  kyc_submitted_at?: string;
  kyc_reviewed_at?: string;

  created_at: string;
  updated_at: string;

  // Joined profile data (optional, from views/queries)
  username?: string;
  avatar_url?: string;
  elo?: number;
}

// ─── Championship Referral ──────────────────────────────────
export interface ChampionshipReferral {
  id: string;
  event_id: string;
  referrer_id: string;
  referred_id: string;
  referred_ads_count: number;
  bonus_awarded: boolean;
  created_at: string;
}

// ─── Admin Audit Log Entry ──────────────────────────────────
export type ChampionshipAdminAction =
  | 'create_championship'
  | 'edit_championship'
  | 'force_cut'
  | 'start_final'
  | 'pause_final'
  | 'resume_final'
  | 'cancel_championship'
  | 'disqualify'
  | 'freeze_points'
  | 'unfreeze_points'
  | 'approve_kyc'
  | 'reject_kyc'
  | 'force_match_winner'
  | 'walkover'
  | 'restart_match';

export interface ChampionshipAuditLog {
  id: string;
  event_id: string;
  admin_user_id: string;
  action: ChampionshipAdminAction;
  reason?: string;
  target_user_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─── RPC Response Types ─────────────────────────────────────
export interface AdActivityResult {
  success: boolean;
  error?: string;
  points_added?: number;
  ads_today?: number;
  daily_cap?: number;
  global_ad_views?: number;
  current_prize_usd?: number;
}

export interface FreezeLeagueResult {
  success: boolean;
  error?: string;
  total_participants?: number;
  qualified_count?: number;
  current_prize_usd?: number;
}

export interface PrizeDistributionResult {
  success: boolean;
  error?: string;
  claims_created?: number;
  total_pool?: number;
}

export interface DisqualifyResult {
  success: boolean;
  error?: string;
  disqualified_user?: string;
  promoted_user?: string | null;
}

export interface ChampionshipAnalytics {
  success: boolean;
  error?: string;
  total_ad_views: number;
  total_ad_clicks: number;
  ctr: number;
  unique_users: number;
  total_referrals: number;
  avg_ads_per_user: number;
  total_sponsor_impressions: number;
  current_prize_usd: number;
  global_ad_views: number;
  sponsor_name?: string;
  championship_phase: ChampionshipPhase;
}

// ─── Prize Distribution Table (for display) ─────────────────
export const CHAMPIONSHIP_PRIZE_TABLE = [
  { rank: 1,  label: 'Campeón 🏆',    percentage: 40 },
  { rank: 2,  label: 'Subcampeón',     percentage: 20 },
  { rank: 3,  label: 'Semifinalista',  percentage: 10 },
  { rank: 4,  label: 'Semifinalista',  percentage: 10 },
  { rank: 5,  label: 'Cuartos',        percentage: 5  },
  { rank: 6,  label: 'Cuartos',        percentage: 5  },
  { rank: 7,  label: 'Cuartos',        percentage: 5  },
  { rank: 8,  label: 'Cuartos',        percentage: 5  },
] as const;

export const CHAMPIONSHIP_FIXED_PRIZES = [
  { rankRange: [9, 16]  as const, label: 'Octavos',  fixedUsd: 15 },
  { rankRange: [17, 32] as const, label: '32avos',   fixedUsd: 5  },
] as const;

/**
 * Calculate prize amount for a given rank position based on the pool.
 */
export function calculatePrizeForRank(rank: number, poolUsd: number): number {
  const tableEntry = CHAMPIONSHIP_PRIZE_TABLE.find(e => e.rank === rank);
  if (tableEntry) {
    return Math.round((poolUsd * tableEntry.percentage / 100) * 100) / 100;
  }
  for (const fixed of CHAMPIONSHIP_FIXED_PRIZES) {
    if (rank >= fixed.rankRange[0] && rank <= fixed.rankRange[1]) {
      return fixed.fixedUsd;
    }
  }
  return 0;
}
