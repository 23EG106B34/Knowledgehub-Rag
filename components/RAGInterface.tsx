'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
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

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  searchMode: SearchMode;
  selectedTopicId: number;
  uploadedFiles: UploadedFile[];
  messages: Message[];
}

type SearchMode = 'upload' | 'search' | 'topic';

type PendingSwitch = {
  searchMode: SearchMode;
  selectedTopicId: number;
};

const STORAGE_KEY = 'knowledgehub-rag-conversations';
const SIDEBAR_WIDTH_KEY = 'knowledgehub-rag-sidebar-width';
const COLLAPSED_WIDTH = 65;
const EXPANDED_WIDTH = 270;

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

const getCurrentTime = () => {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
};

const formatHistoryDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getConversationTitle = (messages: Message[], fallback: string) => {
  const firstQuestion = messages.find((message) => message.sender === 'user')?.text.trim();
  if (!firstQuestion) return fallback;
  return firstQuestion.length > 46 ? `${firstQuestion.slice(0, 43)}...` : firstQuestion;
};

const getModeLabel = (mode: SearchMode, topicId: number) => {
  if (mode === 'topic') {
    return BACKEND_COLLECTIONS.find((topic) => topic.id === topicId)?.name ?? 'Topic focus';
  }

  return searchModes.find((searchMode) => searchMode.value === mode)?.label ?? 'Knowledge search';
};

const isConversation = (value: unknown): value is Conversation => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<Conversation>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    (candidate.searchMode === 'search' || candidate.searchMode === 'upload' || candidate.searchMode === 'topic') &&
    typeof candidate.selectedTopicId === 'number' &&
    Array.isArray(candidate.uploadedFiles) &&
    Array.isArray(candidate.messages)
  );
};

