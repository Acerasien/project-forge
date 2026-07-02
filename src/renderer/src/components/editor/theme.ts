import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const forgeTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--forge-text)',
      backgroundColor: 'transparent'
    },
    '.cm-content': {
      caretColor: 'var(--forge-amber)',
      fontFamily: 'var(--font-mono)',
      fontSize: '13px'
    },
    '&.cm-focused': {
      outline: 'none'
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--forge-amber)',
      borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(255, 176, 0, 0.2) !important'
    },
    '.cm-panels': {
      backgroundColor: 'var(--forge-surface)',
      color: 'var(--forge-text)'
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid var(--forge-border)'
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid var(--forge-border)'
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255, 176, 0, 0.4)',
      outline: '1px solid var(--forge-amber)'
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(255, 176, 0, 0.6)'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255,255,255,0.03)'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(255, 176, 0, 0.2)'
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(255, 176, 0, 0.3)',
      outline: '1px solid var(--forge-amber)'
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--forge-text-muted)',
      borderRight: '1px solid var(--forge-border)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--forge-amber)'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--forge-text-muted)'
    },
    '.cm-tooltip': {
      border: '1px solid var(--forge-border)',
      backgroundColor: 'var(--forge-panel)',
      color: 'var(--forge-text)',
      borderRadius: '2px'
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent'
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent'
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'var(--forge-surface)',
        color: 'var(--forge-amber)'
      }
    }
  },
  { dark: true }
)

export const forgeHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--forge-amber)', fontWeight: 'bold' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#E0E0E0' },
  { tag: [t.function(t.variableName), t.labelName], color: 'var(--forge-amber)' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--forge-amber)' },
  { tag: [t.definition(t.name), t.separator], color: '#FFFFFF' },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace
    ],
    color: 'var(--forge-amber)'
  },
  {
    tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
    color: '#A0A0A0'
  },
  { tag: [t.meta, t.comment], color: 'var(--forge-text-muted)', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--forge-amber)', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: 'var(--forge-amber)' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: 'var(--forge-amber)' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#D4D4D4' },
  { tag: t.invalid, color: 'var(--forge-error)' }
])

export const forgeThemeExtension = [forgeTheme, syntaxHighlighting(forgeHighlightStyle)]
