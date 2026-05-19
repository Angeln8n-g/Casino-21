import React, { useLayoutEffect } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO, injectJSONLD, removeJSONLD } from '../utils/seo';
import { getBlogPostBySlug, getRelatedPosts } from '../data/blog-posts';

export function BlogPost() {
  const slug = window.location.pathname.replace('/blog/', '');
  const post = getBlogPostBySlug(slug);
  const related = getRelatedPosts(slug, 3);

  useLayoutEffect(() => {
    if (post) {
      updateSEO({
        title: `${post.title} | Kasino21`,
        description: post.excerpt,
        canonical: `https://kasino21.com/blog/${post.slug}`,
      });

      // BlogPosting structured data for article rich results
      injectJSONLD('blog-post', {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': post.excerpt,
        'datePublished': post.date,
        'dateModified': post.date,
        'url': `https://kasino21.com/blog/${post.slug}`,
        'inLanguage': 'es',
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': `https://kasino21.com/blog/${post.slug}`,
        },
        'author': {
          '@type': 'Organization',
          'name': 'KASINO21',
          'url': 'https://kasino21.com',
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'KASINO21',
          'url': 'https://kasino21.com',
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://kasino21.com/icons/icon-512x512.png',
          },
        },
        'image': 'https://kasino21.com/og-image.png',
        'articleSection': post.category,
        'wordCount': post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
        'timeRequired': `PT${post.readTime}M`,
      });
    }
    return () => {
      resetSEO();
      removeJSONLD('blog-post');
    };
  }, [post]);

  if (!post) {
    return <BlogNotFound />;
  }

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
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors">Blog</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
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
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-lg">
              {post.category}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(post.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-[10px] text-gray-600">· {post.readTime} min lectura</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-tight">
            {post.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Article */}
          <article
            className="lg:col-span-2 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* CTA Card */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-500/20 rounded-2xl p-6 text-center mb-8">
              <p className="text-lg font-black text-casino-gold mb-2">¿Listo para jugar?</p>
              <p className="text-xs text-gray-400 mb-4">Pon en práctica lo que aprendiste</p>
              <a
                href="/"
                className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform"
              >
                JUGAR AHORA
              </a>
            </div>

            {/* Related Posts */}
            {related.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Artículos relacionados</h3>
                <div className="space-y-3">
                  {related.map(r => (
                    <a
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="block bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group"
                    >
                      <p className="text-xs font-bold text-white group-hover:text-casino-gold transition-colors leading-snug">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">{r.readTime} min lectura</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Footer */}
      <BlogPostFooter />
    </div>
  );
}

function BlogNotFound() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Artículo no encontrado | Kasino21',
      description: 'El artículo que buscas no existe o fue movido.',
      noindex: true,
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-6xl font-black text-casino-gold mb-4">404</p>
        <h1 className="text-2xl font-black text-white mb-4">Artículo no encontrado</h1>
        <p className="text-gray-400 mb-8">El artículo que buscas no existe o fue movido.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/blog" className="text-sm text-casino-gold hover:underline font-bold">
            ← Volver al Blog
          </a>
          <a
            href="/"
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform"
          >
            JUGAR AHORA
          </a>
        </div>
      </div>
    </div>
  );
}

function BlogPostFooter() {
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
