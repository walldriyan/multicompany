
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllProductsAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from '@/app/actions/productActions';
import {
  initializeAllProducts,
  _internalAddNewProduct,
  _internalUpdateProduct,
  _internalDeleteProduct,
  selectAllProducts,
} from '@/store/slices/saleSlice';
import type { AppDispatch } from '@/store/store';
import type { Product as ProductType, ProductFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProductForm } from '@/components/dashboard/ProductForm';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Edit3, Trash2, PackageSearch, RefreshCw, ImageOff, PackageIcon, UsersIcon, UserCogIcon, ArchiveIcon, BuildingIcon, SettingsIcon, MenuIcon } from 'lucide-react';
import Image from 'next/image';
import { getDisplayQuantityAndUnit } from '@/lib/unitUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

type DashboardView = 'products' | 'customers' | 'users' | 'stock' | 'company';

const viewConfig: Record<DashboardView, { name: string; icon: React.ElementType }> = {
  products: { name: 'Product Management', icon: PackageIcon },
  customers: { name: 'Customers', icon: UsersIcon },
  users: { name: 'Users & Roles', icon: UserCogIcon },
  stock: { name: 'Stock Management', icon: ArchiveIcon },
  company: { name: 'Company Details', icon: BuildingIcon },
};

export default function DashboardPage() {
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useToast();
  const products = useSelector(selectAllProducts);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>('products');

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const result = await getAllProductsAction();
    if (result.success && result.data) {
      dispatch(initializeAllProducts(result.data));
    } else {
      toast({
        title: 'Error Fetching Products',
        description: `${result.error || 'Could not load products.'} ${result.detailedError ? `Details: ${result.detailedError}` : ''}`,
        variant: 'destructive',
        duration: 7000,
      });
    }
    setIsLoading(false);
  }, [dispatch, toast]);

  useEffect(() => {
    if (products.length === 0 && activeView === 'products') { // Only fetch if products view is active and no products
      fetchProducts();
    } else {
      setIsLoading(false);
    }
  }, [fetchProducts, products.length, activeView]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductSheetOpen(true);
  };

  const handleEditProduct = (product: ProductType) => {
    setEditingProduct(product);
    setIsProductSheetOpen(true);
  };

  const handleDeleteProduct = (product: ProductType) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    const result = await deleteProductAction(productToDelete.id);
    if (result.success) {
      dispatch(_internalDeleteProduct({ id: productToDelete.id }));
      toast({ title: 'Product Deleted', description: `"${productToDelete.name}" has been deleted.` });
    } else {
      toast({ title: 'Error Deleting Product', description: result.error, variant: 'destructive' });
    }
    setProductToDelete(null);
    setIsSubmitting(false);
  };

  const handleProductFormSubmit = async (data: ProductFormData, productId?: string): Promise<{success: boolean, error?: string, fieldErrors?: Record<string, string[]>}> => {
    setIsSubmitting(true);
    let result;

    if (productId) {
      result = await updateProductAction(productId, data);
      if (result.success && result.data) {
        dispatch(_internalUpdateProduct(result.data));
        toast({ title: 'Product Updated', description: `"${result.data.name}" has been updated.` });
      }
    } else {
      result = await createProductAction(data);
      if (result.success && result.data) {
        dispatch(_internalAddNewProduct(result.data));
        toast({ title: 'Product Created', description: `"${result.data.name}" has been added.` });
      }
    }
    setIsSubmitting(false);
    if (result.success) {
        setIsProductSheetOpen(false); // Close sheet on success
    }
    return {success: result.success, error: result.error, fieldErrors: result.fieldErrors};
  };

  const DashboardPageContent = () => {
    const { isMobile } = useSidebar();
    const currentViewMeta = viewConfig[activeView];

    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 bg-background text-foreground">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            {isMobile && <SidebarTrigger className="mr-2"><MenuIcon /></SidebarTrigger>}
            <Link href="/" passHref>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground self-start sm:self-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to POS
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              {currentViewMeta.name}
            </h1>
          </div>
          {activeView === 'products' && (
            <div className="flex space-x-2 self-end sm:self-center">
              <Button onClick={fetchProducts} variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </div>
          )}
        </header>

        {activeView === 'products' && (
          <Card className="bg-card border-border shadow-xl flex-1">
            <CardHeader>
              <CardTitle className="text-2xl text-card-foreground">Product List</CardTitle>
              <CardDescription className="text-muted-foreground">
                View, add, edit, or delete products in your inventory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && products.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={`skel-${i}`} className="flex items-center space-x-4 p-4 border-b border-border/30">
                    <Skeleton className="h-12 w-12 rounded-md bg-muted/50" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded bg-muted/50" />
                      <Skeleton className="h-3 w-1/2 rounded bg-muted/50" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-md bg-muted/50" />
                  </div>
                ))
              ) : !isLoading && products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <PackageSearch className="mx-auto h-12 w-12 mb-4 text-primary" />
                  <p className="text-lg font-medium">No products found.</p>
                  <p className="text-sm">Click "Add Product" to get started or run seeding.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-border/50 hover:bg-muted/20">
                        <TableHead className="w-16 text-muted-foreground"></TableHead>
                        <TableHead className="text-muted-foreground">Name</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-right text-muted-foreground">Price (Base Unit)</TableHead>
                        <TableHead className="text-right text-muted-foreground">Stock (Base Unit)</TableHead>
                        <TableHead className="text-center text-muted-foreground">Units</TableHead>
                        <TableHead className="text-center text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const { displayQuantity: stockDisplayQty, displayUnit: stockDisplayUnit } = getDisplayQuantityAndUnit(product.stock, product.units);
                        return (
                          <TableRow key={product.id} className="border-b-border/30 hover:bg-muted/10">
                            <TableCell>
                              {product.imageUrl ? (
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  width={48}
                                  height={48}
                                  className="rounded-md object-cover aspect-square"
                                  data-ai-hint={`${product.category} ${product.name.split(' ')[0]}`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none'; 
                                    const fallbackDiv = target.nextElementSibling; 
                                    if (fallbackDiv && fallbackDiv.classList.contains('image-fallback-icon')) {
                                        fallbackDiv.classList.remove('hidden');
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`image-fallback-icon w-12 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs ${product.imageUrl ? 'hidden' : ''}`}>
                                <ImageOff className="h-5 w-5" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-card-foreground">{product.name}</TableCell>
                            <TableCell className="text-card-foreground">{product.category || 'N/A'}</TableCell>
                            <TableCell className="text-right text-card-foreground">Rs. {product.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-card-foreground" title={`${product.stock} ${product.units.baseUnit}`}>
                              {stockDisplayQty} {stockDisplayUnit}
                            </TableCell>
                            <TableCell className="text-center text-card-foreground text-xs">
                              {product.units.baseUnit}
                              {product.units.derivedUnits && product.units.derivedUnits.length > 0 && (
                                <span className="block text-muted-foreground">({product.units.derivedUnits.map(du => du.name).join(', ')})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} className="h-8 w-8 text-blue-500 hover:text-blue-600">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)} className="h-8 w-8 text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {activeView === 'customers' && <div className="text-center p-10 text-muted-foreground">Customer Management Coming Soon...</div>}
        {activeView === 'users' && <div className="text-center p-10 text-muted-foreground">User Management & Roles Coming Soon...</div>}
        {activeView === 'stock' && <div className="text-center p-10 text-muted-foreground">Detailed Stock Management Coming Soon...</div>}
        {activeView === 'company' && <div className="text-center p-10 text-muted-foreground">Company Details Configuration Coming Soon...</div>}

      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" collapsible="icon" className="border-r border-border/30">
        <SidebarHeader className="border-b border-border/30">
          <Link href="/dashboard" className="flex items-center gap-2 p-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg text-foreground group-data-[collapsible=icon]:hidden">Aronium Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {(Object.keys(viewConfig) as DashboardView[]).map((viewKey) => {
              const IconComponent = viewConfig[viewKey].icon;
              const isDisabled = viewKey !== 'products'; // Disable non-product tabs for now
              return (
                <SidebarMenuItem key={viewKey}>
                  <SidebarMenuButton
                    onClick={() => { if (!isDisabled) setActiveView(viewKey);}}
                    isActive={activeView === viewKey}
                    tooltip={{ children: viewConfig[viewKey].name, side: "right" }}
                    disabled={isDisabled}
                    className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {viewConfig[viewKey].name} {isDisabled && "(Soon)"}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        {/* <SidebarFooter>
          <p className="text-xs text-muted-foreground p-2 group-data-[collapsible=icon]:hidden">© Aronium POS</p>
        </SidebarFooter> */}
      </Sidebar>

      <SidebarInset>
        <DashboardPageContent />
      </SidebarInset>

      {isProductSheetOpen && (
        <Sheet open={isProductSheetOpen} onOpenChange={setIsProductSheetOpen}>
          <SheetContent className="sm:max-w-2xl w-full md:w-[50vw] max-h-screen flex flex-col p-0 bg-card border-border shadow-xl overflow-hidden">
            <SheetHeader className="p-6 pb-4 border-b border-border">
              <SheetTitle className="text-card-foreground">{editingProduct ? 'Edit Product' : 'Add New Product'}</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {editingProduct ? `Update details for ${editingProduct.name}.` : 'Fill in the details for the new product.'}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <ProductForm
                product={editingProduct ? {
                    name: editingProduct.name,
                    price: editingProduct.price,
                    stock: editingProduct.stock,
                    category: editingProduct.category || '',
                    imageUrl: editingProduct.imageUrl || '',
                    units: editingProduct.units,
                } : null}
                onSubmit={handleProductFormSubmit}
                isLoading={isSubmitting}
                onCancel={() => setIsProductSheetOpen(false)}
                submitButtonText={editingProduct ? 'Update Product' : 'Create Product'}
              />
            </div>
            {/* SheetFooter might not be needed if ProductForm handles buttons */}
            {/* <SheetFooter className="p-6 pt-4 border-t border-border">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter> */}
          </SheetContent>
        </Sheet>
      )}

      {productToDelete && (
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete "{productToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProduct} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                {isSubmitting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarProvider>
  );
}
