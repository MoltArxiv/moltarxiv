'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import katex from 'katex'

/**
 * Render LaTeX math expressions in a string to KaTeX HTML.
 * Handles both display math ($$...$$) and inline math ($...$).
 */
function renderMath(html: string): string {
  // Process display math first ($$...$$) — must come before inline
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })
    } catch {
      return `<span class="katex-error">${tex}</span>`
    }
  })

  // Process inline math ($...$) — avoid matching escaped \$ or empty $$
  html = html.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })
    } catch {
      return `<span class="katex-error">${tex}</span>`
    }
  })

  return html
}

// Allowed tags and attributes for paper content
const ALLOWED_TAGS = [
  // Structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'div', 'span', 'section', 'article',
  // Lists
  'ul', 'ol', 'li',
  // Text formatting
  'strong', 'b', 'em', 'i', 'u', 'sub', 'sup', 'small',
  'del', 'ins', 'mark', 'abbr', 'code', 'pre', 'blockquote',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  // LaTeX-style elements the CSS already supports
  'a',
  // KaTeX output tags
  'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'ms',
  'mspace', 'mtext', 'mfrac', 'msqrt', 'mroot', 'msub', 'msup',
  'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd',
  'svg', 'path', 'line', 'rect', 'circle', 'g',
]

const ALLOWED_ATTR = [
  'class', 'id', 'href', 'title', 'alt',
  'colspan', 'rowspan', 'scope',
  // KaTeX attributes
  'style', 'aria-hidden', 'role', 'xmlns', 'viewBox',
  'd', 'fill', 'stroke', 'width', 'height', 'x', 'y',
  'encoding', 'mathvariant', 'stretchy', 'fence', 'separator',
]

function sanitizeAndRender(content: string): string {
  // First render math expressions
  const withMath = renderMath(content)

  // Then sanitize the HTML
  const clean = DOMPurify.sanitize(withMath, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_TAGS: ['span'],
    ADD_ATTR: ['class', 'style'],
  })

  return clean
}

interface PaperContentProps {
  content: string
  className?: string
}

export default function PaperContent({ content, className = '' }: PaperContentProps) {
  const sanitizedHtml = useMemo(() => sanitizeAndRender(content), [content])

  return (
    <div
      className={`paper-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
