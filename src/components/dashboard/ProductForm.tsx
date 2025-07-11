
'use client';

import { useForm, Controller, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductCreateInputSchema } from '@/lib/zodSchemas';
import type { ProductFormData, UnitDefinition } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, FilePlus2, CheckCircle, Percent, DollarSign, Info, ChevronsUpDown, X } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDisplayQuantityAndUnit } from '@/lib/unitUtils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ProductFormProps {
  product?: ProductFormData & { id?: string };
  onSubmit: (data: ProductFormData, productId?: string) => Promise<{success: boolean, error?: string, fieldErrors?: Record<string, string[]>}>;
  onCancel?: () => void;
  isLoading?: boolean;
  formError?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSwitchToAddNew?: () => void;
  submissionDetails?: { id: string; name: string } | null;
}

const defaultUnits: UnitDefinition = {
  baseUnit: 'pcs',
  derivedUnits: [],
};

const defaultFormValues: ProductFormData = {
  name: '',
  code: '',
  category: '',
  barcode: '',
  units: defaultUnits,
  sellingPrice: 0,
  costPrice: 0,
  stock: 0,
  defaultQuantity: 1,
  isActive: true,
  isService: false,
  productSpecificTaxRate: undefined,
  description: '',
  imageUrl: '',
};

const defaultUnitOptions = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'm', label: 'Meters (m)' },
    { value: 'cm', label: 'Centimeters (cm)' },
    { value: 'item', label: 'Item' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'card', label: 'Card' },
];


