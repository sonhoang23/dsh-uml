<!-- DSH UML Studio: Vietnamese README. English is the primary README. -->
<div align="center">

<img src="./src/assets/icon.svg" alt="Biểu tượng DSH UML Studio" width="80" height="80" />

# DSH UML Studio

**Vẽ sơ đồ PlantUML ngay bên trong DeepSeek Harness.**

Chỉnh sửa mã, xem trước sơ đồ và xuất file mà không cần rời khỏi DSH.

[Bắt đầu nhanh](#cài-đặt-nhanh) · [Tính năng](#tính-năng) · [Cách sử dụng](#cách-sử-dụng) · [Xử lý lỗi](docs/troubleshooting.md) · [English](README.md)

![Status](https://img.shields.io/badge/status-experimental-F59E0B?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-475569?style=flat-square)
![PlantUML](https://img.shields.io/badge/diagrams-PlantUML-475569?style=flat-square)

</div>

> [!IMPORTANT]
> **MVP thử nghiệm — chưa phải bản phát hành ổn định.** Repo đã có mã nguồn và regression tests, nhưng chưa hoàn tất kiểm thử trực tiếp trên DSH profile/trình duyệt. Package hiện đặt `private: true`, vì vậy hãy build và cài từ source local; không xem đây là package đã phát hành trên npm.

## Tại sao nên dùng DSH UML Studio?

Thay vì chuyển sang một trình biên tập bên ngoài, bạn có thể viết PlantUML và xem sơ đồ ngay trong DSH. Việc render diễn ra **ngay trên máy**, không phụ thuộc server PlantUML hay CDN.

## Tính năng

| Trải nghiệm vẽ sơ đồ | Tích hợp với DSH |
| --- | --- |
| **Preview / Source / Split:** xem hình, xem mã, hoặc làm việc song song. | **Native UML Studio:** mở từ menu tạo tab mới ở sidebar phải, không cần Better Sidebar. |
| **Zoom, pan, fit:** phóng to, di chuyển, căn vừa; xuất `.puml`, SVG và PNG. | **Better Sidebar (tùy chọn):** mở, xem và sửa file UML trực tiếp trong Files. |
| **Mobile UX (đang thử nghiệm):** toolbar gọn, Split xếp dọc, kéo/chụm hai ngón, tự căn sơ đồ vào khung. | **Tương thích pane hẹp:** layout dựa trên chiều rộng vùng chứa DSH, không chỉ kích thước màn hình. |
| **Render cục bộ:** PlantUML TeaVM + Viz.js trong trình duyệt. | **Agent tools:** `uml_validate` để kiểm tra cú pháp, `uml_render` để tạo SVG. |

### Hình ảnh sản phẩm

Repo **chưa có screenshot/GIF đã xác thực** từ phiên chạy DSH thực tế. Vì vậy README chưa hiển thị giao diện mô phỏng. Bạn có thể xem [ví dụ PlantUML](examples/login-sequence.puml) và [hướng dẫn bổ sung ảnh thật](assets/README.md).

## Cài đặt nhanh

**Yêu cầu:** DSH `>=0.2.2-0 <0.3.0`, Node.js `>=24.9.0`, `pnpm` và DSH profile `web`. Better Sidebar `0.32.1` là tùy chọn; nếu sử dụng, nên chạy DSH `0.2.2-rc.2+` trong nhánh 0.2.2.

**Bước 1 — tải source, cài dependency, build**

~~~bash
git clone https://github.com/sonhoang23/dsh-uml.git
cd dsh-uml
pnpm install
pnpm check
~~~

`pnpm check` chạy typecheck, unit tests và build. Nếu lệnh này lỗi, cần sửa lỗi trước khi cài plugin vào DSH.

**Bước 2 — đăng ký plugin local với DSH Web**

~~~bash
dsh plugin --profile web add .
dsh plugin --profile web install
~~~

**Bước 3 — mở UML Studio**

Khởi động lại tiến trình `dsh web`, hard-refresh trình duyệt, rồi mở **UML Studio** từ menu tạo tab ở sidebar phải. Bạn có thể chỉnh ví dụ có sẵn hoặc nhập file `.puml` từ máy.

> [!TIP]
> Nếu Windows báo `Package unavailable`, `Not running` hoặc `cannot resolve profile bundle "dsh-uml"`, hãy làm theo [hướng dẫn xử lý lỗi](docs/troubleshooting.md). Đây thường là lỗi build/cài đặt/profile, không phải cú pháp PlantUML.

## Cách sử dụng

### 1. Vẽ sơ đồ trong Studio

Chuyển giữa **Preview**, **Source** và **Split**; dùng `+`, `−` hoặc **Fit** để điều chỉnh khung hình; bấm **PUML ↓**, **SVG ↓** hoặc **PNG ↓** để tải file.

~~~plantuml
@startuml
actor User
participant "DSH Agent" as Agent
participant "UML Studio" as UML

User -> Agent: Create a diagram
Agent -> UML: PlantUML source
UML --> Agent: SVG preview
Agent --> User: Diagram ready
@enduml
~~~

**Lưu ý:** thao tác **Mở .puml** ở Native Studio chỉ nhập file vào trình biên tập trên trình duyệt. Nó không tự động lưu ngược vào file gốc trong workspace DSH.

### 2. Mở file với Better Sidebar (tùy chọn)

Khi có Better Sidebar, mở file đuôi `.puml`, `.plantuml`, `.uml`, `.pu` hoặc `.wsd` trong **Files** để xem/chỉnh sửa; hoặc dùng thao tác **Mở trong UML Studio** để tạo tab riêng.

Ở chế độ mở file từ Better Sidebar, plugin theo dõi thay đổi chưa lưu và kiểm tra thời gian sửa đổi (`mtime`) trước khi ghi file, giúp tránh ghi đè khi có xung đột. File Markdown và text thông thường không bị chiếm viewer.

### 3. Dùng cùng DSH Agent

| Công cụ | Chức năng |
| --- | --- |
| `uml_validate` | Kiểm tra cú pháp PlantUML và trả về chẩn đoán lỗi. |
| `uml_render` | Render PlantUML thành chuỗi SVG trả về cho agent. |

Cả hai sử dụng PlantUML TeaVM headless chính thức, **không cần Java**. Muốn lưu `.puml` hoặc `.svg` trong workspace, agent dùng các công cụ file thông thường của DSH; hai UML tools không trực tiếp ghi file.

### Trải nghiệm trên điện thoại (đang thử nghiệm)

Trong khung DSH hẹp, Studio mặc định mở **Preview**, hỗ trợ kéo và chụm hai ngón, nút chạm lớn và Split xếp dọc. Các chức năng này cần được nghiệm thu trên thiết bị thật trước khi công bố ổn định. Xem [checklist kiểm thử mobile](docs/mobile-qa.md).

## Kiến trúc

~~~mermaid
flowchart TB
    DSH["DeepSeek Harness"]
    UI["dsh-uml browser client"]
    Native["Native UML Studio tab"]
    Better["Better Sidebar (tùy chọn)"]
    Browser["PlantUML TeaVM + Viz.js cục bộ"]
    Files["File API theo session"]
    Agent["uml_validate / uml_render"]
    Headless["PlantUML TeaVM headless"]

    DSH --> UI
    UI --> Native
    UI -.-> Better
    Native --> Browser
    Better --> Browser
    Better --> Files
    DSH --> Agent
    Agent --> Headless
~~~

Plugin sử dụng extension points sẵn có của DSH, không chỉnh sửa DSH core hay mã nguồn Better Sidebar. Trong trình duyệt, SVG được làm sạch và hiển thị dưới dạng ảnh thay vì nhúng markup có thể thực thi. Với file-backed editing, file `.puml` là nguồn dữ liệu gốc.

## Trạng thái và giới hạn

- **Experimental MVP:** chưa xác nhận hoàn tất bộ kiểm thử DSH/trình duyệt thực tế.
- **Giới hạn an toàn:** chặn `!include`, `!includeurl`, `!include_sprites`, `!import` từ bên ngoài; tối đa **100.000 ký tự** PlantUML.
- **Phạm vi MVP:** hướng tới một sơ đồ mỗi file. Cần đánh giá thêm tốc độ tải engine lần đầu và khả năng cô lập trước khi phát hành.
- **Ý tưởng tương lai (chưa triển khai):** template UML, PlantUML trong Markdown, diagnostics nâng cao, AI giải thích sơ đồ.

## Tài liệu và đóng góp

- [README tiếng Anh](README.md) — tài liệu chính
- [Troubleshooting](docs/troubleshooting.md) — xử lý lỗi cài đặt trên Windows và lỗi runtime
- [Development & acceptance](docs/development.md) — build, kiến trúc và checklist kiểm thử chưa hoàn thành
- [Hướng dẫn chụp ảnh thật](assets/README.md) — bổ sung ảnh demo khi đã kiểm chứng
- [Ví dụ PlantUML](examples/login-sequence.puml)

Bạn có thể gửi issue hoặc pull request kèm các bước tái hiện lỗi, phiên bản DSH/Node và thông tin Better Sidebar có bật hay không. Hãy chạy `pnpm check` trước khi đề xuất thay đổi mã nguồn.

**Giấy phép:** [MIT](LICENSE).

## Bản đóng gói trên GitHub Releases

File `.tgz` thử nghiệm theo phiên bản được tạo tại [GitHub Releases](https://github.com/sonhoang23/dsh-uml/releases) sau khi các bước kiểm tra thành công. Có thể cài file đã phát hành bằng `dsh plugin --profile web add <tarball-url>` rồi chạy `dsh plugin --profile web install`. Vẫn có thể cài từ source như hướng dẫn trên. Cần kiểm thử cài đặt tarball trên profile sạch riêng.
