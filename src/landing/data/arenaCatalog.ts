// ─── Arena Catalog: Personajes, Temas y Mecánicas Tácticas de KASINO21 ──────────────
import { ThemeFontKey } from '../../web/themes/themeRegistry';

export interface CharacterItem {
  id: string;
  name: string;
  alias: string;
  archetype: string;
  quote: string;
  description: string;
  imageUrl: string;
  emoteUrl: string;
  accentColor: string;
  difficulty: 'Estratégico' | 'Agresivo' | 'Calculador' | 'Táctico';
}

export interface ArenaTheme {
  key: string;
  name: string;
  emoji: string;
  previewColor: string;
  description: string;
  feltBg: string;
  borderColor: string;
  glowColor: string;
  cardBg: string;
  cardBorder: string;
  redSuitColor: string;
  blackSuitColor: string;
  fontKey?: ThemeFontKey;
}

export interface TacticalSceneCard {
  value: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  isKey?: boolean;
  annotation?: string;
}

export interface TacticalScene {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  handCards: TacticalSceneCard[];
  boardCards: TacticalSceneCard[];
  actionLabel: string;
  actionOutcome: string;
  tacticalTip: string;
  scoreImpact: string;
}

export const CHARACTERS_CATALOG: CharacterItem[] = [
  {
    id: 'el-as-audax',
    name: 'El AS',
    alias: 'El Audax',
    archetype: 'Maestro del Virado',
    quote: '«La mesa no se limpia por suerte; se barre con cálculo.»',
    description: 'Duelista temido por forzar sumatorias imposibles y barrer la mesa con virados en rondas decisivas.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/el_as_1785028294641.jpg',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/brilliant__1785882338360.gif',
    accentColor: '#fbbf24',
    difficulty: 'Estratégico',
  },
  {
    id: 'la-q-reyna',
    name: 'La Q',
    alias: 'La Reyna',
    archetype: 'Estratega de Equipos 2v2',
    quote: '«El que controla las sumatorias controla el ritmo del juego.»',
    description: 'Especialista en coordinar jugadas con su compañero, asegurar las cartas clave y robar pilas rivales.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/la_q_1785112716923.webp',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/great_job__1785881596936.gif',
    accentColor: '#f43f5e',
    difficulty: 'Táctico',
  },
  {
    id: 'dark-king',
    name: 'Dark King 👑',
    alias: 'El Rey Oscuro',
    archetype: 'Guardián de la Zona de Cierre',
    quote: '«A los 17 puntos no hay margen de error. Cada carta cuenta.»',
    description: 'Dominador del juego tardío; memoriza el mazo para negarle la mayoría de picas al rival en el cierre.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/dark_king__1785028496746.png',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/furious__1785882003412.gif',
    accentColor: '#a855f7',
    difficulty: 'Calculador',
  },
  {
    id: 'dra-corazon',
    name: 'Dra. Corazón',
    alias: 'La Curadora',
    archetype: 'Controladora de Tempo',
    quote: '«Cantar un As en el momento exacto desarma cualquier ofensiva.»',
    description: 'Experta en jugadas de protección y en revertir desventajas de puntuación con precisión quirúrgica.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/dra_coraz_n__1785206129197.png',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/say_what__1785881699887.gif',
    accentColor: '#ec4899',
    difficulty: 'Estratégico',
  },
  {
    id: 'el-as-picaro',
    name: 'El As',
    alias: 'Pícaro',
    archetype: 'Cazador de Cartas Clave',
    quote: '«El 10 de diamantes tiene mi nombre grabado.»',
    description: 'Agresivo y veloz en sus decisiones; arriesga sumatorias altas para asegurar La Buena y La Chica.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/el_as_1785028575847.png',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/burla_1785529611044.gif',
    accentColor: '#38bdf8',
    difficulty: 'Agresivo',
  },
  {
    id: 'chukis',
    name: 'Chukis',
    alias: 'El Chukis',
    archetype: 'Infiltrador de Baraja',
    quote: '«¿Pensabas que esa sumatoria era tuya? Ya no.»',
    description: 'Maestro del contraataque; acecha los errores del rival para robar formaciones en su propio turno.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/chukis_1785014488100.jpg',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/risas_1785529674392.gif',
    accentColor: '#10b981',
    difficulty: 'Táctico',
  },
  {
    id: 'tomas',
    name: 'Tomás',
    alias: 'Compañero',
    archetype: 'Pilar Defensivo',
    quote: '«En 2v2 la victoria se construye carta a carta entre los dos.»',
    description: 'El aliado ideal en partidas por equipos; prepara el tablero para que su compañero remate el virado.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/tom_s_1785027843190.jpg',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/great_job__1785881596936.gif',
    accentColor: '#f59e0b',
    difficulty: 'Estratégico',
  },
  {
    id: 'el-cebollero',
    name: 'El Cebollero',
    alias: 'Veterano de Mesa',
    archetype: 'Conteo Clásico',
    quote: '«He visto a muchos confiarse a los 20 puntos y terminar perdiendo.»',
    description: 'Conoce todas las variantes del 21 tradicional llevadas al videojuego moderno con disciplina inquebrantable.',
    imageUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/el_cebollero_1786576309363.jpg',
    emoteUrl: 'https://kasino21.com/storage/v1/object/public/store_assets/say_what__1785881699887.gif',
    accentColor: '#eab308',
    difficulty: 'Calculador',
  },
];

