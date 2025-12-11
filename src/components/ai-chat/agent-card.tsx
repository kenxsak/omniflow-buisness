import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIAgent } from '@/config/ai-agents';
import { ArrowRight } from 'lucide-react';

interface AgentCardProps {
  agent: AIAgent;
  onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  const Icon = agent.icon;

  return (
    <Card 
      className="hover:border-primary cursor-pointer transition-all hover:shadow-lg group h-full"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className={`w-12 h-12 rounded-lg ${agent.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-6 w-6 ${agent.color}`} />
        </div>
        <CardTitle className="text-xl">{agent.name}</CardTitle>
        <CardDescription className="text-sm">
          {agent.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {agent.capabilities.slice(0, 4).map((capability, index) => (
            <div key={index} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-primary"></span>
              {capability}
            </div>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          size="sm"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
