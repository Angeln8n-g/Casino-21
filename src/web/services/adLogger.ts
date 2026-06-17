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
  } catch (err) {
    console.error('Error logging ad event to database:', err);
  }
}
