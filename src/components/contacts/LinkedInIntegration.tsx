import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Linkedin, Loader2, Lightbulb, MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LinkedInIntegration() {
  const queryClient = useQueryClient();
  const [optimizations, setOptimizations] = useState<any>(null);
  const [templateData, setTemplateData] = useState({
    templateType: "connection_request",
    recipientName: "",
    recipientTitle: "",
    recipientCompany: "",
    context: "",
  });
  const [generatedTemplate, setGeneratedTemplate] = useState<any>(null);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const connectLinkedIn = () => {
    if (!user) return;
    const startUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-oauth-start?user_id=${user.id}`;
    window.location.href = startUrl;
  };

  const generateOptimizationsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-optimization", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setOptimizations(data);
      toast.success("LinkedIn optimization suggestions generated!");
    },
    onError: () => {
      toast.error("Failed to generate optimization suggestions");
    },
  });

  const generateTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateData) => {
      const { data: result, error } = await supabase.functions.invoke("generate-linkedin-template", {
        body: data,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      setGeneratedTemplate(data);
      toast.success("LinkedIn message template generated!");
    },
    onError: () => {
      toast.error("Failed to generate template");
    },
  });

  const isLinkedInConnected = profile?.linkedin_access_token;

  const disconnectLinkedIn = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          linkedin_access_token: null,
          linkedin_profile_id: null,
          linkedin_profile_url: null,
          linkedin_headline: null,
          linkedin_picture_url: null,
          linkedin_name: null,
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("LinkedIn account disconnected");
    } catch (error) {
      toast.error("Failed to disconnect LinkedIn account");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Integration
          </CardTitle>
          <CardDescription>
            Connect your LinkedIn account and get AI-powered optimization suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLinkedInConnected ? (
            <div>
              <Button onClick={connectLinkedIn} className="w-full sm:w-auto">
                <Linkedin className="h-4 w-4 mr-2" />
                Connect LinkedIn Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.linkedin_picture_url || ""} alt={profile?.linkedin_name || "LinkedIn profile"} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Connected
                      </Badge>
                      {profile?.linkedin_name && (
                        <span className="text-sm font-medium">
                          {profile.linkedin_name}
                        </span>
                      )}
                    </div>
                    {profile?.linkedin_headline && (
                      <span className="text-sm text-muted-foreground mt-1">
                        {profile.linkedin_headline}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={disconnectLinkedIn}>
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="optimization" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization">Profile Optimization</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="strategies">Networking Strategies</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                LinkedIn Profile Optimization
              </CardTitle>
              <CardDescription>
                Get AI-powered suggestions to improve your LinkedIn profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => generateOptimizationsMutation.mutate()}
                disabled={generateOptimizationsMutation.isPending}
              >
                {generateOptimizationsMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Generate Optimization Suggestions
              </Button>

              {optimizations && (
                <ScrollArea className="h-[600px] mt-4">
                  <div className="space-y-6 pr-4">
                    <div>
                      <h3 className="font-semibold mb-2">Headline Suggestions</h3>
                      <ul className="space-y-2">
                        {optimizations.headline_suggestions?.map((suggestion: string, i: number) => (
                          <li key={i} className="text-sm bg-muted p-3 rounded-md">{suggestion}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">About Section Tips</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.about_section_tips?.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Experience Enhancement</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.experience_enhancement?.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Skills Strategy</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.skills_strategy?.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Content Sharing Strategy</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.content_sharing?.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Networking Tips</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.networking_tips?.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Profile Completeness</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.profile_completeness?.map((item: string, i: number) => (
                          <li key={i} className="text-sm">{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Personal Branding</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        {optimizations.branding_advice?.map((advice: string, i: number) => (
                          <li key={i} className="text-sm">{advice}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                LinkedIn Message Templates
              </CardTitle>
              <CardDescription>
                Generate personalized LinkedIn messages for networking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={templateData.templateType}
                    onValueChange={(value) => setTemplateData({ ...templateData, templateType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connection_request">Connection Request</SelectItem>
                      <SelectItem value="follow_up">Follow-Up Message</SelectItem>
                      <SelectItem value="informational_interview">Informational Interview Request</SelectItem>
                      <SelectItem value="general_networking">General Networking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recipient Name</Label>
                    <Input
                      value={templateData.recipientName}
                      onChange={(e) => setTemplateData({ ...templateData, recipientName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient Title</Label>
                    <Input
                      value={templateData.recipientTitle}
                      onChange={(e) => setTemplateData({ ...templateData, recipientTitle: e.target.value })}
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recipient Company</Label>
                  <Input
                    value={templateData.recipientCompany}
                    onChange={(e) => setTemplateData({ ...templateData, recipientCompany: e.target.value })}
                    placeholder="Tech Corp"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Context / Additional Info</Label>
                  <Textarea
                    value={templateData.context}
                    onChange={(e) => setTemplateData({ ...templateData, context: e.target.value })}
                    placeholder="Met at conference, interested in their work on AI..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => generateTemplateMutation.mutate(templateData)}
                  disabled={!templateData.recipientName || generateTemplateMutation.isPending}
                >
                  {generateTemplateMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Generate Template
                </Button>

                {generatedTemplate && (
                  <div className="mt-6 space-y-4 border-t pt-4">
                    <div>
                      <Label>Subject / Opening</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-sm">{generatedTemplate.subject}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Message</Label>
                      <Textarea
                        value={generatedTemplate.message}
                        readOnly
                        rows={10}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Tips for Sending</Label>
                      <ul className="mt-2 space-y-2 list-disc list-inside text-sm text-muted-foreground">
                        {generatedTemplate.tips?.map((tip: string, i: number) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTemplate.message);
                        toast.success("Message copied to clipboard!");
                      }}
                    >
                      Copy Message
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Networking Strategies</CardTitle>
              <CardDescription>
                Best practices for building meaningful professional connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>Connection Strategies</Badge>
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Personalize every connection request with specific reference to shared interests or mutual connections</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Focus on quality over quantity - aim for 5-10 meaningful connections per week</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Engage with content before sending connection requests to establish familiarity</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Follow up within 48 hours after connecting with a brief thank you message</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">Content Sharing Strategy</Badge>
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Post 2-3 times per week during peak engagement hours (Tuesday-Thursday, 8-10 AM)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Share industry insights, project learnings, and professional achievements</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Use storytelling format: challenge → solution → result for maximum engagement</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Include relevant hashtags (3-5) and tag companies/people when appropriate</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Respond to all comments within 24 hours to boost algorithmic visibility</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Engagement Best Practices</Badge>
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Comment meaningfully on 5-10 posts daily from your target network</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Share and add context to others' content to demonstrate thought leadership</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Participate in relevant LinkedIn Groups and discussions in your industry</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Use LinkedIn articles for long-form content to establish expertise</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="destructive">Profile Visibility Tactics</Badge>
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Set profile to "Open to Work" with specific roles and companies visible to recruiters</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Update your headline weekly to reflect current focus and searchable keywords</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Customize your LinkedIn URL to include your name for better search visibility</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Request recommendations from colleagues and clients to build social proof</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Campaign Templates</CardTitle>
              <CardDescription>
                Pre-built outreach sequences for different networking goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Job Seeker Campaign (7-Day Sequence)</h3>
                <div className="space-y-4 pl-4 border-l-2 border-primary">
                  <div>
                    <p className="font-medium text-sm">Day 1: Initial Connection</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Hi [Name], I noticed your work in [specific area] at [Company]. I'm currently exploring opportunities in [field] and would love to connect and learn from your experience."
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 3: Value Offer</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Thanks for connecting! I recently came across [relevant article/insight] and thought it might interest you given your work in [area]. Would you be open to a brief chat about [specific topic]?"
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 7: Informational Interview Request</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "I've been following [Company]'s work in [area] and I'm impressed by [specific achievement]. Would you have 15 minutes for a quick coffee chat or call? I'd love to learn about your career path."
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Career Transition Campaign (10-Day Sequence)</h3>
                <div className="space-y-4 pl-4 border-l-2 border-secondary">
                  <div>
                    <p className="font-medium text-sm">Day 1: Connect with Context</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Hi [Name], I'm transitioning from [current field] to [target field] and was inspired by your journey from [their background]. Would love to connect!"
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 5: Share Progress</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Quick update: I've been working on [specific project/skill development] to make my transition into [field]. Any advice from your experience would be invaluable."
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 10: Request Introduction</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "I've made significant progress in my transition and I'm now actively seeking [specific role]. Would you be comfortable introducing me to anyone in your network at [target companies]?"
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Industry Expert Engagement (14-Day Sequence)</h3>
                <div className="space-y-4 pl-4 border-l-2 border-accent">
                  <div>
                    <p className="font-medium text-sm">Day 1: Engage with Content</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Comment meaningfully on 2-3 of their recent posts before sending connection request
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 3: Connection with Value</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Hi [Name], your recent post about [topic] really resonated with me. I've been working on [related project] and would love to learn from your expertise."
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 7: Share Relevant Insight</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "Thought you'd find this interesting: [brief insight or article] related to your work in [area]. It made me think of [their recent post/project]."
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Day 14: Collaboration Proposal</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "I've been following your insights on [topic] and wonder if you'd be interested in collaborating on [specific idea]. I believe our perspectives could create something valuable for the [industry] community."
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Campaign Tracking Tips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Track response rates for each message in the sequence</li>
                  <li>• Adjust timing based on engagement patterns</li>
                  <li>• Personalize templates with specific details for each recipient</li>
                  <li>• Monitor which sequences lead to informational interviews and job referrals</li>
                  <li>• A/B test different subject lines and opening sentences</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}