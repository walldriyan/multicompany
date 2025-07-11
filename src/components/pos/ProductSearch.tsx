'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import { Search, Check } from "lucide-react";

export interface ProductSearchProps {
  allProducts: Product[];
  onProductSelect: (product: Product) => void;
}

export interface ProductSearchHandle {
  focusSearchInput: () => void;
}

const ProductSearch = React.forwardRef<ProductSearchHandle, ProductSearchProps>(
  ({ allProducts, onProductSelect }, ref) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const internalInputRef = useRef<HTMLInputElement>(null); // Renamed for clarity
    const popoverContentRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focusSearchInput: () => {
        if (document.activeElement !== internalInputRef.current) {
          internalInputRef.current?.focus();
        }
      }
    }));

    useEffect(() => {
      if (searchTerm.trim() === '') {
        setSuggestions([]);
        setActiveIndex(-1);
        // Don't close popover here, let blur or selection handle it
        return;
      }

      const filtered = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSuggestions(filtered);
      setIsSuggestionsOpen(filtered.length > 0);
      setActiveIndex(-1);
    }, [searchTerm, allProducts]);

    const handleSelectProduct = useCallback((product: Product) => {
      onProductSelect(product);
      setSearchTerm(''); 
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setActiveIndex(-1);
      internalInputRef.current?.focus(); // Keep focus on search after selection for next search/scan
    }, [onProductSelect]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setIsSuggestionsOpen(false);
        setActiveIndex(-1);
        return; 
      }

      if (isSuggestionsOpen && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const newIndex = (activeIndex + 1) % suggestions.length;
          setActiveIndex(newIndex);
          scrollToSuggestion(newIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const newIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
          setActiveIndex(newIndex);
          scrollToSuggestion(newIndex);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelectProduct(suggestions[activeIndex]);
          } else if (suggestions.length > 0) {
            handleSelectProduct(suggestions[0]); // Default to first if none highlighted by arrows
          }
        }
      } else if (e.key === 'Enter' && searchTerm.trim() !== '' && suggestions.length > 0) {
        e.preventDefault();
        handleSelectProduct(suggestions[0]);
      } else if (e.key === 'Enter' && searchTerm.trim() !== '' && suggestions.length === 0) {
          setIsSuggestionsOpen(false); 
      }
    };

    const scrollToSuggestion = (index: number) => {
      if (popoverContentRef.current) {
        const suggestionElement = popoverContentRef.current.children[0]?.children[index] as HTMLElement;
        if (suggestionElement) {
          suggestionElement.scrollIntoView({ block: 'nearest' });
        }
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchTerm = e.target.value;
      setSearchTerm(newSearchTerm);
      if (newSearchTerm.trim() === '' && suggestions.length > 0) {
         // Don't close suggestions immediately on empty, wait for blur or selection
      } else if (newSearchTerm.trim() !== '') {
        setIsSuggestionsOpen(true);
      }
    };
    
    const handleFocus = () => {
      if (searchTerm.trim() !== '' && suggestions.length > 0) {
        setIsSuggestionsOpen(true);
      }
    };

    const handleBlur = () => {
        // Delay closing suggestions to allow click on popover content
        setTimeout(() => {
            if (!popoverContentRef.current?.contains(document.activeElement)) {
                 setIsSuggestionsOpen(false);
            }
        }, 150);
    };


    return (
      <Popover open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={internalInputRef}
              type="text"
              placeholder="Search products by name or category..."
              className="pl-10 w-full bg-background border-border focus:ring-primary"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-label="Search products"
              autoComplete="off"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          ref={popoverContentRef}
          className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto shadow-lg rounded-md mt-1"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()} 
        >
          {suggestions.length > 0 && (
            <div className="py-1" role="listbox" aria-activedescendant={activeIndex > -1 ? `suggestion-${activeIndex}` : undefined}>
              {suggestions.map((product, index) => (
                <Button
                  key={product.id}
                  id={`suggestion-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  variant="ghost"
                  className={`w-full justify-start h-auto py-2 px-3 text-left rounded-md text-sm
                    ${ index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50' }
                  `}
                  onClick={() => handleSelectProduct(product)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Rs. {(product.sellingPrice ?? 0).toFixed(2)} &bull; Stock: {product.isService ? 'N/A' : product.stock}
                      {product.category && ` &bull; ${product.category}`}
                    </span>
                  </div>
                  {index === activeIndex && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                </Button>
              ))}
            </div>
          )}
          {searchTerm.trim() !== '' && suggestions.length === 0 && (
               <p className="p-4 text-sm text-muted-foreground text-center">No products found for "{searchTerm}".</p>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

ProductSearch.displayName = "ProductSearch";
export { ProductSearch };
