import { Crown, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PremiumFeatureBadgeProps {
  title: string;
  description: string;
  feature: 'extra_credits' | 'auto_recharge';
}

export function PremiumFeatureBadge({ title, description, feature }: PremiumFeatureBadgeProps) {
  const navigate = useNavigate();
  
  const featureMessages = {
    extra_credits: {
      benefit: 'Compre créditos extras quando precisar',
      cta: 'Upgrade para Premium'
    },
    auto_recharge: {
      benefit: 'Nunca fique sem créditos automaticamente',
      cta: 'Upgrade para Premium'
    }
  };
  
  const message = featureMessages[feature];
  
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10 shrink-0">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Crown className="w-4 h-4" />
              <span>{message.benefit}</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate('/dashboard/billing')}
          className="w-full"
          size="lg"
        >
          <Crown className="w-4 h-4 mr-2" />
          {message.cta}
        </Button>
      </CardContent>
    </Card>
  );
}
