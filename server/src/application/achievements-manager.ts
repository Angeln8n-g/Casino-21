import { supabase } from '../supabase';
import { Achievement, PlayerAchievement, Title, PlayerTitle } from '../domain/tournament';

export class AchievementsManager {
  private static readonly ACHIEVEMENTS: Achievement[] = [
    { id: 'first_win', code: 'FIRST_WIN', name: 'Primera Victoria', description: 'Gana tu primera partida', category: 'beginner', xpReward: 50, criteria: 'wins >= 1' },
    { id: 'ten_wins', code: 'TEN_WINS', name: 'Diez Victorias', description: 'Gana 10 partidas', category: 'beginner', xpReward: 100, criteria: 'wins >= 10' },
    { id: 'fifty_wins', code: 'FIFTY_WINS', name: 'Cincuenta Victorias', description: 'Gana 50 partidas', category: 'intermediate', xpReward: 300, criteria: 'wins >= 50' },
    { id: 'hundred_wins', code: 'HUNDRED_WINS', name: 'Cien Victorias', description: 'Gana 100 partidas', category: 'intermediate', xpReward: 500, criteria: 'wins >= 100' },
    { id: 'five_hundred_wins', code: 'FIVE_HUNDRED_WINS', name: 'Quinientas Victorias', description: 'Gana 500 partidas', category: 'advanced', xpReward: 1000, criteria: 'wins >= 500' },
    { id: 'elo_1200', code: 'ELO_1200', name: 'Plata', description: 'Alcanza 1200 de Elo', category: 'beginner', xpReward: 100, criteria: 'elo >= 1200' },
    { id: 'elo_1500', code: 'ELO_1500', name: 'Maestro de Oro', description: 'Alcanza 1500 de Elo', category: 'intermediate', xpReward: 200, criteria: 'elo >= 1500' },
    { id: 'elo_1800', code: 'ELO_1800', name: 'Platino', description: 'Alcanza 1800 de Elo', category: 'advanced', xpReward: 350, criteria: 'elo >= 1800' },
    { id: 'elo_2100', code: 'ELO_2100', name: 'Diamante', description: 'Alcanza 2100 de Elo', category: 'advanced', xpReward: 500, criteria: 'elo >= 2100' },
    { id: 'ten_virados', code: 'TEN_VIRADOS', name: 'Virado Maestro', description: 'Consigue 10 virados en partidas', category: 'advanced', xpReward: 300, criteria: 'virados >= 10' },
    { id: 'tournament_champ', code: 'TOURNAMENT_CHAMP', name: 'Campeón de Torneo', description: 'Gana un torneo', category: 'master', xpReward: 500, criteria: 'tournament_wins >= 1' },
    { id: 'three_tournaments', code: 'THREE_TOURNAMENTS', name: 'Tricampeón', description: 'Gana 3 torneos', category: 'master', xpReward: 1000, criteria: 'tournament_wins >= 3' },
    { id: 'season_top10', code: 'SEASON_TOP10', name: 'Top 10 de Temporada', description: 'Queda en top 10 de tu división en una temporada', category: 'master', xpReward: 1000, criteria: 'season_top10 >= 1' },
    { id: 'season_top50', code: 'SEASON_TOP50', name: 'Top 50 de Temporada', description: 'Queda en top 50 de tu división en una temporada', category: 'advanced', xpReward: 500, criteria: 'season_top50 >= 1' },
    { id: 'first_game', code: 'FIRST_GAME', name: 'Primer Juego', description: 'Juega tu primera partida', category: 'beginner', xpReward: 25, criteria: 'total_games >= 1' },
    { id: 'hundred_games', code: 'HUNDRED_GAMES', name: 'Centenario', description: 'Juega 100 partidas', category: 'intermediate', xpReward: 200, criteria: 'total_games >= 100' },
    { id: 'win_streak_5', code: 'WIN_STREAK_5', name: 'Racha de 5', description: 'Consigue una racha de 5 victorias', category: 'intermediate', xpReward: 150, criteria: 'best_streak >= 5' },
    { id: 'win_streak_10', code: 'WIN_STREAK_10', name: 'Racha de 10', description: 'Consigue una racha de 10 victorias', category: 'advanced', xpReward: 400, criteria: 'best_streak >= 10' },
    { id: 'social_butterfly', code: 'SOCIAL_BUTTERFLY', name: 'Mariposa Social', description: 'Añade 10 amigos', category: 'beginner', xpReward: 75, criteria: 'friends >= 10' },
    { id: 'veteran', code: 'VETERAN', name: 'Veterano', description: 'Juega durante 30 días', category: 'master', xpReward: 750, criteria: 'days_played >= 30' },
  ];

  private static readonly TITLES: Title[] = [
    {
      id: 'novice',
      code: 'NOVICE',
      name: 'Novato',
      description: 'Jugador principiante',
      xpRequirement: 0,
      isPremium: false,
    },
    {
      id: 'bronze',
      code: 'BRONZE',
      name: 'Bronce',
      description: 'Jugador de división bronce',
      xpRequirement: 1000,
      isPremium: false,
    },
    {
      id: 'silver',
      code: 'SILVER',
      name: 'Plata',
      description: 'Jugador de división plata',
      xpRequirement: 5000,
      isPremium: false,
    },
    {
      id: 'gold',
      code: 'GOLD',
      name: 'Oro',
      description: 'Jugador de división oro',
      xpRequirement: 15000,
      isPremium: false,
    },
    {
      id: 'platinum',
      code: 'PLATINUM',
      name: 'Platino',
      description: 'Jugador de división platino',
      xpRequirement: 30000,
      isPremium: false,
    },
    {
      id: 'diamond',
      code: 'DIAMOND',
      name: 'Diamante',
      description: 'Jugador de división diamante',
      xpRequirement: 50000,
      isPremium: false,
    },
    {
      id: 'champion',
      code: 'CHAMPION',
      name: 'Campeón',
      description: 'Campeón de torneos',
      xpRequirement: 100000,
      isPremium: true,
    },
  ];

