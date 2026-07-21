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

  // Cache converter instance để chỉ trả phí khởi tạo 1 lần duy nhất.
  // Dùng Promise để tránh race condition khi upload() được gọi liên tục
  // trong khi lần initialize() trước chưa xong.
  private converterReady?: Promise<WorkerBrowserConverter>;

  constructor(private uploadService: FileUploadService) {}

  ngOnInit(): void {
    // this.fileInfos = this.uploadService.getFiles();

    // Pre-warm converter ngay khi vào màn hình để lần upload đầu tiên
    // không phải đợi initialize(). Fire-and-forget; lỗi sẽ được retry khi user click upload.
    this.getConverter().catch(err => console.warn('Converter pre-warm failed:', err));
  }

  private getConverter(): Promise<WorkerBrowserConverter> {
    if (!this.converterReady) {
      const wasmPaths = createWasmPaths('/wasm/');
      const converter = new WorkerBrowserConverter({
        ...wasmPaths,
        browserWorkerJs: '/wasm/browser.worker.global.js',
      });
      this.converterReady = converter.initialize().then(() => converter);
    }
    return this.converterReady;
  }
  
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      return;
    }

    this.files.push(...Array.from(input.files));

    // Cho phép chọn lại cùng một file
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

    // Lần đầu gọi sẽ trả phí khởi tạo (initialize), các lần sau dùng lại instance đã sẵn sàng.
    const tInitStart = performance.now();
    const converter = await this.getConverter();
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