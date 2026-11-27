import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowRight, Building2, FlaskConical, Layers, MapPin, Menu, Search, X } from 'lucide-react';
import type { SearchIndexItem } from '@/data';
import { ProductIcon } from './ProductIcon';

interface SiteHeaderProps {
  variant?: 'hero' | 'solid';
  searchItems: SearchIndexItem[];
  currentPath?: string;
}

const SPRING_UI = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 36,
  mass: 0.85,
};

const KIND_LABEL: Record<SearchIndexItem['kind'], string> = {
  cadena: 'Cadena',
  proceso: 'Proceso',
  empresa: 'Empresa',
  planta: 'Planta',
  provincia: 'Provincia',
  departamento: 'Departamento',
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const QUICK_LINKS = [
  { label: 'Aluminio', href: '/productos/aluminio' },
  { label: 'Litio', href: '/productos/litio' },
  { label: 'Urea', href: '/productos/urea' },
  { label: 'Soja', href: '/productos/soja' },
];

const ALL_CHAINS = [
  { label: 'Aluminio primario', href: '/productos/aluminio' },
  { label: 'Litio y carbonato', href: '/productos/litio' },
  { label: 'Urea y fertilizantes', href: '/productos/urea' },
  { label: 'Algodón y celulosa', href: '/productos/algodon' },
  { label: 'Soja y derivados', href: '/productos/soja' },
  { label: 'Petroquímica', href: '/productos/petroquimica' },
  { label: 'Biodiésel FAME', href: '/productos/biodiesel' },
];

export function SiteHeader({
  variant = 'solid',
  searchItems,
  currentPath = '/',
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(variant === 'solid');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchOpenRef = useRef(searchOpen);
  searchOpenRef.current = searchOpen;

  const isHeroTop = variant === 'hero' && !scrolled && !mobileMenuOpen;

  useEffect(() => {
    if (variant !== 'hero') {
      setScrolled(true);
      return;
    }
    const onScroll = () => {
      const next = window.scrollY > 44;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [variant]);

  // Atajos globales Ctrl+K / Cmd+K / "/" y Escape (listener único sin re-suscripciones)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        setMobileMenuOpen(false);
      } else if (
        e.key === '/' &&
        !searchOpenRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setActiveIdx(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [searchOpen]);

  const indexedSearchItems = useMemo(
    () =>
      searchItems.map((item) => ({
        item,
        haystack: normalizeText(`${item.title} ${item.subtitle} ${item.keywords}`),
      })),
    [searchItems]
  );

  const defaultSuggestions = useMemo(() => {
    const cadenas = searchItems.filter((i) => i.kind === 'cadena');
    const provs = searchItems.filter(
      (i) => i.kind === 'provincia' && ['26', '06', '82', '38'].includes(i.provinciaId ?? '')
    );
    return [...cadenas, ...provs].slice(0, 10);
  }, [searchItems]);

  const filteredItems = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return defaultSuggestions;
    const matches: SearchIndexItem[] = [];
    for (const entry of indexedSearchItems) {
      if (entry.haystack.includes(q)) {
        matches.push(entry.item);
        if (matches.length >= 12) break;
      }
    }
    return matches;
  }, [query, defaultSuggestions, indexedSearchItems]);

  const navigateToItem = (item: SearchIndexItem) => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (
      item.kind === 'departamento' &&
      item.departamentoId &&
      item.provinciaId &&
      window.location.pathname === '/'
    ) {
      window.dispatchEvent(
        new CustomEvent('atlas:select-departamento', {
          detail: { provinciaId: item.provinciaId, departamentoId: item.departamentoId },
        })
      );
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (item.kind === 'provincia' && item.provinciaId && window.location.pathname === '/') {
      window.dispatchEvent(
        new CustomEvent('atlas:select-provincia', { detail: { provinciaId: item.provinciaId } })
      );
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = item.href;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (filteredItems.length > 0 ? (i + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) =>
        filteredItems.length > 0 ? (i - 1 + filteredItems.length) % filteredItems.length : 0
      );
    } else if (e.key === 'Enter' && filteredItems[activeIdx]) {
      e.preventDefault();
      navigateToItem(filteredItems[activeIdx]);
    }
  };

  const renderKindIcon = (item: SearchIndexItem) => {
    if (item.iconId) {
      return <ProductIcon iconId={item.iconId} size={15} />;
    }
    switch (item.kind) {
      case 'provincia':
      case 'departamento':
        return <MapPin className="h-4 w-4" />;
      case 'empresa':
      case 'planta':
        return <Building2 className="h-4 w-4" />;
      case 'proceso':
        return <FlaskConical className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const positionClass = variant === 'hero' ? 'fixed inset-x-0 top-0' : 'sticky top-0';

  return (
    <MotionConfig reducedMotion="user">
      <header
        className={`${positionClass} z-40 transition-colors duration-200 ${isHeroTop
          ? 'border-b border-transparent bg-transparent text-white'
          : 'border-b border-rule/90 bg-stone-surface/95 text-ink backdrop-blur-md shadow-[0_1px_12px_rgba(17,18,20,0.06)]'
          }`}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8 lg:px-10">
          {/* Identidad tipográfica sobria sin elementos decorativos */}
          <a
            href="/"
            className="flex min-w-0 shrink-0 items-center font-display text-[16px] font-medium tracking-[-0.022em] sm:text-[18px]"
          >
            <span className="truncate">Atlas Químico Argentino</span>
          </a>

          {/* Navegación desktop en una sola línea compacta */}
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-5 text-[14px] md:flex"
          >
            <a
              href={currentPath === '/' ? '#mapa' : '/#mapa'}
              className={`transition-colors duration-150 ${isHeroTop ? 'text-white/85 hover:text-white' : 'text-ink-muted hover:text-ink'
                }`}
            >
              Mapa territorial
            </a>
            <a
              href={currentPath === '/' ? '#procesos' : '/#procesos'}
              className={`transition-colors duration-150 ${isHeroTop ? 'text-white/85 hover:text-white' : 'text-ink-muted hover:text-ink'
                }`}
            >
              Procesos
            </a>
            <a
              href="/comparar"
              className={`transition-colors duration-150 ${currentPath === '/comparar'
                ? isHeroTop
                  ? 'font-medium text-white'
                  : 'font-medium text-cobalt'
                : isHeroTop
                  ? 'text-white/85 hover:text-white'
                  : 'text-ink-muted hover:text-ink'
                }`}
            >
              Comparar
            </a>
            <a
              href="/empresas"
              className={`transition-colors duration-150 ${currentPath === '/empresas'
                ? isHeroTop
                  ? 'font-medium text-white'
                  : 'font-medium text-cobalt'
                : isHeroTop
                  ? 'text-white/85 hover:text-white'
                  : 'text-ink-muted hover:text-ink'
                }`}
            >
              Empresas
            </a>
            <a
              href="/cobertura"
              className={`transition-colors duration-150 ${currentPath === '/cobertura'
                ? isHeroTop
                  ? 'font-medium text-white'
                  : 'font-medium text-cobalt'
                : isHeroTop
                  ? 'text-white/85 hover:text-white'
                  : 'text-ink-muted hover:text-ink'
                }`}
            >
              Cobertura
            </a>

            <span
              className={`hidden h-4 w-px lg:inline-block ${isHeroTop ? 'bg-white/25' : 'bg-rule'
                }`}
              aria-hidden="true"
            />

            <div className="hidden items-center gap-4 lg:flex">
              {QUICK_LINKS.map((link) => {
                const isCurrent = currentPath === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`transition-colors duration-150 ${isCurrent
                      ? isHeroTop
                        ? 'font-medium text-white'
                        : 'font-medium text-cobalt'
                      : isHeroTop
                        ? 'text-white/80 hover:text-white'
                        : 'text-ink-muted hover:text-ink'
                      }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            {/* Botón Buscar: 1 px menor que los enlaces de navegación (13px vs 14px) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar cadenas, provincias o plantas (Ctrl+K)"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${isHeroTop
                ? 'bg-white text-ink hover:bg-stone-bg'
                : 'bg-ink text-white hover:bg-cobalt'
                }`}
            >
              <span>Buscar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </nav>

          {/* Controles mobile compactos de borde a borde */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              aria-label="Abrir buscador"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${isHeroTop
                ? 'bg-white text-ink'
                : 'bg-ink text-white'
                }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Buscar</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center transition-colors duration-150 ${isHeroTop
                ? 'text-white hover:bg-white/10'
                : 'text-ink hover:bg-stone-subtle'
                }`}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menú desplegable mobile con física spring */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-rule bg-stone-surface text-ink md:hidden"
            >
              <div className="space-y-4 px-5 py-5">
                <div className="flex flex-col gap-2 border-b border-rule pb-4 text-[15px] font-medium">
                  <a
                    href={currentPath === '/' ? '#mapa' : '/#mapa'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1 text-ink hover:text-cobalt"
                  >
                    Mapa territorial
                  </a>
                  <a
                    href={currentPath === '/' ? '#procesos' : '/#procesos'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1 text-ink hover:text-cobalt"
                  >
                    Procesos químicos
                  </a>
                  <a
                    href="/comparar"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-1 ${currentPath === '/comparar' ? 'font-medium text-cobalt' : 'text-ink hover:text-cobalt'
                      }`}
                  >
                    Cadena de valor y comparador
                  </a>
                  <a
                    href="/empresas"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-1 ${currentPath === '/empresas' ? 'font-medium text-cobalt' : 'text-ink hover:text-cobalt'
                      }`}
                  >
                    Empresas y plantas
                  </a>
                  <a
                    href="/cobertura"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-1 ${currentPath === '/cobertura' ? 'font-medium text-cobalt' : 'text-ink hover:text-cobalt'
                      }`}
                  >
                    Cobertura de datos
                  </a>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-ink-muted">
                    Las 7 cadenas verificadas
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[14px]">
                    {ALL_CHAINS.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`border px-3 py-2 font-medium transition-colors duration-150 ${currentPath === item.href
                          ? 'border-ink bg-ink text-white'
                          : 'border-rule bg-stone-bg text-ink hover:border-ink'
                          }`}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Modal de búsqueda instantánea (Ctrl+K / click) */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setSearchOpen(false)}
            className="fixed inset-0 z-50 flex items-start justify-center bg-[#0D1117]/65 px-4 pt-16 backdrop-blur-xs sm:pt-24"
            role="dialog"
            aria-modal="true"
            aria-label="Buscador del Atlas Químico Argentino"
          >
            <motion.div
              key="search-dialog"
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={SPRING_UI}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden border border-rule-strong/20 bg-stone-surface text-ink shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-rule px-4 py-3.5">
                <Search className="h-4 w-4 shrink-0 text-ink-muted" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIdx(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Buscar cadena, empresa, provincia, departamento o planta (ej. Aluar, Litio, 9 de Julio)..."
                  className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Cerrar buscador"
                  className="cursor-pointer p-1 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto divide-y divide-rule">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => {
                    const isSelected = idx === activeIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => navigateToItem(item)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-100 ${isSelected ? 'bg-ink text-white' : 'bg-stone-surface text-ink hover:bg-stone-bg'
                          }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center ${isSelected ? 'bg-white/15 text-white' : 'bg-stone-subtle text-ink'
                              }`}
                          >
                            {renderKindIcon(item)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium">{item.title}</p>
                            <p
                              className={`truncate text-[13px] ${isSelected ? 'text-white/75' : 'text-ink-muted'
                                }`}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[13px] font-medium ${isSelected ? 'text-white/85' : 'text-ink-muted'
                            }`}
                        >
                          {KIND_LABEL[item.kind]}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-4 py-8 text-center text-[14px] text-ink-muted">
                    No encontramos coincidencias para "{query}". Probá con Aluminio, Litio, Urea,
                    Soja, Chubut o Bahía Blanca.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-rule bg-stone-bg px-4 py-2.5 text-[13px] text-ink-muted tabular-nums">
                <span>Usá ↑ ↓ para moverte y Enter para abrir</span>
                <span>{searchItems.length} registros indexados</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
