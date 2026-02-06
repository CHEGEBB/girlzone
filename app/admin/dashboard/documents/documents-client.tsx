"use client";

import { useState } from "react";
import DocumentForm from "./document-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    updatePrivacyPolicy,
    updateTermsOfService,
    updateCookiesPolicy,
    updateUnderagePolicy,
    updateContentRemovalPolicy,
    updateBlockedContentPolicy,
    updateDMCAPolicy,
    updateComplaintPolicy,
    update2257Exemption,
    updateCommunityGuidelines,
    updateAffiliateTerms
} from "@/app/actions/document-actions";

// We need to map the action keys to the actual content we receive
// Since we can't easily pass the update function name as a string to be resolved on the client without a map,
// we'll reuse the map concept from the form or just pass the action name.
// Actually, DocumentForm takes `updateAction` as a string key of the `actions` object defined INSIDE DocumentForm.
// So we just need to pass the correct string key.

type DocumentData = {
    title: string;
    content: string;
    updateAction: "updatePrivacyPolicy" | "updateTermsOfService" | "updateCookiesPolicy" | "updateUnderagePolicy" | "updateContentRemovalPolicy" | "updateBlockedContentPolicy" | "updateDMCAPolicy" | "updateComplaintPolicy" | "update2257Exemption" | "updateCommunityGuidelines" | "updateAffiliateTerms";
};

interface DocumentsClientProps {
    documents: DocumentData[];
}

export default function DocumentsClient({ documents }: DocumentsClientProps) {
    const [selectedDocIndex, setSelectedDocIndex] = useState(0);
    const selectedDoc = documents[selectedDocIndex];

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <Card className="w-full md:w-1/4 p-4 flex flex-col gap-2 bg-card/50">
                <ScrollArea className="h-full pr-4">
                    <div className="flex flex-col gap-2">
                        {documents.map((doc, index) => (
                            <Button
                                key={doc.title}
                                variant={selectedDocIndex === index ? "default" : "ghost"}
                                className={cn(
                                    "justify-start text-left h-auto py-3 px-4 whitespace-normal",
                                    selectedDocIndex === index ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                )}
                                onClick={() => setSelectedDocIndex(index)}
                            >
                                {doc.title}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Editor Area */}
            <Card className="w-full md:w-3/4 p-6 bg-card">
                <div className="h-full flex flex-col">
                    <div className="mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold">{selectedDoc.title}</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Edit the content for this policy page.
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <DocumentForm 
                            // Add a key to force re-render when switching docs so state resets
                            key={selectedDoc.updateAction} 
                            title={selectedDoc.title} 
                            content={selectedDoc.content} 
                            updateAction={selectedDoc.updateAction} 
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}
