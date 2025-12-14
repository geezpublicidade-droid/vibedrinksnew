import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';
import { Package, Zap, Snowflake, Percent, ShoppingCart, Loader2, Search, Check } from 'lucide-react';
import type { Product, Category } from '@shared/schema';

interface ComboModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnergeticoOption = '2L' | '5cans';

interface ProductSelectorProps {
  products: Product[];
  selected: Product | null;
  onSelect: (product: Product | null) => void;
  placeholder: string;
  showMultiplier?: number;
}

function ProductSelector({ products, selected, onSelect, placeholder, showMultiplier }: ProductSelectorProps) {
  const [search, setSearch] = useState('');
  
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const searchLower = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(searchLower));
  }, [products, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-product-search"
        />
      </div>
      <ScrollArea className="h-[180px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto encontrado
            </p>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelect(selected?.id === product.id ? null : product)}
                className={`w-full flex items-center justify-between p-2 rounded-md text-sm text-left transition-colors hover-elevate ${
                  selected?.id === product.id 
                    ? 'bg-primary/10 border border-primary' 
                    : 'hover:bg-muted'
                }`}
                data-testid={`button-select-${product.id}`}
              >
                <span className="flex-1 truncate pr-2">{product.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">
                    R$ {Number(product.salePrice).toFixed(2)}
                    {showMultiplier && showMultiplier > 1 && ` x${showMultiplier}`}
                  </span>
                  {selected?.id === product.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      {selected && (
        <div className="text-sm text-primary font-medium flex items-center gap-1">
          <Check className="h-4 w-4" />
          Selecionado: {selected.name}
        </div>
      )}
    </div>
  );
}

