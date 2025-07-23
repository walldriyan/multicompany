
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, DatabaseBackup, UploadCloud, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { backupCompanyDataAction, backupFullDatabaseAction } from '@/app/actions/backupActions';
import { usePermissions } from '@/hooks/usePermissions';

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const { can } = usePermissions();
  const canManageSettings = can('manage', 'Settings');

  const isSuperAdmin = currentUser?.role?.name === 'Admin';

  const handleCompanyBackup = async () => {
    if (!currentUser?.id || !canManageSettings) {
      toast({ title: "Error", description: "You don't have permission to perform this action.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    toast({ title: "Starting Company Backup", description: "Preparing company data for download..." });

    const result = await backupCompanyDataAction(currentUser.id);

    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.companyName || 'company'}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Backup Complete", description: "Company data (JSON) downloaded successfully." });
    } else {
       toast({ title: "Backup Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
    
    setIsProcessing(false);
  };
  
  const handleFullDatabaseBackup = async () => {
    if (!currentUser?.id || !isSuperAdmin || !canManageSettings) {
       toast({ title: "Permission Denied", description: "Only Super Admins can perform a full database backup.", variant: "destructive" });
       return;
    }
    setIsProcessing(true);
    toast({ title: "Starting Full Database Backup", description: "Preparing database file for download..." });

    const result = await backupFullDatabaseAction(currentUser.id);

    if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/vnd.sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aronium_full_backup_${new Date().toISOString().split('T')[0]}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Full Backup Complete", description: "Database file (.db) downloaded successfully." });
    } else {
        toast({ title: "Full Backup Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
    setIsProcessing(false);
  };


  const handleRestoreClick = () => {
    toast({
        title: "Restore Not Implemented",
        description: "Restoring from a backup is a sensitive operation and is not yet fully implemented in this UI.",
        variant: "default",
    });
  };

  const renderSuperAdminView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DatabaseBackup className="mr-2 h-5 w-5 text-primary" /> Backup Full Database</CardTitle>
          <CardDescription>Download the entire application database (`dev.db`). This contains all companies, users, and data. This is the master backup.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFullDatabaseBackup} disabled={isProcessing || !canManageSettings} className="w-full">
            {isProcessing ? 'Backing up...' : 'Download Full Database (.db)'}
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5" /> Restore Full Database</CardTitle>
          <CardDescription className="text-destructive/80">
            Restoring will **completely overwrite** the current database with the uploaded file. This action cannot be undone. All current data will be lost.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRestoreClick} variant="destructive" disabled={isProcessing || !canManageSettings} className="w-full">
             <UploadCloud className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Restore from .db file'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompanyUserView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DatabaseBackup className="mr-2 h-5 w-5 text-primary" /> Backup My Company Data</CardTitle>
          <CardDescription>Download a backup of your company's data (Products, Sales, etc.) as a JSON file. Keep this file in a safe place.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCompanyBackup} disabled={isProcessing || !currentUser?.companyId || !canManageSettings} className="w-full">
            {isProcessing ? 'Backing up...' : 'Download Company Backup (.json)'}
          </Button>
          {!currentUser?.companyId && <p className="text-xs text-muted-foreground mt-2 text-center">You must be assigned to a company to use this feature.</p>}
        </CardContent>
      </Card>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5" /> Restore Company Data</CardTitle>
          <CardDescription className="text-destructive/80">
            Restoring from a JSON file will overwrite your company's existing data. This action is not yet implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRestoreClick} variant="destructive" disabled={isProcessing || !canManageSettings} className="w-full">
            <UploadCloud className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Restore from .json file'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );


  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground self-start sm:self-center">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center">
            <Settings className="mr-3 h-7 w-7" /> Application Settings
          </h1>
        </div>
      </header>
      
      <Tabs defaultValue="backup-restore" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backup-restore">Backup & Restore</TabsTrigger>
          <TabsTrigger value="system-settings">System Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="backup-restore" className="mt-4">
          {!canManageSettings ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                <p>You do not have permission to manage backups and restores.</p>
              </CardContent>
            </Card>
          ) : isSuperAdmin ? renderSuperAdminView() : renderCompanyUserView()}
        </TabsContent>
        <TabsContent value="system-settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>General system-wide settings will be available here in the future.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">This section is under construction.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
