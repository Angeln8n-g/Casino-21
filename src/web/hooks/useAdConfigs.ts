import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface AdConfig {
  id: string;
  name: string;
  ad_type: string;
  enabled: boolean;
  script_url: string | null;
  container_id: string | null;
  smartlink_url: string | null;
  csp_domains: string[];
  priority: number;
}

export function useAdConfig(adType: string): AdConfig | null {
  const [config, setConfig] = useState<AdConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('ad_configurations')
        .select('*')
        .eq('ad_type', adType)
        .eq('enabled', true)
        .order('priority', { ascending: true })
        .limit(1)
        .single();
      if (mounted && data) setConfig(data);
    })().catch(() => {});
    return () => { mounted = false; };
  }, [adType]);

  return config;
}
