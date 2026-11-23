import { useEffect, useRef, useState, useCallback, createElement as h } from 'react'
import type { BetterSidebarService, FileViewerProps } from 'dsh-better-sidebar'
import { renderBrowser, svgDimensions } from './renderer.ts'
import { readUml, writeUml, type Scope, type ReadResult } from './fs.ts'

const EXAMPLE = '@startuml\nactor User\nparticipant "DSH Agent" as Agent\nparticipant "UML Studio" as UML\nUser -> Agent: Vẽ sequence diagram\nAgent -> UML: PlantUML source\nUML --> Agent: SVG preview\nAgent --> User: Sơ đồ đã tạo\n@enduml'

const CSS = [
  '.dsh-uml{display:flex;flex-direction:column;height:100%;min-height:280px;min-width:0;color:var(--dsw-alias-text-primary,inherit);font:13px/1.5 system-ui,sans-serif}',
  '.dsh-uml .uml-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px;border-bottom:1px solid var(--dsw-alias-border-subtle,#9996)}',
  '.dsh-uml button{font:inherit;cursor:pointer;border-radius:6px;padding:5px 9px;border:1px solid var(--dsw-alias-border-subtle,#7777);background:transparent;color:inherit}',
  '.dsh-uml button[aria-pressed=true]{background:var(--dsw-alias-bg-layer-3,#aaa3);font-weight:600}',
  '.dsh-uml button:disabled{opacity:.45;cursor:default}',
  '.dsh-uml .uml-spacer{flex:1}',
  '.dsh-uml .uml-body{display:flex;flex:1;min-height:0;overflow:hidden}',
  '.dsh-uml .uml-code{flex:1;min-width:130px;min-height:0;resize:none;box-sizing:border-box;border:0;outline:0;padding:12px;background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:2}',
  '.dsh-uml .uml-frame{flex:1;min-width:0;min-height:0;overflow:hidden;position:relative;touch-action:none;cursor:grab;background:var(--dsw-alias-bg-layer-1,transparent)}',
  '.dsh-uml .uml-frame:active{cursor:grabbing}',
  '.dsh-uml .uml-image{position:absolute;left:50%;top:50%;width:auto;height:auto;max-width:none;max-height:none;transform-origin:center;pointer-events:none;user-select:none}',
  '.dsh-uml .uml-message{padding:7px 12px;margin:0;font-size:12px;color:var(--dsw-alias-text-secondary,inherit);border-top:1px solid var(--dsw-alias-border-subtle,#9995);overflow-wrap:anywhere}',
  '.dsh-uml .uml-error{color:var(--dsw-alias-state-error-primary,#c33)}',
  '.dsh-uml .uml-blank{display:flex;align-items:center;justify-content:center;flex:1;padding:16px;text-align:center;color:var(--dsw-alias-text-secondary,inherit)}',
].join('')

