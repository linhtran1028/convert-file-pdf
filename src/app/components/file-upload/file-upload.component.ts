import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileUploadService } from '../../services/file-upload.service';
import { PDFDocument } from 'pdf-lib';

import {
  WorkerBrowserConverter,
  createWasmPaths,
} from '@matbee/libreoffice-converter/browser';

// Module-level cache: sống qua mọi lần mount/unmount của component
// trong cùng session trình duyệt. Worker pool là resource của tab,
// không phải của component — không nên phá cache khi Angular destroy component.
// Singleton đảm bảo chỉ tạo đúng 1 Worker, tránh race tạo instance mới khi pre-warm fail.
let cachedConverterPromise: Promise<WorkerBrowserConverter> | null = null;

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
})
export class FileUploadComponent implements OnInit {
  files: File[] = [];
  message = '';
  fileInfos?: Observable<any>;
  initError: string | null = null;

  constructor(private uploadService: FileUploadService) {}

  ngOnInit(): void {
    // Pre-warm converter ngay khi vào màn hình để lần upload đầu tiên
    // không phải đợi initialize(). Fire-and-forget; lỗi sẽ được retry khi user click upload.
    this.prewarmConverter();
  }

  private prewarmConverter(): void {
    this.getConverter().catch(err => {
      console.warn('[FileUpload] Converter pre-warm failed:', err);
      this.initError = 'WASM converter chưa sẵn sàng. Upload lần đầu sẽ tự thử lại.';
    });
  }

  private getConverter(): Promise<WorkerBrowserConverter> {
    if (cachedConverterPromise) {
      return cachedConverterPromise;
    }

    const wasmPaths = createWasmPaths('/wasm/');
    const converter = new WorkerBrowserConverter({
      ...wasmPaths,
      browserWorkerJs: '/wasm/browser.worker.global.js',
      onProgress: (info) => console.log(`${info.percent}%: ${info.message}`),
    });

    cachedConverterPromise = converter
      .initialize()
      .then(() => converter)
      .catch(err => {
        // Reset cache để lần gọi sau retry được, nhưng KHÔNG giữ promise lỗi.
        // Promise bị reject không được ai await sẽ được GC,
        // Worker instance cũ (chưa init xong) sẽ được browser thu dọn.
        cachedConverterPromise = null;
        throw err;
      });

    return cachedConverterPromise;
  }
  
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      return;
    }

    this.files.push(...Array.from(input.files));
    
    input.value = '';
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  private async mergePdfFiles(files: File[]): Promise<File> {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();

      const pdf = await PDFDocument.load(bytes);

      const copiedPages = await mergedPdf.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();

    // Copy sang ArrayBuffer mới
    const output = new Uint8Array(mergedBytes.byteLength);
    output.set(mergedBytes);

    return new File(
      [output],
      'merged.pdf',
      {
        type: 'application/pdf',
      }
    );
  }

  async upload() {
    if (!this.files.length) {
      return;
    }

    const filesToUpload: File[] = [];

    const tInitStart = performance.now();

    let converter: WorkerBrowserConverter;
    try {
      converter = await this.getConverter();
      // Init thành công (có thể là retry sau pre-warm fail) → clear lỗi trên UI.
      this.initError = null;
    } catch (err) {
      this.message = 'Không thể khởi tạo WASM converter. Vui lòng tải lại trang.';
      console.error('[FileUpload] Converter init failed:', err);
      return;
    }

    const tInitEnd = performance.now();

    const tConvertStart = performance.now();

    for (const file of this.files) {

      let fileToUpload = file;

      if (!file.name.toLowerCase().endsWith('.pdf')) {

        const inputData = new Uint8Array(
          await file.arrayBuffer()
        );
        const result = await converter.convert(
          inputData,
          { outputFormat: 'pdf' },
          file.name
        );
        const pdfBytes = new Uint8Array(result.data.byteLength);
        pdfBytes.set(result.data);

        fileToUpload = new File(
          [
            new Blob([pdfBytes], {
              type: result.mimeType,
            }),
          ],
          result.filename,
          {
            type: result.mimeType,
          }
        );
      }

      filesToUpload.push(fileToUpload);
    }

    
      console.log(filesToUpload);
      if (filesToUpload.length === 1) {

        const file = filesToUpload[0];

        const url = URL.createObjectURL(file);

        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();

        URL.revokeObjectURL(url);

      } else {

        // Gộp tất cả PDF
        const mergedFile = await this.mergePdfFiles(filesToUpload);

        const url = URL.createObjectURL(mergedFile);

        const a = document.createElement('a');
        a.href = url;
        a.download = mergedFile.name;
        a.click();

        URL.revokeObjectURL(url);

      }
    const tConvertEnd = performance.now();

    console.table({
      'Initialize': `${(tInitEnd - tInitStart).toFixed(2)} ms`,
      'Convert': `${(tConvertEnd - tConvertStart).toFixed(2)} ms`,
      'Total': `${(tConvertEnd - tInitStart).toFixed(2)} ms`
    });
  }
}