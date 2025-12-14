import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';
import { Package, Zap, Snowflake, Percent, ShoppingCart, Loader2, Check, Wine } from 'lucide-react';
import type { Product, Category, ComboGelo } from '@shared/schema';

interface ComboModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnergeticoOption = '2L' | '4cans';

const COMBO_CATEGORIES = ['Gin', 'Vodka', 'Cachaça', 'Whisky'];
const ICE_COUNT = 4;
const CAN_COUNT = 4;

export function ComboModal({ open, onOpenChange }: ComboModalProps) {
  const { addCombo } = useCart();
  const { toast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDestilado, setSelectedDestilado] = useState<Product | null>(null);
  const [selectedGelos, setSelectedGelos] = useState<(Product | null)[]>(Array(ICE_COUNT).fill(null));
  const [selectedEnergetico, setSelectedEnergetico] = useState<Product | null>(null);
  const [energeticoOption, setEnergeticoOption] = useState<EnergeticoOption>('2L');

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const isLoading = productsLoading || categoriesLoading;

  const comboCategories = useMemo(() => 
    categories.filter(c => COMBO_CATEGORIES.some(name => 
      c.name.toLowerCase() === name.toLowerCase()
    )),
    [categories]
  );

  const destiladosByCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return [];
    return products.filter(p => 
      p.comboEligible && 
      p.isActive && 
      p.stock > 0 && 
      p.categoryId === category.id
    );
  }, [products, categories, selectedCategory]);

  const energeticoKeywords = ['energetico', 'energético', 'redbull', 'red bull', 'monster', 'tnt', 'burn', 'fusion', 'energy'];
  
  const isEnergetico = (name: string): boolean => {
    const lowerName = name.toLowerCase();
    return energeticoKeywords.some(keyword => lowerName.includes(keyword));
  };

  const energeticos2L = useMemo(() => 
    products.filter(p => 
      p.comboEligible && 
      p.isActive && 
      p.stock > 0 && 
      isEnergetico(p.name) && 
      p.name.toLowerCase().includes('2l')
    ),
    [products]
  );

  const energeticosCans = useMemo(() => 
    products.filter(p => 
      p.comboEligible && 
      p.isActive && 
      p.stock >= CAN_COUNT && 
      isEnergetico(p.name) && 
      !p.name.toLowerCase().includes('2l')
    ),
    [products]
  );

  const gelosAvailable = useMemo(() => 
    products.filter(p => 
      p.comboEligible && 
      p.isActive && 
      p.stock >= 1 &&
      (p.name.toLowerCase().includes('gelo') && 
       !p.name.toLowerCase().includes('kg') && 
       !p.name.toLowerCase().includes('saco') &&
       !p.name.toLowerCase().includes('triturado') &&
       !p.name.toLowerCase().includes('premium'))
    ),
    [products]
  );

  const getAvailableGelosForSlot = (slotIndex: number) => {
    const selectedIds = selectedGelos
      .filter((g, idx) => g !== null && idx !== slotIndex)
      .map(g => g!.id);
    return gelosAvailable.filter(g => !selectedIds.includes(g.id));
  };

  const energeticoQuantity = energeticoOption === '2L' ? 1 : CAN_COUNT;

  const calculateTotal = () => {
    const validGelos = selectedGelos.filter((g): g is Product => g !== null);
    if (!selectedDestilado || !selectedEnergetico || validGelos.length !== ICE_COUNT) {
      return { original: 0, discounted: 0 };
    }
    
    const destiladoPrice = Number(selectedDestilado.salePrice);
    const energeticoPrice = Number(selectedEnergetico.salePrice) * energeticoQuantity;
    const geloPrice = validGelos.reduce((sum, g) => sum + Number(g.salePrice), 0);
    
    const original = destiladoPrice + energeticoPrice + geloPrice;
    const discounted = original * 0.95;
    
    return { original, discounted };
  };

  const totals = calculateTotal();

  const handleSelectGelo = (index: number, product: Product | null) => {
    setSelectedGelos(prev => {
      const newGelos = [...prev];
      newGelos[index] = product;
      return newGelos;
    });
  };

  const handleAddCombo = () => {
    const validGelos = selectedGelos.filter((g): g is Product => g !== null);
    
    if (!selectedDestilado || !selectedEnergetico || validGelos.length !== ICE_COUNT) {
      toast({
        title: 'Selecione todos os itens',
        description: 'Escolha a bebida, os 4 gelos e o energetico para montar seu combo.',
        variant: 'destructive',
      });
      return;
    }

    const comboId = `combo-${Date.now()}`;
    
    const gelos: ComboGelo[] = validGelos.map(g => ({
      product: g,
      quantity: 1,
    }));

    addCombo({
      id: comboId,
      destilado: selectedDestilado,
      energetico: selectedEnergetico,
      energeticoQuantity,
      gelos,
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
    setSelectedCategory(null);
    setSelectedDestilado(null);
    setSelectedGelos(Array(ICE_COUNT).fill(null));
    setSelectedEnergetico(null);
    setEnergeticoOption('2L');
  };

  const validGelosCount = selectedGelos.filter(g => g !== null).length;
  const isComplete = selectedDestilado && selectedEnergetico && validGelosCount === ICE_COUNT;

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
                <Wine className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">1. Escolha a Categoria</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {comboCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedDestilado(null);
                    }}
                    data-testid={`button-category-${cat.name.toLowerCase()}`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {selectedCategory && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">2. Escolha a Garrafa</h3>
                  <span className="text-xs text-muted-foreground">({destiladosByCategory.length} opcoes)</span>
                </div>
                <ScrollArea className="h-[150px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {destiladosByCategory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum produto disponivel nesta categoria
                      </p>
                    ) : (
                      destiladosByCategory.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => setSelectedDestilado(selectedDestilado?.id === product.id ? null : product)}
                          className={`w-full flex items-center justify-between p-2 rounded-md text-sm text-left transition-colors hover-elevate ${
                            selectedDestilado?.id === product.id 
                              ? 'bg-primary/10 border border-primary' 
                              : 'hover:bg-muted'
                          }`}
                          data-testid={`button-select-destilado-${product.id}`}
                        >
                          <span className="flex-1 truncate pr-2">{product.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground">R$ {Number(product.salePrice).toFixed(2)}</span>
                            {selectedDestilado?.id === product.id && <Check className="h-4 w-4 text-primary" />}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">3. Escolha os 4 Gelos</h3>
                <span className="text-xs text-muted-foreground">({validGelosCount}/{ICE_COUNT} selecionados)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Array(ICE_COUNT).fill(null).map((_, index) => {
                  const availableForSlot = getAvailableGelosForSlot(index);
                  return (
                    <div key={index} className="space-y-1">
                      <label className="text-xs text-muted-foreground">Gelo {index + 1}</label>
                      <ScrollArea className="h-[100px] rounded-md border">
                        <div className="p-1 space-y-1">
                          {selectedGelos[index] && (
                            <button
                              key={selectedGelos[index]!.id}
                              onClick={() => handleSelectGelo(index, null)}
                              className="w-full flex items-center justify-between p-1.5 rounded text-xs text-left bg-primary/10 border border-primary"
                              data-testid={`button-select-gelo-${index}-${selectedGelos[index]!.id}`}
                            >
                              <span className="flex-1 truncate pr-1">{selectedGelos[index]!.name.replace(/GELO /i, '')}</span>
                              <span className="flex items-center gap-1 shrink-0">
                                <span className="text-muted-foreground">R${Number(selectedGelos[index]!.salePrice).toFixed(2)}</span>
                                <Check className="h-3 w-3 text-primary" />
                              </span>
                            </button>
                          )}
                          {availableForSlot.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => handleSelectGelo(index, product)}
                              className="w-full flex items-center justify-between p-1.5 rounded text-xs text-left transition-colors hover-elevate hover:bg-muted"
                              data-testid={`button-select-gelo-${index}-${product.id}`}
                            >
                              <span className="flex-1 truncate pr-1">{product.name.replace(/GELO /i, '')}</span>
                              <span className="flex items-center gap-1 shrink-0">
                                <span className="text-muted-foreground">R${Number(product.salePrice).toFixed(2)}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">4. Escolha o Energetico</h3>
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
                  variant={energeticoOption === '4cans' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEnergeticoOption('4cans');
                    setSelectedEnergetico(null);
                  }}
                  data-testid="button-energetico-4cans"
                >
                  {CAN_COUNT} Latas
                </Button>
              </div>

              <ScrollArea className="h-[120px] rounded-md border">
                <div className="p-2 space-y-1">
                  {(energeticoOption === '2L' ? energeticos2L : energeticosCans).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum energetico disponivel
                    </p>
                  ) : (
                    (energeticoOption === '2L' ? energeticos2L : energeticosCans).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedEnergetico(selectedEnergetico?.id === product.id ? null : product)}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-sm text-left transition-colors hover-elevate ${
                          selectedEnergetico?.id === product.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        data-testid={`button-select-energetico-${product.id}`}
                      >
                        <span className="flex-1 truncate pr-2">{product.name}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground">
                            R$ {Number(product.salePrice).toFixed(2)}
                            {energeticoQuantity > 1 && ` x${energeticoQuantity}`}
                          </span>
                          {selectedEnergetico?.id === product.id && <Check className="h-4 w-4 text-primary" />}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal:</span>
                <span className={totals.original > 0 ? 'line-through' : ''}>
                  R$ {totals.original.toFixed(2)}
                </span>
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
              disabled={!isComplete}
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