export const ARENA_THEMES: ArenaTheme[] = [
  {
    key: 'default',
    name: 'Clásico',
    emoji: '🃏',
    previewColor: '#ffffff',
    description: 'Mesa tradicional de casino con paño azul profundo y cartas marfil ultra nítidas.',
    feltBg: 'radial-gradient(circle at 50% 30%, #0a3258 0%, #07263f 60%, #041a2e 100%)',
    borderColor: '#1e3a5f',
    glowColor: 'rgba(34, 211, 238, 0.3)',
    cardBg: 'linear-gradient(165deg, #ffffff 0%, #f8fafc 40%, #e2e8f0 100%)',
    cardBorder: 'rgba(255, 255, 255, 0.8)',
    redSuitColor: '#dc2626',
    blackSuitColor: '#0f172a',
    fontKey: 'russo',
  },
  {
    key: 'neon-dealer',
    name: 'Neon Dealer',
    emoji: '⚡',
    previewColor: '#0d0d1a',
    description: 'Estética cyberpunk neón donde cada palo y borde brilla con luz reactiva.',
    feltBg: 'radial-gradient(circle at 50% 30%, #16162d 0%, #0d0d1a 60%, #05050b 100%)',
    borderColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    cardBg: 'linear-gradient(165deg, #181829 0%, #0f0f1b 50%, #090912 100%)',
    cardBorder: 'rgba(56, 189, 248, 0.6)',
    redSuitColor: '#f43f5e',
    blackSuitColor: '#38bdf8',
    fontKey: 'orbitron',
  },
  {
    key: 'gold-rush',
    name: 'Gold Rush',
    emoji: '✨',
    previewColor: '#1a1200',
    description: 'Glassmorphism de alta competencia con reflejos dorados y acabados de campeonato.',
    feltBg: 'radial-gradient(circle at 50% 30%, #291e03 0%, #171102 60%, #080601 100%)',
    borderColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    cardBg: 'linear-gradient(165deg, #241d08 0%, #161204 50%, #0c0902 100%)',
    cardBorder: 'rgba(251, 191, 36, 0.7)',
    redSuitColor: '#f59e0b',
    blackSuitColor: '#fef08a',
    fontKey: 'orbitron',
  },
  {
    key: 'vault-noir',
    name: 'Vault Noir',
    emoji: '🖤',
    previewColor: '#1a1208',
    description: 'Terciopelo negro mate y cartas envejecidas con estética sobria de club exclusivo.',
    feltBg: 'radial-gradient(circle at 50% 30%, #1f1b18 0%, #120f0d 60%, #070605 100%)',
    borderColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    cardBg: 'linear-gradient(165deg, #fdfbf7 0%, #f4eee1 50%, #e6dac3 100%)',
    cardBorder: 'rgba(202, 138, 4, 0.5)',
    redSuitColor: '#991b1b',
    blackSuitColor: '#1c1917',
    fontKey: 'cinzel',
  },
  {
    key: 'tactile-vegas',
    name: 'Tactile Vegas',
    emoji: '🎰',
    previewColor: '#4a1942',
    description: 'Tonos magenta y amatista con sensación táctil arcade moderna y gran volumen.',
    feltBg: 'radial-gradient(circle at 50% 30%, #3f1338 0%, #240a20 60%, #11030f 100%)',
    borderColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.35)',
    cardBg: 'linear-gradient(165deg, #ffffff 0%, #fdf2f8 50%, #fce7f3 100%)',
    cardBorder: 'rgba(244, 114, 182, 0.6)',
    redSuitColor: '#db2777',
    blackSuitColor: '#4c0519',
    fontKey: 'russo',
  },
  {
    key: 'bento-casino',
    name: 'Bento Casino',
    emoji: '🍱',
    previewColor: '#f5f5f7',
    description: 'Minimalismo escandinavo con sombras suaves, líneas puras y legibilidad extrema.',
    feltBg: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 60%, #020617 100%)',
    borderColor: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    cardBg: 'linear-gradient(165deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
    cardBorder: 'rgba(203, 213, 225, 0.8)',
    redSuitColor: '#ef4444',
    blackSuitColor: '#0f172a',
    fontKey: 'chakra',
  },
];

