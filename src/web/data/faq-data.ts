export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faqData: FAQItem[] = [
  {
    question: '¿Qué es Kasino21?',
    answer: 'Kasino21 es un juego de cartas competitivo online basado en el juego tradicional de 21. Es completamente gratuito y se juega directamente desde tu navegador sin necesidad de descargas. Puedes jugar en modo 1v1 o 2v2 contra otros jugadores reales o contra bots.',
    category: 'General',
  },
  {
    question: '¿Es gratuito?',
    answer: 'Sí, Kasino21 es 100% gratuito. Las monedas del juego son virtuales y no tienen valor monetario real. No se pueden comprar ni vender por dinero real. El juego se mantiene mediante publicidad no intrusiva de Google AdSense.',
    category: 'General',
  },
  {
    question: '¿Necesito crear una cuenta?',
    answer: 'Sí, necesitas crear una cuenta para guardar tu progreso, tu rango ELO, tu historial de partidas y tus logros. El registro es rápido y solo requiere un correo electrónico. Usamos Supabase para la autenticación segura.',
    category: 'Cuentas',
  },
  {
    question: '¿Puedo cambiar mi nombre de usuario?',
    answer: 'Actualmente el nombre de usuario se establece al crear la cuenta. Si necesitas cambiarlo por alguna razón, contáctanos a kansino21.service@gmail.com y te ayudaremos con el proceso.',
    category: 'Cuentas',
  },
  {
    question: '¿Cómo funciona el sistema ELO?',
    answer: 'El sistema ELO ajusta tu puntuación después de cada partida. Si ganas contra un jugador con ELO más alto, ganas más puntos. Si pierdes contra alguien con ELO más bajo, pierdes más puntos. El matchmaking busca oponentes con ELO similar (inicialmente ±50 puntos, expandiéndose hasta ±500 si no se encuentran rivales).',
    category: 'Juego',
  },
  {
    question: '¿Cuántos jugadores hay por partida?',
    answer: 'Puedes jugar en dos modos: 1v1 (duelo directo entre dos jugadores) o 2v2 (equipos de dos jugadores cada uno). Ambos modos tienen el mismo sistema de puntuación y reglas.',
    category: 'Juego',
  },
  {
    question: '¿Puedo jugar contra bots?',
    answer: 'Sí, ofrecemos un modo contra bots con diferentes niveles de dificultad. Es perfecto para practicar antes de competir contra otros jugadores. Cada anuncio visto desbloquea 10 partidas contra bots.',
    category: 'Juego',
  },
  {
    question: '¿Qué pasa si me desconecto durante una partida?',
    answer: 'Si te desconectas, tienes un tiempo limitado para reconectarte y continuar la partida. Si no te reconectas, la partida se resuelve según las reglas del juego y puedes perder puntos ELO. Te recomendamos tener una conexión estable.',
    category: 'Juego',
  },
  {
    question: '¿Cómo se calcula la puntuación?',
    answer: 'Al final de cada ronda se otorgan puntos por: mayoría de cartas (3 pts), mayoría de picas (1 pt), 10 de diamantes (2 pts), 2 de picas (1 pt), cada As (1 pt) y cada Virado (1 pt). El primero en alcanzar 21 puntos gana. Consulta nuestra guía completa de puntuación en el blog.',
    category: 'Juego',
  },
  {
    question: '¿El juego funciona en móvil?',
    answer: 'Sí, Kasino21 es completamente responsivo y funciona en navegadores móviles. También puedes instalarlo como PWA (Progressive Web App) para una experiencia más parecida a una app nativa con acceso directo desde tu pantalla de inicio.',
    category: 'General',
  },
  {
    question: '¿Las monedas tienen valor real?',
    answer: 'No. Las monedas son completamente virtuales y solo existen dentro del juego. No se pueden convertir en dinero real, transferir a otros jugadores ni usar fuera de Kasino21. No hay apuestas reales de ningún tipo.',
    category: 'Monedas',
  },
  {
    question: '¿Cómo consigo más monedas?',
    answer: 'Puedes ganar monedas de varias formas: jugando partidas (victoria y participación), completando misiones diarias, participando en torneos, o viendo anuncios patrocinados en la tienda del juego.',
    category: 'Monedas',
  },
  {
    question: '¿Qué son los torneos?',
    answer: 'Los torneos son competiciones especiales donde múltiples jugadores se enfrentan durante un período limitado (generalmente semanal) para acumular la mayor cantidad de victorias y puntos. Los mejores jugadores en la tabla de clasificación reciben premios virtuales.',
    category: 'Torneos',
  },
  {
    question: '¿Cómo participo en un torneo?',
    answer: 'Los torneos activos aparecen en la página principal del juego. Simplemente juega partidas durante el período del torneo y tus resultados se acumulan automáticamente en la tabla de clasificación. No necesitas inscripción previa.',
    category: 'Torneos',
  },
  {
    question: '¿Cómo funciona el sistema de anuncios?',
    answer: 'Kasino21 utiliza Google AdSense para mostrar anuncios que nos ayudan a mantener el juego gratuito. Los anuncios aparecen como intersticiales entre partidas, anuncios recompensados en la tienda, y anuncios de puerta para desbloquear partidas contra bots. Puedes ver nuestra política de cookies para más detalles.',
    category: 'General',
  },
  {
    question: '¿Cómo reporto un problema?',
    answer: 'Puedes contactarnos a través de la página de Contacto (/contact) o enviando un email a kansino21.service@gmail.com. Respondemos en un plazo de 24-48 horas. También puedes reportar bugs directamente desde el juego.',
    category: 'Cuentas',
  },
  {
    question: '¿Hay un modo de práctica?',
    answer: 'Sí, el modo contra bot funciona como modo de práctica. Puedes jugar contra la inteligencia artificial con diferentes niveles de dificultad sin riesgo de perder puntos ELO. Es ideal para aprender las reglas y probar estrategias.',
    category: 'Juego',
  },
];

export function getFAQCategories(): string[] {
  const categories = new Set(faqData.map(item => item.category));
  return Array.from(categories);
}

export function getFAQByCategory(category: string): FAQItem[] {
  return faqData.filter(item => item.category === category);
}
