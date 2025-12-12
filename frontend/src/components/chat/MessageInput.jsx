import React, {useRef, useState} from 'react';
import {Button} from '../ui/button';
import {Textarea} from '../ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {Popover, PopoverContent, PopoverTrigger} from '../ui/popover';
import {Badge} from '../ui/badge';
import {Alert, AlertDescription} from '../ui/alert';
import {AlertTriangle, FileText, Mic, Paperclip, Plus, RotateCcw, Send, Square, Upload, X} from 'lucide-react';
import {cn} from '../ui/utils';
import {DOCUMENT_ACCEPT, SUPPORTED_DOCUMENT_TYPES_LABEL} from '../../constants/documentTypes';

export function MessageInput({
                                 onSendMessage,
                                 onCancelGeneration,
                                 onRetryGeneration,
                                 isGenerating = false,
                                 canRetry = false,
                                 attachedDocuments = [],
                                 onUploadDocument,
                                 disabled = false,
                                 placeholder = "Message AI assistant...",
                                 uploadDisabled = false,
                             }) {
    const [message, setMessage] = useState('');
    const [selectedDocuments, setSelectedDocuments] = useState(new Set());
    const [selectedSource, setSelectedSource] = useState('default');
    const [isListening, setIsListening] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Simple content safety check (in real app, this would be more sophisticated)
    const checkContentSafety = (text) => {
        const riskyPatterns = ['password', 'hack', 'exploit', 'illegal'];
        return !riskyPatterns.some(pattern =>
            text.toLowerCase().includes(pattern)
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (message.trim() && !isGenerating && !disabled) {
            // Safety check
            if (!checkContentSafety(message)) {
                return;
            }

            onSendMessage(message.trim(), Array.from(selectedDocuments));
            setMessage('');
            setSelectedDocuments(new Set());
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleToggleDocument = (documentId) => {
        const newSelected = new Set(selectedDocuments);
        if (newSelected.has(documentId)) {
            newSelected.delete(documentId);
        } else {
            newSelected.add(documentId);
        }
        setSelectedDocuments(newSelected);
    };

    const handleVoiceToggle = () => {
        setIsListening(!isListening);
        // Voice recording logic would go here
    };

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0 || !onUploadDocument) return;
        if (uploadDisabled) {
            setUploadError('Storage is full. Delete documents to upload new files.');
            return;
        }

        const file = files[0];

        setUploadError(null);
        setUploadProgress(0);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev === null) return 0;
                    const next = prev + Math.random() * 30;
                    return next >= 95 ? 95 : next;
                });
            }, 200);

            await onUploadDocument(file);

            clearInterval(progressInterval);
            setUploadProgress(100);

            setTimeout(() => {
                setUploadProgress(null);
            }, 2000);
        } catch (error) {
            setUploadProgress(null);
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
        }
    };

    const handleFileInputChange = (e) => {
        handleFileSelect(e.target.files);
        if (e.target) {
            e.target.value = '';
        }
    };

    const openFileDialog = () => {
        if (uploadDisabled) return;
        fileInputRef.current?.click();
    };

    const isContentSafe = checkContentSafety(message);
    const canSend = message.trim() && !disabled && !isGenerating && isContentSafe;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Attached Documents */}
            {selectedDocuments.size > 0 && (
                <div
                    className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Context ({selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''})
            </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {attachedDocuments
                            .filter(doc => selectedDocuments.has(doc.id))
                            .map((doc) => (
                                <Badge
                                    key={doc.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 pr-1 bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                                >
                                    <FileText className="h-3 w-3"/>
                                    <span className="truncate max-w-[120px]">{doc.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={() => handleToggleDocument(doc.id)}
                                    >
                                        <X className="h-3 w-3"/>
                                    </Button>
                                </Badge>
                            ))}
                    </div>
                </div>
            )}

            {/* Main Input */}
            <div
                className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:shadow-md transition-all">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={placeholder}
                        disabled={disabled || isGenerating}
                        className={cn(
                            "min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-4 pr-20 text-base",
                            "text-gray-900 dark:text-gray-100",
                            "focus:ring-0 focus-visible:ring-0 placeholder:text-gray-500 dark:placeholder:text-gray-400",
                            !isContentSafe && message.length > 0 && "text-red-600 dark:text-red-400"
                        )}
                        rows={1}
                    />

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between px-3 md:px-4 pb-2 md:pb-3 gap-2">
                        {/* Left Side - Source Selection - Same on both mobile and desktop */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                                <SelectTrigger
                                    className="w-24 md:w-32 h-8 border-gray-200 dark:border-gray-600 text-xs md:text-sm">
                                    <SelectValue placeholder="Source"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="web">Large model</SelectItem>
                                    <SelectItem value="docs">Medium model</SelectItem>
                                    <SelectItem value="code">Small model</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Right Side - Action Buttons */}
                        <div className="flex items-center gap-1 md:gap-2 justify-end flex-shrink-0">
                            {/* Cancel Button */}
                            {isGenerating && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancelGeneration}
                                    className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                >
                                    <Square className="h-4 w-4 md:mr-1"/>
                                    <span className="hidden md:inline text-sm whitespace-nowrap">Cancel</span>
                                </Button>
                            )}

                            {/* Retry Button */}
                            {canRetry && !isGenerating && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRetryGeneration}
                                    disabled={disabled}
                                    className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                                >
                                    <RotateCcw className="h-4 w-4 md:mr-1"/>
                                    <span className="hidden md:inline text-sm whitespace-nowrap">Retry</span>
                                </Button>
                            )}

                            {/* Voice Input - Always visible, responsive styling */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleVoiceToggle}
                                className={cn(
                                    "h-8 px-2 md:px-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0",
                                    isListening
                                        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                )}
                            >
                                <Mic className="h-4 w-4 md:mr-1"/>
                                <span className="hidden md:inline text-sm whitespace-nowrap">
                  {isListening ? 'Stop' : 'Voice'}
                </span>
                            </Button>

                            {/* Attach Documents */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 md:px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 relative flex-shrink-0"
                                    >
                                        <Paperclip className="h-4 w-4 md:mr-1"/>
                                        <span className="hidden md:inline text-sm whitespace-nowrap">Attach</span>
                                        {selectedDocuments.size > 0 && (
                                            <Badge variant="secondary"
                                                   className="ml-2 h-5 px-1 text-xs hidden md:inline-flex">
                                                {selectedDocuments.size}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end">
                                    {attachedDocuments.length === 0 ? (
                                        <div className="p-4 text-center">
                                            <div
                                                className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500"/>
                                            </div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">No
                                                documents available</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                Upload documents in the supported
                                                formats: <strong>{SUPPORTED_DOCUMENT_TYPES_LABEL}</strong>.
                                            </p>
                                            {uploadDisabled && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                                                    Storage is full. Delete existing content to upload more documents.
                                                </p>
                                            )}
                                            {onUploadDocument && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={openFileDialog}
                                                        className="mb-2"
                                                        disabled={uploadDisabled}
                                                    >
                                                        <Upload className="h-4 w-4 mr-2"/>
                                                        Upload Document
                                                    </Button>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept={DOCUMENT_ACCEPT}
                                                        onChange={handleFileInputChange}
                                                        className="hidden"
                                                        disabled={uploadDisabled}
                                                    />
                                                    {uploadProgress !== null && (
                                                        <div className="mt-2 text-xs text-gray-600">
                                                            Uploading... {Math.round(uploadProgress)}%
                                                        </div>
                                                    )}
                                                    {uploadError && (
                                                        <div className="mt-2 text-xs text-red-600">
                                                            {uploadError}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Available
                                                    Documents</h4>
                                                {onUploadDocument && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={openFileDialog}
                                                        className="h-6 px-2 text-xs"
                                                        disabled={uploadDisabled}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1"/>
                                                        Add
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {attachedDocuments.map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                                                            selectedDocuments.has(doc.id) && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                        )}
                                                        onClick={() => handleToggleDocument(doc.id)}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0",
                                                            selectedDocuments.has(doc.id)
                                                                ? "bg-blue-600 border-blue-600"
                                                                : "border-gray-300 dark:border-gray-600"
                                                        )}>
                                                            {selectedDocuments.has(doc.id) && (
                                                                <svg className="w-3 h-3 text-white" fill="none"
                                                                     viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                                          strokeWidth={3} d="M5 13l4 4L19 7"/>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <FileText
                                                            className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0"/>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                {doc.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {(doc.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept={DOCUMENT_ACCEPT}
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                                disabled={uploadDisabled}
                                            />
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>

                            {/* Send Button */}
                            <Button
                                type="submit"
                                disabled={!canSend}
                                className="h-8 w-8 md:w-auto md:px-4 p-0 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex-shrink-0"
                            >
                                <Send className="h-4 w-4 md:mr-1"/>
                                <span className="hidden md:inline text-sm whitespace-nowrap">Send</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Safety Warning */}
            {!isContentSafe && message.length > 0 && (
                <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertDescription>
                        This message may contain sensitive content. Please review before sending.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
