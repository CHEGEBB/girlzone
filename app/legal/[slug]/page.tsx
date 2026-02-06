import { notFound } from "next/navigation";
import {
    getCookiesPolicy,
    getUnderagePolicy,
    getContentRemovalPolicy,
    getBlockedContentPolicy,
    getDMCAPolicy,
    getComplaintPolicy,
    get2257Exemption,
    getCommunityGuidelines,
    getAffiliateTerms
} from "@/app/actions/document-actions";

export const dynamic = 'force-dynamic';

const policyMap: Record<string, { title: string; action: () => Promise<string> }> = {
    "cookies": { title: "Cookies Notice", action: getCookiesPolicy },
    "underage-policy": { title: "Underage Policy", action: getUnderagePolicy },
    "content-removal": { title: "Content Removal Policy", action: getContentRemovalPolicy },
    "blocked-content": { title: "Blocked Content Policy", action: getBlockedContentPolicy },
    "dmca": { title: "DMCA Policy", action: getDMCAPolicy },
    "complaint-policy": { title: "Complaint Policy", action: getComplaintPolicy },
    "2257-exemption": { title: "18 U.S.C. 2257 Exemption", action: get2257Exemption },
    "community-guidelines": { title: "Community Guidelines", action: getCommunityGuidelines },
    "affiliate-terms": { title: "Affiliate Terms & Conditions", action: getAffiliateTerms },
};

export default async function LegalDocPage({ params }: { params: { slug: string } }) {
    const doc = policyMap[params.slug];

    if (!doc) {
        notFound();
    }

    const content = await doc.action();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{doc.title}</h1>
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
}
