/** Browser half: independent native UML Studio plus OPTIONAL Better Sidebar adapter. */
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { BetterSidebarService, FileViewerProps, TabComponentProps } from 'dsh-better-sidebar'
import { Studio, ManualStudio } from './studio.tsx'
import { isUmlFile } from '../safety.ts'

export const inject: string[] = []
const FILE_TAB = 'dsh-uml:file'
const NATIVE_TAB = 'dsh-uml'
const NATIVE_KEY = 'dsh-uml:native'

interface NativeTabInfo { tab: { id: string; visible: boolean } }
interface NativeProps { useTabInfo: () => NativeTabInfo }
interface TabRegistry {
  register(descriptor: {
    id: string; kind: string; keepMounted?: boolean; priority: 'extension'
    title: (address: string) => string
    guide?: { id: string; title: () => string; description: () => string; order: number }[]
  }): () => void
}
interface SlotRegistry {
  inject(name: string, callback: () => () => void): () => void
  register(
    descriptor: { name: string; key: string; inject: (sessionId: string) => object },
    component: (props: NativeProps) => ReactNode,
  ): () => void
}

function NativeStudio(props: NativeProps): ReactNode {
  const { tab } = props.useTabInfo()
  return h('div', { style: { height: '100%', minHeight: 0 }, 'data-dsh-uml-native': '' },
    h(Studio, { key: tab.id, visible: tab.visible }))
}
function icon() { return h('span', { role: 'img', 'aria-label': 'UML' }, '◇') }
const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path

function registerNative(ctx: Context): () => void {
  const seat = ctx.inject(['sidebarRightTabs'], injected => {
    const tabs = (injected as unknown as { get: (name: string) => unknown }).get('sidebarRightTabs') as TabRegistry | undefined
    if (!tabs) return
    const slots = (ctx as unknown as { slots: SlotRegistry }).slots
    const disposeType = tabs.register({
      id: NATIVE_KEY, kind: NATIVE_TAB, keepMounted: true, priority: 'extension',
      title: () => 'UML Studio',
      guide: [{
        id: NATIVE_KEY, title: () => 'UML Studio',
        description: () => 'Vẽ và chỉnh sửa PlantUML', order: 70,
      }],
    })
    let disposeSlot: (() => void) | undefined
    try {
      disposeSlot = slots.inject('sidebar.right.pane.tab', () => slots.register({
        name: 'sidebar.right.pane.tab', key: NATIVE_KEY, inject: () => ({}),
      }, NativeStudio))
    } catch (error) {
      disposeType()
      throw error
    }
    return () => { disposeSlot?.(); disposeType() }
  })
  return () => { void seat.dispose() }
}

function registerSidebar(service: BetterSidebarService): () => void {
  const disposers: Array<() => void> = []
  const viewer = (props: FileViewerProps): ReactNode => {
    if (props.largeFile || props.content === undefined) {
      return h('p', { role: 'status' }, 'File UML quá lớn hoặc không phải văn bản.')
    }
    return h(Studio, {
      key: props.path, path: props.path, scope: props.scope, service,
      content: props.content, mtimeMs: props.mtimeMs,
      ...(props.onReload ? { onReload: props.onReload } : {}),
      ...(props.onToolbarState ? { onToolbarState: props.onToolbarState } : {}),
      ...(props.onToolbarControls ? { onToolbarControls: props.onToolbarControls } : {}),
      ...(props.visible === undefined ? {} : { visible: props.visible }),
    })
  }
  const open = (path: string, sessionId: string) => {
    service.openTab({
      type: FILE_TAB, id: FILE_TAB + ':' + path,
      title: 'UML: ' + fileName(path), path,
    }, { sessionId })
  }
  try {
    disposers.push(service.registerFileViewer({
      id: 'dsh-uml:viewer', title: 'PlantUML Diagram', icon,
      exts: ['puml', 'plantuml', 'uml', 'pu', 'wsd'],
      priority: 100, fetchStrategy: 'fsRead', component: viewer,
    }))
    disposers.push(service.registerTab({
      id: FILE_TAB, title: 'UML Viewer',
      description: 'Xem và chỉnh sửa file PlantUML',
      icon, hidden: true, dedupeKey: tab => tab.path,
      component: (props: TabComponentProps) => props.tab.path
        ? h(ManualStudio, { key: props.tab.path, path: props.tab.path, scope: props.scope, service })
        : h('p', null, 'Chọn file .puml trong Files.'),
    }))
    disposers.push(service.registerFileAction({
      id: 'dsh-uml:open-file', label: 'Mở trong UML Studio',
      icon, order: 50,
      when: row => !row.isDir && Boolean(row.sessionId) && isUmlFile(row.path),
      run: row => { if (row.sessionId) open(row.path, row.sessionId) },
    }))
    disposers.push(service.registerTabAction({
      id: 'dsh-uml:open-tab', label: 'UML',
      title: 'Mở file trong UML Studio', icon, order: 50,
      when: tab => !tab.isDir && tab.tabType === 'editor' && isUmlFile(tab.path),
      run: tab => open(tab.path, tab.sessionId),
    }))
  } catch (error) {
    disposers.reverse().forEach(dispose => dispose())
    throw error
  }
  return () => { disposers.reverse().forEach(dispose => dispose()) }
}

export function apply(ctx: Context): void {
  ctx.effect(() => registerNative(ctx), 'dsh-uml: native studio')
  ctx.effect(() => {
    const seat = ctx.inject(['betterSidebar'], injected => {
      const service = (injected as unknown as { get: (name: string) => unknown }).get('betterSidebar') as BetterSidebarService | undefined
      return service ? registerSidebar(service) : undefined
    })
    return () => { void seat.dispose() }
  }, 'dsh-uml: optional Better Sidebar integration')
}
