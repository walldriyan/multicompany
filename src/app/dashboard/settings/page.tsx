
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

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    toast({ title: "Starting Backup", description: "Your database backup is being prepared for download." });
    // In a real app, this would trigger a server action
    // For now, we simulate a delay and a successful download
    setTimeout(() => {
      // Simulate file download
      const blob = new Blob(["Simulated DB Content"], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aronium_backup_${new Date().toISOString()}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Backup Complete", description: "Database backup downloaded successfully." });
      setIsBackingUp(false);
    }, 2000);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsRestoring(true);
      toast({ title: "Restoring Database", description: `Uploading ${file.name}... This may take a moment.` });
      // Simulate upload and restore process
      setTimeout(() => {
        toast({ title: "Restore Complete", description: "Database has been restored successfully. The application may need to restart.", variant: "default" });
        setIsRestoring(false);
      }, 3000);
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><DatabaseBackup className="mr-2 h-5 w-5 text-primary" /> Backup Database</CardTitle>
                <CardDescription>Download a complete backup of the application database. Keep this file in a safe place.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleBackup} disabled={isBackingUp || isRestoring} className="w-full">
                  {isBackingUp ? 'Backing up...' : 'Download Backup File'}
                </Button>
              </CardContent>
            </Card>
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5" /> Restore Database</CardTitle>
                <CardDescription className="text-destructive/80">
                  Restoring will completely overwrite the current database. This action cannot be undone. Proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" accept=".db,.sqlite,.sqlite3" />
                <Button onClick={handleRestoreClick} variant="destructive" disabled={isRestoring || isBackingUp} className="w-full">
                   <UploadCloud className="mr-2 h-4 w-4" />
                  {isRestoring ? 'Restoring...' : 'Choose Backup File to Restore'}
                </Button>
              </CardContent>
            </Card>
          </div>
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