export const TACTICAL_SCENES: TacticalScene[] = [
  {
    id: 'llevar',
    title: 'Llevar (Captura Directa)',
    subtitle: 'El fundamento del control de mesa',
    summary: 'Juegas una carta de tu mano con el mismo valor que una o más cartas del tablero para capturarlas y sumarlas a tu pozo de mayoría.',
    handCards: [
      { value: '7', suit: 'hearts', isKey: true, annotation: 'Carta que juegas' },
      { value: 'K', suit: 'spades' },
      { value: '2', suit: 'diamonds' },
      { value: 'J', suit: 'clubs' },
    ],
    boardCards: [
      { value: '7', suit: 'spades', isKey: true, annotation: 'Capturada (+1)' },
      { value: '4', suit: 'clubs' },
      { value: 'Q', suit: 'hearts' },
      { value: 'A', suit: 'diamonds' },
    ],
    actionLabel: 'Jugar 7♥ para Llevar el 7♠',
    actionOutcome: '¡Captura exitosa! Ambas cartas van a tu reserva. Reduces opciones del rival.',
    tacticalTip: 'Si en el tablero hay múltiples combinaciones que sumen el mismo valor, puedes capturarlas todas en la misma jugada.',
    scoreImpact: '+2 cartas acumuladas para el cómputo de Mayoría (+3 pts).',
  },
  {
    id: 'sumatorias',
    title: 'Sumatorias (Riesgo y Robo)',
    subtitle: 'Cálculo matemático con tensión constante',
    summary: 'Agrupas cartas del tablero que sumen el valor de una carta que conservas en tu mano. Pero ten cuidado: ¡tu oponente puede robarla si tiene el mismo valor!',
    handCards: [
      { value: '10', suit: 'diamonds', isKey: true, annotation: 'La Buena en mano' },
      { value: '4', suit: 'hearts', isKey: true, annotation: 'Carta para formar' },
      { value: '8', suit: 'spades' },
      { value: 'Q', suit: 'clubs' },
    ],
    boardCards: [
      { value: '6', suit: 'clubs', isKey: true, annotation: 'Base' },
      { value: '3', suit: 'hearts' },
      { value: 'K', suit: 'diamonds' },
      { value: '5', suit: 'spades' },
    ],
    actionLabel: 'Jugar 4♥ sobre 6♣ formando Sumatoria a 10',
    actionOutcome: 'Pila [6 + 4 = 10] creada en mesa lista para cobrar con tu 10♦.',
    tacticalTip: 'Nunca formes una sumatoria si sospechas que el rival retiene ese valor, o te arrebatará la jugada antes de tu siguiente turno.',
    scoreImpact: 'Asegura cartas de alto valor y encamina los +2 pts de La Buena.',
  },
  {
    id: 'cantar-as',
    title: 'Cantar un As (Jugada Blindada)',
    subtitle: 'Protección absoluta con doble As',
    summary: 'Si tienes dos Ases en tu mano, puedes jugar uno a la mesa y "Cantar el As". Ningún rival podrá capturarlo durante esa ronda, garantizando tu jugada siguiente.',
    handCards: [
      { value: 'A', suit: 'spades', isKey: true, annotation: 'As cantado' },
      { value: 'A', suit: 'hearts', isKey: true, annotation: 'Segundo As' },
      { value: '9', suit: 'clubs' },
      { value: '6', suit: 'diamonds' },
    ],
    boardCards: [
      { value: '3', suit: 'spades' },
      { value: '8', suit: 'hearts' },
      { value: 'J', suit: 'spades' },
      { value: '5', suit: 'clubs' },
    ],
    actionLabel: 'Cantar As jugando A♠ con A♥ en mano',
    actionOutcome: '¡As protegido en la mesa! El rival no puede llevarlo hasta tu próximo turno.',
    tacticalTip: 'Ideal para obligar al rival a jugar pasivo sin riesgo de perder tu punto de As ni la carta clave de picas.',
    scoreImpact: '+1 pt directo de As asegurado + ventaja psicológica.',
  },
  {
    id: 'virado',
    title: '¡Virado! (Barrida de Mesa)',
    subtitle: '+1 Punto inmediato y control total',
    summary: 'Cuando tu jugada captura la última carta restante del tablero, dejas la mesa vacía. Esto se llama VIRADO: suma +1 punto directo al marcador y fuerza al rival a regalar carta.',
    handCards: [
      { value: '8', suit: 'diamonds', isKey: true, annotation: 'Última captura' },
      { value: 'K', suit: 'hearts' },
      { value: '4', suit: 'spades' },
      { value: '7', suit: 'clubs' },
    ],
    boardCards: [
      { value: '8', suit: 'spades', isKey: true, annotation: 'Última en mesa' },
    ],
    actionLabel: 'Jugar 8♦ y llevar el 8♠ restante',
    actionOutcome: '¡MESA LIMPIA! ¡¡VIRADO!! +1 Punto inmediato en el marcador.',
    tacticalTip: 'Un virado obliga al contrincante a tirar una carta en mesa vacía en su turno, dejándote a ti la iniciativa de captura.',
    scoreImpact: '+1 pt en el acto que puede definir partidas ajustadas.',
  },
  {
    id: 'cierre',
    title: 'Regla de Cierre (17–20 Puntos)',
    subtitle: 'Donde los campeones marcan la diferencia',
    summary: 'Al acercarse al 21, las reglas de puntuación se restringen para evitar victorias casuales. Cada decisión se vuelve quirúrgica.',
    handCards: [
      { value: '2', suit: 'spades', isKey: true, annotation: 'La Chica (+1 pica)' },
      { value: 'A', suit: 'spades', isKey: true, annotation: 'Pica decisiva' },
      { value: '10', suit: 'spades', isKey: true, annotation: 'Pica pesada' },
      { value: 'Q', suit: 'spades', isKey: true, annotation: 'Mayoría de picas' },
    ],
    boardCards: [
      { value: '2', suit: 'hearts' },
      { value: '9', suit: 'spades', isKey: true, annotation: 'Pica en disputa' },
      { value: '7', suit: 'diamonds' },
    ],
    actionLabel: 'Disputar mayoría de picas con marcador a 20 pts',
    actionOutcome: 'Con 20 puntos, solo la Mayoría de Picas otorga el punto 21 de la victoria.',
    tacticalTip: 'A 17 pts solo cuentan Mayoría de Cartas y Picas. A 18-19 solo Mayoría de Cartas. A 20 pts solo Mayoría de Picas.',
    scoreImpact: 'Regla de Oro: La partida se gana con maestría en el mazo, nunca al azar.',
  },
];