  async getAllAchievements(): Promise<Achievement[]> {
    return AchievementsManager.ACHIEVEMENTS;
  }

  async getPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
    const { data, error } = await supabase
      .from('player_achievements')
      .select('*')
      .eq('player_id', playerId);

    if (error) throw new Error(`Error al obtener logros: ${error.message}`);
    return (data || []) as PlayerAchievement[];
  }

  async getAchievementProgress(playerId: string): Promise<{
    achievement: Achievement;
    unlocked: boolean;
    unlockedAt?: Date;
  }[]> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wins, elo')
      .eq('id', playerId)
      .single();

    const { data: unlocked } = await supabase
      .from('player_achievements')
      .select('achievement_id, unlocked_at')
      .eq('player_id', playerId);

    const unlockedMap = new Map((unlocked || []).map(u => [u.achievement_id, u.unlocked_at]));

    return AchievementsManager.ACHIEVEMENTS.map(achievement => ({
      achievement,
      unlocked: unlockedMap.has(achievement.id),
      unlockedAt: unlockedMap.has(achievement.id) ? new Date(unlockedMap.get(achievement.id)) : undefined,
    }));
  }

  async checkAchievements(playerId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wins, elo')
      .eq('id', playerId)
      .single();

    if (!profile) {
      throw new Error('Jugador no encontrado');
    }

    // Obtener logros ya desbloqueados
    const { data: unlockedAchievements } = await supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('player_id', playerId);

    const unlockedIds = unlockedAchievements?.map(a => a.achievement_id) || [];

    // Verificar cada logro
    for (const achievement of AchievementsManager.ACHIEVEMENTS) {
      if (unlockedIds.includes(achievement.id)) {
        continue;
      }

      if (this.checkAchievementCriteria(achievement, profile)) {
        await this.unlockAchievement(playerId, achievement);
      }
    }
  }

  async unlockAchievement(
    playerId: string,
    achievement: Achievement
  ): Promise<void> {
    // Insertar logro desbloqueado
    const { error } = await supabase.from('player_achievements').insert({
      player_id: playerId,
      achievement_id: achievement.id,
      unlocked_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Error al desbloquear logro: ${error.message}`);
    }

    // Otorgar XP
    await this.addXP(playerId, achievement.xpReward);

    // Aquí se enviaría una notificación al jugador
  }

  async addXP(playerId: string, xp: number): Promise<void> {
    // Actualizar XP y nivel
    await supabase.rpc('add_player_xp', {
      p_player_id: playerId,
      p_xp: xp,
    });
  }

  async getAchievements(playerId: string): Promise<{
    unlocked: PlayerAchievement[];
    locked: Achievement[];
  }> {
    const { data: unlocked } = await supabase
      .from('player_achievements')
      .select(`
        id,
        achievement_id,
        unlocked_at,
        achievements (code, name, description, category, xp_reward)
      `)
      .eq('player_id', playerId);

    const unlockedIds = unlocked?.map(a => a.achievement_id) || [];

    const locked = AchievementsManager.ACHIEVEMENTS.filter(
      a => !unlockedIds.includes(a.id)
    );

    return {
      unlocked: (unlocked as unknown) as PlayerAchievement[],
      locked,
    };
  }

  async getTitles(playerId: string): Promise<{
    unlocked: PlayerTitle[];
    all: Title[];
  }> {
    const { data: unlocked } = await supabase
      .from('player_titles')
      .select(`
        id,
        title_id,
        unlocked_at,
        is_active,
        titles (code, name, description, xp_requirement, is_premium)
      `)
      .eq('player_id', playerId);

    return {
      unlocked: (unlocked as unknown) as PlayerTitle[],
      all: AchievementsManager.TITLES,
    };
  }

  async setActiveTitle(playerId: string, titleId: string): Promise<void> {
    // Desactivar todos los títulos primero
    await supabase
      .from('player_titles')
      .update({ is_active: false })
      .eq('player_id', playerId);

    // Activar el nuevo título
    const { error } = await supabase
      .from('player_titles')
      .update({ is_active: true })
      .eq('player_id', playerId)
      .eq('title_id', titleId);

    if (error) {
      throw new Error(`Error al activar título: ${error.message}`);
    }
  }

  private checkAchievementCriteria(achievement: Achievement, profile: any): boolean {
    switch (achievement.id) {
      case 'first_win': return profile.wins >= 1;
      case 'ten_wins': return profile.wins >= 10;
      case 'fifty_wins': return profile.wins >= 50;
      case 'hundred_wins': return profile.wins >= 100;
      case 'five_hundred_wins': return profile.wins >= 500;
      case 'elo_1200': return profile.elo >= 1200;
      case 'elo_1500': return profile.elo >= 1500;
      case 'elo_1800': return profile.elo >= 1800;
      case 'elo_2100': return profile.elo >= 2100;
      case 'first_game': return (profile.wins + profile.losses) >= 1;
      case 'hundred_games': return (profile.wins + profile.losses) >= 100;
      default: return false;
    }
  }
}