type Mode = 'preview' | 'source' | 'split'
type Toolbar = Pick<FileViewerProps, 'onToolbarState' | 'onToolbarControls' | 'visible'>
export interface StudioProps extends Toolbar {
  path?: string
  content?: string
  scope?: Scope
  service?: BetterSidebarService
  mtimeMs?: number
  onReload?: () => void
}
const shortName = (path?: string) => path?.split(/[\\/]/).pop() ?? 'diagram.puml'
const nameStem = (path?: string) => shortName(path).replace(/\.(puml|plantuml|uml|pu|wsd)$/i, '') || 'diagram'

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function Studio(props: StudioProps) {
  const { path, scope, service, mtimeMs, onReload, onToolbarState, onToolbarControls } = props
  const [mode, setMode] = useState<Mode>(path ? 'preview' : 'split')
  const [draft, setDraft] = useState(props.content ?? EXAMPLE)
  const [saved, setSaved] = useState(props.content ?? EXAMPLE)
  const [baseline, setBaseline] = useState(mtimeMs)
  const [status, setStatus] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [svg, setSvg] = useState('')
  const [renderError, setRenderError] = useState('')
  const [rendering, setRendering] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirty = draft !== saved
  const isFile = Boolean(path && service && scope)
  const visible = props.visible !== false

  useEffect(() => {
    if (dirty) return
    setDraft(props.content ?? EXAMPLE)
    setSaved(props.content ?? EXAMPLE)
    setBaseline(mtimeMs)
  }, [props.content, mtimeMs, path])

  useEffect(() => {
    if (!visible || mode === 'source') return
    let current = true
    const timer = setTimeout(() => {
      setRendering(true)
      void renderBrowser(draft).then(value => {
        if (current) { setSvg(value); setRenderError('') }
      }).catch(error => {
        if (current) { setSvg(''); setRenderError(message(error)) }
      }).finally(() => { if (current) setRendering(false) })
    }, 300)
    return () => { current = false; clearTimeout(timer) }
  }, [draft, visible, mode])

  useEffect(() => {
    if (!svg) return
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    setSvgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [svg])

  const [svgUrl, setSvgUrl] = useState('')
  const save = useCallback(async () => {
    if (!path || !scope || !service || !dirty || saveState === 'saving') return
    if (baseline === undefined) { setStatus('Không có mtime gốc an toàn; hãy tải lại file.'); return }
    setSaveState('saving'); setStatus('')
    try {
      const newMtime = await writeUml(service, scope, path, draft, baseline)
      setSaved(draft); setBaseline(newMtime); setSaveState('saved'); setStatus('Đã lưu ' + shortName(path))
    } catch (error) {
      setSaveState('failed')
      setStatus('Không thể lưu: ' + message(error) + '. Kiểm tra xung đột phiên bản.')
    }
  }, [path, scope, service, dirty, saveState, baseline, draft])

  useEffect(() => {
    onToolbarState?.({
      modes: true, mode: mode === 'preview' ? 'preview' : 'edit', dirty,
      editable: isFile, saveState,
    })
  }, [onToolbarState, mode, dirty, isFile, saveState])
  useEffect(() => {
    onToolbarControls?.({ setMode: next => setMode(next === 'preview' ? 'preview' : 'split'), save: () => { void save() } })
    return () => onToolbarControls?.(null)
  }, [onToolbarControls, save])

  const button = (label: string, action: () => void, active?: boolean, disabled?: boolean) =>
    h('button', {
      type: 'button', onClick: action, disabled,
      ...(active === undefined ? {} : { 'aria-pressed': active }),
    }, label)

  const exportPng = async () => {
    if (!svg) return
    try {
      const { width, height } = svgDimensions(svg)
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      try {
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('Unable to decode SVG for PNG export.'))
          image.src = url
        })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(width * 2)
        canvas.height = Math.ceil(height * 2)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is unavailable.')
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          result => result ? resolve(result) : reject(new Error('PNG export failed.')), 'image/png'))
        download(png, nameStem(path) + '.png')
      } finally { URL.revokeObjectURL(url) }
    } catch (error) { setStatus('Không thể xuất PNG: ' + message(error)) }
  }

  const handleKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); void save()
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const input = event.currentTarget
      const from = input.selectionStart, to = input.selectionEnd
      setDraft(draft.slice(0, from) + '  ' + draft.slice(to))
      requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = from + 2 })
    }
  }

  return <div className="dsh-uml" data-dsh-uml-studio="">
    <style>{CSS}</style>
    <div className="uml-bar">
      {button('Preview', () => setMode('preview'), mode === 'preview')}
      {button('Source', () => setMode('source'), mode === 'source')}
      {button('Split', () => setMode('split'), mode === 'split')}
      <span className="uml-spacer" />
      {button('−', () => setZoom(z => Math.max(.2, z / 1.2)), undefined, mode === 'source')}
      {button('+', () => setZoom(z => Math.min(6, z * 1.2)), undefined, mode === 'source')}
      {button('Fit', () => { setZoom(1); setPan({ x: 0, y: 0 }) }, undefined, mode === 'source')}
      {isFile ? button(dirty ? 'Lưu •' : 'Lưu', () => { void save() }, undefined, !dirty || saveState === 'saving') : null}
      {isFile ? button('Nạp lại', () => {
        if (dirty && !window.confirm('Bỏ các thay đổi chưa lưu?')) return
        setDraft(saved); onReload?.()
      }, undefined, !onReload) : <>
        {button('Mở .puml', () => fileInput.current?.click())}
        <input ref={fileInput} type="file" hidden accept=".puml,.plantuml,.uml,.pu,.wsd" onChange={event => {
          const file = event.currentTarget.files?.[0]
          if (file) void file.text().then(value => { setDraft(value); setSaved(value); setStatus('Đã mở ' + file.name) })
          event.currentTarget.value = ''
        }} />
      </>}
      {button('PUML ↓', () => download(new Blob([draft], { type: 'text/plain;charset=utf-8' }), nameStem(path) + '.puml'))}
      {button('SVG ↓', () => download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), nameStem(path) + '.svg'), undefined, !svg)}
      {button('PNG ↓', () => { void exportPng() }, undefined, !svg)}
    </div>
    <div className="uml-body">
      {mode !== 'preview' ? <textarea
        className="uml-code" aria-label="PlantUML source" value={draft}
        onKeyDown={handleKey} spellCheck={false}
        onChange={event => { setDraft(event.target.value); setSaveState('idle') }}
      /> : null}
      {mode !== 'source' ? <div
        className="uml-frame" role="img" aria-label="PlantUML diagram preview"
        onPointerDown={event => {
          drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => {
          if (!drag.current) return
          setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y })
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
      >
        {svg && svgUrl ? <img className="uml-image" alt="PlantUML rendered diagram" src={svgUrl}
          style={{ transform: 'translate(calc(-50% + ' + pan.x + 'px), calc(-50% + ' + pan.y + 'px)) scale(' + zoom + ')' }} /> :
          <div className="uml-blank">{rendering ? 'Đang vẽ sơ đồ…' : (renderError || 'Chưa có sơ đồ.')}</div>}
      </div> : null}
    </div>
    <p className={'uml-message' + (renderError || status.startsWith('Không') ? ' uml-error' : '')} role="status">
      {status || renderError || (rendering ? 'Đang cập nhật preview…' : (dirty && isFile ? 'Chưa lưu thay đổi' : 'PlantUML · Local renderer'))}
    </p>
  </div>
}

export function ManualStudio(props: {
  path: string; service: BetterSidebarService; scope: Scope
}) {
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<ReadResult | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError('')
    void readUml(props.service, props.scope, props.path, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(reason => { if (!controller.signal.aborted) setError(message(reason)) })
    return () => controller.abort()
  }, [props.service, props.scope.sessionId, props.scope.cwd, props.path, version])
  if (error) return <p role="alert">Không thể mở UML: {error}</p>
  if (!data) return <p role="status">Đang mở PlantUML…</p>
  if (data.kind !== 'text') return <p role="alert">File không phải văn bản hoặc quá lớn để mở.</p>
  return <Studio key={props.path + ':' + version} path={props.path} service={props.service}
    scope={props.scope} content={data.content} mtimeMs={data.mtimeMs}
    onReload={() => setVersion(n => n + 1)} />
}
