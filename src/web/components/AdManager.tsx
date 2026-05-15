import React from 'react';

export const initializeAds = (): void => {};

export const showInterstitialAd = (): void => {};

export const showRewardedAd = (onReward: (amount: number) => void, rewardAmount: number = 500): void => {
  onReward(rewardAmount);
};

export const showGateAdForBots = (onClose: () => void): void => {
  onClose();
};

export const AdManager: React.FC = () => null;
