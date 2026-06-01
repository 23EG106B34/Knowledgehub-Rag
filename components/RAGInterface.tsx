'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Moon,
  PanelLeft,
  Search,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { BACKEND_COLLECTIONS } from '@/lib/backendCollections';
import { useTheme } from '@/components/ThemeProvider';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  status?: 'normal' | 'warning' | 'error';
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

type SearchMode = 'upload' | 'search' | 'topic';

const searchModes: Array<{
  value: SearchMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'search',
    label: 'Knowledge search',
    description: 'Search the complete curated base',
    icon: Search,
  },
  {
    value: 'upload',
    label: 'Document search',
    description: 'Ask against uploaded files',
    icon: Upload,
  },
  {
    value: 'topic',
    label: 'Topic focus',
    description: 'Limit answers to one collection',
    icon: BookOpen,
  },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function RAGInterface() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [selectedTopic, setSelectedTopic] = useState<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTopic = useMemo(
    () => BACKEND_COLLECTIONS.find((topic) => topic.id === selectedTopic),
    [selectedTopic],
  );

  const canSearch = searchMode !== 'upload' || uploadedFiles.length > 0;
  const selectedMode = searchModes.find((mode) => mode.value === searchMode) ?? searchModes[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const getCurrentTime = () => {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  };

  const resetMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setMessages([]);
  };

  const addAssistantMessage = (text: string, status: Message['status'] = 'normal') => {
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        text,
        sender: 'ai',
        timestamp: getCurrentTime(),
        status,
      },
    ]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const nextFiles = Array.from(files).map((file) => ({
      id: createId(),
      name: file.name,
      size: file.size,
    }));

    setUploadedFiles((prev) => [...prev, ...nextFiles]);
    addAssistantMessage(
      `${nextFiles.length} document${nextFiles.length === 1 ? '' : 's'} added and ready for search.`,
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const question = inputValue.trim();
    if (!question || isLoading || !canSearch) return;

    const userMessage: Message = {
      id: createId(),
      text: question,
      sender: 'user',
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          searchMode,
          documents: uploadedFiles,
          selectedTopicId: selectedTopic,
        }),
      });

      const data = (await response.json()) as { answer?: string; error?: string; source?: string };

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with status ${response.status}`);
      }

      const isFallback = data.source === 'local-fallback';
      addAssistantMessage(
        data.answer ?? 'I could not generate an answer for that question.',
        isFallback ? 'warning' : 'normal',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to the AI service.';
      addAssistantMessage(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const statusLabel = useMemo(() => {
    if (searchMode === 'upload') {
      return uploadedFiles.length === 0
        ? 'Upload at least one document to search'
        : `${uploadedFiles.length} document${uploadedFiles.length === 1 ? '' : 's'} ready`;
    }

    if (searchMode === 'topic') {
      return currentTopic ? `Focused on ${currentTopic.name}` : 'Select a topic';
    }

    return `${BACKEND_COLLECTIONS.length} curated topics available`;
  }, [currentTopic, searchMode, uploadedFiles.length]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950 dark:bg-[#080a0f] dark:text-slate-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[22rem_1fr]">
        <aside className="border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#0d1118]/95 lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">KnowledgeHub RAG</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">Research workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label="Toggle color theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            </button>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search mode
            </p>
            <div className="grid gap-2" role="radiogroup" aria-label="Search mode">
              {searchModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = searchMode === mode.value;

                return (
                  <button
                    key={mode.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => resetMode(mode.value)}
                    className={`flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]'
                    }`}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{mode.label}</span>
                      <span className={`block text-xs ${isActive ? 'opacity-75' : 'text-slate-500 dark:text-slate-400'}`}>
                        {mode.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            {searchMode === 'upload' && (
              <div>
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-slate-500 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]">
                  <Upload className="mb-2 size-5 text-slate-500" aria-hidden="true" />
                  <span className="text-sm font-semibold">Upload files</span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, TXT, CSV, or Markdown</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.csv,.md"
                    onChange={handleFileUpload}
                    className="sr-only"
                    aria-label="Upload documents"
                  />
                </label>

                <div className="mt-4 grid gap-2">
                  {uploadedFiles.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No documents uploaded yet.</p>
                  ) : (
                    uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <FileText className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                          aria-label={`Remove ${file.name}`}
                          title="Remove file"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {searchMode === 'topic' && (
              <div>
                <label htmlFor="topic-select" className="mb-2 block text-sm font-semibold">
                  Topic collection
                </label>
                <select
                  id="topic-select"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(Number(event.target.value))}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-300 dark:border-white/10 dark:bg-[#111722] dark:text-white dark:focus:border-white"
                >
                  {BACKEND_COLLECTIONS.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>

                {currentTopic && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-sm font-semibold">{currentTopic.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{currentTopic.description}</p>
                    <span className="mt-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {currentTopic.category}
                    </span>
                  </div>
                )}
              </div>
            )}

            {searchMode === 'search' && (
              <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                <Search className="mb-3 size-5 text-slate-500" aria-hidden="true" />
                Ask a question across all pre-loaded engineering, AI, data, and security topics.
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-[#0d1118]/80 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <PanelLeft className="size-4" aria-hidden="true" />
                  <span>{selectedMode.label}</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                  Ask your knowledge base
                </h1>
              </div>
              <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {canSearch ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                )}
                <span className="truncate">{statusLabel}</span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {messages.length === 0 ? (
                <div className="grid min-h-[55vh] place-items-center">
                  <div className="max-w-xl text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <BookOpen className="size-6 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">Ready for a precise answer</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Choose a mode, ask a focused question, and KnowledgeHub will answer using the configured model with a local knowledge fallback.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    aria-label={`${message.sender === 'user' ? 'Your' : 'Assistant'} message`}
                  >
                    <div
                      className={`max-w-[min(44rem,92%)] rounded-xl border px-4 py-3 shadow-sm ${
                        message.sender === 'user'
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : message.status === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
                            : message.status === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
                              : 'border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                      <p className={`mt-2 text-xs ${message.sender === 'user' ? 'opacity-70' : 'text-slate-500 dark:text-slate-400'}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </article>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Generating answer...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-white/90 px-4 py-4 dark:border-white/10 dark:bg-[#0d1118]/95 sm:px-6">
            <form onSubmit={handleSendMessage} className="mx-auto flex max-w-4xl items-end gap-3">
              <label htmlFor="question" className="sr-only">
                Ask a question
              </label>
              <textarea
                id="question"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={canSearch ? 'Ask a question...' : 'Upload a document before asking...'}
                disabled={isLoading || !canSearch}
                rows={1}
                className="max-h-32 min-h-12 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white dark:disabled:bg-white/[0.02]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || !canSearch}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-white/20 dark:disabled:text-white/50"
                aria-label="Send question"
                title="Send"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
              </button>
            </form>
          </footer>
        </section>
      </div>
    </main>
  );
}
