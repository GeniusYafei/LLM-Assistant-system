export const ALLOWED_DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/jpg',
];

export const ALLOWED_DOCUMENT_EXTENSIONS = [
    '.pdf',
    '.txt',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.png',
    '.jpg',
    '.jpeg',
    '.csv',
    '.json',
];

export const SUPPORTED_DOCUMENT_TYPES_LABEL = 'PDF, TXT, Word, Excel, PNG, JPG, JPEG, CSV, JSON';

export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(',');
