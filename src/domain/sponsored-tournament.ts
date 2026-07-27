export interface BrandTheme {
  primaryColor?: string;
  secondaryColor?: string;
  tableFeltUrl?: string;
  cardBackUrl?: string;
  logoUrl?: string;
  fontAccent?: string;
}

export interface PrizeDistributionItem {
  rank: number;
  amountUsd: number;
  description?: string;
}

export interface SponsoredTournament {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  isSponsored: boolean;
  sponsorName?: string;
  sponsorLogoUrl?: string;
  sponsorBannerUrl?: string;
  brandTheme?: BrandTheme;
  maxParticipants: number;
  participantsCount: number;
  entryFeeCoins: number;
  cashPrizePool: number;
  prizeDistribution: PrizeDistributionItem[];
  sponsorAdCampaignIds?: string[];
}

export type PrizeClaimStatus = 'pending_claim' | 'claim_submitted' | 'paid' | 'expired';

export interface PrizeClaim {
  id: string;
  eventId?: string;
  userId?: string;
  rankPosition?: number;
  amountUsd?: number;
  fullName?: string;
  idCardNumber?: string;
  phoneNumber?: string;
  bankName?: string;
  accountNumber?: string;
  status: PrizeClaimStatus;
  smsVerified?: boolean;
  claimedAt?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt?: string;

  // Supabase raw row properties (snake_case)
  event_id?: string;
  user_id?: string;
  rank_position?: number;
  amount_usd?: number;
  full_name?: string;
  id_card_number?: string;
  phone_number?: string;
  bank_name?: string;
  account_number?: string;
  sms_verified?: boolean;
  claimed_at?: string;
  paid_at?: string;
  expires_at?: string;
  created_at?: string;
}

export type SponsorLogEventType = 
  | 'ad_impression'
  | 'ad_watch_complete'
  | 'match_exposure'
  | 'banner_click';

export interface SponsorAnalyticsLog {
  id?: string;
  eventId?: string;
  sponsorName: string;
  userId?: string;
  eventType: SponsorLogEventType;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export const DOMINICAN_BANKS = [
  'Banreservas',
  'Banco Popular Dominicano',
  'Scotiabank',
  'Banco BHD',
  'Banco Santa Cruz',
  'Banco Promerica',
  'Banco Caribe',
  'Banco APAP',
  'Qik Banco Digital'
] as const;

export type DominicanBank = typeof DOMINICAN_BANKS[number] | string;
