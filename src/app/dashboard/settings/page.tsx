
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, DatabaseBackup, UploadCloud, AlertTriangle, FileUp, FileDown, Replace, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { backupCompanyDataAction, backupFullDatabaseAction } from '@/app/actions/backupActions';
import { importProductsAction, exportProductsAction } from '@/app/actions/importExportActions';
import { usePermissions } from '@/hooks/usePermissions';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type FieldMapping = Record<string, string>;

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const { can } = usePermissions();
  const canManageSettings = can('manage', 'Settings');

  const isSuperAdmin = currentUser?.role?.name === 'Admin';
  
  // State for import feature
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileDataPreview, setFileDataPreview] = useState<Record<string, any>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; errors: any[] } | null>(null);

  const dbProductFields = [
    { value: 'name', label: 'Product Name', required: true },
    { value: 'sellingPrice', label: 'Selling Price', required: true },
    { value: 'stock', label: 'Initial Stock' },
    { value: 'costPrice', label: 'Initial Cost Price' },
    { value: 'code', label: 'Product Code' },
    { value: 'barcode', label: 'Barcode' },
    { value: 'category', label: 'Category' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToImport(file);
      setImportResult(null);
      setImportProgress(0);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => {
          if (results.meta.fields) {
            setFileHeaders(results.meta.fields);
            setFileDataPreview(results.data as Record<string, any>[]);
            
            // Auto-map fields if names match common patterns
            const initialMapping: FieldMapping = {};
            dbProductFields.forEach(dbField => {
              const lowerDbField = dbField.value.toLowerCase().replace(/_/g, '');
              const foundHeader = results.meta.fields?.find(header => {
                const lowerHeader = header.toLowerCase().replace(/ /g, '').replace(/_/g, '');
                return lowerHeader === lowerDbField ||
                       lowerHeader === `${lowerDbField}s` ||
                       (lowerDbField === 'name' && lowerHeader.includes('productname')) ||
                       (lowerDbField === 'name' && lowerHeader.includes('itemname')) ||
                       (lowerDbField === 'sellingprice' && lowerHeader.includes('price')) ||
                       (lowerDbField === 'sellingprice' && lowerHeader.includes('retail')) ||
                       (lowerDbField === 'stock' && lowerHeader.includes('quantity')) ||
                       (lowerDbField === 'stock' && lowerHeader.includes('qty')) ||
                       (lowerDbField === 'stock' && lowerHeader.includes('onhand'));
              });
              if (foundHeader) {
                initialMapping[dbField.value] = foundHeader;
              }
            });
            setFieldMapping(initialMapping);
          }
        }
      });
    }
  };

  const handleImportProducts = async () => {
    if (!fileToImport || !currentUser?.id) {
        toast({ title: "Error", description: "Please select a file to import.", variant: "destructive" });
        return;
    }
    
    // Validate required fields are mapped
    const unmappedRequiredField = dbProductFields.find(f => f.required && !fieldMapping[f.value]);
    if (unmappedRequiredField) {
        toast({ title: "Mapping Incomplete", description: `Please map a column for the required field: ${unmappedRequiredField.label}`, variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    setImportResult(null);
    setImportProgress(20);

    Papa.parse(fileToImport, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            setImportProgress(40);
            const importResult = await importProductsAction(results.data as Record<string, any>[], fieldMapping, currentUser.id);
            setImportProgress(100);
            setImportResult({ success: importResult.success, message: importResult.message, errors: importResult.errors });
            toast({
                title: importResult.success ? "Import Complete" : "Import Finished with Errors",
                description: importResult.message,
                variant: importResult.success ? "default" : "destructive",
                duration: 10000,
            });
            setIsProcessing(false);
            if (importResult.success) {
                setFileToImport(null);
                setFileHeaders([]);
                setFileDataPreview([]);
                setFieldMapping({});
            }
        }
    });
  };
  
  const handleExportProducts = async () => {
    if (!currentUser?.id) {
        toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    toast({ title: "Exporting Products", description: "Preparing your product data for download..." });
    const result = await exportProductsAction(currentUser.id);

    if (result.success && result.data) {
        const dataToExport = result.data.map(p => ({
            'Name': p.name,
            'Code': p.code,
            'Category': p.category,
            'Barcode': p.barcode,
            'Selling_Price': p.sellingPrice,
            'Cost_Price_Avg': p.costPrice,
            'Stock_Total': p.stock,
            'Base_Unit': p.units.baseUnit,
            'Is_Active': p.isActive,
            'Is_Service': p.isService,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        XLSX.writeFile(workbook, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);

        toast({ title: "Export Complete", description: "Product data downloaded successfully." });
    } else {
        toast({ title: "Export Failed", description: result.error || "Could not export products.", variant: "destructive" });
    }
    setIsProcessing(false);
  };
  
  const handleCompanyBackup = async () => {
    if (!currentUser?.id) {
        toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    toast({ title: "Company Backup", description: "Preparing your company data for download..." });
    const result = await backupCompanyDataAction(currentUser.id);

    if (result.success && result.data && result.companyName) {
        const blob = new Blob([result.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.companyName}_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Backup Complete", description: "Company data downloaded." });
    } else {
        toast({ title: "Backup Failed", description: result.error || "Could not complete company data backup.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleFullDatabaseBackup = async () => {
    if (!currentUser?.id || !isSuperAdmin) {
        toast({ title: "Error", description: "Permission denied or not authenticated.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    toast({ title: "Full Database Backup", description: "Preparing database file for download..." });
    const result = await backupFullDatabaseAction(currentUser.id);

    if (result.success && result.data) {
        const byteCharacters = atob(result.data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pos_full_backup_${new Date().toISOString().split('T')[0]}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Backup Complete", description: "Full database downloaded." });
    } else {
        toast({ title: "Backup Failed", description: result.error || "Could not complete full database backup.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground self-start sm:self-center">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center"><Settings className="mr-3 h-7 w-7" /> Application Settings</h1>
        </div>
      </header>
      
      <Tabs defaultValue="import-export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import-export">Import & Export Products</TabsTrigger>
          <TabsTrigger value="backup-restore">Backup & Restore</TabsTrigger>
        </TabsList>
        <TabsContent value="import-export" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><FileDown className="mr-2 h-5 w-5 text-primary" /> Export Products</CardTitle>
                  <CardDescription>Download all your current product data into a single Excel file.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportProducts} disabled={isProcessing || !canManageSettings} className="w-full">
                    {isProcessing ? 'Processing...' : 'Export All Products to Excel'}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><FileUp className="mr-2 h-5 w-5 text-primary" /> Import Products from CSV</CardTitle>
                  <CardDescription>Upload a CSV file to add new products to your inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="bg-input border-border" disabled={isProcessing || !canManageSettings} />
                </CardContent>
              </Card>
          </div>
          {fileToImport && (
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Step 2: Map CSV Columns to Database Fields</CardTitle>
                    <CardDescription>Match the columns from your file ({fileToImport.name}) to the corresponding product fields in the database. Required fields are marked with *.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {dbProductFields.map(dbField => (
                        <div key={dbField.value}>
                            <Label htmlFor={`map-${dbField.value}`} className="text-xs">{dbField.label}{dbField.required && '*'}</Label>
                            <Select value={fieldMapping[dbField.value] || ''} onValueChange={(value) => setFieldMapping(prev => ({ ...prev, [dbField.value]: value }))}>
                                <SelectTrigger id={`map-${dbField.value}`} className="bg-input border-border mt-1"><SelectValue placeholder="Select CSV Column..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- Do Not Import --</SelectItem>
                                    {fileHeaders.map(header => (
                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                  </div>
                  <Separator className="my-4"/>
                  <Label className="text-xs">Data Preview (first 5 rows)</Label>
                  <ScrollArea className="h-48 border rounded-md mt-1">
                    <Table>
                        <TableHeader><TableRow>{fileHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                            {fileDataPreview.map((row, i) => (
                                <TableRow key={i}>{fileHeaders.map(h => <TableCell key={h} className="text-xs truncate max-w-[100px]">{row[h]}</TableCell>)}</TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleImportProducts} disabled={isProcessing}>{isProcessing ? 'Importing...' : 'Start Import'}</Button>
                  </div>
                  {isProcessing && <Progress value={importProgress} className="w-full mt-2" />}
                  {importResult && (
                    <div className="mt-4">
                        <CardDescription>{importResult.message}</CardDescription>
                        {importResult.errors.length > 0 && (
                            <ScrollArea className="h-40 border bg-destructive/10 text-destructive p-2 rounded-md mt-2">
                                <h4 className="font-bold">Import Errors:</h4>
                                <ul className="text-xs space-y-1">
                                    {importResult.errors.map((err, i) => (
                                        <li key={i}>Row {err.row}: {err.message}</li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        )}
                    </div>
                  )}
                </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="backup-restore" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><DatabaseBackup className="mr-2 h-5 w-5 text-primary" /> Backup Data</CardTitle>
                <CardDescription>Download backups of your data. Super Admins can download the entire database, while others can backup their specific company data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                 <Button onClick={handleCompanyBackup} disabled={isProcessing || !currentUser?.companyId || !canManageSettings} className="w-full">
                    {isProcessing ? 'Processing...' : 'Download My Company Backup (.json)'}
                  </Button>
                {isSuperAdmin && (
                   <Button onClick={handleFullDatabaseBackup} disabled={isProcessing || !canManageSettings} className="w-full">
                        {isProcessing ? 'Processing...' : 'Download Full Database (.db)'}
                    </Button>
                )}
              </CardContent>
            </Card>
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive"><Replace className="mr-2 h-5 w-5" /> Restore Data</CardTitle>
                <CardDescription className="text-destructive/80">Restoring will **overwrite** current data. This action is not implemented in the UI and must be done manually by a developer.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Button variant="destructive" disabled={true} className="w-full">
                    Restore From Backup (Disabled)
                 </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
