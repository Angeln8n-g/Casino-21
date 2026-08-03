import { supabase } from './supabase';

export type AdLogEventType = 'impression' | 'click' | 'complete' | 'blocked' | 'error';

/**
 * Logs an ad-related event to the database for tracking and analytics.
 * Automatically tries to link the event to the active ad configuration of that type
 * and links to the logged-in user if available.
 * 
 * @param adType The type of ad: 'banner' | 'social_bar' | 'interstitial' | 'rewarded'
 * @param eventType The event occurred: 'impression' | 'click' | 'complete' | 'blocked' | 'error'
 * @param metadata Additional JSON metadata for the event
 */
export async function logAdEventToDb(
  adType: 'banner' | 'social_bar' | 'interstitial' | 'rewarded',
  eventType: AdLogEventType,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // 1. Fetch the active configuration for this ad type (highest priority / lowest number)
    const { data: config } = await supabase
      .from('ad_configurations')
      .select('id')
      .eq('ad_type', adType)
      .eq('enabled', true)
      .order('priority', { ascending: true })
      .limit(1)
      .maybeSingle();

    const configId = config?.id || null;

    // 2. Fetch current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // 3. Log event
    const { error } = await supabase
      .from('ad_logs')
      .insert({
        config_id: configId,
        ad_type: adType,
        event_type: eventType,
        user_id: userId,
        metadata
      });

    if (error) {
      console.warn('Could not persist ad log to database:', error.message);
    }

    // 4. If logged-in user and valid view/click, record championship ad activity
    if (userId && (eventType === 'impression' || eventType === 'complete' || eventType === 'click')) {
      let { data: championshipEvent } = await supabase
        .from('events')
        .select('id')
        .eq('is_championship', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!championshipEvent?.id) {
        const { data: newEv } = await supabase.from('events').insert({
          title: 'KASINO21 CHAMPIONSHIP',
          description: 'Liga de 7 días con pozo acumulable en dólares.',
          rules: 'Acumula puntos viendo anuncios y compite por el pozo en efectivo.',
          type: 'liga',
          status: 'live',
          entry_fee: 0,
          prize_pool: '$100.00 USD',
          min_elo: 0,
          participants_count: 0,
          is_championship: true,
          championship_phase: 'league',
          base_prize_usd: 100,
          current_prize_usd: 100,
          max_prize_usd: 5000,
          global_ad_views: 0,
          daily_ad_cap: 300,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).select('id').maybeSingle();

        championshipEvent = newEv;
      }

      if (championshipEvent?.id) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_championship_ad_activity', {
          p_user_id: userId,
          p_event_id: championshipEvent.id,
          p_type: eventType === 'click' ? 'click' : 'view',
        });

        if (!rpcErr && rpcRes?.success) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('championship_point_earned', {
              detail: {
                pointsAdded: rpcRes.points_added || (eventType === 'click' ? 3 : 1),
                newTotalPoints: rpcRes.new_total_points || 0,
                streakMultiplier: rpcRes.streak_multiplier || 1,
                winStreak: rpcRes.win_streak || 0,
                eventType,
                adsToday: rpcRes.ads_today || 1,
                dailyCap: rpcRes.daily_cap || 300
              }
            }));
          }
        } else {
          const pointsToAdd = eventType === 'click' ? 3 : 1;
          const { data: part } = await supabase
            .from('championship_participants')
            .select('id, points, ads_today, ads_watched, ad_clicks')
            .eq('event_id', championshipEvent.id)
            .eq('user_id', userId)
            .maybeSingle();

          if (!part) {
            await supabase.from('championship_participants').insert({
              event_id: championshipEvent.id,
              user_id: userId,
              points: pointsToAdd,
              ads_today: 1,
              ads_watched: eventType === 'click' ? 0 : 1,
              ad_clicks: eventType === 'click' ? 1 : 0,
            });
          } else {
            await supabase.from('championship_participants').update({
              points: (part.points || 0) + pointsToAdd,
              ads_today: (part.ads_today || 0) + 1,
              ads_watched: eventType === 'click' ? (part.ads_watched || 0) : (part.ads_watched || 0) + 1,
              ad_clicks: eventType === 'click' ? (part.ad_clicks || 0) + 1 : (part.ad_clicks || 0),
              updated_at: new Date().toISOString(),
            }).eq('id', part.id);
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('championship_point_earned', {
              detail: {
                pointsAdded: pointsToAdd,
                newTotalPoints: (part?.points || 0) + pointsToAdd,
                eventType,
                adsToday: (part?.ads_today || 0) + 1,
                dailyCap: 300
              }
            }));
          }
        }
      }
    }
  } catch (err) {
    console.error('Error logging ad event to database:', err);
  }
}
