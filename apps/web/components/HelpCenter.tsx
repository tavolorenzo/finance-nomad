'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, X, BookOpen, HelpCircle, Sparkles, ChevronDown, ChevronUp,
  ExternalLink, Coins, CreditCard, Users, Wallet, BarChart3, Tags,
  WifiOff, Sliders, ArrowRight, Lightbulb, CheckCircle2,
  type LucideIcon
} from 'lucide-react'
import {
  WIKI_ARTICLES,
  FAQ_ITEMS,
  QUICK_GUIDES,
  HELP_CATEGORIES,
  searchHelp,
  type WikiArticle,
  type FaqItem,
  type QuickGuide
} from '@/lib/help-data'
import { TourTriggerButton } from './TourTriggerButton'

interface HelpCenterProps {
  currentCurrency?: string
}

type TabKey = 'wiki' | 'faq' | 'guides'

const ICON_MAP: Record<string, LucideIcon> = {
  Coins,
  CreditCard,
  Users,
  Wallet,
  BarChart3,
  Tags,
  WifiOff,
  Sliders,
  Sparkles,
  BookOpen
}

export function HelpCenter({ currentCurrency = 'EUR' }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('wiki')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Estado de expansión de artículos y FAQs
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({
    'wiki-fx': true // Primer artículo expandido por defecto
  })
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({})

  // Búsqueda y filtrado
  const searchResults = useMemo(() => {
    return searchHelp(searchQuery, selectedCategory)
  }, [searchQuery, selectedCategory])

  const toggleArticle = (id: string) => {
    setExpandedArticles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const expandAllFaqs = () => {
    const allExpanded: Record<string, boolean> = {}
    searchResults.faqs.forEach((faq) => {
      allExpanded[faq.id] = true
    })
    setExpandedFaqs(allExpanded)
  }

  const collapseAllFaqs = () => {
    setExpandedFaqs({})
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
  }

  const navigateToWikiSlug = (slug?: string) => {
    if (!slug) return
    setActiveTab('wiki')
    const article = WIKI_ARTICLES.find((a) => a.slug === slug)
    if (article) {
      setExpandedArticles((prev) => ({ ...prev, [article.id]: true }))
      // Scroll hacia el artículo
      setTimeout(() => {
        const el = document.getElementById(article.id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header con Buscador Hero ── */}
      <div className="bg-surface-1 border border-border rounded-card p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent mb-2">
              <Sparkles size={13} />
              Base de Conocimiento & FAQ
            </div>
            <h1 className="font-display text-xl md:text-2xl font-medium text-text-primary">
              Centro de Ayuda & Wiki
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Guías completas, preguntas frecuentes y documentación de todas las funciones de Finance Nomad.
            </p>
          </div>

          <div className="shrink-0">
            <TourTriggerButton currentCurrency={currentCurrency} />
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <div className="relative mt-2">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscá por palabra clave (ej. cuotas, cotización, whatsapp, offline, tarjetas)..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-2 border border-border rounded-control focus:border-accent text-text-primary placeholder:text-text-muted"
            aria-label="Buscar en la base de ayuda"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-full transition"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtros de Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-xs">
          {HELP_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition ${
                  isSelected
                    ? 'bg-accent text-[color:var(--on-accent)] shadow-sm'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Métricas de Coincidencia */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border mt-3">
            <span>
              {searchResults.totalMatches === 0
                ? 'No se encontraron resultados'
                : `Encontradas ${searchResults.totalMatches} coincidencias (${searchResults.articles.length} en Wiki, ${searchResults.faqs.length} en FAQs, ${searchResults.guides.length} en Guías)`}
            </span>
            <button
              onClick={handleClearFilters}
              className="text-accent hover:underline font-medium"
            >
              Ver todo el contenido
            </button>
          </div>
        )}
      </div>

      {/* ── Selector de Pestañas Principales ── */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('wiki')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'wiki'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <BookOpen size={16} />
          Wiki & Guías
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-text-secondary font-mono">
            {searchResults.articles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'faq'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <HelpCircle size={16} />
          Preguntas Frecuentes
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-text-secondary font-mono">
            {searchResults.faqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('guides')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'guides'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sparkles size={16} />
          Recetas Rápidas
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-text-secondary font-mono">
            {searchResults.guides.length}
          </span>
        </button>
      </div>

      {/* ── Estado Vacío si no hay resultados ── */}
      {searchResults.totalMatches === 0 && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center">
            <Search size={24} />
          </div>
          <h2 className="font-display text-base font-medium text-text-primary">
            No encontramos resultados para tu búsqueda
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Probá con palabras más generales o reiniciá los filtros para ver toda la documentación.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-accent text-[color:var(--on-accent)] rounded-control text-sm font-medium inline-flex items-center gap-2"
          >
            Limpiar filtros y ver todo
          </button>
        </div>
      )}

      {/* ── TAB 1: Wiki & Guías de Funcionalidades ── */}
      {activeTab === 'wiki' && searchResults.articles.length > 0 && (
        <div className="space-y-4">
          {searchResults.articles.map((article) => {
            const isExpanded = !!expandedArticles[article.id]
            const ArticleIcon = ICON_MAP[article.iconName] || BookOpen

            return (
              <article
                key={article.id}
                id={article.id}
                className="bg-surface-1 border border-border rounded-card transition overflow-hidden shadow-sm"
              >
                {/* Cabecera del Artículo */}
                <div
                  onClick={() => toggleArticle(article.id)}
                  className="p-4 md:p-5 cursor-pointer select-none hover:bg-surface-2/40 transition flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-control bg-accent/15 text-accent shrink-0 flex items-center justify-center mt-0.5">
                      <ArticleIcon size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-border">
                          {article.categoryLabel}
                        </span>
                        {article.badge && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-income/15 text-income font-medium">
                            {article.badge}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-base md:text-lg font-medium text-text-primary">
                        {article.title}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        {article.summary}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-2 text-text-secondary hover:text-text-primary rounded-control shrink-0"
                    aria-label={isExpanded ? 'Colapsar artículo' : 'Expandir artículo'}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {/* Contenido Expandible */}
                {isExpanded && (
                  <div className="px-4 pb-5 md:px-5 space-y-4 border-t border-border pt-4 bg-surface-0/30">
                    <div className="grid gap-4 md:grid-cols-2">
                      {article.sections.map((sec, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-1 border border-border rounded-control p-3.5 space-y-2"
                        >
                          <h3 className="font-display text-sm font-medium text-text-primary flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                            {sec.title}
                          </h3>
                          <p className="text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                            {sec.content}
                          </p>
                          {sec.tip && (
                            <div className="flex items-start gap-2 p-2.5 rounded-control bg-accent/10 border border-accent/20 text-xs text-text-primary mt-2">
                              <Lightbulb size={15} className="text-accent shrink-0 mt-0.5" />
                              <span>{sec.tip}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer con Enlace Rápido de Acción */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                      {article.targetRoute ? (
                        <Link
                          href={article.targetRoute}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium bg-surface-2 border border-border text-text-primary hover:border-accent hover:text-accent transition"
                        >
                          <ExternalLink size={14} />
                          {article.targetLabel || 'Abrir en la aplicación'}
                        </Link>
                      ) : (
                        <div />
                      )}

                      {article.relatedFaqIds && article.relatedFaqIds.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>Preguntas relacionadas:</span>
                          <button
                            onClick={() => {
                              setActiveTab('faq')
                              setSelectedCategory(article.category)
                            }}
                            className="text-accent hover:underline font-medium"
                          >
                            Ver {article.relatedFaqIds.length} FAQs asociadas
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ── TAB 2: Preguntas Frecuentes (FAQ) ── */}
      {activeTab === 'faq' && searchResults.faqs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-text-muted">
              Mostrando {searchResults.faqs.length} preguntas frecuentes
            </p>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={expandAllFaqs}
                className="text-text-secondary hover:text-text-primary underline"
              >
                Expandir todas
              </button>
              <span>·</span>
              <button
                onClick={collapseAllFaqs}
                className="text-text-secondary hover:text-text-primary underline"
              >
                Colapsar todas
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {searchResults.faqs.map((faq) => {
              const isExpanded = !!expandedFaqs[faq.id]

              return (
                <div
                  key={faq.id}
                  className="bg-surface-1 border border-border rounded-control transition overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-surface-2/40 transition select-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="space-y-1 pr-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border inline-block">
                        {faq.categoryLabel}
                      </span>
                      <p className="font-display text-sm md:text-base font-medium text-text-primary">
                        {faq.question}
                      </p>
                    </div>

                    <div className="p-1 text-text-secondary shrink-0 mt-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/70 space-y-3 bg-surface-0/30">
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          {faq.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-surface-2 text-text-muted text-[11px]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {faq.relatedWikiSlug && (
                          <button
                            onClick={() => navigateToWikiSlug(faq.relatedWikiSlug)}
                            className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                          >
                            <BookOpen size={13} />
                            Leer guía completa en la Wiki
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: Guías Rápidas / Recetas Paso a Paso ── */}
      {activeTab === 'guides' && searchResults.guides.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {searchResults.guides.map((guide) => {
            const GuideIcon = ICON_MAP[guide.iconName] || Sparkles

            return (
              <div
                key={guide.id}
                className="bg-surface-1 border border-border rounded-card p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-control bg-accent/15 text-accent flex items-center justify-center shrink-0">
                      <GuideIcon size={18} />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-medium text-text-primary">
                        {guide.title}
                      </h2>
                      <p className="text-xs text-text-secondary">
                        {guide.description}
                      </p>
                    </div>
                  </div>

                  {/* Pasos */}
                  <div className="space-y-2 pt-2">
                    {guide.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary">
                        <span className="w-5 h-5 rounded-full bg-surface-2 border border-border text-text-primary font-mono font-medium text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {guide.route && (
                  <div className="pt-3 border-t border-border">
                    <Link
                      href={guide.route}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      {guide.routeLabel || 'Ir al formulario'}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Banner de Cierre: Asistencia y Tour ── */}
      <div className="bg-surface-1 border border-border rounded-card p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-income/15 text-income flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="font-display text-sm font-medium text-text-primary">
              ¿Tenés dudas o querés ver una demostración interactiva?
            </p>
            <p className="text-xs text-text-secondary">
              Podés recorrer el tour interactivo de bienvenida en 1 minuto cuando quieras.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <TourTriggerButton currentCurrency={currentCurrency} />
        </div>
      </div>
    </div>
  )
}