export const OFFICIAL_SCORING_RULES = [
  { item: 'Mayoría de Cartas (27+ cartas)', points: '+3 Puntos', icon: 'Layers', note: 'Quien acumule más cartas al cerrar la ronda' },
  { item: 'Mayoría de Picas ♠ (7+ picas)', points: '+1 Punto', icon: 'Spade', note: 'Esencial para desbloquear el punto final a los 20 pts' },
  { item: '10 de Diamantes ♦ ("La Buena")', points: '+2 Puntos', icon: 'Gem', note: 'La carta individual más valiosa de toda la baraja' },
  { item: '2 de Picas ♠ ("La Chica")', points: '+1 Punto', icon: 'Sparkle', note: 'Aporta doble: punto individual y suma para mayoría de picas' },
  { item: 'Cada As en mano capturado', points: '+1 Punto c/u', icon: 'Crown', note: 'Hasta 4 puntos posibles en juego por ronda' },
  { item: 'Cada Virado (Mesa vacía)', points: '+1 Punto c/u', icon: 'Zap', note: 'Puntos inmediatos al momento de barrer la mesa' },
];

export const ELO_DIVISIONS_DATA = [
  { name: 'Bronce', minElo: 0, maxElo: 1199, color: '#b45309', border: 'border-amber-700/40', badge: 'bg-amber-900/30 text-amber-400', desc: 'Iniciación, aprendizaje de sumatorias y ritmo básico.' },
  { name: 'Plata', minElo: 1200, maxElo: 1499, color: '#9ca3af', border: 'border-gray-500/40', badge: 'bg-gray-700/30 text-gray-300', desc: 'Dominio de capturas, control de Ases y conteo preliminar.' },
  { name: 'Oro', minElo: 1500, maxElo: 1799, color: '#eab308', border: 'border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-400', desc: 'Juego táctico avanzado, robos de sumatoria y lectura de rival.' },
  { name: 'Platino', minElo: 1800, maxElo: 2099, color: '#06b6d4', border: 'border-cyan-500/40', badge: 'bg-cyan-500/20 text-cyan-300', desc: 'Conteo riguroso de picas, dominación de virados y 2v2 sincronizado.' },
  { name: 'Diamante', minElo: 2100, maxElo: 2399, color: '#8b5cf6', border: 'border-violet-500/40', badge: 'bg-violet-500/20 text-violet-300', desc: 'Élite competitiva; dominio absoluto de la Regla de Cierre 17-20.' },
  { name: 'Leyenda', minElo: 2400, maxElo: 9999, color: '#f59e0b', border: 'border-amber-400/60', badge: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300', desc: 'Top duelistas de la temporada disputando la cima mundial.' },
];
