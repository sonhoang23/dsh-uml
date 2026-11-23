# DSH UML Studio

Standalone PlantUML editor/renderer for DeepSeek Harness with optional Better Sidebar file preview.

> **Experimental MVP:** source and regression tests are committed; live DSH profile/browser acceptance is still required before release.

## User experience

- **Without Better Sidebar:** open **UML Studio** in DSH's right-sidebar new-tab menu; edit PlantUML in Preview, Source, or Split mode. Import a local .puml file to the browser editor or export .puml / SVG / PNG.
- **With Better Sidebar:** opening a .puml, .plantuml, .uml, .pu, or .wsd file in Files uses a dedicated UML viewer/editor; explicit **Mở trong UML Studio** file action creates a dedicated tab.
- Zoom, pan, fit, local SVG/PNG export. Unsaved drafts are reported to Better Sidebar, preventing automatic reload. Saving uses authenticated session-scoped routes and mtime conflict checks.
- Agent tools: **uml_validate** checks syntax; **uml_render** generates SVG using the official headless TeaVM PlantUML engine, no Java runtime required. DSH can create .puml documents with its normal file tools.

## Example

~~~plantuml
@startuml
actor User
participant "DSH Agent" as Agent
participant "UML Studio" as UML
User -> Agent: Create a diagram
Agent -> UML: PlantUML source
UML --> Agent: SVG
Agent --> User: Preview ready
@enduml
~~~

## Architecture

- Host: official @plantuml/mcp-js headless engine for Agent tools, lazily loaded.
- Browser: official @plantuml/core TeaVM engine and @viz-js/viz for Graphviz-dependent diagrams. Local rendering, no remote server/CDN.
- Native UI: DSH right-sidebar tab via sidebarRightTabs and sidebar.right.pane.tab.
- Optional adapter: Better Sidebar registerFileViewer/registerTab/registerFileAction/registerTabAction. No DSH core patch and no Better Sidebar source modification.
- The .puml file remains the source of truth. Markdown is never hijacked.

MVP disables external !include, !includeurl and !import statements. One diagram per file is intended. SVG is sanitized and displayed as an image, never as executable inline markup. The browser engine is large; measure cold-load and consider isolation/lazy loading before release.

## Windows: sửa `Package unavailable` / `Not running`

Nếu Plugin Manager đã hiện `dsh-uml` nhưng báo
`cannot resolve profile bundle "dsh-uml"`, DSH đã có **bundle entry**
nhưng chưa phân giải được package từ profile `web`. Đây là lỗi ở bước cài đặt
hoặc build, chưa phải lỗi PlantUML.

### 1. Kiểm tra phiên bản đang thực sự chạy

Mở PowerShell:

```powershell
dsh --version
Get-Command dsh | Select-Object Source
node -v
```

`dsh-uml` yêu cầu DSH `>=0.2.2-0 <0.3.0`, Node `>=24.9.0`.
Khi dùng Better Sidebar 0.32.1, cần DSH `0.2.2-rc.2+` trong nhánh 0.2.2.
**Nếu `dsh --version` còn là 0.2.1-rc.x, nâng cấp bản DSH đang chạy
trước khi cài plugin; không dùng `allow-version --accept-risk` để bỏ qua.**
Chỉ cập nhật checkout GitHub không làm thay đổi executable DSH đã cài.

### 2. Đồng bộ mã nguồn nhưng giữ mọi thay đổi local

```powershell
cd 'C:\path\to\dsh-uml'
git status -sb
git fetch origin
git log --oneline --left-right HEAD...origin/main
```

Chỉ khi worktree sạch và nhánh local không có commit riêng, thực hiện:

```powershell
git merge --ff-only origin/main
```

Nếu `main` đã diverge hoặc có sửa đổi chưa commit, không dùng
`reset --hard` hay `clean`. Hãy giữ các commit local và merge có kiểm soát
sau khi kiểm tra diff.

### 3. Build và cài lại đúng profile

```powershell
$plugin = 'C:\path\to\dsh-uml'
cd $plugin
pnpm install
pnpm check
Test-Path (Join-Path $plugin 'lib\index.js')
Test-Path (Join-Path $plugin 'lib\client.js')
dsh plugin --profile web add .
dsh plugin --profile web install
$profile = Join-Path $env:USERPROFILE '.dsh\profiles\web'
Test-Path (Join-Path $profile 'node_modules\dsh-uml\package.json')
dsh web --dump-config | Select-String 'dsh-uml'
```

Cả ba lệnh `Test-Path` phải trả về `True`. Nếu `pnpm check`
bị lỗi, **không tiếp tục lệnh `add`**; cần sửa lỗi build trước.
`add .` ghi một liên kết `link:` đến thư mục local;
`install` bảo đảm dependency được materialize vào profile.
Nếu profile vẫn không có `node_modules\dsh-uml`, phải kiểm tra log
`dsh plugin --profile web install` và `package.json` của profile;
không tự tay xóa hoặc sửa `cordis.patch.yml`.

Khởi động lại toàn bộ `dsh web` và hard-refresh trình duyệt.
Bắt đầu từ tab **UML Studio** ở native sidebar, sau đó mở
`examples/login-sequence.puml` qua Better Sidebar.

### Kiểm tra nhanh nếu vẫn lỗi

```powershell
Get-Content (Join-Path $profile 'package.json') | Select-String 'dsh-uml'
Get-Item (Join-Path $profile 'node_modules\dsh-uml') -ErrorAction SilentlyContinue | Format-List FullName,LinkType,Target
```

`Package unavailable` khác với lỗi `engines.dsh` không tương thích
và cũng khác với lỗi TypeScript `TS5097`: xử lý theo đúng thông báo từng bước.

## Development

MVP sử dụng `pnpm check` để chạy typecheck, unit tests và build.
Mã nguồn cần được build ở checkout local trước khi được profile DSH nạp.

## Live acceptance checklist (pending)

- [ ] Native UML Studio tab opens even without Better Sidebar.
- [ ] Sequence, class, component and activity diagrams render, including the Graphviz path.
- [ ] Syntax errors appear without executing includes.
- [ ] Opening .puml in Better Sidebar previews UML; regular .md and .txt remain unchanged.
- [ ] Source, split, zoom, pan, fit, SVG/PNG/.puml exports work.
- [ ] Save succeeds, stale mtime is rejected, dirty draft survives host changes.
- [ ] Plugin disable/re-enable unregisters and re-registers native and Better Sidebar contributions.
- [ ] Agent tools return real diagnostics and valid SVG.
- [ ] Light/dark, reverse proxy, and desktop profile work.

## Future phases

UML templates, inline Markdown PlantUML fences, richer syntax diagnostics, and AI-powered diagram explanations.
