import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';
import { blogPosts, getBlogCategories, getPostsByCategory } from '../data/blog-posts';

const CATEGORIES = ['Todos', ...getBlogCategories()];

const DEFAULT_IMAGES: Record<string, string> = {
  'Guías': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
  'Estrategia': 'https://images.unsplash.com/photo-1603484477859-abe6a79798f07?auto=format&fit=crop&q=80&w=800',
  'Noticias': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
  'Mecánicas': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
  'Historia': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&q=80&w=800',
  'Consejos': 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Blog() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Blog | Kasino21 — Guías, Estrategias y Noticias',
      description: 'Lee guías, estrategias y noticias sobre Kasino21. Aprende a jugar mejor, descubre mecánicas del juego y mantente al día con las novedades.',
      canonical: 'https://kasino21.com/blog',
    });
    return () => resetSEO();
  }, []);

  const [activeCategory, setActiveCategory] = useState('Todos');

  const filteredArticles = activeCategory === 'Todos'
    ? blogPosts
    : getPostsByCategory(activeCategory);

  const categoryColors: Record<string, string> = {
    'Guías': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    'Estrategia': 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    'Noticias': 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
    'Mecánicas': 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400',
    'Historia': 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Nosotros</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/contact" className="text-gray-500 hover:text-casino-gold transition-colors">Contacto</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-amber-900/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-yellow-400" />
            Blog / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Blog de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Kasino21</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Guías, estrategias, noticias y todo lo que necesitas saber para dominar el juego de cartas 21.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-white/5 w-fit">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-casino-gold to-yellow-600 text-black'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(article => (
            <article
              key={article.slug}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-casino-gold/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)] hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-10" />
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                  style={{ backgroundImage: `url(${DEFAULT_IMAGES[article.category] || DEFAULT_IMAGES['Noticias']})` }}
                />
                {/* Category badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border bg-gradient-to-r ${categoryColors[article.category] || categoryColors['Noticias']}`}>
                    {article.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">
                  <time>{formatDate(article.date)}</time>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span>{article.readTime} min lectura</span>
                </div>

                <h2 className="text-lg font-display font-black text-white mb-2 group-hover:text-casino-gold transition-colors leading-tight line-clamp-2">
                  {article.title}
                </h2>

                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-4">
                  {article.excerpt}
                </p>

                <a
                  href={`/blog/${article.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-bold text-casino-gold uppercase tracking-wider group-hover:gap-3 transition-all"
                >
                  Leer más
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
              No hay artículos en esta categoría
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Vuelve pronto, estamos escribiendo nuevo contenido.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <BlogFooter />
    </div>
  );
}

function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
