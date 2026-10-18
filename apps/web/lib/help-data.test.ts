import { describe, it, expect } from 'vitest'
import {
  WIKI_ARTICLES,
  FAQ_ITEMS,
  QUICK_GUIDES,
  HELP_CATEGORIES,
  searchHelp
} from './help-data'

describe('Help Data & Search Engine', () => {
  it('contiene artículos wiki válidos con estructura completa', () => {
    expect(WIKI_ARTICLES.length).toBeGreaterThanOrEqual(8)

    const ids = new Set<string>()
    const slugs = new Set<string>()

    for (const article of WIKI_ARTICLES) {
      expect(article.id).toBeTruthy()
      expect(article.slug).toBeTruthy()
      expect(article.title).toBeTruthy()
      expect(article.summary).toBeTruthy()
      expect(article.sections.length).toBeGreaterThan(0)

      // Identificadores únicos
      expect(ids.has(article.id)).toBe(false)
      expect(slugs.has(article.slug)).toBe(false)
      ids.add(article.id)
      slugs.add(article.slug)
    }
  })

  it('contiene preguntas frecuentes (FAQs) con tags y respuestas', () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(15)

    const ids = new Set<string>()
    for (const faq of FAQ_ITEMS) {
      expect(faq.id).toBeTruthy()
      expect(faq.question).toBeTruthy()
      expect(faq.answer).toBeTruthy()
      expect(faq.tags.length).toBeGreaterThan(0)

      expect(ids.has(faq.id)).toBe(false)
      ids.add(faq.id)
    }
  })

  it('contiene guías rápidas con pasos definidos', () => {
    expect(QUICK_GUIDES.length).toBeGreaterThanOrEqual(4)
    for (const guide of QUICK_GUIDES) {
      expect(guide.id).toBeTruthy()
      expect(guide.title).toBeTruthy()
      expect(guide.steps.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('retorna todo el contenido cuando la búsqueda y filtro son vacíos o "all"', () => {
    const result = searchHelp('', 'all')
    expect(result.articles.length).toBe(WIKI_ARTICLES.length)
    expect(result.faqs.length).toBe(FAQ_ITEMS.length)
    expect(result.guides.length).toBe(QUICK_GUIDES.length)
    expect(result.totalMatches).toBe(
      WIKI_ARTICLES.length + FAQ_ITEMS.length + QUICK_GUIDES.length
    )
  })

  it('filtra por término de búsqueda en preguntas, tags o respuestas', () => {
    const result = searchHelp('whatsapp')
    expect(result.faqs.length).toBeGreaterThan(0)
    expect(result.articles.length).toBeGreaterThan(0)

    const hasWhatsappFaq = result.faqs.some((f) =>
      f.question.toLowerCase().includes('whatsapp') || f.tags.includes('whatsapp')
    )
    expect(hasWhatsappFaq).toBe(true)
  })

  it('filtra por categoría específica', () => {
    const resultCards = searchHelp('', 'cards')
    expect(resultCards.articles.every((a) => a.category === 'cards')).toBe(true)
    expect(resultCards.faqs.every((f) => f.category === 'cards')).toBe(true)
    expect(resultCards.articles.length).toBeGreaterThan(0)
  })

  it('combina búsqueda de texto y filtro de categoría', () => {
    const result = searchHelp('cuotas', 'cards')
    expect(result.articles.length).toBeGreaterThan(0)
    expect(result.faqs.length).toBeGreaterThan(0)
    expect(result.articles.every((a) => a.category === 'cards')).toBe(true)
  })

  it('retorna cero resultados cuando no hay coincidencias', () => {
    const result = searchHelp('término_totalmente_inexistente_xyz_123', 'all')
    expect(result.articles.length).toBe(0)
    expect(result.faqs.length).toBe(0)
    expect(result.guides.length).toBe(0)
    expect(result.totalMatches).toBe(0)
  })
})