export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading: isProductFormLoading,
  formError,
  fieldErrors: serverFieldErrors,
  onSwitchToAddNew,
  submissionDetails,
}: ProductFormProps) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(ProductCreateInputSchema),
    defaultValues: product
      ? { ...defaultFormValues, ...product }
      : defaultFormValues,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors: localErrors, isDirty, isValid: formIsValid },
  } = methods;

  const isEditingProduct = !!product?.id;
  
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [isUnitPopoverOpen, setIsUnitPopoverOpen] = useState(false);
  const [unitOptions, setUnitOptions] = useState(defaultUnitOptions);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  
  const watchedUnits = watch('units');
  const watchedStock = watch('stock');

  const [displayStockQty, setDisplayStockQty] = useState<string>('');
  const [displayStockUnit, setDisplayStockUnit] = useState<string>(watchedUnits?.baseUnit || 'pcs');

  // New state for categories
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // Load/Save categories from/to localStorage
  useEffect(() => {
    try {
      const storedCategories = localStorage.getItem('productCategories');
      const storedUnits = localStorage.getItem('aroniumCustomProductUnits');
      if (storedCategories) {
        setAllCategories(JSON.parse(storedCategories));
      }
      if (storedUnits) {
        const parsedUnits = JSON.parse(storedUnits);
        if (Array.isArray(parsedUnits)) setCustomUnits(parsedUnits);
      }
    } catch (e) { console.error("Failed to load from localStorage", e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('productCategories', JSON.stringify(allCategories));
    } catch (e) { console.error("Failed to save categories to localStorage", e); }
  }, [allCategories]);

  useEffect(() => {
    try {
      localStorage.setItem('aroniumCustomProductUnits', JSON.stringify(customUnits));
    } catch (e) { console.error("Failed to save custom units", e); }
  }, [customUnits]);


  useEffect(() => {
    const customUnitObjects = customUnits.map(u => ({ value: u, label: u }));
    const combined = [...defaultUnitOptions, ...customUnitObjects];
    const uniqueMap = new Map(combined.map(item => [item.value.toLowerCase(), item]));
    setUnitOptions(Array.from(uniqueMap.values()).sort((a,b) => a.label.localeCompare(b.label)));
  }, [customUnits]);

  useEffect(() => {
    if (product) {
      const initialFormValues = {
        ...defaultFormValues,
        ...product,
        units: product.units || defaultUnits,
        imageUrl: product.imageUrl || '',
        category: product.category || '',
        costPrice: product.costPrice === null ? undefined : product.costPrice,
        productSpecificTaxRate: product.productSpecificTaxRate === null ? undefined : product.productSpecificTaxRate,
        defaultQuantity: product.defaultQuantity ?? 1,
        isActive: product.isActive !== undefined ? product.isActive : true,
        isService: product.isService !== undefined ? product.isService : false,
      };
      reset(initialFormValues);
      
      const { displayQuantity, displayUnit } = getDisplayQuantityAndUnit(product.stock, product.units);
      setDisplayStockQty(displayQuantity);
      setDisplayStockUnit(displayUnit);

    } else {
      reset(defaultFormValues);
      setDisplayStockQty('0');
      setDisplayStockUnit('pcs');
    }
  }, [product, reset]);

  useEffect(() => {
    const qty = parseFloat(displayStockQty) || 0;
    const unitDef = watchedUnits;
    if (!unitDef) return;

    let conversionFactor = 1;
    if (displayStockUnit !== unitDef.baseUnit) {
        const derived = unitDef.derivedUnits?.find(d => d.name === displayStockUnit);
        if (derived) conversionFactor = derived.conversionFactor;
    }
    
    const finalBaseStock = qty * conversionFactor;
    const currentBaseStock = watchedStock || 0;
    if (Math.abs(currentBaseStock - finalBaseStock) > 1e-9) { 
      setValue('stock', finalBaseStock, { shouldValidate: true, shouldDirty: true });
    }
  }, [displayStockQty, displayStockUnit, watchedUnits, setValue, watchedStock]);


  const { fields: derivedUnitFields, append: appendDerivedUnit, remove: removeDerivedUnit } = useFieldArray({
    control,
    name: 'units.derivedUnits',
  });
  
  const currentCostPrice = watch('costPrice');
  const currentSellingPrice = watch('sellingPrice');

  const [markup, setMarkup] = useState<number | null>(null);
  const [margin, setMargin] = useState<number | null>(null);

  useEffect(() => {
    if (typeof currentCostPrice === 'number' && currentCostPrice > 0 && typeof currentSellingPrice === 'number') {
      const newMarkup = ((currentSellingPrice - currentCostPrice) / currentCostPrice) * 100;
      setMarkup(newMarkup);
      const newMargin = currentSellingPrice > 0 ? ((currentSellingPrice - currentCostPrice) / currentSellingPrice) * 100 : null;
      setMargin(newMargin);
    } else {
      setMarkup(null);
      setMargin(null);
    }
  }, [currentCostPrice, currentSellingPrice]);


  const handleProductFormSubmitInternal = async (data: ProductFormData) => {
    const dataToSubmit: ProductFormData = {
      ...data,
      code: data.code || null,
      category: data.category ? data.category.toUpperCase() : null,
      barcode: data.barcode || null,
      costPrice: data.costPrice === undefined || data.costPrice === null || isNaN(Number(data.costPrice)) ? null : Number(data.costPrice),
      productSpecificTaxRate: data.productSpecificTaxRate === undefined || data.productSpecificTaxRate === null || isNaN(Number(data.productSpecificTaxRate)) ? null : Number(data.productSpecificTaxRate),
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      units: {
        ...data.units,
        baseUnit: data.units.baseUnit || '',
        derivedUnits: (data.units.derivedUnits || []).map(du => ({
            ...du,
            name: du.name || '',
            conversionFactor: Number(du.conversionFactor) || 0,
            threshold: Number(du.threshold) || 0
        })),
      },
      isActive: data.isActive !== undefined ? data.isActive : true,
      isService: data.isService !== undefined ? data.isService : false,
      defaultQuantity: data.defaultQuantity || 1,
    };
    await onSubmit(dataToSubmit, product?.id);
  };

  const handleClearAndPrepareForNew = () => {
    if (onSwitchToAddNew) onSwitchToAddNew();
    reset(defaultFormValues);
    setDisplayStockQty('0');
    setDisplayStockUnit('pcs');
  };

  const handleAddCustomUnit = (newUnit: string) => {
    const cleanedUnit = newUnit.trim();
    if (cleanedUnit && !unitOptions.some(o => o.value.toLowerCase() === cleanedUnit.toLowerCase())) {
        const updatedCustomUnits = [...customUnits, cleanedUnit];
        setCustomUnits(updatedCustomUnits);
        setValue('units.baseUnit', cleanedUnit, { shouldValidate: true, shouldDirty: true });
        setIsUnitPopoverOpen(false);
        setUnitSearchTerm("");
    }
  };

  const handleDeleteCustomUnit = (unitToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const updatedCustomUnits = customUnits.filter(u => u !== unitToDelete);
    setCustomUnits(updatedCustomUnits);
  };
  
  const handleCreateCategory = (newCategory: string) => {
    const upperCaseCategory = newCategory.trim().toUpperCase();
    if (upperCaseCategory && !allCategories.includes(upperCaseCategory)) {
        setAllCategories(prev => [...prev, upperCaseCategory].sort());
    }
    setValue('category', upperCaseCategory, { shouldValidate: true, shouldDirty: true });
    setIsCategoryPopoverOpen(false);
    setCategorySearchTerm('');
  };

  const handleDeleteCategory = (categoryToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAllCategories(prev => prev.filter(c => c !== categoryToDelete));
  };


  const filteredUnitOptions = unitOptions.filter(option =>
      option.label.toLowerCase().includes(unitSearchTerm.toLowerCase())
  );
  
  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );
  
  const stockUnitOptions = useMemo(() => {
    const options = [{ name: watchedUnits?.baseUnit || '' }];
    if (watchedUnits?.derivedUnits) {
        options.push(...watchedUnits.derivedUnits);
    }
    return options.filter(opt => opt && opt.name);
  }, [watchedUnits]);

  const handleDisplayUnitChange = (newUnit: string) => {
    const currentBaseStock = watchedStock;
    const unitDef = watchedUnits;
    if (!unitDef) return;

    let conversionFactor = 1;
    if (newUnit !== unitDef.baseUnit) {
        const derived = unitDef.derivedUnits?.find(d => d.name === newUnit);
        if (derived) conversionFactor = derived.conversionFactor;
    }
    
    const newDisplayQty = currentBaseStock / conversionFactor;
    const formattedDisplayQty = Number(newDisplayQty.toFixed(3)).toString();

    setDisplayStockQty(formattedDisplayQty);
    setDisplayStockUnit(newUnit);
  };

  const combinedFieldErrors = { ...localErrors, ...serverFieldErrors };

  return (
    <FormProvider {...methods}>
    <form onSubmit={handleSubmit(handleProductFormSubmitInternal)} className="space-y-4 pb-4">
      {formError && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{formError}</p>}

      {submissionDetails && (
        <div className="mb-3 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex items-center space-x-2 flex-grow">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500" />
            <span className="text-sm">Product "{submissionDetails.name}" saved successfully!</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAndPrepareForNew}
            className="ml-auto border-green-600 text-green-700 hover:bg-green-600 hover:text-white dark:border-green-500 dark:text-green-400 dark:hover:bg-green-500 dark:hover:text-card-foreground text-xs px-3 py-1 h-auto self-start sm:self-center"
            disabled={isProductFormLoading}
          >
            <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> Add Another Product
          </Button>
        </div>
      )}

      {/* Product Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-foreground text-xs">Product Name*</Label>
          <Input id="name" {...register('name')} className="bg-input border-border focus:ring-primary text-sm" />
          {(combinedFieldErrors.name || serverFieldErrors?.name) && (
            <p className="text-xs text-destructive mt-1">{combinedFieldErrors.name?.message || serverFieldErrors?.name?.[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="code" className="text-foreground text-xs">Product Code</Label>
          <Input id="code" {...register('code')} className="bg-input border-border focus:ring-primary text-sm" />
          {(combinedFieldErrors.code || serverFieldErrors?.code) && (
            <p className="text-xs text-destructive mt-1">{combinedFieldErrors.code?.message || serverFieldErrors?.code?.[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <Label htmlFor="category-combobox-trigger" className="text-foreground text-xs">Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="category-combobox-trigger"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-input border-border focus:ring-primary text-sm text-foreground hover:bg-muted/30 font-normal"
                    >
                      {field.value || "Select category..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <div className="p-2">
                        <Input
                          placeholder="Search or add category..."
                          value={categorySearchTerm}
                          onChange={(e) => setCategorySearchTerm(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <ScrollArea className="max-h-48">
                          {filteredCategories.map((cat) => (
                            <div key={cat} className="flex items-center group text-sm pl-2 pr-1 hover:bg-accent/50 rounded-md">
                                <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-8"
                                onClick={() => {
                                    setValue('category', cat, { shouldValidate: true, shouldDirty: true });
                                    setIsCategoryPopoverOpen(false);
                                    setCategorySearchTerm('');
                                }}
                                >
                                {cat}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-50 group-hover:opacity-100" onClick={(e) => handleDeleteCategory(cat, e)}>
                                 <X className="h-3 w-3 text-destructive" />
                                </Button>
                            </div>
                          ))}
                           {categorySearchTerm && !filteredCategories.some(c => c.toLowerCase() === categorySearchTerm.toLowerCase()) && (
                            <Button variant="ghost" className="w-full justify-start font-normal h-8 text-sm" onClick={() => handleCreateCategory(categorySearchTerm)}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Create "{categorySearchTerm.toUpperCase()}"
                            </Button>
                          )}
                           {filteredCategories.length === 0 && !categorySearchTerm && <p className="p-2 text-xs text-muted-foreground text-center">No categories found.</p>}
                      </ScrollArea>
                  </PopoverContent>
                </Popover>
              )}
            />
          {(combinedFieldErrors.category || serverFieldErrors?.category) && (
            <p className="text-xs text-destructive mt-1">{combinedFieldErrors.category?.message || serverFieldErrors?.category?.[0]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="barcode" className="text-foreground text-xs">Barcode</Label>
          <Input id="barcode" {...register('barcode')} className="bg-input border-border focus:ring-primary text-sm" />
          {(combinedFieldErrors.barcode || serverFieldErrors?.barcode) && (
            <p className="text-xs text-destructive mt-1">{combinedFieldErrors.barcode?.message || serverFieldErrors?.barcode?.[0]}</p>
          )}
        </div>
      </div>

      <Card className="bg-muted/20 border-border/40">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm text-foreground">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPrice" className="text-foreground">Cost Price (per base unit)</Label>
              <Input 
                id="costPrice" 
                type="number" 
                step="any" 
                {...register('costPrice', {
                  setValueAs: (v) => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? undefined : parseFloat(v),
                })}
                placeholder="0.00" 
                className="bg-input border-border focus:ring-primary text-sm" 
              />
              {(combinedFieldErrors.costPrice || serverFieldErrors?.costPrice) && (
                <p className="text-xs text-destructive mt-1">{combinedFieldErrors.costPrice?.message || serverFieldErrors?.costPrice?.[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="sellingPrice" className="text-foreground">Selling Price (per base unit)*</Label>
              <Input 
                id="sellingPrice" 
                type="number" 
                step="any" 
                {...register('sellingPrice', { 
                    setValueAs: (v) => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? 0 : parseFloat(v) 
                })}
                placeholder="0.00" 
                className="bg-input border-border focus:ring-primary text-sm" 
              />
              {(combinedFieldErrors.sellingPrice || serverFieldErrors?.sellingPrice) && (
                <p className="text-xs text-destructive mt-1">{combinedFieldErrors.sellingPrice?.message || serverFieldErrors?.sellingPrice?.[0]}</p>
              )}
            </div>
          </div>
          {(markup !== null || margin !== null) && (
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mt-1 p-2 rounded-md bg-background/50 border border-dashed border-border/30">
              <div>
                <Label className="flex items-center"><Percent className="h-3 w-3 mr-1" /> Markup</Label>
                <p className={markup !== null && markup < 0 ? "text-red-500" : ""}>{markup !== null ? `${markup.toFixed(2)}%` : 'N/A'}</p>
              </div>
              <div>
                <Label className="flex items-center"><DollarSign className="h-3 w-3 mr-1" /> Margin</Label>
                 <p className={margin !== null && margin < 0 ? "text-red-500" : ""}>{margin !== null ? `${margin.toFixed(2)}%` : 'N/A'}</p>
              </div>
            </div>
          )}
           <div>
            <Label htmlFor="productSpecificTaxRate" className="text-foreground">
                Product Specific Tax Rate (0 to 1, e.g. 0.05 for 5%)
                <Info size={12} className="inline ml-1 text-muted-foreground cursor-help" title="Leave blank to use global/category tax if applicable."/>
            </Label>
            <Input 
                id="productSpecificTaxRate" 
                type="number" 
                step="0.001" 
                {...register('productSpecificTaxRate', {
                    setValueAs: (v) => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? undefined : parseFloat(v),
                })} 
                placeholder="e.g., 0.05" 
                className="bg-input border-border focus:ring-primary text-sm" 
            />
            {(combinedFieldErrors.productSpecificTaxRate || serverFieldErrors?.productSpecificTaxRate) && (
                <p className="text-xs text-destructive mt-1">{combinedFieldErrors.productSpecificTaxRate?.message || serverFieldErrors?.productSpecificTaxRate?.[0]}</p>
            )}
           </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/20 border-border/40">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm text-foreground flex items-center">
            Stock & Units
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground cursor-help ml-1"><Info className="h-4 w-4" /></Button>
            </TooltipTrigger><TooltipContent className="max-w-xs text-xs" side="top">
                <p className="font-bold mb-1">Unit Configuration</p>
                <p><strong className="text-primary">Base Unit:</strong> The smallest unit stock is tracked in (e.g., grams, ml, pcs). Pricing and discounts are based on this unit.</p>
                <p className="mt-2"><strong className="text-primary">Derived Units:</strong> Larger units composed of the base unit (e.g., kg). The system will display stock in these units when the quantity exceeds the `Display Threshold`.</p>
            </TooltipContent></Tooltip></TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="displayStockQty" className="text-foreground">Current Stock Quantity</Label>
                <div className="flex items-center gap-2">
                  <Input id="displayStockQty" type="number" step="any" value={displayStockQty} onChange={(e) => setDisplayStockQty(e.target.value)} className="bg-input border-border focus:ring-primary text-sm" />
                  <Select value={displayStockUnit} onValueChange={handleDisplayUnitChange}>
                    <SelectTrigger className="w-[120px] bg-input border-border focus:ring-primary text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stockUnitOptions.map(opt => <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                 <Label className="text-foreground">Stock to Save (in Base Unit)</Label>
                 <div className="h-10 px-3 py-2 rounded-md bg-green-900/50 border border-green-700/60 text-green-300 font-medium text-sm flex items-center">
                    {watchedStock} {watchedUnits?.baseUnit || ''}
                 </div>
                 {(combinedFieldErrors.stock || serverFieldErrors?.stock) && (<p className="text-xs text-destructive mt-1">{combinedFieldErrors.stock?.message || serverFieldErrors?.stock?.[0]}</p>)}
              </div>
          </div>
          <Separator className="bg-border/30"/>
           <div>
            <Label htmlFor="units.baseUnit" className="text-foreground">Base Unit*</Label>
             <Controller
                name="units.baseUnit"
                control={control}
                render={({ field }) => (
                  <Popover open={isUnitPopoverOpen} onOpenChange={setIsUnitPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isUnitPopoverOpen} className="w-full justify-between bg-input border-border focus:ring-primary text-sm text-foreground hover:bg-muted/30 font-normal">
                        {field.value ? unitOptions.find((opt) => opt.value === field.value)?.label : "Select unit..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <div className="p-2">
                        <Input placeholder="Search or add unit..." value={unitSearchTerm} onChange={(e) => setUnitSearchTerm(e.target.value)} className="h-8"/>
                      </div>
                      <ScrollArea className="max-h-60">
                        {filteredUnitOptions.map((option) => (
                          <div key={option.value} className="flex items-center group text-sm pl-2 pr-1 hover:bg-accent/50 rounded-md">
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-normal h-8"
                              onClick={() => {
                                field.onChange(option.value);
                                setDisplayStockUnit(option.value);
                                setIsUnitPopoverOpen(false);
                              }}
                            >
                              {option.label}
                            </Button>
                            {customUnits.includes(option.value) && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-50 group-hover:opacity-100" onClick={(e) => handleDeleteCustomUnit(option.value, e)}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {filteredUnitOptions.length === 0 && unitSearchTerm && (
                           <Button variant="ghost" className="w-full justify-start font-normal h-8 text-sm" onClick={() => handleAddCustomUnit(unitSearchTerm)}>
                             Create "{unitSearchTerm}"
                           </Button>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
            />
           {(combinedFieldErrors.units?.baseUnit || serverFieldErrors?.["units.baseUnit"]) && (
             <p className="text-xs text-destructive mt-1">{combinedFieldErrors.units?.baseUnit?.message || serverFieldErrors?.["units.baseUnit"]?.[0]}</p>
            )}
        </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium text-foreground flex items-center">
                Derived Units (Optional)
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground cursor-help ml-1"><Info className="h-4 w-4" /></Button>
                </TooltipTrigger><TooltipContent className="max-w-xs text-xs" side="top">
                    <p className="font-bold mb-1">Unit Configuration</p>
                    <p><strong className="text-primary">Base Unit:</strong> The smallest unit stock is tracked in (e.g., grams, ml, pcs). Pricing and discounts are based on this unit.</p>
                    <p className="mt-2"><strong className="text-primary">Derived Units:</strong> Larger units composed of the base unit (e.g., kg). The system will display stock in these units when the quantity exceeds the `Display Threshold`.</p>
                </TooltipContent></Tooltip></TooltipProvider>
                </h4>
            </div>
            {derivedUnitFields.map((field, index) => (
              <Card key={field.id} className="mb-2 p-2.5 bg-background/50 border-border/30 space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-muted-foreground">Derived Unit {index + 1}</p>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDerivedUnit(index)} className="h-5 w-5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor={`units.derivedUnits.${index}.name`} className="text-foreground text-xs">Name* (e.g., kg)</Label>
                    <Input {...register(`units.derivedUnits.${index}.name`)} className="bg-input border-border focus:ring-primary h-7 text-xs" />
                     {(combinedFieldErrors.units?.derivedUnits?.[index]?.name || serverFieldErrors?.[`units.derivedUnits.${index}.name`]) && <p className="text-xs text-destructive mt-0.5">{combinedFieldErrors.units?.derivedUnits?.[index]?.name?.message || serverFieldErrors?.[`units.derivedUnits.${index}.name`]?.[0]}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`units.derivedUnits.${index}.conversionFactor`} className="text-foreground text-xs">Conversion Factor*</Label>
                    <Input type="number" step="any" {...register(`units.derivedUnits.${index}.conversionFactor`, { valueAsNumber: true })} className="bg-input border-border focus:ring-primary h-7 text-xs" />
                     {(combinedFieldErrors.units?.derivedUnits?.[index]?.conversionFactor || serverFieldErrors?.[`units.derivedUnits.${index}.conversionFactor`]) && <p className="text-xs text-destructive mt-0.5">{combinedFieldErrors.units?.derivedUnits?.[index]?.conversionFactor?.message || serverFieldErrors?.[`units.derivedUnits.${index}.conversionFactor`]?.[0]}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`units.derivedUnits.${index}.threshold`} className="text-foreground text-xs">Display Threshold*</Label>
                    <Input type="number" step="any" {...register(`units.derivedUnits.${index}.threshold`, { valueAsNumber: true })} className="bg-input border-border focus:ring-primary h-7 text-xs" />
                    {(combinedFieldErrors.units?.derivedUnits?.[index]?.threshold || serverFieldErrors?.[`units.derivedUnits.${index}.threshold`]) && <p className="text-xs text-destructive mt-0.5">{combinedFieldErrors.units?.derivedUnits?.[index]?.threshold?.message || serverFieldErrors?.[`units.derivedUnits.${index}.threshold`]?.[0]}</p>}
                  </div>
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendDerivedUnit({ name: '', conversionFactor: 1, threshold: 0 })} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-1 text-xs h-7">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Derived Unit
            </Button>
            {(combinedFieldErrors.units?.derivedUnits && typeof combinedFieldErrors.units.derivedUnits.message === 'string') && (
                 <p className="text-xs text-destructive mt-1">{combinedFieldErrors.units.derivedUnits.message}</p>
            )}
             {(combinedFieldErrors.units && !combinedFieldErrors.units.baseUnit && !combinedFieldErrors.units.derivedUnits && typeof combinedFieldErrors.units.message === 'string') && (
                <p className="text-xs text-destructive mt-1">{combinedFieldErrors.units.message}</p>
            )}
             <Accordion type="single" collapsible className="w-full mt-2">
                <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline p-1 justify-start">
                    උදාහරණයක් බලන්න (View Example)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-3 text-xs border border-dashed rounded-md bg-background/30 text-muted-foreground space-y-2">
                      <p><strong className="text-foreground">තත්ත්වය (Scenario):</strong> අපි පැනඩෝල් විකුණනවා.</p>
                      <p><strong className="text-foreground">ප්‍රධාන මිනුම (Base Unit):</strong> `tablet` (පෙත්ත) - අපේ තොගය සහ මිල ගණන් පදනම් වෙන්නේ පෙති ගණන මතයි.</p>
                      
                      <p className="font-semibold text-foreground pt-2 border-t border-border/30">පළමු විශාල ඒකකය (Derived Unit 1): කාඩ් එක</p>
                      <ul className="list-disc pl-5">
                          <li><strong>Name:</strong> `card`</li>
                          <li><strong>Conversion Factor:</strong> `12` (මොකද 1 card = 12 tablets)</li>
                          <li><strong>Display Threshold:</strong> `12` (තොගය පෙති 12ක් හෝ ඊට වැඩි නම්, 'card' වලින් පෙන්වන්න)</li>
                      </ul>

                      <p className="font-semibold text-foreground pt-2 border-t border-border/30">දෙවන විශාල ඒකකය (Derived Unit 2): පෙට්ටිය</p>
                      <ul className="list-disc pl-5">
                          <li><strong>Name:</strong> `box`</li>
                          <li><strong>Conversion Factor:</strong> `72` (මොකද 1 box = 6 cards, සහ 1 card = 12 tablets නිසා, 6 x 12 = 72 tablets)</li>
                          <li><strong>Display Threshold:</strong> `72` (තොගය පෙති 72ක් හෝ ඊට වැඩි නම්, 'box' වලින් පෙන්වන්න)</li>
                      </ul>

                      <p className="font-semibold text-foreground pt-2 border-t border-border/30">ප්‍රතිඵලය (Result):</p>
                      <ul className="list-disc pl-5">
                          <li>ඔබේ තොගයේ පෙති `3`ක් තිබුණොත්, එය **`3 tablet`** ලෙස පෙන්වයි.</li>
                          <li>ඔබේ තොගයේ පෙති `15`ක් තිබුණොත්, එය **`1.25 card`** ලෙස පෙන්වයි (15 / 12).</li>
                          <li>ඔබේ තොගයේ පෙති `144`ක් තිබුණොත්, එය **`2 box`** ලෙස පෙන්වයි (144 / 72).</li>
                      </ul>
                  </div>
                </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/20 border-border/40">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm text-foreground">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <Label htmlFor="defaultQuantity" className="text-foreground">Default Sale Quantity</Label>
                  <Input id="defaultQuantity" type="number" step="any" {...register('defaultQuantity', { setValueAs: (v) => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? 1 : parseFloat(v) })} className="bg-input border-border focus:ring-primary text-sm" />
                  {(combinedFieldErrors.defaultQuantity || serverFieldErrors?.defaultQuantity) && (<p className="text-xs text-destructive mt-1">{combinedFieldErrors.defaultQuantity?.message || serverFieldErrors?.defaultQuantity?.[0]}</p>)}
              </div>
              <div>
                <Label htmlFor="imageUrl" className="text-foreground text-xs">Image URL</Label>
                <Input id="imageUrl" {...register('imageUrl')} placeholder="https://placehold.co/100x100.png" className="bg-input border-border focus:ring-primary text-sm" />
                {(combinedFieldErrors.imageUrl || serverFieldErrors?.imageUrl) && (<p className="text-xs text-destructive mt-1">{combinedFieldErrors.imageUrl?.message || serverFieldErrors?.imageUrl?.[0]}</p>)}
              </div>
          </div>
           <div>
            <Label htmlFor="description" className="text-foreground text-xs">Description/Comment</Label>
            <Textarea id="description" {...register('description')} placeholder="Enter any notes or description for the product..." className="bg-input border-border focus:ring-primary text-sm min-h-[60px]" />
            {(combinedFieldErrors.description || serverFieldErrors?.description) && (<p className="text-xs text-destructive mt-1">{combinedFieldErrors.description?.message || serverFieldErrors?.description?.[0]}</p>)}
          </div>
          <div className="flex items-center space-x-6 pt-2">
            <div className="flex items-center space-x-2">
              <Controller name="isActive" control={control} render={({ field }) => (<Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} aria-label="Product Active Status"/>)} />
              <Label htmlFor="isActive" className="text-foreground text-xs">Product Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller name="isService" control={control} render={({ field }) => (<Switch id="isService" checked={field.value} onCheckedChange={field.onChange} aria-label="Product Service Status"/>)} />
              <Label htmlFor="isService" className="text-foreground text-xs">Is Service Item (No Stock)</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end space-x-3 pt-3 border-t border-border mt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProductFormLoading} className="border-muted text-muted-foreground hover:bg-muted/80">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isProductFormLoading || !formIsValid || (!isDirty && isEditingProduct)} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]">
          {isProductFormLoading ? 'Saving...' : (isEditingProduct ? 'Update Product' : 'Create Product')}
        </Button>
      </div>
    </form>
    </FormProvider>
  );
}

    