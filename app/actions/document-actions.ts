"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getApiKey } from "@/lib/db-init";

// Generic get function
async function getDocument(name: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("documents")
        .select("content")
        .eq("name", name)
        .single();

    if (error) {
        console.error(`Error fetching ${name}:`, error);
        return "";
    }

    return data.content;
}

// Generic update function
async function updateDocument(name: string, content: string, path: string = "/legal") {
    const supabase = createClient();
    const { error } = await supabase
        .from("documents")
        .update({ content })
        .eq("name", name);

    if (error) {
        console.error(`Error updating ${name}:`, error);
        return { error: `Failed to update ${name}.` };
    }

    if (path) revalidatePath(path);
    revalidatePath("/admin/dashboard/documents");

    return { success: `${name.replace(/_/g, " ")} updated successfully.` };
}

// Existing
export async function getPrivacyPolicy() { return getDocument("privacy_policy"); }
export async function getTermsOfService() { return getDocument("terms_of_service"); }
export async function updatePrivacyPolicy(content: string) { return updateDocument("privacy_policy", content, "/privacy"); }
export async function updateTermsOfService(content: string) { return updateDocument("terms_of_service", content, "/terms"); }

// New
export async function getCookiesPolicy() { return getDocument("cookies_policy"); }
export async function getUnderagePolicy() { return getDocument("underage_policy"); }
export async function getContentRemovalPolicy() { return getDocument("content_removal_policy"); }
export async function getBlockedContentPolicy() { return getDocument("blocked_content_policy"); }
export async function getDMCAPolicy() { return getDocument("dmca_policy"); }
export async function getComplaintPolicy() { return getDocument("complaint_policy"); }
export async function get2257Exemption() { return getDocument("2257_exemption"); }
export async function getCommunityGuidelines() { return getDocument("community_guidelines"); }
export async function getAffiliateTerms() { return getDocument("affiliate_terms"); }

export async function updateCookiesPolicy(content: string) { return updateDocument("cookies_policy", content, "/legal/cookies"); }
export async function updateUnderagePolicy(content: string) { return updateDocument("underage_policy", content, "/legal/underage-policy"); }
export async function updateContentRemovalPolicy(content: string) { return updateDocument("content_removal_policy", content, "/legal/content-removal"); }
export async function updateBlockedContentPolicy(content: string) { return updateDocument("blocked_content_policy", content, "/legal/blocked-content"); }
export async function updateDMCAPolicy(content: string) { return updateDocument("dmca_policy", content, "/legal/dmca"); }
export async function updateComplaintPolicy(content: string) { return updateDocument("complaint_policy", content, "/legal/complaint-policy"); }
export async function update2257Exemption(content: string) { return updateDocument("2257_exemption", content, "/legal/2257-exemption"); }
export async function updateCommunityGuidelines(content: string) { return updateDocument("community_guidelines", content, "/legal/community-guidelines"); }
export async function updateAffiliateTerms(content: string) { return updateDocument("affiliate_terms", content, "/legal/affiliate-terms"); }

// AI Formatting
export async function formatDocumentContent(content: string) {
    try {
        let apiKey: string | null = process.env.NOVITA_API_KEY || process.env.NEXT_PUBLIC_NOVITA_API_KEY || null;

        if (!apiKey) {
            apiKey = await getApiKey("novita_api_key");
        }

        if (!apiKey) {
            return { error: "No API key found. Please configure the Novita API key in settings." };
        }

        const systemPrompt = `You are an expert document formatter. Your task is to take the provided text and format it into clean, well-structured HTML suitable for a legal document or policy page. 
        
        Rules:
        1. Use proper headings (<h2>, <h3>) for section titles.
        2. Use paragraphs (<p>) for body text.
        3. Use lists (<ul>, <ol>, <li>) for bullet points or numbered lists.
        4. Add <strong> tags for emphasis where appropriate (e.g., defined terms).
        5. Do NOT change the meaning or wording of the text, only the formatting and structure.
        6. Return ONLY the formatted HTML content. Do NOT wrap it in markdown code blocks (like \`\`\`html). Do NOT include any introductory or concluding remarks.`;

        const response = await fetch("https://api.novita.ai/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3.1-8b-instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: content }
                ],
                temperature: 0.3, // Lower temperature for more deterministic formatting
                max_tokens: 4000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Novita API error:", response.status, errorText);
            return { error: `API request failed: ${response.status}` };
        }

        const completion = await response.json();
        const formattedContent = completion.choices[0].message.content;

        return { success: formattedContent };
    } catch (error) {
        console.error("Error formatting document:", error);
        return { error: "Failed to format document with AI." };
    }
}
