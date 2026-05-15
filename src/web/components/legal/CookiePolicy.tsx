import React, { useEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function CookiePolicy() {
  useEffect(() => {
    updateSEO({
      title: 'Política de Cookies — KASINO21 | Juego de Cartas Online',
      description: 'Información completa sobre las cookies que utiliza KASINO21: cookies esenciales, analíticas de Google Analytics y publicitarias de Google AdSense. Cumplimiento GDPR/ePrivacy.',
      canonical: 'https://kasino21.com/cookies',
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/privacy" className="text-gray-500 hover:text-casino-gold transition-colors">Privacidad</a>
            <a href="/terms" className="text-gray-500 hover:text-casino-gold transition-colors">Términos</a>
            <a
              href="/"
              className="bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/30 px-4 py-2 rounded-xl transition-all"
            >
              ← Jugar
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-orange-900/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-amber-400" />
            Legal / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Cookies</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Esta Política de Cookies explica cómo KASINO21 utiliza cookies y tecnologías de seguimiento similares,
            requerida por la ley de la UE (GDPR/Directiva ePrivacy) para sitios que usan Google AdSense.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Última actualización: 11 de mayo de 2026 · Requerido para cumplimiento UE
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <CookieSection icon="🍪" title="¿Qué Son las Cookies?">
          <p>
            Las cookies son pequeños archivos de texto que se colocan en tu dispositivo (ordenador, tableta o móvil)
            cuando visitas un sitio web. Se utilizan ampliamente para que los sitios web funcionen de manera eficiente,
            recordar tus preferencias y proporcionar información a los propietarios del sitio.
          </p>
          <p className="mt-3">
            Tecnologías similares — como balizas web, píxeles y almacenamiento local — cumplen propósitos similares
            y están cubiertas por esta política. Nos referimos colectivamente a todas ellas como "cookies".
          </p>
        </CookieSection>

        <CookieSection icon="📋" title="Qué Cookies Utilizamos">
          <p className="mb-6">KASINO21 utiliza las siguientes categorías de cookies:</p>

          <div className="space-y-4">
            <CookieTable
              category="Esenciales / Estrictamente Necesarias"
              color="emerald"
              required
              description="Estas cookies son necesarias para que el juego funcione. Sin ellas, no puedes iniciar sesión, jugar ni usar funciones principales. No se pueden deshabilitar."
              cookies={[
                { name: 'sb-auth-token', provider: 'Supabase', purpose: 'Mantiene tu sesión autenticada', duration: 'Sesión / 1 hora' },
                { name: 'casino21_roomId', provider: 'KASINO21', purpose: 'Guarda la sala de juego actual para reconexión', duration: 'Sesión' },
                { name: 'casino21_playerId', provider: 'KASINO21', purpose: 'Identifica tu ID de jugador en la partida actual', duration: 'Sesión' },
                { name: 'casino21_ui_*', provider: 'KASINO21', purpose: 'Guarda tus preferencias de interfaz (estado de barra lateral, etc.)', duration: 'Persistente' },
              ]}
            />

            <CookieTable
              category="Analíticas"
              color="blue"
              required={false}
              description="Estas cookies nos ayudan a entender cómo los jugadores usan KASINO21, qué funciones son populares y dónde se necesitan mejoras. Todos los datos son anónimos."
              cookies={[
                { name: '_ga', provider: 'Google Analytics', purpose: 'Distingue usuarios únicos (anonimizado)', duration: '2 años' },
                { name: '_ga_*', provider: 'Google Analytics', purpose: 'Mantiene el estado de sesión para analíticas', duration: '2 años' },
                { name: '_gid', provider: 'Google Analytics', purpose: 'Distingue usuarios en un período de 24 horas', duration: '24 horas' },
              ]}
            />

            <CookieTable
              category="Publicitarias (Google AdSense)"
              color="amber"
              required={false}
              description="Google AdSense coloca cookies para mostrar anuncios relevantes que ayudan a financiar KASINO21 como juego gratuito. Estas cookies pueden recopilar datos sobre tus hábitos de navegación en otros sitios."
              cookies={[
                { name: '__gads / __gpi', provider: 'Google AdSense', purpose: 'Registra impresiones de anuncios y evita la duplicación', duration: '13 meses' },
                { name: 'IDE', provider: 'Google DoubleClick', purpose: 'Registra e informa interacciones con anuncios para seguimiento de conversiones', duration: '13 meses' },
                { name: 'NID / ANID', provider: 'Google', purpose: 'Almacena preferencias del usuario para personalización de anuncios', duration: '6 meses' },
                { name: 'DSID', provider: 'Google', purpose: 'Identifica usuarios autenticados para segmentación entre dispositivos', duration: '2 semanas' },
              ]}
            />
          </div>
        </CookieSection>

        <CookieSection icon="⚙️" title="Cómo Controlar las Cookies">
          <p>Tienes varias opciones para gestionar las cookies. Ten en cuenta que restringir las cookies puede afectar tu experiencia de juego:</p>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <ControlCard
              icon="🌐"
              title="Configuración del Navegador"
              description="Todos los navegadores modernos te permiten bloquear, eliminar o permitir cookies específicas. Aquí te mostramos cómo hacerlo en los navegadores más comunes:"
              links={[
                { label: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                { label: 'Firefox', url: 'https://support.mozilla.org/kb/enable-and-disable-cookies' },
                { label: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471' },
                { label: 'Edge', url: 'https://support.microsoft.com/topic/microsoft-edge-browsing-data-and-privacy' },
              ]}
            />
            <ControlCard
              icon="🎯"
              title="Personalización de Anuncios"
              description="Exclúyete de la publicidad personalizada de Google o gestiona tu configuración de anuncios:"
              links={[
                { label: 'Configuración de Anuncios de Google', url: 'https://adssettings.google.com' },
                { label: 'Exclusión de Google Analytics', url: 'https://tools.google.com/dlpage/gaoptout' },
                { label: 'Tus Opciones Online (UE)', url: 'https://www.youronlinechoices.com' },
                { label: 'Exclusión NAI (EE. UU.)', url: 'https://optout.networkadvertising.org' },
              ]}
            />
          </div>

          <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Importante: Funcionalidad del Juego</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Deshabilitar las <strong className="text-white">cookies esenciales</strong> impedirá que inicies sesión y juegues a KASINO21.
                  Deshabilitar las <strong className="text-white">cookies analíticas o publicitarias</strong> solo afecta al seguimiento y a la
                  personalización de anuncios — el juego seguirá funcionando, aunque podrías ver anuncios menos relevantes.
                </p>
              </div>
            </div>
          </div>
        </CookieSection>

        <CookieSection icon="🔗" title="Uso de Cookies por Google">
          <p>
            KASINO21 utiliza Google AdSense para mostrar anuncios. Google utiliza cookies para servir anuncios basados
            en tus visitas previas a KASINO21 u otros sitios web en internet. Puedes obtener más información sobre
            cómo Google utiliza los datos de cookies cuando usas los sitios o aplicaciones de sus socios:
          </p>
          <div className="mt-4 space-y-3">
            <ExternalLinkRow
              title="Privacidad y Términos de Google"
              url="https://policies.google.com/privacy"
              desc="Política de privacidad completa de Google que explica todas sus prácticas de datos"
            />
            <ExternalLinkRow
              title="Cómo usa Google las cookies en publicidad"
              url="https://policies.google.com/technologies/ads"
              desc="Explicación detallada de las cookies publicitarias utilizadas por Google AdSense"
            />
            <ExternalLinkRow
              title="Tipos de cookies de Google"
              url="https://policies.google.com/technologies/cookies"
              desc="Desglose completo de todas las cookies que Google utiliza y sus propósitos"
            />
          </div>
        </CookieSection>

        <CookieSection icon="🔄" title="Cambios a Esta Política">
          <p>
            Podemos actualizar esta Política de Cookies para reflejar cambios en las cookies que utilizamos, o por
            razones operativas, legales o reglamentarias. Cuando realicemos cambios significativos, actualizaremos
            la fecha de "Última actualización" en la parte superior.
          </p>
          <p className="mt-3">
            Te recomendamos que revises esta página periódicamente para mantenerte informado sobre nuestro uso de cookies.
          </p>
        </CookieSection>

        <CookieSection icon="✉️" title="Contacto">
          <p>Si tienes alguna pregunta sobre nuestro uso de cookies, contáctanos:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🍪
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Consultas sobre Cookies</p>
              <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kansino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Respuesta en 30 días · Atención en español</p>
            </div>
          </div>
        </CookieSection>

      </main>

      {/* Footer */}
      <LegalFooter current="cookies" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function CookieSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

interface CookieRow {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
}

function CookieTable({
  category,
  color,
  required,
  description,
  cookies,
}: {
  category: string;
  color: 'emerald' | 'blue' | 'amber';
  required: boolean;
  description: string;
  cookies: CookieRow[];
}) {
  const colorMap = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
  };
  const textMap = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={`border rounded-2xl overflow-hidden ${colorMap[color]}`}>
      <div className={`px-5 py-4 border-b border-white/5 flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-black uppercase tracking-widest ${textMap[color]}`}>{category}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              required
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-white/10 text-gray-600 bg-white/5'
            }`}>
              {required ? 'Obligatorio' : 'Opcional'}
            </span>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-black/20">
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Nombre de la Cookie</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Proveedor</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Propósito</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Duración</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">{cookie.name}</td>
                <td className="px-4 py-3 text-gray-500">{cookie.provider}</td>
                <td className="px-4 py-3 text-gray-400">{cookie.purpose}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{cookie.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ControlCard({ icon, title, description, links }: {
  icon: string;
  title: string;
  description: string;
  links: { label: string; url: string }[];
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <div className="space-y-2">
        {links.map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-casino-gold hover:text-white transition-colors"
          >
            <span className="text-[8px]">▶</span>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function ExternalLinkRow({ title, url, desc }: { title: string; url: string; desc: string }) {
  return (
    <div className="flex items-start justify-between bg-white/[0.03] border border-white/5 rounded-xl p-4 gap-4">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-casino-gold hover:underline font-mono shrink-0"
      >
        Visitar →
      </a>
    </div>
  );
}

function LegalFooter({ current }: { current: 'privacy' | 'terms' | 'cookies' }) {
  const links = [
    { href: '/privacy', label: 'Política de Privacidad' },
    { href: '/terms', label: 'Términos de Servicio' },
    { href: '/cookies', label: 'Política de Cookies' },
  ];

  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`text-xs uppercase tracking-widest font-bold transition-colors ${
                current === link.href.slice(1)
                  ? 'text-casino-gold'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/"
          className="text-xs bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/20 px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all"
        >
          ← Volver al Juego
        </a>
      </div>
    </footer>
  );
}
