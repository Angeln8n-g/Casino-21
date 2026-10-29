import React, { useState, memo } from 'react';
import { CHARACTERS_CATALOG, ARENA_THEMES, CharacterItem, ArenaTheme } from '../data/arenaCatalog';
import LandingCard from '../components/LandingCard';
import { Sparkles, Palette, Shield, Quote, Smile } from 'lucide-react';

function CharactersShowcaseSection() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterItem>(CHARACTERS_CATALOG[0]);
  const [selectedTheme, setSelectedTheme] = useState<ArenaTheme>(ARENA_THEMES[0]);

  return (
    <section id="personajes" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#050811]">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Sub-Section 1: Character Roster Showcase */}
        <div>
          {/* Section Heading (No eyebrow per craft-floor) */}
          <div className="text-left max-w-3xl mb-12">
            <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
              Duelistas de KASINO21
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
              Elige tu avatar representativo en la mesa. Cada personaje encarna una filosofía de juego y cuenta con su propia colección de reacciones y emotes tácticos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Character Selector Thumbnails (Left - 7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {CHARACTERS_CATALOG.map((character) => {
                const isSelected = character.id === selectedCharacter.id;
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setSelectedCharacter(character)}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isSelected
                        ? 'bg-[#0e1a33] border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)] scale-[1.02]'
                        : 'bg-[#081020] border border-white/10 hover:border-white/20 hover:bg-[#0c162b]'
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/20 mb-2">
                      <img
                        src={character.imageUrl}
                        alt={character.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <div className="font-['Russo_One'] text-sm text-white truncate">
                        {character.name}
                      </div>
                      <div className="font-['Chakra_Petch'] text-xs text-amber-400 font-semibold truncate">
                        {character.alias}
                      </div>
                      <div className="font-['Chakra_Petch'] text-[10px] text-gray-400 mt-1 truncate">
                        {character.archetype}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Character Spotlight Card (Right - 5 cols) */}
            <div className="lg:col-span-5 bg-[#081020] border border-white/10 rounded-3xl p-7 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-4 pb-6 border-b border-white/[0.08] mb-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md flex-shrink-0">
                  <img
                    src={selectedCharacter.imageUrl}
                    alt={selectedCharacter.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-['Chakra_Petch'] text-amber-400 font-bold uppercase tracking-wider">
                    {selectedCharacter.archetype}
                  </div>
                  <h3 className="text-2xl font-black font-['Russo_One'] text-white">
                    {selectedCharacter.name} · {selectedCharacter.alias}
                  </h3>
                  <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-['Chakra_Petch'] text-gray-300">
                    Estilo: {selectedCharacter.difficulty}
                  </div>
                </div>
              </div>

              {/* Quote */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] mb-5 flex items-start gap-3">
                <Quote size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-['Chakra_Petch'] italic text-gray-200 leading-relaxed">
                  {selectedCharacter.quote}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-gray-300 font-['Chakra_Petch'] leading-relaxed mb-6">
                {selectedCharacter.description}
              </p>

              {/* Emote Reaction Preview */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCharacter.emoteUrl}
                    alt="Emote en mesa"
                    className="w-10 h-10 object-contain rounded-lg bg-black/50 p-1 border border-white/10"
                  />
                  <div>
                    <div className="text-xs font-['Chakra_Petch'] font-bold text-white flex items-center gap-1">
                      <Smile size={13} className="text-amber-400" /> Reacción de Mesa
                    </div>
                    <div className="text-[10px] text-gray-400 font-['Chakra_Petch']">
                      Disponible para taunts y chat
                    </div>
                  </div>
                </div>

                <a
                  href="/login"
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white font-['Chakra_Petch'] text-xs font-bold transition-all"
                >
                  Desbloquear
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Section 2: Live Themes & Table Customization Switcher */}
        <div className="pt-12 border-t border-white/[0.06]">
          <div className="text-left max-w-3xl mb-8">
            <h3 className="text-2xl sm:text-4xl font-black font-['Russo_One'] text-white">
              Personaliza tu mesa y baraja
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-300 font-['Chakra_Petch']">
              Cambia la apariencia visual de la mesa en tiempo real. Todos los temas se desbloquean jugando partidas y completando torneos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Theme Selector Buttons (Left - 5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ARENA_THEMES.map((theme) => {
                const isSelected = theme.key === selectedTheme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between h-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isSelected
                        ? 'bg-[#0f1d38] border-2 border-amber-400 shadow-md scale-[1.02]'
                        : 'bg-[#081020] border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{theme.emoji}</span>
                    <div>
                      <div className="font-['Russo_One'] text-xs sm:text-sm text-white">
                        {theme.name}
                      </div>
                      <div className="w-4 h-1 rounded-full mt-1.5" style={{ background: theme.borderColor }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Table Preview Stage (Right - 7 cols) */}
            <div
              className="lg:col-span-7 rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all duration-300 relative overflow-hidden"
              style={{
                background: selectedTheme.feltBg,
                borderColor: selectedTheme.borderColor,
                boxShadow: `0 15px 40px ${selectedTheme.glowColor}`,
              }}
            >
              <div className="flex items-center justify-between text-xs font-['Chakra_Petch'] font-bold text-gray-300 mb-6">
                <span className="flex items-center gap-2">
                  <Palette size={15} style={{ color: selectedTheme.borderColor }} />
                  <span>Vista Previa: Tema {selectedTheme.name}</span>
                </span>
                <span className="text-[11px] text-gray-400">{selectedTheme.description}</span>
              </div>

              {/* Sample Card Pair on the Themed Surface */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-4">
                <LandingCard
                  value="A"
                  suit="spades"
                  annotation="As de Picas"
                  size="lg"
                  customStyle={{
                    cardBg: selectedTheme.cardBg,
                    cardBorder: selectedTheme.cardBorder,
                    redSuitColor: selectedTheme.redSuitColor,
                    blackSuitColor: selectedTheme.blackSuitColor,
                  }}
                />

                <LandingCard
                  value="10"
                  suit="diamonds"
                  annotation="La Buena +2"
                  size="lg"
                  isKey
                  customStyle={{
                    cardBg: selectedTheme.cardBg,
                    cardBorder: selectedTheme.cardBorder,
                    redSuitColor: selectedTheme.redSuitColor,
                    blackSuitColor: selectedTheme.blackSuitColor,
                  }}
                />
              </div>

              <div className="mt-4 text-center text-xs font-['Chakra_Petch'] text-gray-300">
                Aplica a todas tus partidas en vivo tanto en navegador web como en la app móvil.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(CharactersShowcaseSection);
