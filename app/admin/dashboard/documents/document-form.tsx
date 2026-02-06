"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
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
    updateAffiliateTerms,
    formatDocumentContent
} from "@/app/actions/document-actions";

interface DocumentFormProps {
    title: string;
    content: string;
    updateAction: keyof typeof actions;
}

const actions = {
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
};

export default function DocumentForm({ title, content, updateAction }: DocumentFormProps) {
    const [newContent, setNewContent] = useState(content);
    const [message, setMessage] = useState("");
    const [isFormatting, setIsFormatting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const action = actions[updateAction];
        const result = await action(newContent);
        if (result.error) {
            setMessage(result.error);
        } else if (result.success) {
            setMessage(result.success);
        }
    };

    const handleAutoFormat = async () => {
        setIsFormatting(true);
        setMessage("");
        
        try {
            const result = await formatDocumentContent(newContent);
            if (result.error) {
                setMessage(result.error);
            } else if (result.success) {
                setNewContent(result.success);
                setMessage("Document formatted successfully! Review the changes before saving.");
            }
        } catch (error) {
            setMessage("An error occurred while formatting.");
        } finally {
            setIsFormatting(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAutoFormat}
                    disabled={isFormatting}
                    className="gap-2"
                >
                    {isFormatting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Formatting...
                        </>
                    ) : (
                        <>
                            <Wand2 className="h-4 w-4" />
                            AI Auto-Format
                        </>
                    )}
                </Button>
            </div>
            <form onSubmit={handleSubmit}>
                <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={20}
                    className="mb-4 font-mono text-sm"
                />
                <div className="flex justify-end">
                    <Button type="submit">Update {title}</Button>
                </div>
            </form>
            {message && <p className="mt-4 text-sm font-medium">{message}</p>}
        </div>
    );
}