export default function RAGInterface() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('search');
  const [selectedTopic, setSelectedTopic] = useState<number>(1);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => createId());
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasHydratedHistory, setHasHydratedHistory] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(EXPANDED_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const currentTopic = useMemo(
    () => BACKEND_COLLECTIONS.find((topic) => topic.id === selectedTopic),
    [selectedTopic],
  );

  const canSearch = searchMode !== 'upload' || uploadedFiles.length > 0;
  const selectedMode = searchModes.find((mode) => mode.value === searchMode) ?? searchModes[0];
  const hasActiveConversation = messages.length > 0 || uploadedFiles.length > 0;
  const sortedConversations = useMemo(
    () => [...conversations].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()),
    [conversations],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setConversations(parsed.filter(isConversation));
        }
      }
    } catch (error) {
      console.warn('Unable to load chat history.', error);
    } finally {
      setHasHydratedHistory(true);
    }
  }, []);

  useEffect(() => {
    try {
      const storedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(storedWidth)) {
        setSidebarWidth(Math.min(EXPANDED_WIDTH, Math.max(COLLAPSED_WIDTH, storedWidth)));
      }
    } catch (error) {
      console.warn('Unable to load sidebar width.', error);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedHistory) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.warn('Unable to save chat history.', error);
    }
  }, [conversations, hasHydratedHistory]);

  useEffect(() => {
    if (!hasHydratedHistory) return;

    const now = new Date().toISOString();
    const fallbackTitle = getModeLabel(searchMode, selectedTopic);
    setConversations((prev) => {
      const existing = prev.find((conversation) => conversation.id === activeConversationId);
      const nextConversation: Conversation = {
        id: activeConversationId,
        title: getConversationTitle(messages, existing?.title ?? fallbackTitle),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        searchMode,
        selectedTopicId: selectedTopic,
        uploadedFiles,
        messages,
      };

      if (!hasActiveConversation && !existing) return prev;
      if (existing) {
        return prev.map((conversation) => (conversation.id === activeConversationId ? nextConversation : conversation));
      }

      return [nextConversation, ...prev];
    });
  }, [activeConversationId, hasActiveConversation, hasHydratedHistory, messages, searchMode, selectedTopic, uploadedFiles]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = Math.min(EXPANDED_WIDTH, Math.max(COLLAPSED_WIDTH, event.clientX));
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
      } catch (error) {
        console.warn('Unable to save sidebar width.', error);
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingSidebar, sidebarWidth]);

  // Auto-collapse sidebar when chat starts
  useEffect(() => {
    if (hasActiveConversation && !isSidebarHovered) {
      setIsSidebarCollapsed(true);
    }
  }, [hasActiveConversation, isSidebarHovered]);

  const applyConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setSearchMode(conversation.searchMode);
    setSelectedTopic(conversation.selectedTopicId);
    setUploadedFiles(conversation.uploadedFiles);
    setMessages(conversation.messages);
    setInputValue('');
    setIsHistoryOpen(false);
  };

  const startConversation = (target?: PendingSwitch, carryMessages = false) => {
    setActiveConversationId(createId());
    setSearchMode(target?.searchMode ?? searchMode);
    setSelectedTopic(target?.selectedTopicId ?? selectedTopic);
    setUploadedFiles(target?.searchMode === 'upload' && carryMessages ? uploadedFiles : []);
    setMessages(carryMessages ? messages : []);
    setInputValue('');
    setPendingSwitch(null);
  };

  const requestContextSwitch = (target: PendingSwitch) => {
    if (target.searchMode === searchMode && target.selectedTopicId === selectedTopic) return;

    if (hasActiveConversation) {
      setPendingSwitch(target);
      return;
    }

    startConversation(target);
  };

  const continuePreviousChat = () => {
    if (!pendingSwitch) return;

    const matchingConversation = sortedConversations.find(
      (conversation) =>
        conversation.id !== activeConversationId &&
        conversation.searchMode === pendingSwitch.searchMode &&
        conversation.selectedTopicId === pendingSwitch.selectedTopicId,
    );

    if (matchingConversation) {
      applyConversation(matchingConversation);
      setPendingSwitch(null);
      return;
    }

    startConversation(pendingSwitch, true);
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

      const data = (await response.json()) as { answer?: string; error?: string; providerError?: string; source?: string };

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with status ${response.status}`);
      }

      const isFallback = data.source === 'local-fallback';
      const answerText = isFallback && data.providerError ? `${data.providerError}\n\n${data.answer}` : data.answer;

      addAssistantMessage(
        answerText ?? 'I could not generate an answer for that question.',
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
    <main className="h-screen overflow-hidden bg-[#f5f7fb] text-slate-950 dark:bg-[#111318] dark:text-slate-100">
      <div
        className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[var(--sidebar-width)_1fr]"
        style={{ '--sidebar-width': `${isSidebarCollapsed && !isSidebarHovered ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px` } as React.CSSProperties}
      >
        <aside
          ref={sidebarRef}
          className="sticky top-0 z-30 max-h-[46vh] overflow-y-auto border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#171a21]/95 lg:relative lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r lg:px-5 transition-all duration-250 ease-in-out"
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              {(isSidebarHovered || !isSidebarCollapsed) && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">KnowledgeHub RAG</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">Research workspace</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startConversation()}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                aria-label="Start new chat"
                title="Start new chat"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                aria-label="Toggle color theme"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {(isSidebarHovered || !isSidebarCollapsed) && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
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
                      onClick={() => requestContextSwitch({ searchMode: mode.value, selectedTopicId: selectedTopic })}
                      className={`flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-indigo-400/50 dark:bg-indigo-500/20 dark:text-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]'
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
          )}

          {(isSidebarHovered || !isSidebarCollapsed) && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              {searchMode === 'upload' && (
                <div>
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-white/15 dark:bg-white/[0.04] dark:hover:border-indigo-300/60 dark:hover:bg-indigo-400/10">
                    <Upload className="mb-2 size-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
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
                          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]"
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <FileText className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
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
                    onChange={(event) => requestContextSwitch({ searchMode: 'topic', selectedTopicId: Number(event.target.value) })}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-[#20242c] dark:text-white dark:focus:border-indigo-300"
                  >
                    {BACKEND_COLLECTIONS.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>

                  {currentTopic && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]">
                      <p className="text-sm font-semibold">{currentTopic.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{currentTopic.description}</p>
                      <span className="mt-3 inline-flex rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200">
                        {currentTopic.category}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {searchMode === 'search' && (
                <div className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <Search className="mb-3 size-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  Ask a question across all pre-loaded engineering, AI, data, and security topics.
                </div>
              )}
            </div>
          )}

          {(isSidebarHovered || !isSidebarCollapsed) && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsHistoryOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                <span className="inline-flex items-center gap-2">
                  <History className="size-4" aria-hidden="true" />
                  Chat history
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {sortedConversations.length}
                </span>
              </button>

              <div className={`${isHistoryOpen ? 'grid' : 'hidden'} mt-3 gap-2 lg:grid`}>
                {sortedConversations.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                    Previous chats will appear here.
                  </p>
                ) : (
                  sortedConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => applyConversation(conversation)}
                      className={`rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                        conversation.id === activeConversationId
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-950 dark:border-indigo-400/40 dark:bg-indigo-400/10 dark:text-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{conversation.title}</span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="size-3" aria-hidden="true" />
                            {formatHistoryDate(conversation.updatedAt)}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                            {getModeLabel(conversation.searchMode, conversation.selectedTopicId)}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            className={`absolute right-0 top-0 hidden h-full w-2 translate-x-1 cursor-col-resize items-center justify-center transition lg:flex ${
              isResizingSidebar ? 'bg-indigo-400/20' : 'hover:bg-indigo-400/10'
            }`}
            aria-label="Resize sidebar"
            title="Drag to resize sidebar"
          >
            <span className="h-12 w-1 rounded-full bg-slate-300 transition group-hover:bg-indigo-400 dark:bg-slate-600" />
          </button>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#171a21]/90 sm:px-6">
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
              <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
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
                    <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
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
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-indigo-400/30 dark:bg-indigo-500/20 dark:text-indigo-50'
                          : message.status === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
                            : message.status === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
                              : 'border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100'
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
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Generating answer...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="border-t border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#171a21]/95 sm:px-6">
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
                className="max-h-32 min-h-12 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-[#20242c] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-300 dark:focus:ring-indigo-400/20 dark:disabled:bg-white/[0.03]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || !canSearch}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400 dark:disabled:bg-white/20 dark:disabled:text-white/50"
                aria-label="Send question"
                title="Send"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
              </button>
            </form>
          </footer>
        </section>
      </div>

      {pendingSwitch && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm dark:bg-slate-950/60" role="presentation">
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1b1f27]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-chat-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="switch-chat-title" className="text-lg font-semibold text-slate-950 dark:text-white">
                  Switch conversation context?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  You have an active chat. Continue a previous chat for this mode or start a clean conversation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingSwitch(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close dialog"
                title="Close"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={continuePreviousChat}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-indigo-400/10"
              >
                Continue Previous Chat
              </button>
              <button
                type="button"
                onClick={() => startConversation(pendingSwitch)}
                className="rounded-lg bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}