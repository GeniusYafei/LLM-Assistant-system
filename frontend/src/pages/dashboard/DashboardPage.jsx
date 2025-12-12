import React from 'react';
import {Building2, MessageSquare} from 'lucide-react';
import {Badge} from '../../components/ui/badge.jsx';
import {Button} from '../../components/ui/button.jsx';
import {OrganizationSelector} from '../../components/organization/OrganizationSelector.jsx';
import {MessageList} from '../../components/chat/MessageList.jsx';
import {MessageInput} from '../../components/chat/MessageInput.jsx';
import {StorageWarningBanner} from '../../components/storage/StorageWarningBanner.jsx';
import {getStorageWarningLevel, isStorageFull} from '../../utils/storageConfig.jsx';

export function DashboardPage({
                                  filters,
                                  onFiltersChange,
                                  organizations,
                                  selectedOrganizationId,
                                  onSelectOrganization,
                                  onStartConversation,
                                  activeConversationId,
                                  displayMessages,
                                  isGenerating,
                                  canRetry,
                                  onSendMessage,
                                  onCancelGeneration,
                                  onRetryGeneration,
                                  documents,
                                  onUploadDocument,
                                  createConversationLoading,
                                  storageUsed,
                                  storageQuota,
                                  user,
                                  onManageStorage,
                              }) {
    const selectedOrganization = organizations.find((org) => org.id === selectedOrganizationId);
    const organizationName = selectedOrganization?.displayName || selectedOrganization?.name;
    const [storageBannerDismissed, setStorageBannerDismissed] = React.useState(false);
    const lastBannerLevelRef = React.useRef(null);
    const storageLevel = getStorageWarningLevel(storageUsed, storageQuota);
    const storageFull = isStorageFull(storageUsed, storageQuota);
    const shouldShowBanner = Boolean(storageLevel) && !storageBannerDismissed;
    React.useEffect(() => {
        if (!storageLevel) {
            lastBannerLevelRef.current = null;
            return;
        }
        if (lastBannerLevelRef.current && storageLevel !== lastBannerLevelRef.current) {
            setStorageBannerDismissed(false);
        }
        lastBannerLevelRef.current = storageLevel;
    }, [storageLevel]);
    const quickActions = [
        {title: 'Creative Writing', description: 'Help me write a story or poem'},
        {title: 'Problem Solving', description: 'Analyze and solve complex problems'},
        {title: 'Code & Development', description: 'Write, debug, and explain code'},
        {title: 'Learning & Research', description: 'Explain concepts and research topics'},
    ];

    return (
        <>
            {/* Header */}
            <header
                className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-shrink">
                        <h1 className="font-semibold text-lg md:text-xl text-gray-900 dark:text-white truncate">JinKo
                            Solar</h1>
                        <Badge
                            variant="secondary"
                            className="hidden sm:inline-flex bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 flex-shrink-0"
                        >
                            Enterprise
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        {/* <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              organizationName={organizationName}
              className="hidden md:flex"
            /> */}

                        <OrganizationSelector
                            organizations={organizations}
                            selectedOrganizationId={selectedOrganizationId}
                            onSelectOrganization={onSelectOrganization}
                        />
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {!selectedOrganizationId ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-2xl px-8">
                            <div
                                className="w-20 h-20 mx-auto bg-blue-600 dark:bg-blue-500 rounded-3xl flex items-center justify-center">
                                <Building2 className="h-10 w-10 text-white"/>
                            </div>
                            <div>
                                <h3 className="text-3xl font-semibold mb-4 text-gray-900 dark:text-white">Select an
                                    Organization</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                                    Choose an organization from the dropdown above to start chatting. All conversations
                                    are scoped to your selected
                                    organization.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : !activeConversationId ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-2xl px-8">
                            <div
                                className="w-20 h-20 mx-auto bg-blue-600 dark:bg-blue-500 rounded-3xl flex items-center justify-center">
                                <MessageSquare className="h-10 w-10 text-white"/>
                            </div>
                            <div>
                                <h3 className="text-3xl font-semibold mb-4 text-gray-900 dark:text-white">How can I help
                                    you today?</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                                    I'm your AI assistant. I can help you with questions, creative tasks,
                                    analysis, coding, and much more.
                                    What would you like to explore?
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8">
                                {quickActions.map(({title, description}) => (
                                    <Button
                                        key={title}
                                        variant="outline"
                                        className="p-4 md:p-6 h-auto text-left justify-start border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={onStartConversation}
                                    >
                                        <div>
                                            <div
                                                className="font-medium text-sm md:text-base text-gray-900 dark:text-white">{title}</div>
                                            <div
                                                className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {shouldShowBanner && (
                            <div className="flex-shrink-0 px-3 md:px-6">
                                <StorageWarningBanner
                                    usedBytes={storageUsed}
                                    quotaBytes={storageQuota}
                                    level={storageLevel}
                                    onDismiss={() => setStorageBannerDismissed(true)}
                                    onManageStorage={onManageStorage}
                                />
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-hidden ">
                            <MessageList messages={displayMessages} isGenerating={isGenerating} user={user}
                                         attachedDocuments={documents}/>
                        </div>
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 md:p-6">
                <MessageInput
                    onSendMessage={onSendMessage}
                    onCancelGeneration={onCancelGeneration}
                    onRetryGeneration={onRetryGeneration}
                    isGenerating={isGenerating}
                    canRetry={canRetry}
                    attachedDocuments={documents}
                    onUploadDocument={onUploadDocument}
                    disabled={createConversationLoading}
                    uploadDisabled={storageFull}
                    placeholder={activeConversationId ? 'Message AI assistant...' : 'What are the best open opportunities by company size?'}
                />

                <div className="mt-3 md:mt-4 text-center hidden md:block">
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        AI assistant may display inaccurate info, so please double-check the responses.{' '}
                        <button className="underline hover:text-gray-700 dark:hover:text-gray-300">Your Privacy & Terms
                        </button>
                    </p>
                </div>
            </div>
        </>
    );
}

export default DashboardPage;
