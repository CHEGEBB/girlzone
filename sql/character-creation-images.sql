-- Character Creation Images Management System
-- This SQL script creates tables for managing images used in character creation steps

-- Create image categories table
CREATE TABLE IF NOT EXISTS character_image_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create image options table
CREATE TABLE IF NOT EXISTS character_image_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES character_image_categories(id) ON DELETE CASCADE,
  option_key VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, option_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_character_image_categories_step_order ON character_image_categories(step_order);
CREATE INDEX IF NOT EXISTS idx_character_image_categories_is_active ON character_image_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_character_image_options_category_id ON character_image_options(category_id);
CREATE INDEX IF NOT EXISTS idx_character_image_options_is_active ON character_image_options(is_active);
CREATE INDEX IF NOT EXISTS idx_character_image_options_sort_order ON character_image_options(sort_order);

-- Enable Row Level Security
ALTER TABLE character_image_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_image_options ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to image categories" 
  ON character_image_categories FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Allow public read access to image options" 
  ON character_image_options FOR SELECT 
  USING (is_active = true);

-- Create policies for admin access
CREATE POLICY "Allow admin full access to image categories"
  ON character_image_categories FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Allow admin full access to image options"
  ON character_image_options FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Insert default categories based on the character creation flow
INSERT INTO character_image_categories (name, display_name, description, step_order) VALUES
('style', 'Character Style', 'Choose between realistic or anime style', 0),
('ethnicity', 'Ethnicity', 'Choose character ethnicity', 1),
('age', 'Age Range', 'Choose character age range', 2),
('eye_color', 'Eye Color', 'Choose character eye color', 3),
('hair_style', 'Hair Style', 'Choose character hair style', 4),
('hair_color', 'Hair Color', 'Choose character hair color', 5),
('body_type', 'Body Type', 'Choose character body type', 6),
('breast_size', 'Breast Size', 'Choose character breast size', 7),
('butt_size', 'Butt Size', 'Choose character butt size', 8),
('personality', 'Personality', 'Choose character personality type', 9),
('relationship', 'Relationship', 'Choose relationship type', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert default image options for each category
-- Style options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'realistic', 'Realistic', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face', 1
FROM character_image_categories WHERE name = 'style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'anime', 'Anime', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop&crop=face', 2
FROM character_image_categories WHERE name = 'style';

-- Ethnicity options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'caucasian', 'Caucasian', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=300&fit=crop&crop=face', 1
FROM character_image_categories WHERE name = 'ethnicity';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'latina', 'Latina', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=face', 2
FROM character_image_categories WHERE name = 'ethnicity';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'asian', 'Asian', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=face', 3
FROM character_image_categories WHERE name = 'ethnicity';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'african', 'African', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=face', 4
FROM character_image_categories WHERE name = 'ethnicity';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'indian', 'Indian', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=face', 5
FROM character_image_categories WHERE name = 'ethnicity';

-- Eye color options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'brown', 'Brown', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=150&fit=crop&crop=eyes', 1
FROM character_image_categories WHERE name = 'eye_color';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'blue', 'Blue', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=150&fit=crop&crop=eyes', 2
FROM character_image_categories WHERE name = 'eye_color';

-- Hair style options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'straight', 'Straight', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=hair', 1
FROM character_image_categories WHERE name = 'hair_style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'curly', 'Curly', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair', 2
FROM character_image_categories WHERE name = 'hair_style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'wavy', 'Wavy', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair', 3
FROM character_image_categories WHERE name = 'hair_style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'short', 'Short', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair', 4
FROM character_image_categories WHERE name = 'hair_style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'long', 'Long', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair', 5
FROM character_image_categories WHERE name = 'hair_style';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'bob', 'Bob Cut', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair', 6
FROM character_image_categories WHERE name = 'hair_style';

-- Hair color options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'blonde', 'Blonde', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=hair', 1
FROM character_image_categories WHERE name = 'hair_color';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'brunette', 'Brunette', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair', 2
FROM character_image_categories WHERE name = 'hair_color';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'black', 'Black', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair', 3
FROM character_image_categories WHERE name = 'hair_color';

-- Body type options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'petite', 'Petite', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body', 1
FROM character_image_categories WHERE name = 'body_type';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'slim', 'Slim', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body', 2
FROM character_image_categories WHERE name = 'body_type';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'athletic', 'Athletic', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body', 3
FROM character_image_categories WHERE name = 'body_type';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'voluptuous', 'Voluptuous', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body', 4
FROM character_image_categories WHERE name = 'body_type';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'curvy', 'Curvy', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body', 5
FROM character_image_categories WHERE name = 'body_type';

-- Breast size options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'small', 'Small', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body', 1
FROM character_image_categories WHERE name = 'breast_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'medium', 'Medium', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body', 2
FROM character_image_categories WHERE name = 'breast_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'large', 'Large', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body', 3
FROM character_image_categories WHERE name = 'breast_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'huge', 'Huge', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body', 4
FROM character_image_categories WHERE name = 'breast_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'xlarge', 'X-Large', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body', 5
FROM character_image_categories WHERE name = 'breast_size';

-- Butt size options
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'small', 'Small', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body', 1
FROM character_image_categories WHERE name = 'butt_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'medium', 'Medium', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body', 2
FROM character_image_categories WHERE name = 'butt_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'large', 'Large', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body', 3
FROM character_image_categories WHERE name = 'butt_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'athletic', 'Athletic', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body', 4
FROM character_image_categories WHERE name = 'butt_size';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'xlarge', 'X-Large', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body', 5
FROM character_image_categories WHERE name = 'butt_size';

-- Personality options (these don't need images, but we'll add placeholder entries)
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'caregiver', 'Caregiver', '/placeholder.svg?height=80&width=80', 1
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'sage', 'Sage', '/placeholder.svg?height=80&width=80', 2
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'innocent', 'Innocent', '/placeholder.svg?height=80&width=80', 3
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'jester', 'Jester', '/placeholder.svg?height=80&width=80', 4
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'temptress', 'Temptress', '/placeholder.svg?height=80&width=80', 5
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'dominant', 'Dominant', '/placeholder.svg?height=80&width=80', 6
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'submissive', 'Submissive', '/placeholder.svg?height=80&width=80', 7
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'lover', 'Lover', '/placeholder.svg?height=80&width=80', 8
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'nympho', 'Nympho', '/placeholder.svg?height=80&width=80', 9
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'mean', 'Mean', '/placeholder.svg?height=80&width=80', 10
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'confidant', 'Confidant', '/placeholder.svg?height=80&width=80', 11
FROM character_image_categories WHERE name = 'personality';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'experimenter', 'Experimenter', '/placeholder.svg?height=80&width=80', 12
FROM character_image_categories WHERE name = 'personality';

-- Relationship options (these don't need images, but we'll add placeholder entries)
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'stranger', 'Stranger', '/placeholder.svg?height=80&width=80', 1
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'school-mate', 'School Mate', '/placeholder.svg?height=80&width=80', 2
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'colleague', 'Colleague', '/placeholder.svg?height=80&width=80', 3
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'mentor', 'Mentor', '/placeholder.svg?height=80&width=80', 4
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'girlfriend', 'Girlfriend', '/placeholder.svg?height=80&width=80', 5
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'sex-friend', 'Sex Friend', '/placeholder.svg?height=80&width=80', 6
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'wife', 'Wife', '/placeholder.svg?height=80&width=80', 7
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'mistress', 'Mistress', '/placeholder.svg?height=80&width=80', 8
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'friend', 'Friend', '/placeholder.svg?height=80&width=80', 9
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'best-friend', 'Best Friend', '/placeholder.svg?height=80&width=80', 10
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'step-sister', 'Step Sister', '/placeholder.svg?height=80&width=80', 11
FROM character_image_categories WHERE name = 'relationship';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'step-mom', 'Step Mom', '/placeholder.svg?height=80&width=80', 12
FROM character_image_categories WHERE name = 'relationship';

-- Age options (these don't need images, but we'll add placeholder entries)
INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, 'teen', 'Teen (18+)', '/placeholder.svg?height=80&width=80', 1
FROM character_image_categories WHERE name = 'age';

INSERT INTO character_image_options (category_id, option_key, display_name, image_url, sort_order) 
SELECT id, '20s', '20s', '/placeholder.svg?height=80&width=80', 2
FROM character_image_categories WHERE name = 'age';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_character_image_categories_updated_at 
    BEFORE UPDATE ON character_image_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_image_options_updated_at 
    BEFORE UPDATE ON character_image_options 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
