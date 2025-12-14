import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';
import { Wine, Loader2, Plus, Minus, ShoppingCart, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Product, Category } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

interface SpecialDrinksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpecialDrinksModal({ open, onOpenChange }: SpecialDrinksModalProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const specialCategoryNames = ['CAIPIRINHAS', 'DRINKS ESPECIAIS', 'COPAO', 'BATIDAS'];

  const specialCategories = categories.filter(c => 
    c.isActive && 
    specialCategoryNames.some(name => c.name.toLowerCase() === name.toLowerCase())
  );

  useEffect(() => {
    if (open && specialCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(specialCategories[0].id);
    }
  }, [open, specialCategories, selectedCategory]);

  useEffect(() => {
    if (!open) {
      setSelectedCategory(null);
      setCurrentIndex(0);
    }
  }, [open]);

  const specialDrinks = products.filter(p => {
    if (!p.isActive) return false;
    if (!selectedCategory) return false;
    return p.categoryId === selectedCategory;
  });

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (!isAutoPlaying || specialDrinks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % specialDrinks.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isAutoPlaying, specialDrinks.length, selectedCategory]);

  useEffect(() => {
    if (scrollRef.current && specialDrinks.length > 0) {
      const cardWidth = scrollRef.current.scrollWidth / specialDrinks.length;
      scrollRef.current.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, specialDrinks.length]);

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(price));
  };

  const getCartQuantity = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    return item?.quantity ?? 0;
  };

  const handleAddToCart = (product: Product) => {
    if (!product.isPrepared) {
      const cartItem = items.find(i => i.productId === product.id);
      const currentQty = cartItem?.quantity ?? 0;
      
      if (product.stock <= 0 || currentQty >= product.stock) {
        toast({
          title: 'Estoque Insuficiente',
          description: `O produto ${product.name} esta com estoque zerado ou voce ja adicionou a quantidade maxima disponivel.`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    addItem(product);
    toast({
      title: 'Adicionado ao carrinho',
      description: `${product.name} foi adicionado.`,
    });
  };

  const handlePrev = () => {
    setCurrentIndex(prev => prev === 0 ? specialDrinks.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % specialDrinks.length);
  };

  const isLoading = productsLoading || categoriesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
              <Wine className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Drinks Especiais da Casa
            </span>
            <Sparkles className="h-5 w-5 text-pink-400" />
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {specialCategories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setIsAutoPlaying(true);
                  }}
                  className={selectedCategory === category.id ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                  data-testid={`button-filter-${category.id}`}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {specialDrinks.length === 0 ? (
              <div className="text-center py-12">
                <Wine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum drink especial disponivel no momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="relative"
                  role="region"
                  aria-label="Carrossel de drinks especiais"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} de {specialDrinks.length}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      aria-label={isAutoPlaying ? 'Pausar carrossel' : 'Iniciar carrossel'}
                      data-testid="button-toggle-autoplay"
                    >
                      {isAutoPlaying ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {isAutoPlaying ? 'Pausar' : 'Iniciar'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handlePrev}
                      className="flex-shrink-0 border-purple-500/50"
                      aria-label="Drink anterior"
                      data-testid="button-carousel-prev"
                    >
                      <ChevronLeft className="h-5 w-5 text-purple-400" />
                    </Button>

                    <div 
                      ref={scrollRef}
                      className="flex-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <div className="flex gap-4">
                        <AnimatePresence mode="wait">
                          {specialDrinks.map((product, index) => {
                            const quantity = getCartQuantity(product.id);
                            const isOutOfStock = !product.isPrepared && product.stock <= 0;
                            const isActive = index === currentIndex;

                            return (
                              <motion.div
                                key={product.id}
                                className="flex-shrink-0 w-[calc(100%-2rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] snap-center"
                                initial={{ opacity: 0.7 }}
                                animate={{ 
                                  opacity: isActive ? 1 : 0.6,
                                  scale: isActive ? 1 : 0.95,
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                <Card 
                                  className={`overflow-hidden border-2 transition-all duration-300 ${
                                    isActive 
                                      ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                                      : 'border-purple-500/20'
                                  }`}
                                  data-testid={`card-special-drink-${product.id}`}
                                >
                                  <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Wine className="h-16 w-16 text-purple-400/50" />
                                      </div>
                                    )}
                                    
                                    {isOutOfStock && (
                                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <Badge variant="secondary">Esgotado</Badge>
                                      </div>
                                    )}

                                    <Badge 
                                      className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 border-none"
                                    >
                                      Especial
                                    </Badge>
                                  </div>
                                  
                                  <div className="p-4 space-y-3">
                                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                                    
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-lg text-purple-400">
                                        {formatPrice(product.salePrice)}
                                      </span>
                                      
                                      {!isOutOfStock && (
                                        <>
                                          {quantity === 0 ? (
                                            <Button
                                              size="sm"
                                              onClick={() => handleAddToCart(product)}
                                              className="bg-gradient-to-r from-purple-500 to-pink-500"
                                              data-testid={`button-add-${product.id}`}
                                            >
                                              <Plus className="h-4 w-4 mr-1" />
                                              Adicionar
                                            </Button>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => updateQuantity(product.id, quantity - 1)}
                                                data-testid={`button-decrease-${product.id}`}
                                              >
                                                <Minus className="h-4 w-4" />
                                              </Button>
                                              <span className="w-8 text-center font-bold">{quantity}</span>
                                              <Button
                                                size="icon"
                                                onClick={() => updateQuantity(product.id, quantity + 1)}
                                                className="bg-gradient-to-r from-purple-500 to-pink-500"
                                                data-testid={`button-increase-${product.id}`}
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleNext}
                      className="flex-shrink-0 border-purple-500/50"
                      aria-label="Proximo drink"
                      data-testid="button-carousel-next"
                    >
                      <ChevronRight className="h-5 w-5 text-purple-400" />
                    </Button>
                  </div>

                  {specialDrinks.length > 1 && (
                    <div 
                      className="flex justify-center gap-1.5 mt-4"
                      role="tablist"
                      aria-label="Navegacao do carrossel"
                    >
                      {specialDrinks.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`h-2 rounded-full transition-all ${
                            i === currentIndex 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-6' 
                              : 'bg-purple-500/30 w-2 hover:bg-purple-500/50'
                          }`}
                          role="tab"
                          aria-selected={i === currentIndex}
                          aria-label={`Ir para drink ${i + 1}`}
                          data-testid={`button-dot-${i}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500" 
                size="lg"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-special-drinks"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Continuar Comprando
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
