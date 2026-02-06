-- Insert available models for purchase
INSERT INTO models (name, description, category, token_cost, is_premium, features) VALUES
('Stability AI Pro', 'High-quality image generation with advanced control', 'Image Generation', 0, false, '{"quality": "high", "speed": "fast", "control": "advanced"}'),
('FLUX Pro', 'Next-generation image generation with superior quality', 'Image Generation', 0, false, '{"quality": "superior", "speed": "medium", "control": "basic"}'),
('Anime Style v2', 'Enhanced anime character generation with better details', 'Anime', 50, true, '{"style": "anime", "quality": "enhanced", "details": "high"}'),
('Realistic Portrait Pro', 'Professional-grade realistic human portraits', 'Realistic', 75, true, '{"style": "realistic", "quality": "professional", "details": "photorealistic"}'),
('Fantasy Art Master', 'Epic fantasy characters and creatures', 'Fantasy', 60, true, '{"style": "fantasy", "quality": "epic", "creatures": "detailed"}'),
('Cyberpunk Style', 'Futuristic cyberpunk aesthetics and environments', 'Sci-Fi', 55, true, '{"style": "cyberpunk", "quality": "futuristic", "environments": "detailed"}'),
('Oil Painting Classic', 'Classical oil painting style with artistic flair', 'Artistic', 45, true, '{"style": "oil_painting", "quality": "classical", "artistic": "high"}'),
('Manga Style Pro', 'Traditional manga art with professional quality', 'Anime', 40, true, '{"style": "manga", "quality": "professional", "traditional": "authentic"}'),
('Character Creator Pro', 'Advanced character creation with multiple styles', 'Character', 100, true, '{"styles": "multiple", "quality": "advanced", "customization": "extensive"}'),
('Environment Master', 'Detailed environment and background generation', 'Environment', 80, true, '{"environments": "detailed", "quality": "high", "variety": "extensive"}');
