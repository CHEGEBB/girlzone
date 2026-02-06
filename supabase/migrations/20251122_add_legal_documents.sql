INSERT INTO documents (name, content) VALUES
('cookies_policy', 'Your Cookies Notice content goes here.'),
('underage_policy', 'Your Underage Policy content goes here.'),
('content_removal_policy', 'Your Content Removal Policy content goes here.'),
('blocked_content_policy', 'Your Blocked Content Policy content goes here.'),
('dmca_policy', 'Your DMCA Policy content goes here.'),
('complaint_policy', 'Your Complaint Policy content goes here.'),
('2257_exemption', 'Your 18 U.S.C. 2257 Exemption content goes here.'),
('community_guidelines', 'Your Community Guidelines content goes here.'),
('affiliate_terms', 'Your Affiliate Terms & Conditions content goes here.')
ON CONFLICT (name) DO NOTHING;
