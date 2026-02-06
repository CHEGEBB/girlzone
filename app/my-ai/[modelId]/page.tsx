"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Zap,
  Eye,
  Users,
  MessageCircle,
  Heart,
  Share2,
  Settings,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  BarChart3
} from "lucide-react";

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  token_cost: number;
  is_premium: boolean;
  features: any;
  is_purchased: boolean;
  image_url?: string;
  usage_count?: number;
  rating?: number;
  created_at?: string;
}

interface ModelStats {
  totalUsage: number;
  monthlyUsage: number;
  averageRating: number;
  totalUsers: number;
  lastUsed?: string;
}

export default function ModelProfilePage({ params }: { params: Promise<{ modelId: string }> }) {
  const [model, setModel] = useState<Model | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
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
  }

  useEffect(() => {
    if (user) {
      loadModel();
    }
  }, [user]);

  async function loadModel() {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();

      if (data.success) {
        const modelId = (await params).modelId;
        const foundModel = data.models.find((m: Model) => m.id === modelId);

        if (foundModel && foundModel.is_purchased) {
          setModel(foundModel);
          // Mock stats for now - in a real app, these would come from an API
          setStats({
            totalUsage: Math.floor(Math.random() * 1000) + 100,
            monthlyUsage: Math.floor(Math.random() * 200) + 20,
            averageRating: 4.2 + Math.random() * 0.8,
            totalUsers: Math.floor(Math.random() * 500) + 50,
            lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        } else {
          router.push('/my-ai');
        }
      }
    } catch (error) {
      console.error('Error loading model:', error);
      router.push('/my-ai');
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

  if (!model) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Model not found</h1>
          <Link href="/my-ai" className="text-primary hover:underline">
            ← Back to My AI Models
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/my-ai')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                <div className="text-6xl">🤖</div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{model.name}</h1>
                    {model.is_premium && (
                      <Star className="h-6 w-6 text-[#1111FF]" fill="currentColor" />
                    )}
                    <Badge variant="secondary" className="bg-green-500 text-white">
                      Owned
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-4 max-w-2xl">
                    {model.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{model.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      {model.token_cost} tokens
                    </div>
                    {stats?.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Last used {new Date(stats.lastUsed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsLiked(!isLiked)}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button
                    variant={isFollowing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    onClick={() => router.push(`/chat?model=${model.id}`)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Cards */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Usage</span>
                  <span className="font-semibold">{stats?.totalUsage || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-semibold">{stats?.monthlyUsage || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{stats?.averageRating?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="font-semibold">{stats?.totalUsers || 0}</span>
                </div>
              </div>
            </Card>

            {/* Model Features */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Features
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Advanced AI Processing</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Real-time Responses</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Context Awareness</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>Custom Personality</span>
                </div>
                {model.is_premium && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-[#1111FF] rounded-full" />
                    <span className="text-[#1111FF] font-medium">Premium Features</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push(`/chat?model=${model.id}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/premium')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Browse More Models
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/my-ai')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Models
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New chat session started</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Heart className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Model liked by user</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user started following</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <Award className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Model purchased successfully</p>
                    <p className="text-xs text-muted-foreground">1 week ago</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Model Description */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">About This Model</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {model.description}
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  This AI model specializes in {model.category.toLowerCase()} interactions and provides
                  intelligent responses tailored to your preferences. With advanced natural language
                  processing capabilities, it can engage in meaningful conversations while maintaining
                  context and personality throughout your interactions.
                </p>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats?.averageRating?.toFixed(1) || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Average Rating</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{stats?.totalUsage || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Interactions</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{stats?.monthlyUsage || 0}</div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">{stats?.totalUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
