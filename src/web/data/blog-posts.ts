export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  readTime: number;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "que-es-el-veintiuno-reglas-basicas",
    title: "¿Qué es el Veintiuno? Reglas Básicas para Principiantes",
    excerpt: "Descubre los fundamentos del juego de cartas más popular de los casinos. Aprende las reglas esenciales, el valor de las cartas y cómo se determina al ganador en cada mano.",
    content: `<h2>Introducción al Veintiuno</h2>
<p>El veintiuno, conocido internacionalmente como blackjack, es uno de los juegos de cartas más populares y accesibles del mundo. Su objetivo es sencillo: formar una mano cuyo valor se acerque lo más posible a 21 sin pasarse, superando la mano del crupier.</p>

<h2>Valor de las Cartas</h2>
<p>En el veintiuno, cada carta tiene un valor específico que debes conocer antes de jugar:</p>
<ul>
<li><strong>Cartas numéricas (2 al 10):</strong> Valen su número exacto. Un 7 vale 7 puntos, un 9 vale 9 puntos, y así sucesivamente.</li>
<li><strong>Figuras (J, Q, K):</strong> Todas valen 10 puntos, sin importar el palo.</li>
<li><strong>As (A):</strong> Es la carta más versátil. Puede valer 1 u 11 puntos, según convenga a tu mano. Esta flexibilidad es lo que hace al as tan valioso.</li>
</ul>

<h2>Desarrollo del Juego</h2>
<p>La partida comienza cuando cada jugador recibe dos cartas boca arriba, mientras que el crupier recibe una carta visible y otra oculta. A partir de aquí, tienes varias opciones:</p>
<ul>
<li><strong>Pedir carta (Hit):</strong> Solicitas una carta adicional para acercarte a 21.</li>
<li><strong>Plantarse (Stand):</strong> Te quedas con tu mano actual y pasas el turno.</li>
<li><strong>Doblar (Double):</strong> Duplicas tu apuesta inicial y recibes exactamente una carta más.</li>
<li><strong>Dividir (Split):</strong> Si tienes dos cartas del mismo valor, puedes separarlas en dos manos independientes.</li>
</ul>

<h2>Cómo Ganar</h2>
<p>Existen varias formas de ganar una mano de veintiuno:</p>
<ul>
<li>Obtener un total más alto que el crupier sin pasarte de 21.</li>
<li>Que el crupier se pase de 21 (se "quiebre").</li>
<li>Conseguir un "blackjack natural": un as más una carta de valor 10 en las dos primeras cartas. Esto paga generalmente 3 a 2.</li>
</ul>

<h2>Consejos para Principiantes</h2>
<p>Antes de jugar con apuestas reales, practica con fichas virtuales para familiarizarte con las reglas. Recuerda que el veintiuno combina suerte y estrategia: conocer cuándo pedir carta y cuándo plantarse marca una gran diferencia a largo plazo. Juega con responsabilidad y establece límites antes de cada sesión.</p>`,
    date: "2026-01-15",
    category: "Guías",
    readTime: 6,
  },
  {
    slug: "estrategia-basica-veintiuno-tabla",
    title: "Estrategia Básica del Veintiuno: La Tabla que Todo Jugador Debe Conocer",
    excerpt: "Aprende a usar la tabla de estrategia básica para tomar decisiones matemáticamente óptimas en cada mano. Reduce la ventaja de la casa y mejora tus resultados.",
    content: `<h2>¿Qué es la Estrategia Básica?</h2>
<p>La estrategia básica del veintiuno es un conjunto de decisiones matemáticamente óptimas para cada combinación posible de tu mano y la carta visible del crupier. No garantiza ganar cada mano, pero minimiza la ventaja de la casa al mínimo posible, generalmente por debajo del 1%.</p>

<h2>Principios Fundamentales</h2>
<p>La estrategia se basa en millones de simulaciones por computadora que determinan la acción con mayor valor esperado para cada situación. Los principios clave son:</p>

<h3>Manos Duras (sin As o con As contando como 1)</h3>
<ul>
<li><strong>8 o menos:</strong> Siempre pide carta. No puedes pasarte con una carta adicional.</li>
<li><strong>9:</strong> Dobla si el crupier muestra 3-6. Si no, pide carta.</li>
<li><strong>10:</strong> Dobla si el crupier muestra 2-9. Si no, pide carta.</li>
<li><strong>11:</strong> Siempre dobla, excepto si el crupier tiene un as (en ese caso, pide carta).</li>
<li><strong>12-16:</strong> Plántate si el crupier muestra 2-6. Pide carta si muestra 7 o más.</li>
<li><strong>17 o más:</strong> Siempre plántate. El riesgo de pasarte es demasiado alto.</li>
</ul>

<h3>Manos Blandas (con As contando como 11)</h3>
<ul>
<li><strong>A-2, A-3:</strong> Dobla contra 5-6. Si no, pide carta.</li>
<li><strong>A-4, A-5:</strong> Dobla contra 4-6. Si no, pide carta.</li>
<li><strong>A-6:</strong> Dobla contra 3-6. Si no, pide carta.</li>
<li><strong>A-7:</strong> Plántate contra 2, 7-8. Dobla contra 3-6. Pide carta contra 9-A.</li>
<li><strong>A-8, A-9:</strong> Siempre plántate.</li>
</ul>

<h3>Pares (cuándo dividir)</h3>
<ul>
<li><strong>Ases y 8:</strong> Siempre divide. Dos ases te dan dos oportunidades de blackjack. Dos 8 suman 16, la peor mano del juego, pero divididas mejoran.</li>
<li><strong>10:</strong> Nunca dividas. Una mano de 20 es excelente tal como está.</li>
<li><strong>5:</strong> Nunca dividas. Trátalo como un 10 y dobla cuando corresponda.</li>
<li><strong>2-3, 6-7:</strong> Divide contra 2-7 del crupier.</li>
<li><strong>4:</strong> Divide solo contra 5-6.</li>
<li><strong>9:</strong> Divide contra 2-9, excepto contra 7.</li>
</ul>

<h2>La Carta del Crupier Importa</h2>
<p>Las cartas 2-6 del crupier se consideran "débiles" porque tienen mayor probabilidad de quebrarse. Las cartas 7-A se consideran "fuertes". Esta distinción es la base de casi todas las decisiones de la estrategia básica.</p>

<h2>Practica Antes de Jugar</h2>
<p>La mejor forma de internalizar la estrategia básica es practicar. En Kasino21 puedes jugar partidas gratuitas para aplicar estas reglas sin riesgo. Con la práctica, las decisiones se vuelven automáticas y podrás concentrarte en disfrutar del juego.</p>`,
    date: "2026-01-22",
    category: "Estrategia",
    readTime: 8,
  },
  {
    slug: "gestion-bankroll-juego-responsable",
    title: "Gestión de Bankroll: Cómo Administrar tu Dinero en Juegos de Cartas",
    excerpt: "La gestión adecuada de tu bankroll es la habilidad más importante para cualquier jugador. Aprende técnicas probadas para proteger tu presupuesto y jugar de forma responsable.",
    content: `<h2>¿Por qué es Importante la Gestión de Bankroll?</h2>
<p>La gestión de bankroll (fondos de juego) es el factor que separa a los jugadores disciplinados de los que pierden más de lo que pueden permitirse. No importa cuán buena sea tu estrategia: sin una gestión adecuada del dinero, eventualmente enfrentarás problemas financieros.</p>

<h2>Principios Básicos</h2>

<h3>1. Define tu Bankroll Total</h3>
<p>Tu bankroll es la cantidad de dinero que estás dispuesto a perder completamente sin que afecte tu vida diaria. Nunca uses dinero destinado a gastos esenciales: alquiler, comida, educación o emergencias. El bankroll debe ser dinero de entretenimiento.</p>

<h3>2. Establece Límites por Sesión</h3>
<p>Divide tu bankroll en sesiones individuales. Una regla común es no arriesgar más del 5% de tu bankroll total en una sola sesión. Si tu bankroll es de $1,000, cada sesión no debería superar los $50.</p>

<h3>3. Determina el Tamaño de Apuesta</h3>
<p>Cada apuesta individual debe representar un porcentaje pequeño de tu bankroll de sesión. La regla del 1-2% es un buen punto de partida: con $50 por sesión, tus apuestas deberían estar entre $0.50 y $1.</p>

<h2>Reglas de Oro</h2>
<ul>
<li><strong>Nunca persigas pérdidas:</strong> Aumentar las apuestas para recuperar lo perdido es el error más común y el más costoso.</li>
<li><strong>Establece un límite de ganancia:</strong> Decide de antemano cuánto necesitas ganar para terminar la sesión. Al alcanzarlo, retírate.</li>
<li><strong>Lleva un registro:</strong> Anota cada sesión: fecha, bankroll inicial, resultado final. Esto te da una visión realista de tu rendimiento.</li>
<li><strong>Acepta las rachas negativas:</strong> Las pérdidas consecutivas son normales. No significan que debas cambiar tu estrategia o aumentar tus apuestas.</li>
</ul>

<h2>La Regla del Stop-Loss</h2>
<p>Un stop-loss es un límite de pérdida automática. Si pierdes el 50% de tu bankroll de sesión, detente inmediatamente. No "una mano más", no "la próxima será diferente". La disciplina es tu mejor herramienta.</p>

<h2>Juego Responsable</h2>
<p>El veintiuno y otros juegos de cartas deben ser entretenimiento, no una fuente de ingresos. Si sientes que el juego está afectando tu bienestar emocional o financiero, busca ayuda profesional. En muchos países existen líneas de atención y recursos para el juego responsable.</p>

<h2>Practica con Kasino21</h2>
<p>Nuestra plataforma te permite jugar con fichas virtuales, lo que es ideal para practicar la gestión de bankroll sin riesgo real. Establece un presupuesto ficticio y sigue las mismas reglas que usarías con dinero real. La disciplina se construye con la práctica.</p>`,
    date: "2026-02-05",
    category: "Consejos",
    readTime: 7,
  },
  {
    slug: "historia-veintiuno-origen-evolucion",
    title: "Historia del Veintiuno: Del Siglo XVIII a la Era Digital",
    excerpt: "Viaja a través del tiempo para descubrir cómo el veintiuno evolucionó desde los salones franceses del siglo XVIII hasta convertirse en el juego de cartas más popular del mundo.",
    content: `<h2>Los Orígenes Franceses</h2>
<p>El veintiuno tiene sus raíces en la Francia del siglo XVIII, donde se jugaba un juego llamado "Vingt-et-Un" (veinte y uno). Este juego se practicaba en los casinos franceses y compartía la mecánica fundamental del juego moderno: alcanzar un total de 21 sin pasarse.</p>

<h2>Expansión a América</h2>
<p>Los colonizadores franceses llevaron el Vingt-et-Un a América del Norte. Durante el siglo XIX, el juego se popularizó en los salones del Mississippi y los establecimientos de juego del oeste americano. Fue en Estados Unidos donde el juego recibió el nombre de "blackjack".</p>

<h3>El Origen del Nombre "Blackjack"</h3>
<p>Para atraer más jugadores, algunos casinos estadounidenses ofrecían un bono especial: si un jugador obtenía un as de picas (espadas) junto con una jota negra (J de picas o tréboles), recibía un pago de 10 a 1. Aunque este bono desapareció, el nombre "blackjack" (jota negra) se quedó para siempre.</p>

<h2>La Revolución de la Estrategia</h2>
<p>En la década de 1950, cuatro matemáticos estadounidenses (Roger Baldwin, Wilbert Cantey, Herbert Maisel y James McDermott) utilizaron calculadoras de mano para determinar la estrategia matemáticamente óptima del veintiuno. Su trabajo, publicado en 1956, sentó las bases de lo que hoy conocemos como "estrategia básica".</p>

<h3>Edward Thorp y el Conteo de Cartas</h3>
<p>En 1962, el profesor Edward Thorp publicó "Beat the Dealer", donde demostró matemáticamente que era posible obtener ventaja sobre el casino contando las cartas que habían salido. Su sistema de "Diez y Medio" revolucionó el juego y obligó a los casinos a implementar contramedidas, como usar múltiples barajas.</p>

<h2>El Veintiuno en la Era Digital</h2>
<p>Con la llegada de internet en los años 90, el veintiuno encontró un nuevo hogar en los casinos en línea. Las plataformas digitales permitieron jugar desde cualquier lugar, con variantes innovadoras y la posibilidad de practicar sin riesgo económico.</p>

<h3>Plataformas Modernas como Kasino21</h3>
<p>Hoy en día, plataformas como Kasino21 ofrecen experiencias de veintiuno en línea con multijugador en tiempo real, sistemas de clasificación ELO y partidas tanto contra otros jugadores como contra la computadora. La esencia del juego permanece intacta, pero la accesibilidad y las funcionalidades sociales lo han transformado.</p>

<h2>Legado Cultural</h2>
<p>El veintiuno ha dejado una marca indeleble en la cultura popular. Aparece en innumerables películas, desde clásicos de James Bond hasta "21: Black Jack" (2008), basada en la historia real del equipo de conteo de cartas del MIT. Su combinación de simplicidad y profundidad estratégica lo mantiene relevante después de más de dos siglos.</p>`,
    date: "2026-02-18",
    category: "Historia",
    readTime: 7,
  },
  {
    slug: "variantes-veintiuno-reglas-especiales",
    title: "Variantes del Veintiuno: Reglas Especiales y Cómo Adaptar tu Estrategia",
    excerpt: "Explora las diferentes variantes del veintiuno que existen y aprende cómo ajustar tu estrategia para cada una. Desde el Blackjack Español hasta el Double Exposure.",
    content: `<h2>¿Por qué Existen Variantes?</h2>
<p>El veintiuno clásico es solo el punto de partida. A lo largo de los años, casinos y desarrolladores han creado variantes que modifican las reglas para ofrecer experiencias diferentes. Cada variante afecta la ventaja de la casa de manera distinta, y conocer estas diferencias es esencial para tomar decisiones informadas.</p>

<h2>Blackjack Español</h2>
<p>Esta variante utiliza un mazo español de 40 cartas, eliminando los 8s y 9s. Esto cambia significativamente las probabilidades:</p>
<ul>
<li>Al no haber 8s y 9s, hay menos cartas de valor medio, lo que afecta las decisiones de doblar y dividir.</li>
<li>La probabilidad de que el crupier se quiebre cambia, ya que hay menos cartas de valor 10 en proporción.</li>
<li>Es fundamental ajustar la estrategia básica: con menos cartas de valor 10, las manos de 12-16 tienen mayor riesgo al pedir carta.</li>
</ul>

<h2>Blackjack Double Exposure</h2>
<p>En esta variante, ambas cartas del crupier se muestran boca arriba. Esto parece una ventaja enorme para el jugador, pero se compensa con reglas más estrictas:</p>
<ul>
<li>El crupier gana en caso de empate (excepto blackjack natural).</li>
<li>El blackjack paga 1 a 1 en lugar de 3 a 2.</li>
<li>Doblar solo se permite con 9, 10 u 11.</li>
</ul>

<h2>Blackjack Switch</h2>
<p>Se juegan dos manos simultáneamente y el jugador puede intercambiar las segundas cartas de cada mano. Esto ofrece oportunidades estratégicas únicas:</p>
<ul>
<li>Puedes convertir dos manos débiles en dos manos fuertes.</li>
<li>El blackjack paga 1 a 1.</li>
<li>Si el crupier tiene 22, se considera empate en lugar de quiebra.</li>
</ul>

<h2>Blackjack Surrender</h2>
<p>Esta variante permite "rendirse" después de recibir las dos primeras cartas, recuperando la mitad de tu apuesta:</p>
<ul>
<li><strong>Rendición temprana:</strong> Puedes rendirte antes de que el crupier verifique si tiene blackjack. Es la más favorable al jugador.</li>
<li><strong>Rendición tardía:</strong> Solo puedes rendirte después de que el crupier confirma que no tiene blackjack. Es la más común.</li>
<li>La rendición es óptima con manos como 16 contra 9, 10 o A del crupier, y con 15 contra 10.</li>
</ul>

<h2>Adaptar tu Estrategia</h2>
<p>Cada variante requiere ajustes a la estrategia básica. Las reglas que más afectan la ventaja de la casa son:</p>
<ul>
<li>Número de barajas utilizadas (menos barajas = mejor para el jugador).</li>
<li>Si el crupier se planta o pide carta con 17 blando.</li>
<li>Si se permite doblar después de dividir.</li>
<li>Si se permite rendición.</li>
<li>El pago del blackjack (3:2 es mejor que 6:5).</li>
</ul>

<h2>Juega en Kasino21</h2>
<p>En Kasino21 puedes experimentar con diferentes estilos de juego y practicar tu estrategia adaptativa. Nuestra plataforma multijugador te permite competir contra otros jugadores en tiempo real, poniendo a prueba tus conocimientos en condiciones reales de juego.</p>`,
    date: "2026-03-02",
    category: "Guías",
    readTime: 8,
  },
  {
    slug: "psicologia-juego-cartas-control-emociones",
    title: "Psicología del Juego de Cartas: Control Emocional y Toma de Decisiones",
    excerpt: "El aspecto mental del veintiuno es tan importante como la estrategia matemática. Aprende a manejar las emociones, evitar sesgos cognitivos y mantener la disciplina en cada mano.",
    content: `<h2>La Mente es tu Mejor Herramienta</h2>
<p>En el veintiuno, conocer la estrategia básica es solo la mitad de la ecuación. La otra mitad es psicológica: tu capacidad para tomar decisiones racionales bajo presión, manejar las rachas negativas sin desesperarte y mantener la disciplina cuando las emociones intentan sabotear tu juicio.</p>

<h2>Sesgos Cognitivos Comunes</h2>

<h3>La Falacia del Jugador</h3>
<p>Este es el error más frecuente: creer que después de varias pérdidas consecutivas, una victoria es "debida". La realidad es que cada mano de veintiuno es independiente. El mazo no tiene memoria. Que hayas perdido cinco manos seguidas no aumenta tus probabilidades de ganar la siguiente.</p>

<h3>El Sesgo de Confirmación</h3>
<p>Tendemos a recordar las veces que nuestra estrategia "falló" y olvidar las veces que funcionó. Si te plantas con 17 y el crupier saca 21, sientes que la estrategia te falló. Pero a largo plazo, plantarse con 17 es la decisión correcta. Un solo resultado no invalida la matemática.</p>

<h3>La Aversión a la Pérdida</h3>
<p>Psicológicamente, el dolor de perder es aproximadamente el doble de intenso que el placer de ganar la misma cantidad. Esto lleva a muchos jugadores a tomar decisiones irracionales después de una pérdida: aumentar apuestas, abandonar la estrategia o "perseguir" lo perdido.</p>

<h2>Técnicas de Control Emocional</h2>

<h3>1. Establece Reglas Antes de Jugar</h3>
<p>Antes de comenzar, define tus límites: cuánto estás dispuesto a perder, cuánto necesitas ganar para retirarte, y cuánto tiempo jugarás. Una vez establecidas, sigue estas reglas sin excepción, independientemente de cómo te sientas.</p>

<h3>2. Toma Descansos</h3>
<p>Después de una racha negativa significativa, toma un descanso de al menos 15 minutos. Levántate, camina, respira. La fatiga mental deteriora la toma de decisiones más de lo que la mayoría reconoce.</p>

<h3>3. No Juegas bajo Influencia</h3>
<p>El alcohol, la fatiga extrema y el estrés emocional afectan tu capacidad de tomar decisiones racionales. El veintiuno requiere claridad mental. Si no estás en condiciones óptimas, es mejor no jugar.</p>

<h3>4. Acepta la Varianza</h3>
<p>Las rachas positivas y negativas son parte inherente del juego. Incluso con la estrategia perfecta, perderás aproximadamente el 48% de las manos (el resto son empates). Aceptar esto como normal te protege de reacciones emocionales exageradas.</p>

<h2>El Poder de la Paciencia</h2>
<p>Los mejores jugadores no son los que toman las decisiones más espectaculares, sino los que consistentemente toman las decisiones correctas, mano tras mano, sesión tras sesión. La paciencia y la disciplina son las verdaderas habilidades que separan a los jugadores exitosos del resto.</p>

<h2>Practica la Mentalidad Correcta en Kasino21</h2>
<p>Nuestra plataforma es el entorno ideal para desarrollar disciplina mental. Juega partidas con fichas virtuales, establece límites ficticios y practica seguir tus reglas sin excepción. Cuando la disciplina se convierte en hábito, estarás preparado para cualquier situación de juego.</p>`,
    date: "2026-03-15",
    category: "Consejos",
    readTime: 7,
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogCategories(): string[] {
  const categories = new Set(blogPosts.map((post) => post.category));
  return Array.from(categories).sort();
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter((post) => post.category === category);
}

export function getRelatedPosts(slug: string, limit: number = 3): BlogPost[] {
  const current = getBlogPostBySlug(slug);
  if (!current) return [];

  return blogPosts
    .filter(
      (post) => post.slug !== slug && post.category === current.category
    )
    .slice(0, limit);
}
