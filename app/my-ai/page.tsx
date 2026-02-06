"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useLanguage } from "@/components/language-context";

interface Character {
  id: string;
  name: string;
  image: string;
  age: number;
  body: string;
  ethnicity: string;
  relationship: string;
  occupation: string;
  hobbies: string;
  personality: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
}

export default function MyAIPage() {
  const { t } = useLanguage();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    loadCharacters(user.id);
  }

  async function loadCharacters(userId: string) {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-8">{t('pages.myAI.title')}</h1>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-semibold mb-4">{t('pages.myAI.noCharacters')}</h2>
            <p className="text-muted-foreground mb-8">{t('pages.myAI.createFirst')}</p>
            <Link
              href="/create-character"
              className="inline-block px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all"
            >
              Create Character
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{t('pages.myAI.title')}</h1>
          <Link
            href="/create-character"
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all"
          >
            {t('pages.myAI.createNew')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <Card key={character.id} className="p-6 hover:shadow-lg transition-all duration-300 border border-border">
              <div className="relative aspect-square mb-4">
                <img
                  src={character.image}
                  alt={character.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white text-xs">
                    {character.is_public ? t('pages.myAI.public') : t('pages.myAI.private')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold mb-1">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {character.age} • {character.ethnicity} • {character.relationship}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {character.personality}
                  </Badge>
                  {character.occupation && (
                    <Badge variant="outline" className="text-xs">
                      {character.occupation}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/characters/${character.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t('pages.myAI.viewProfile')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
