import Link from "next/link";

export default function LegalHubPage() {
    const legalLinks = [
        { title: "Terms of Service", href: "/terms" },
        { title: "Privacy Notice", href: "/privacy" },
        { title: "Cookies Notice", href: "/legal/cookies" },
        { title: "Underage Policy", href: "/legal/underage-policy" },
        { title: "Content Removal Policy", href: "/legal/content-removal" },
        { title: "Blocked Content Policy", href: "/legal/blocked-content" },
        { title: "DMCA Policy", href: "/legal/dmca" },
        { title: "Complaint Policy", href: "/legal/complaint-policy" },
        { title: "18 U.S.C. 2257 Exemption", href: "/legal/2257-exemption" },
        { title: "Community Guidelines", href: "/legal/community-guidelines" },
        { title: "Affiliate Terms & Conditions", href: "/legal/affiliate-terms" },
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-20">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-12">Legal Information</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {legalLinks.map((link) => (
                        <Link 
                            key={link.href} 
                            href={link.href}
                            className="bg-[#1A1A1A] hover:bg-[#252525] p-8 rounded-lg flex items-center justify-center text-center transition-colors min-h-[120px]"
                        >
                            <span className="text-lg font-medium text-gray-200">{link.title}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
