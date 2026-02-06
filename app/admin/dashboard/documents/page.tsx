import {
    getPrivacyPolicy,
    getTermsOfService,
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
import DocumentsClient from "./documents-client";

export default async function DocumentsPage() {
    // Fetch all documents
    const privacyPolicy = await getPrivacyPolicy();
    const termsOfService = await getTermsOfService();
    const cookiesPolicy = await getCookiesPolicy();
    const underagePolicy = await getUnderagePolicy();
    const contentRemovalPolicy = await getContentRemovalPolicy();
    const blockedContentPolicy = await getBlockedContentPolicy();
    const dmcaPolicy = await getDMCAPolicy();
    const complaintPolicy = await getComplaintPolicy();
    const exemption2257 = await get2257Exemption();
    const communityGuidelines = await getCommunityGuidelines();
    const affiliateTerms = await getAffiliateTerms();

    // Prepare data for client component
    // Note: The order here determines the sidebar order
    const documents = [
        { title: "Terms of Service", content: termsOfService, updateAction: "updateTermsOfService" as const },
        { title: "Privacy Policy", content: privacyPolicy, updateAction: "updatePrivacyPolicy" as const },
        { title: "Cookies Notice", content: cookiesPolicy, updateAction: "updateCookiesPolicy" as const },
        { title: "Underage Policy", content: underagePolicy, updateAction: "updateUnderagePolicy" as const },
        { title: "Content Removal Policy", content: contentRemovalPolicy, updateAction: "updateContentRemovalPolicy" as const },
        { title: "Blocked Content Policy", content: blockedContentPolicy, updateAction: "updateBlockedContentPolicy" as const },
        { title: "DMCA Policy", content: dmcaPolicy, updateAction: "updateDMCAPolicy" as const },
        { title: "Complaint Policy", content: complaintPolicy, updateAction: "updateComplaintPolicy" as const },
        { title: "18 U.S.C. 2257 Exemption", content: exemption2257, updateAction: "update2257Exemption" as const },
        { title: "Community Guidelines", content: communityGuidelines, updateAction: "updateCommunityGuidelines" as const },
        { title: "Affiliate Terms & Conditions", content: affiliateTerms, updateAction: "updateAffiliateTerms" as const },
    ];

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Document Management</h1>
            <DocumentsClient documents={documents} />
        </div>
    );
}
