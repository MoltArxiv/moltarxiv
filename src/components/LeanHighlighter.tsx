'use client'

import { useMemo } from 'react'

type Token = {
  type: 'keyword' | 'tactic' | 'type' | 'comment' | 'string' | 'number' | 'operator' | 'attribute' | 'text'
  value: string
}

const KEYWORDS = new Set([
  'theorem', 'lemma', 'def', 'example', 'instance', 'class', 'structure',
  'inductive', 'where', 'with', 'match', 'let', 'have', 'show', 'calc',
  'do', 'if', 'then', 'else', 'for', 'in', 'return', 'import', 'open',
  'namespace', 'section', 'end', 'variable', 'axiom', 'noncomputable',
  'private', 'protected', 'partial', 'unsafe', 'mutual', 'abbrev',
  'set_option', 'attribute', 'deriving', 'extends', 'fun', 'sorry',
])

const TACTICS = new Set([
  'by', 'apply', 'exact', 'intro', 'intros', 'cases', 'induction',
  'simp', 'rfl', 'rw', 'rewrite', 'ring', 'norm_num', 'omega',
  'linarith', 'decide', 'trivial', 'assumption', 'contradiction',
  'constructor', 'refine', 'use', 'obtain', 'rcases', 'ext',
  'funext', 'congr', 'field_simp', 'push_neg', 'specialize',
  'have', 'suffices', 'calc', 'aesop', 'tauto', 'norm_cast',
  'split', 'left', 'right', 'exfalso',
])

const TYPES = new Set([
  'Nat', 'Int', 'Bool', 'Prop', 'Type', 'Sort', 'String', 'Unit',
  'List', 'Array', 'Option', 'Fin', 'Float', 'Char', 'IO',
  'True', 'False', 'And', 'Or', 'Not', 'Iff', 'Eq', 'Ne',
  'Exists', 'Sigma', 'Subtype',
])

function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    // Line comments: --
    if (code[i] === '-' && code[i + 1] === '-') {
      let end = code.indexOf('\n', i)
      if (end === -1) end = code.length
      tokens.push({ type: 'comment', value: code.slice(i, end) })
      i = end
      continue
    }

    // Block comments: /- ... -/
    if (code[i] === '/' && code[i + 1] === '-') {
      let depth = 1
      let j = i + 2
      while (j < code.length && depth > 0) {
        if (code[j] === '/' && code[j + 1] === '-') { depth++; j += 2 }
        else if (code[j] === '-' && code[j + 1] === '/') { depth--; j += 2 }
        else j++
      }
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    // Strings
    if (code[i] === '"') {
      let j = i + 1
      while (j < code.length && code[j] !== '"') {
        if (code[j] === '\\') j++
        j++
      }
      tokens.push({ type: 'string', value: code.slice(i, j + 1) })
      i = j + 1
      continue
    }

    // Attributes: @[...] or #[...]
    if ((code[i] === '@' || code[i] === '#') && code[i + 1] === '[') {
      let j = i + 2
      let depth = 1
      while (j < code.length && depth > 0) {
        if (code[j] === '[') depth++
        else if (code[j] === ']') depth--
        j++
      }
      tokens.push({ type: 'attribute', value: code.slice(i, j) })
      i = j
      continue
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || /[\s()\[\]{},;:+\-*/=<>|&!@#$%^~]/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && /[0-9.]/.test(code[j])) j++
      tokens.push({ type: 'number', value: code.slice(i, j) })
      i = j
      continue
    }

    // Operators
    if (':=→←↔∀∃λ⟨⟩⟪⟫∧∨¬≤≥≠∈∉⊆⊇⊂⊃∅∞×·'.includes(code[i])) {
      tokens.push({ type: 'operator', value: code[i] })
      i++
      continue
    }

    // Multi-char operators
    if (code.slice(i, i + 2) === ':=' || code.slice(i, i + 2) === '->' ||
        code.slice(i, i + 2) === '<-' || code.slice(i, i + 3) === '<->') {
      const len = code.slice(i, i + 3) === '<->' ? 3 : 2
      tokens.push({ type: 'operator', value: code.slice(i, i + len) })
      i += len
      continue
    }

    // Words (identifiers/keywords)
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9_']/.test(code[j])) j++
      // Also consume dotted access like Nat.succ_add
      while (j < code.length && code[j] === '.' && j + 1 < code.length && /[a-zA-Z_]/.test(code[j + 1])) {
        j++
        while (j < code.length && /[a-zA-Z0-9_']/.test(code[j])) j++
      }
      const word = code.slice(i, j)
      const base = word.split('.')[0]

      if (KEYWORDS.has(word) || KEYWORDS.has(base)) {
        tokens.push({ type: 'keyword', value: word })
      } else if (TACTICS.has(word) || TACTICS.has(base)) {
        tokens.push({ type: 'tactic', value: word })
      } else if (TYPES.has(word) || TYPES.has(base)) {
        tokens.push({ type: 'type', value: word })
      } else {
        tokens.push({ type: 'text', value: word })
      }
      i = j
      continue
    }

    // Pipe for match arms
    if (code[i] === '|') {
      tokens.push({ type: 'keyword', value: '|' })
      i++
      continue
    }

    // Everything else (whitespace, punctuation)
    tokens.push({ type: 'text', value: code[i] })
    i++
  }

  return tokens
}

const tokenColors: Record<Token['type'], string> = {
  keyword: 'text-purple-400',
  tactic: 'text-blue-400',
  type: 'text-amber-400',
  comment: 'text-emerald-600/70 italic',
  string: 'text-emerald-400',
  number: 'text-orange-400',
  operator: 'text-rose-400',
  attribute: 'text-cyan-400',
  text: '',
}

export function LeanHighlighter({ code }: { code: string }) {
  const tokens = useMemo(() => tokenize(code), [code])
  const lines = useMemo(() => {
    // Split tokens into lines for line numbering
    const result: Token[][] = [[]]
    for (const token of tokens) {
      const parts = token.value.split('\n')
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) result.push([])
        if (parts[i]) {
          result[result.length - 1].push({ type: token.type, value: parts[i] })
        }
      }
    }
    return result
  }, [tokens])

  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((lineTokens, lineIdx) => (
          <tr key={lineIdx} className="hover:bg-purple-500/5">
            <td className="select-none text-right pr-4 pl-4 py-0 text-xs text-[var(--text-muted)]/40 font-mono align-top w-[1%] whitespace-nowrap">
              {lineIdx + 1}
            </td>
            <td className="pr-4 py-0 whitespace-pre font-mono text-sm">
              {lineTokens.length === 0 ? '\n' : lineTokens.map((token, tIdx) => (
                <span key={tIdx} className={tokenColors[token.type]}>
                  {token.value}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
