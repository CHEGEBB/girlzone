"use client"

import { FAQSection } from "@/components/faq-section";
import { useSite } from "@/components/site-context";

export default function Faq() {
  const { settings } = useSite()

  return (
    <div style={{ backgroundColor: "black", color: "white", padding: "4rem 0" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2>
          {settings.logoText} FAQS
        </h2>
      </div>
      <FAQSection />
    </div>
  );
}
