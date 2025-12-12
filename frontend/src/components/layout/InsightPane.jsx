import React, {useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {ScrollArea} from '../ui/scroll-area';
import {DocumentUpload} from '../documents/DocumentUpload';
import {TelemetryPanel} from '../telemetry/TelemetryPanel';
import {SafetyPanel} from '../safety/SafetyPanel';
import {LogsPanel} from '../logs/LogsPanel';
import {BarChart3, Code, FileText, Shield} from 'lucide-react';

export function InsightPane({
                                documents = [],
                                onUpload,
                                onDelete,
                                uploadLoading = false,
                                telemetry,
                                telemetryLoading = false,
                                telemetryError = null,
                                operatorMode = false,
                                logs = [],
                                logsLoading = false,
                                safety = {
                                    policyMode: 'standard',
                                    violations: [],
                                    warnings: []
                                }
                            }) {
    const [activeTab, setActiveTab] = useState('documents');

    const tabs = [
        {
            id: 'documents',
            label: 'Documents',
            icon: FileText,
            content: (
                <DocumentUpload
                    documents={documents}
                    onUpload={onUpload}
                    onDelete={onDelete}
                    loading={uploadLoading}
                />
            )
        },
        {
            id: 'telemetry',
            label: 'Telemetry',
            icon: BarChart3,
            content: (
                <TelemetryPanel
                    telemetry={telemetry}
                    loading={telemetryLoading}
                    error={telemetryError}
                />
            )
        },
        {
            id: 'safety',
            label: 'Safety',
            icon: Shield,
            content: (
                <SafetyPanel
                    policyMode={safety.policyMode}
                    violations={safety.violations}
                    warnings={safety.warnings}
                />
            )
        }
    ];

    // Add logs tab only for operators
    if (operatorMode) {
        tabs.push({
            id: 'logs',
            label: 'Logs',
            icon: Code,
            content: (
                <LogsPanel
                    logs={logs}
                    loading={logsLoading}
                />
            )
        });
    }

    return (
        <div className="h-full border-l bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                {/* Tab Headers */}
                <div className="border-b px-4 pt-4">
                    <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${tabs.length}, 1fr)`}}>
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <tab.icon className="h-4 w-4"/>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {tabs.map((tab) => (
                        <TabsContent
                            key={tab.id}
                            value={tab.id}
                            className="h-full m-0 p-0 data-[state=inactive]:hidden"
                        >
                            <ScrollArea className="h-full">
                                <div className="p-4">
                                    {tab.content}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        </div>
    );
}
