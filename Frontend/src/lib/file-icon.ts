import {
    FileArchive,
    FileAudio,
    FileSpreadsheet,
    FileText,
    FileVideo,
    Paperclip,
    type LucideIcon,
} from 'lucide-react';

/** Port of composables/useFileIcon.ts. */
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx', 'csv', 'ods'];

function extensionOf(name: string): string {
    const parts = name.split('.');

    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

export function fileIconFor(mimeType: string, name: string): LucideIcon {
    if (mimeType.startsWith('audio/')) {
        return FileAudio;
    }

    if (mimeType.startsWith('video/')) {
        return FileVideo;
    }

    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) {
        return FileText;
    }

    const extension = extensionOf(name);

    if (
        ARCHIVE_EXTENSIONS.includes(extension) ||
        mimeType.includes('zip') ||
        mimeType.includes('compressed') ||
        mimeType.includes('archive')
    ) {
        return FileArchive;
    }

    if (
        SPREADSHEET_EXTENSIONS.includes(extension) ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('excel')
    ) {
        return FileSpreadsheet;
    }

    return Paperclip;
}