export function ComboModal({ open, onOpenChange }: ComboModalProps) {
  const { addCombo } = useCart();
  const { toast } = useToast();
  
  const [selectedDestilado, setSelectedDestilado] = useState<Product | null>(null);
  const [selectedEnergetico, setSelectedEnergetico] = useState<Product | null>(null);
  const [energeticoOption, setEnergeticoOption] = useState<EnergeticoOption>('2L');
  const [selectedGelo, setSelectedGelo] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const destiladoKeywords = ['gin', 'whisky', 'whiskey', 'cachaça', 'cachaca', 'vodka', 'sake', 'saque', 'rum'];
  const destiladosCategoryIds = categories
    .filter(c => destiladoKeywords.some(keyword => c.name.toLowerCase().includes(keyword)))
    .map(c => c.id);

  const destilados = products.filter(p => 
    p.comboEligible && 
    p.isActive && 
    p.stock > 0 && 
    destiladosCategoryIds.includes(p.categoryId)
  );

  const energeticoKeywords = ['energetico', 'energético', 'redbull', 'red bull', 'monster', 'tnt', 'burn', 'fusion', 'energy'];
  
  const isEnergetico = (name: string): boolean => {
    const lowerName = name.toLowerCase();
    return energeticoKeywords.some(keyword => lowerName.includes(keyword));
  };

  const energeticos2L = products.filter(p => 
    p.comboEligible && 
    p.isActive && 
    p.stock > 0 && 
    isEnergetico(p.name) && 
    p.name.toLowerCase().includes('2l')
  );

  const energeticosCans = products.filter(p => 
    p.comboEligible && 
    p.isActive && 
    p.stock >= 5 && 
    isEnergetico(p.name) && 
    !p.name.toLowerCase().includes('2l')
  );

  function isLargeIceBag(name: string): boolean {
    const lowerName = name.toLowerCase();
    return lowerName.includes('kg') || lowerName.includes('saco') || lowerName.includes('grande');
  }

  const gelos = products.filter(p => 
    p.comboEligible && 
    p.isActive && 
    p.name.toLowerCase().includes('gelo') &&
    (isLargeIceBag(p.name) ? p.stock >= 1 : p.stock >= 5)
  );

  const energeticoQuantity = energeticoOption === '2L' ? 1 : 5;
  
  const getGeloQuantity = (gelo: Product | null): number => {
    if (!gelo) return 5;
    return isLargeIceBag(gelo.name) ? 1 : 5;
  };
  
  const geloQuantity = getGeloQuantity(selectedGelo);

  const calculateTotal = () => {
    if (!selectedDestilado || !selectedEnergetico || !selectedGelo) return { original: 0, discounted: 0 };
    
    const destiladoPrice = Number(selectedDestilado.salePrice);
    const energeticoPrice = Number(selectedEnergetico.salePrice) * energeticoQuantity;
    const geloPrice = Number(selectedGelo.salePrice) * geloQuantity;
    
    const original = destiladoPrice + energeticoPrice + geloPrice;
    const discounted = original * 0.95;
    
    return { original, discounted };
  };

  const totals = calculateTotal();

  const handleAddCombo = () => {
    if (!selectedDestilado || !selectedEnergetico || !selectedGelo) {
      toast({
        title: 'Selecione todos os itens',
        description: 'Escolha um destilado, um energetico e o gelo para montar seu combo.',
        variant: 'destructive',
      });
      return;
    }

    const comboId = `combo-${Date.now()}`;
    
    addCombo({
      id: comboId,
      destilado: selectedDestilado,
      energetico: selectedEnergetico,
      energeticoQuantity,
      gelo: selectedGelo,
      geloQuantity,
      discountPercent: 5,
      originalTotal: totals.original,
      discountedTotal: totals.discounted,
    });

    toast({
      title: 'Combo adicionado!',
      description: `Combo com 5% de desconto foi adicionado ao carrinho.`,
    });

    resetSelections();
    onOpenChange(false);
  };

  const resetSelections = () => {
    setSelectedDestilado(null);
    setSelectedEnergetico(null);
    setSelectedGelo(null);
    setEnergeticoOption('2L');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetSelections();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Percent className="h-6 w-6 text-primary" />
            Monte Seu Combo - 5% OFF
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">1. Escolha seu Destilado</h3>
                <span className="text-xs text-muted-foreground">({destilados.length} opcoes)</span>
              </div>
              <ProductSelector
                products={destilados}
                selected={selectedDestilado}
                onSelect={setSelectedDestilado}
                placeholder="Buscar destilado..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">2. Escolha seu Energetico</h3>
              </div>
              
              <div className="flex gap-4 mb-3">
                <Button
                  variant={energeticoOption === '2L' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEnergeticoOption('2L');
                    setSelectedEnergetico(null);
                  }}
                  data-testid="button-energetico-2l"
                >
                  1 Garrafa 2L
                </Button>
                <Button
                  variant={energeticoOption === '5cans' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEnergeticoOption('5cans');
                    setSelectedEnergetico(null);
                  }}
                  data-testid="button-energetico-5cans"
                >
                  5 Latas
                </Button>
              </div>

              <ProductSelector
                products={energeticoOption === '2L' ? energeticos2L : energeticosCans}
                selected={selectedEnergetico}
                onSelect={setSelectedEnergetico}
                placeholder="Buscar energetico..."
                showMultiplier={energeticoQuantity}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">3. Escolha seu Gelo</h3>
                <span className="text-xs text-muted-foreground">({gelos.length} opcoes)</span>
              </div>
              <ProductSelector
                products={gelos}
                selected={selectedGelo}
                onSelect={setSelectedGelo}
                placeholder="Buscar gelo..."
                showMultiplier={geloQuantity}
              />
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal:</span>
                <span className="line-through">R$ {totals.original.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Desconto (5%):</span>
                <span>- R$ {(totals.original - totals.discounted).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total do Combo:</span>
                <span className="text-primary">R$ {totals.discounted.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleAddCombo}
              disabled={!selectedDestilado || !selectedEnergetico || !selectedGelo}
              data-testid="button-add-combo"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Adicionar Combo ao Carrinho
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
