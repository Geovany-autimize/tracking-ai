import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingDown, Star } from 'lucide-react';
import { useBilling, type CreditPackage } from '@/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';

export function CreditPackagesGrid() {
  const { creditPackages, isLoadingPackages, purchaseCredits, isPurchasing } = useBilling();

  if (isLoadingPackages) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comprar Créditos Extras</CardTitle>
          <CardDescription>Adicione créditos avulsos a qualquer momento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!creditPackages || creditPackages.length === 0) {
    return null;
  }

  const getMostPopular = () => {
    return creditPackages[1]?.id; // Segundo pacote geralmente é o mais popular
  };

  const getBestValue = () => {
    const sorted = [...creditPackages].sort((a, b) => {
      const pricePerCreditA = a.price_cents / a.credits;
      const pricePerCreditB = b.price_cents / b.credits;
      return pricePerCreditA - pricePerCreditB;
    });
    return sorted[0]?.id;
  };

  const mostPopular = getMostPopular();
  const bestValue = getBestValue();

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const getPricePerCredit = (pkg: CreditPackage) => {
    const pricePerCredit = pkg.price_cents / pkg.credits;
    return `R$ ${(pricePerCredit / 100).toFixed(2).replace('.', ',')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Comprar Créditos Extras
        </CardTitle>
        <CardDescription>
          Adicione créditos avulsos a qualquer momento. Quanto mais você compra, mais econômico fica!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {creditPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {pkg.id === mostPopular && (
                <Badge className="absolute top-2 right-2 gap-1 bg-primary">
                  <Star className="h-3 w-3 fill-current" />
                  Popular
                </Badge>
              )}
              {pkg.id === bestValue && (
                <Badge className="absolute top-2 right-2 gap-1 bg-success">
                  <TrendingDown className="h-3 w-3" />
                  Melhor Custo
                </Badge>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.credits.toLocaleString('pt-BR')} créditos
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(pkg.price_cents)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getPricePerCredit(pkg)} por crédito
                  </div>
                </div>

                {pkg.discount_percentage && pkg.discount_percentage > 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    Economia de {pkg.discount_percentage.toFixed(0)}%
                  </Badge>
                )}

                <Button
                  className="w-full"
                  onClick={() => purchaseCredits(pkg.id)}
                  disabled={isPurchasing}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isPurchasing ? 'Processando...' : 'Comprar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
