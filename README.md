# Tổng quan

Thư viện hỗ trợ chuyển đổi tài liệu giữa nhiều định dạng khác nhau trong **Node.js** và **trình duyệt (Browser)** bằng cách sử dụng **LibreOffice WebAssembly (WASM)**.

## Định dạng hỗ trợ

### Định dạng đầu vào (Input)

- DOC
- DOCX
- XLS
- XLSX
- PPT
- PPTX
- ODT
- ODS
- ODP
- RTF
- TXT
- HTML
- CSV
- PDF
- EPUB

### Định dạng đầu ra (Output)

- PDF
- DOCX
- DOC
- ODT
- RTF
- TXT
- HTML
- XLSX
- XLS
- ODS
- CSV
- PPTX
- PPT
- ODP
- PNG
- JPG
- SVG

## Yêu cầu khi chạy trên Browser

Để WebAssembly hoạt động chính xác, máy chủ phải trả về các HTTP Header sau:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|------------|----------|
| Node.js | >= 18.0.0 |
| Browser | Tải xuống khoảng **240 MB** ở lần chạy đầu tiên (sẽ được cache cho các lần sử dụng tiếp theo) |

## Lưu ý

- Phiên bản chạy trên **Browser** sẽ tải LibreOffice WASM trong lần khởi động đầu tiên.
- Sau khi tải thành công, các tệp WASM sẽ được **cache**, giúp những lần sử dụng tiếp theo nhanh hơn.
- Nếu trình duyệt không hỗ trợ **Cross-Origin Isolation** hoặc thiếu các HTTP Header ở trên, quá trình khởi tạo WASM có thể không hoạt động.
