import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "secondary" | "accent" | "purple" | "pink" | "yellow";
}

const variantStyles = {
  default: "hover:border-primary",
  primary: "border-primary/50 hover:border-primary",
  secondary: "border-secondary/50 hover:border-secondary",
  accent: "border-accent/50 hover:border-accent",
  purple: "border-purple-500/50 hover:border-purple-500",
  pink: "border-pink-500/50 hover:border-pink-500",
  yellow: "border-yellow-500/50 hover:border-yellow-500",
};

const iconVariantStyles = {
  default: "bg-primary text-primary-foreground",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
  purple: "bg-purple-500 text-white",
  pink: "bg-pink-500 text-white",
  yellow: "bg-yellow-500 text-black",
};

export function DashboardCard({
  title,
  description,
  icon: Icon,
  variant = "default",
  className,
  ...props
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "border-2 border-transparent",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent className="text-center pb-6">
          <CardDescription className="text-base">{description}</CardDescription>
        </CardContent>
      )}
    </Card>
  );
}
