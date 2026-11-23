import { useEffect, useRef, useState, useCallback, useMemo, createElement as h } from 'react'
import type { BetterSidebarService, FileViewerProps } from 'dsh-better-sidebar'
import { renderBrowser, svgDimensions } from './renderer.ts'
import { readUml, writeUml, type Scope, type ReadResult } from './fs.ts'
import { CSS } from './studio-styles.ts'
import {
  distance, fitZoom, midpoint, pinchTransform, zoomAt,
  type Point, type ViewTransform,
} from './viewport.ts'

const EXAMPLE = '@startuml\nactor User\nparticipant "DSH Agent" as Agent\nparticipant "UML Studio" as UML\nUser -> Agent: Vẽ sequence diagram\nAgent -> UML: PlantUML source\nUML --> Agent: SVG preview\nAgent --> User: Sơ đồ đã tạo\n@enduml'


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
  const [view, setView] = useState<ViewTransform>({ zoom: 1, pan: { x: 0, y: 0 } })
  const viewRef = useRef(view)
  const [autoFit, setAutoFit] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const drag = useRef<{ at: Point; initial: ViewTransform } | null>(null)
  const pinch = useRef<{ center: Point; gap: number } | null>(null)
  const selectedMode = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const diagramSize = useMemo(() => svg ? svgDimensions(svg) : null, [svg])
  const dirty = draft !== saved
  const isFile = Boolean(path && service && scope)
  const visible = props.visible !== false

  const chooseMode = useCallback((next: Mode) => {
    selectedMode.current = true
    setMode(next)
    setMoreOpen(false)
  }, [])

  const viewFrame = useRef<number | null>(null)
  const updateView = useCallback((update: (previous: ViewTransform) => ViewTransform) => {
    viewRef.current = update(viewRef.current)
    // Collapse high-frequency pointer moves into at most one React render per frame.
    if (viewFrame.current !== null) return
    viewFrame.current = requestAnimationFrame(() => {
      viewFrame.current = null
      setView(viewRef.current)
    })
  }, [])

  useEffect(() => () => {
    if (viewFrame.current !== null) cancelAnimationFrame(viewFrame.current)
  }, [])

  const fit = useCallback(() => {
    const frame = frameRef.current
    if (!frame || !diagramSize || frame.clientWidth <= 0 || frame.clientHeight <= 0) return
    updateView(() => ({
      zoom: fitZoom(diagramSize, { width: frame.clientWidth, height: frame.clientHeight }, 18),
      pan: { x: 0, y: 0 },
    }))
  }, [diagramSize, updateView])

  const resetFit = () => {
    setAutoFit(true)
    fit()
  }

  const stepZoom = (factor: number) => {
    const frame = frameRef.current
    if (!frame) return
    setAutoFit(false)
    const size = { width: frame.clientWidth, height: frame.clientHeight }
    updateView(previous => zoomAt(previous, previous.zoom * factor,
      { x: size.width / 2, y: size.height / 2 }, size))
  }

  // DSH embeds Studio in panes of varying width; viewport media queries alone are insufficient.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const width = root.getBoundingClientRect().width
      if (width > 0 && !selectedMode.current) setMode(path || width <= 560 ? 'preview' : 'split')
    }
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure)
      observer.observe(root)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [path])

  // Refit after render, orientation change, or a resize of the actual preview pane.
  useEffect(() => {
    if (!autoFit || !diagramSize || mode === 'source') return
    const frame = frameRef.current
    if (!frame) return
    fit()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(fit)
      observer.observe(frame)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [autoFit, diagramSize, fit, mode])

  useEffect(() => {
    if (!moreOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [moreOpen])

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
    onToolbarControls?.({ setMode: next => chooseMode(next === 'preview' ? 'preview' : 'split'), save: () => { void save() } })
    return () => onToolbarControls?.(null)
  }, [onToolbarControls, save, chooseMode])

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

  const reloadFile = () => {
    if (!onReload) return
    if (dirty && !window.confirm('Bỏ các thay đổi chưa lưu?')) return
    setDraft(saved)
    setMoreOpen(false)
    onReload()
  }
  const exportSource = () => download(
    new Blob([draft], { type: 'text/plain;charset=utf-8' }), nameStem(path) + '.puml')
  const exportSvg = () => {
    if (svg) download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), nameStem(path) + '.svg')
  }

  const pointerPosition = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = pointerPosition(event)
    pointers.current.set(event.pointerId, point)
    event.currentTarget.setPointerCapture(event.pointerId)
    if (pointers.current.size === 1) {
      drag.current = { at: point, initial: viewRef.current }
      pinch.current = null
    } else if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { center: midpoint(a, b), gap: Math.max(distance(a, b), 1) }
      drag.current = null
    }
  }
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    const point = pointerPosition(event)
    pointers.current.set(event.pointerId, point)
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      const center = midpoint(a, b)
      const gap = Math.max(distance(a, b), 1)
      if (pinch.current) {
        const frame = event.currentTarget
        const previous = pinch.current
        const size = { width: frame.clientWidth, height: frame.clientHeight }
        updateView(view => pinchTransform(view, previous.center, center, gap / previous.gap, size))
        setAutoFit(false)
      }
      pinch.current = { center, gap }
    } else if (drag.current) {
      const start = drag.current
      updateView(() => ({
        zoom: start.initial.zoom,
        pan: {
          x: start.initial.pan.x + point.x - start.at.x,
          y: start.initial.pan.y + point.y - start.at.y,
        },
      }))
      setAutoFit(false)
    }
  }
  const pointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { center: midpoint(a, b), gap: Math.max(distance(a, b), 1) }
    } else if (pointers.current.size === 1) {
      const point = Array.from(pointers.current.values())[0]
      drag.current = { at: point, initial: viewRef.current }
      pinch.current = null
    } else {
      drag.current = null
      pinch.current = null
    }
  }

  return <div ref={rootRef} className="dsh-uml" data-dsh-uml-studio="">
    <style>{CSS}</style>
    <input ref={fileInput} type="file" hidden accept=".puml,.plantuml,.uml,.pu,.wsd"
      onChange={event => {
        const file = event.currentTarget.files?.[0]
        if (file) void file.text().then(value => {
          setDraft(value); setSaved(value); setStatus('Đã mở ' + file.name)
          setAutoFit(true)
        })
        event.currentTarget.value = ''
      }} />
    <div className="uml-bar">
      <div className="uml-modes" role="group" aria-label="Editor mode">
        {button('Preview', () => chooseMode('preview'), mode === 'preview')}
        {button('Source', () => chooseMode('source'), mode === 'source')}
        {button('Split', () => chooseMode('split'), mode === 'split')}
      </div>
      <span className="uml-spacer" />
      {isFile ? button(dirty ? 'Lưu •' : 'Lưu', () => { void save() }, undefined,
        !dirty || saveState === 'saving') : null}
      <div className="uml-desktop-actions">
        {button('−', () => stepZoom(1 / 1.2), undefined, mode === 'source' || !svg)}
        {button('+', () => stepZoom(1.2), undefined, mode === 'source' || !svg)}
        {button('Fit', resetFit, undefined, mode === 'source' || !svg)}
        {isFile ? button('Nạp lại', reloadFile, undefined, !onReload) :
          button('Mở .puml', () => fileInput.current?.click())}
        {button('PUML ↓', exportSource)}
        {button('SVG ↓', exportSvg, undefined, !svg)}
        {button('PNG ↓', () => { void exportPng() }, undefined, !svg)}
      </div>
      <div className="uml-more" ref={menuRef}>
        <button type="button" aria-label="Tùy chọn UML" aria-expanded={moreOpen}
          onClick={() => setMoreOpen(open => !open)}>•••</button>
        {moreOpen ? <div className="uml-menu" aria-label="UML file actions">
          {isFile ? button('Nạp lại', reloadFile, undefined, !onReload) :
            button('Mở .puml', () => { setMoreOpen(false); fileInput.current?.click() })}
          {button('Xuất PUML', () => { exportSource(); setMoreOpen(false) })}
          {button('Xuất SVG', () => { exportSvg(); setMoreOpen(false) }, undefined, !svg)}
          {button('Xuất PNG', () => { void exportPng(); setMoreOpen(false) }, undefined, !svg)}
        </div> : null}
      </div>
    </div>
    <div className="uml-body" data-mode={mode}>

      {mode !== 'preview' ? <textarea
        className="uml-code" aria-label="PlantUML source" value={draft}
        onKeyDown={handleKey} spellCheck={false} autoCapitalize="off" autoCorrect="off"
        onChange={event => { setDraft(event.target.value); setSaveState('idle') }}
      /> : null}
      {mode !== 'source' ? <div
        ref={frameRef} className="uml-frame" role="region"
        aria-label="PlantUML diagram preview. Drag to pan, pinch to zoom."
        tabIndex={0}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onKeyDown={event => {
          if (event.key === '+' || event.key === '=') { event.preventDefault(); stepZoom(1.2) }
          else if (event.key === '-') { event.preventDefault(); stepZoom(1 / 1.2) }
          else if (event.key === '0') { event.preventDefault(); resetFit() }
          else if (event.key.startsWith('Arrow')) {
            const offsets: Record<string, Point> = {
              ArrowLeft: { x: -24, y: 0 }, ArrowRight: { x: 24, y: 0 },
              ArrowUp: { x: 0, y: -24 }, ArrowDown: { x: 0, y: 24 },
            }
            const offset = offsets[event.key]
            if (offset) {
              event.preventDefault()
              setAutoFit(false)
              updateView(current => ({
                zoom: current.zoom,
                pan: { x: current.pan.x + offset.x, y: current.pan.y + offset.y },
              }))
            }
          }
        }}
      >
        {svg && svgUrl ? <img className="uml-image" alt="PlantUML rendered diagram" src={svgUrl}
          draggable={false}
          style={{
            width: diagramSize?.width, height: diagramSize?.height,
            transform: 'translate(calc(-50% + ' + view.pan.x + 'px), calc(-50% + ' +
              view.pan.y + 'px)) scale(' + view.zoom + ')',
          }} /> :
          <div className="uml-blank">{rendering ? 'Đang vẽ sơ đồ…' : (renderError || 'Chưa có sơ đồ.')}</div>}
      </div> : null}
    </div>
    {mode !== 'source' ? <div className="uml-mobile-tools" role="group" aria-label="Zoom controls">
      {button('−', () => stepZoom(1 / 1.2), undefined, !svg)}
      {button('Fit', resetFit, undefined, !svg)}
      {button('+', () => stepZoom(1.2), undefined, !svg)}
    </div> : null}
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
