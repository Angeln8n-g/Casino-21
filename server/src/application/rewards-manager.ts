import { supabase } from '../supabase';

export class RewardsManager {
  private static readonly XP_PER_VICTORY = 50;
  private static readonly XP_PER_DEFEAT = 20;
  private static readonly XP_PER_TOURNAMENT_WIN = 500;
  private static readonly XP_PER_TOURNAMENT_2ND = 300;
  private static readonly XP_PER_TOURNAMENT_3RD = 150;

  async addXP(playerId: string, xp: number): Promise<void> {
    // Actualizar XP y nivel
    await supabase.rpc('add_player_xp', {
      p_player_id: playerId,
      p_xp: xp,
    });
  }

  async calculateLevel(xp: number): Promise<number> {
    // Fórmula: nivel = floor(sqrt(XP / 100))
    return Math.floor(Math.sqrt(xp / 100));
  }

  getXPForLevel(level: number): number {
    // Fórmula inversa: XP = level^2 * 100
    return level * level * 100;
  }

  async awardMatchXP(playerId: string, isWinner: boolean): Promise<void> {
    const xp = isWinner
      ? RewardsManager.XP_PER_VICTORY
      : RewardsManager.XP_PER_DEFEAT;

    await this.addXP(playerId, xp);
  }

  async awardTournamentXP(
    playerId: string,
    position: number
  ): Promise<void> {
    let xp = 0;

    switch (position) {
      case 1:
        xp = RewardsManager.XP_PER_TOURNAMENT_WIN;
        break;
      case 2:
        xp = RewardsManager.XP_PER_TOURNAMENT_2ND;
        break;
      case 3:
        xp = RewardsManager.XP_PER_TOURNAMENT_3RD;
        break;
      default:
        xp = 0;
    }

    if (xp > 0) {
      await this.addXP(playerId, xp);
    }
  }

  async awardSeasonXP(playerId: string, rank: number): Promise<void> {
    let xp = 0;

    if (rank <= 10) {
      xp = 1000;
    } else if (rank <= 50) {
      xp = 500;
    } else if (rank <= 100) {
      xp = 200;
    }

    if (xp > 0) {
      await this.addXP(playerId, xp);
    }
  }

  async getRewardsSummary(playerId: string): Promise<{
    totalXP: number;
    level: number;
    nextLevelXP: number;
    xpProgress: number;
  }> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', playerId)
      .single();

    if (!profile) {
      throw new Error('Jugador no encontrado');
    }

    const currentLevel = profile.level || 0;
    const nextLevel = currentLevel + 1;
    const nextLevelXP = this.getXPForLevel(nextLevel);
    const xpProgress = profile.xp % this.getXPForLevel(currentLevel || 1);

    return {
      totalXP: profile.xp,
      level: currentLevel,
      nextLevelXP,
      xpProgress,
    };
  }
}
