/*! Adapted from Instatic, Copyright (c) 2026 David Babinec. MIT License: /licenses/instatic.txt */
// Adapted from CoreBunch/Instatic (MIT). Tree projection is supplied by our adapter.

type WireNodeKind =
  | 'box'
  | 'button'
  | 'check'
  | 'col'
  | 'dot'
  | 'field'
  | 'gap'
  | 'icon'
  | 'image'
  | 'lines'
  | 'pill'
  | 'radio'
  | 'row'
  | 'rule'

export interface WireNode {
  kind: WireNodeKind
  children?: WireNode[]
  count?: number
  width?: number
  height?: number
  flex?: number
  gap?: number
  pad?: number
  align?: 'start' | 'center' | 'end'
  avatar?: boolean
  bar?: boolean
  big?: boolean
  card?: boolean
  caret?: boolean
  center?: boolean
  code?: boolean
  dashed?: boolean
  link?: boolean
  logo?: boolean
  message?: boolean
  mono?: boolean
  play?: boolean
  solid?: boolean
  tip?: boolean
  vertical?: boolean
}

const row = (children: WireNode[], node: Partial<WireNode> = {}): WireNode => ({
  kind: 'row',
  children,
  ...node,
})

const col = (children: WireNode[], node: Partial<WireNode> = {}): WireNode => ({
  kind: 'col',
  children,
  ...node,
})

const box = (children: WireNode[] = [], node: Partial<WireNode> = {}): WireNode => ({
  kind: 'box',
  children,
  ...node,
})

const lines = (count = 3, node: Partial<WireNode> = {}): WireNode => ({
  kind: 'lines',
  count,
  ...node,
})

const field = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'field', ...node })
const image = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'image', ...node })
const button = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'button', ...node })
const icon = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'icon', ...node })
const dot = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'dot', ...node })
const check = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'check', ...node })
const radio = (node: Partial<WireNode> = {}): WireNode => ({ kind: 'radio', ...node })

export const MODULE_WIRES: Readonly<Record<string, WireNode>> = {
  'base.body': box([], { dashed: true, height: 52 }),
  'base.button': row([button({ width: 48 })], { center: true, align: 'center', height: 40 }),
  'base.checkbox': row([check(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
  'base.container': box([], { dashed: true, height: 52 }),
  'base.outlet': col([lines(1, { big: true, width: 60 }), lines(3), image({ height: 30 }), lines(2)], { gap: 6 }),
  'base.form': col([field(), field(), button({ width: 40 })], { gap: 6 }),
  'base.form-message': box([row([icon(), lines(1, { flex: 1 })], { gap: 6, align: 'center' })], { pad: 6, message: true }),
  'base.image': image({ height: 52 }),
  'base.input': col([lines(1, { width: 28 }), field()], { gap: 4 }),
  'base.label': lines(1, { width: 34 }),
  'base.link': lines(1, { width: 44, link: true }),
  'base.list': col([
    row([dot(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
    row([dot(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
    row([dot(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
  ], { gap: 6 }),
  'base.loop': col([
    row([image({ width: 18, height: 18 }), lines(2, { flex: 1 })], { gap: 6, align: 'center' }),
    row([image({ width: 18, height: 18 }), lines(2, { flex: 1 })], { gap: 6, align: 'center' }),
  ], { gap: 6 }),
  'base.option': col([lines(1, { width: 28 }), field({ caret: true })], { gap: 4 }),
  'base.option-group': col([lines(1, { width: 42 }), field({ caret: true })], { gap: 4 }),
  'base.radio': col([
    row([radio(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
    row([radio(), lines(1, { flex: 1 })], { gap: 6, align: 'center' }),
  ], { gap: 6 }),
  'base.select': col([lines(1, { width: 28 }), field({ caret: true })], { gap: 4 }),
  'base.slot-instance': box([], { dashed: true, height: 42 }),
  'base.slot-outlet': box([lines(1, { width: 52, center: true })], { dashed: true, height: 44, center: true }),
  'base.submit': row([button({ width: 52, solid: true })], { center: true, height: 40 }),
  'base.svg': box([icon({ big: true })], { dashed: true, height: 52, center: true }),
  'base.text': lines(3),
  'base.textarea': col([lines(1, { width: 28 }), field({ height: 28 })], { gap: 4 }),
  'base.video': image({ height: 52, play: true }),
  'base.visual-component-ref': box([icon({ big: true }), lines(1, { width: 54, center: true })], {
    dashed: true,
    height: 52,
    center: true,
    gap: 6,
  }),
}


export function moduleWireForId(moduleId: string, category?: string): WireNode {
  const known = MODULE_WIRES[moduleId]
  if (known) return known

  if (category === 'Forms') return MODULE_WIRES['base.form']
  if (category === 'Media') return MODULE_WIRES['base.image']
  if (category === 'Interactive') return MODULE_WIRES['base.button']
  if (category === 'Typography') return MODULE_WIRES['base.text']
  if (category === 'CMS') return MODULE_WIRES['base.outlet']
  return MODULE_WIRES['base.container']
}

