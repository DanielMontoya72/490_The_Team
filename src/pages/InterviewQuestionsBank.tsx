import { useState } from "react";
import { INTERVIEW_QUESTIONS_BANK } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Lightbulb } from "lucide-react";

const InterviewQuestionsBank = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filterQuestions = (questions: typeof INTERVIEW_QUESTIONS_BANK.behavioral) => {
    if (!searchQuery) return questions;
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const QuestionCard = ({ question, category, tips }: { question: string; category: string; tips: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium">{question}</CardTitle>
          <Badge variant="secondary" className="shrink-0">{category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
          <span>{tips}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Interview Questions Bank
        </h1>
        <p className="text-muted-foreground mt-2">
          Practice with common interview questions across different categories
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="behavioral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="situational">Situational</TabsTrigger>
          <TabsTrigger value="common">Common</TabsTrigger>
        </TabsList>

        <TabsContent value="behavioral" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Behavioral questions assess how you've handled situations in the past. Use the STAR method (Situation, Task, Action, Result).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {filterQuestions(INTERVIEW_QUESTIONS_BANK.behavioral).map((q, idx) => (
              <QuestionCard key={idx} {...q} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Technical questions test your knowledge and problem-solving abilities in your field.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {filterQuestions(INTERVIEW_QUESTIONS_BANK.technical).map((q, idx) => (
              <QuestionCard key={idx} {...q} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="situational" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Situational questions present hypothetical scenarios to assess your judgment and decision-making.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {filterQuestions(INTERVIEW_QUESTIONS_BANK.situational).map((q, idx) => (
              <QuestionCard key={idx} {...q} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="common" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These are standard questions asked in almost every interview. Prepare thoughtful answers in advance.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {filterQuestions(INTERVIEW_QUESTIONS_BANK.common).map((q, idx) => (
              <QuestionCard key={idx} {...q} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewQuestionsBank;
