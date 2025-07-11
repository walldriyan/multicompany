
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyProfileSchema } from '@/lib/zodSchemas';
import type { CompanyProfileFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, ArrowLeft, Edit, Save, X, UploadCloud, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompanyProfileAction, upsertCompanyProfileAction } from '@/app/actions/companyActions';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { usePermissions } from '@/hooks/usePermissions';

const defaultCompanyProfile: CompanyProfileFormData = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxId: '',
  logoUrl: '',
};

const isValidHttpUrl = (stringToCheck: string | null | undefined): boolean => {
  if (!stringToCheck || typeof stringToCheck !== 'string') {
    return false;
  }
  if (stringToCheck.startsWith('/uploads/')) {
    return true;
  }
  let url;
  try {
    url = new URL(stringToCheck);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
};

export default function CompanyDetailsPage() {
  const { toast } = useToast();
  const currentUser = useSelector(selectCurrentUser);
  const { can } = usePermissions();
  const canManageSettings = can('manage', 'Settings');

  const [companyDetailsFromServer, setCompanyDetailsFromServer] = useState<CompanyProfileFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formSubmissionError, setFormSubmissionError] = useState<string | null>(null);
  const [formSubmissionFieldErrors, setFormSubmissionFieldErrors] = useState<Record<string, string[]> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(CompanyProfileSchema),
    defaultValues: defaultCompanyProfile,
    mode: 'all',
  });

  const currentLogoUrlFromForm = watch('logoUrl');

  const fetchCompanyDetails = useCallback(async () => {
    setIsLoading(true);
    setFormSubmissionError(null);
    setFormSubmissionFieldErrors(null);
    const result = await getCompanyProfileAction();
    if (result.success && result.data) {
      const fetchedData = result.data;
      const dataForForm: CompanyProfileFormData = {
        name: fetchedData.name || '',
        address: fetchedData.address || '',
        phone: fetchedData.phone || '',
        email: fetchedData.email || '',
        website: fetchedData.website || '',
        taxId: fetchedData.taxId || '',
        logoUrl: fetchedData.logoUrl || '',
      };
      setCompanyDetailsFromServer(dataForForm);
      reset(dataForForm);
      setPreviewUrl(isValidHttpUrl(dataForForm.logoUrl) ? dataForForm.logoUrl : null);
    } else {
      toast({ title: 'Error', description: result.error || 'Could not fetch company details.', variant: 'destructive' });
      setCompanyDetailsFromServer(defaultCompanyProfile);
      reset(defaultCompanyProfile);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setIsLoading(false);
  }, [toast, reset]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue('logoUrl', '', { shouldValidate: true, shouldDirty: true });
    } else {
      setSelectedFile(null);
      const serverLogo = companyDetailsFromServer?.logoUrl;
      setPreviewUrl(serverLogo && isValidHttpUrl(serverLogo) ? serverLogo : null);
      setValue('logoUrl', serverLogo || '', { shouldValidate: true, shouldDirty: true });
    }
  };
  
  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setValue('logoUrl', '', { shouldValidate: true, shouldDirty: true });
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: CompanyProfileFormData) => {
    if (!canManageSettings) {
        toast({ title: 'Permission Denied', description: 'You do not have permission to manage settings.', variant: 'destructive' });
        return;
    }
    if (!currentUser?.id) {
        setFormSubmissionError('You must be logged in to update company details.');
        toast({ title: 'Authentication Error', description: 'User not found.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    setFormSubmissionError(null);
    setFormSubmissionFieldErrors(null);

    const formDataToSend = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'logoFile' && key !== 'id' && value !== null && value !== undefined) {
        formDataToSend.append(key, String(value));
      }
    });
    
    if (selectedFile) {
      formDataToSend.append('logoFile', selectedFile);
    } else if (!data.logoUrl && companyDetailsFromServer?.logoUrl) {
      formDataToSend.append('clearLogo', 'true');
    }
    
    const result = await upsertCompanyProfileAction(formDataToSend, currentUser.id);
    if (result.success && result.data) {
      const updatedData = result.data;
      const dataForFormReset: CompanyProfileFormData = {
        name: updatedData.name || '',
        address: updatedData.address || '',
        phone: updatedData.phone || '',
        email: updatedData.email || '',
        website: updatedData.website || '',
        taxId: updatedData.taxId || '',
        logoUrl: updatedData.logoUrl || '',
      };
      setCompanyDetailsFromServer(dataForFormReset);
      reset(dataForFormReset);
      setPreviewUrl(isValidHttpUrl(dataForFormReset.logoUrl) ? dataForFormReset.logoUrl : null);
      setSelectedFile(null);
      toast({ title: 'Success', description: 'Company details updated successfully.' });
      setIsEditing(false);
    } else {
      setFormSubmissionError(result.error || 'Could not update company details.');
      if (result.fieldErrors) {
        setFormSubmissionFieldErrors(result.fieldErrors);
      }
      toast({ title: 'Error Updating', description: result.error || 'Please check the form for details.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleCancelEdit = () => {
    if (companyDetailsFromServer) {
      reset(companyDetailsFromServer);
      setPreviewUrl(isValidHttpUrl(companyDetailsFromServer.logoUrl) ? companyDetailsFromServer.logoUrl : null);
    } else {
      reset(defaultCompanyProfile);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setIsEditing(false);
    setFormSubmissionError(null);
    setFormSubmissionFieldErrors(null);
  };

  const displayDataForViewing = companyDetailsFromServer || defaultCompanyProfile;
  const logoToDisplayForViewing = isValidHttpUrl(displayDataForViewing.logoUrl) ? displayDataForViewing.logoUrl : null;
  const logoToDisplayInEditPreview = previewUrl || (currentLogoUrlFromForm && isValidHttpUrl(currentLogoUrlFromForm) ? currentLogoUrlFromForm : null);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
        <header className="mb-6 md:mb-8 flex items-center space-x-3">
          <Skeleton className="h-10 w-36" /> <Skeleton className="h-10 w-40" />
        </header>
        <Card className="bg-card border-border shadow-xl">
          <CardHeader><Skeleton className="h-8 w-3/5 mb-2" /><Skeleton className="h-4 w-4/5" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-32 mb-4" />
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div><Skeleton className="h-4 w-1/4 mb-1" /><Skeleton className="h-4 w-3/4" /></div>
                <div><Skeleton className="h-4 w-1/4 mb-1" /><Skeleton className="h-4 w-3/4" /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground self-start sm:self-center">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center">
            <Building className="mr-3 h-7 w-7" /> Company Details
          </h1>
        </div>
        {!isEditing && (
          <Button onClick={() => { setIsEditing(true); setFormSubmissionError(null); setFormSubmissionFieldErrors(null);}} disabled={!canManageSettings} className="bg-primary hover:bg-primary/90 text-primary-foreground self-end sm:self-center">
            <Edit className="mr-2 h-4 w-4" /> Edit Details
          </Button>
        )}
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="bg-card border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-card-foreground">
              {isEditing ? 'Edit Company Information' : (displayDataForViewing.name || 'Company Information')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isEditing ? 'Update your company\'s details below.' : 'View your company\'s information.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <>
                {(formSubmissionError && !formSubmissionFieldErrors) && ( 
                  <div className="my-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                    {formSubmissionError}
                  </div>
                )}
                {(formSubmissionFieldErrors || Object.keys(errors).length > 0) && (
                  <div className="my-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <p className="font-medium mb-1">Please correct the following errors:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {formSubmissionFieldErrors && Object.entries(formSubmissionFieldErrors).map(([field, fieldSpecificErrors]) =>
                        fieldSpecificErrors.map((errorMsg, index) => (
                          <li key={`${field}-server-${index}`}>
                            <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}:</strong> {errorMsg}
                          </li>
                        ))
                      )}
                      {Object.entries(errors)
                        .filter(([fieldName]) => !formSubmissionFieldErrors || !formSubmissionFieldErrors[fieldName as keyof CompanyProfileFormData])
                        .map(([fieldName, fieldError]) =>
                          fieldError?.message && (
                            <li key={`${fieldName}-local`}>
                              <strong className="capitalize">{fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}:</strong> {String(fieldError.message)}
                            </li>
                          )
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <Label htmlFor="name" className="text-xs text-foreground">Company Name*</Label>
                  <Input id="name" {...register('name')} className="bg-input border-border focus:ring-primary text-sm" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                
                <div>
                    <Label htmlFor="logoFile" className="text-xs text-foreground">Company Logo (Optional)</Label>
                    <div className="mt-1 flex items-center space-x-3">
                        <Input id="logoFile" type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml"
                            onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                        <input type="hidden" {...register('logoUrl')} /> 
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-dashed border-primary text-primary hover:bg-primary/10 text-sm">
                           <UploadCloud className="mr-2 h-4 w-4" /> {selectedFile ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        {(logoToDisplayInEditPreview || (currentLogoUrlFromForm && isValidHttpUrl(currentLogoUrlFromForm))) && (
                             <Button type="button" variant="ghost" size="icon" onClick={handleRemoveLogo} className="text-destructive hover:bg-destructive/10" title="Remove current logo">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {logoToDisplayInEditPreview && (
                        <div className="mt-2 p-2 border border-dashed border-border rounded-md inline-block bg-muted/30">
                          <Image src={logoToDisplayInEditPreview} alt="Logo Preview" width={150} height={50} className="max-h-16 object-contain" data-ai-hint="company logo"/>
                        </div>
                    )}
                    {errors.logoUrl && <p className="text-xs text-destructive mt-1">{errors.logoUrl.message}</p>}
                </div>

                <div>
                  <Label htmlFor="address" className="text-xs text-foreground">Address*</Label>
                  <Textarea id="address" {...register('address')} className="bg-input border-border focus:ring-primary text-sm" />
                  {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-xs text-foreground">Phone*</Label>
                    <Input id="phone" {...register('phone')} className="bg-input border-border focus:ring-primary text-sm" />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs text-foreground">Email (Optional)</Label>
                    <Input id="email" type="email" {...register('email')} className="bg-input border-border focus:ring-primary text-sm" />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website" className="text-xs text-foreground">Website (Optional)</Label>
                    <Input id="website" {...register('website')} placeholder="https://example.com" className="bg-input border-border focus:ring-primary text-sm" />
                    {errors.website && <p className="text-xs text-destructive mt-1">{errors.website.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="taxId" className="text-xs text-foreground">Tax ID / Reg No. (Optional)</Label>
                    <Input id="taxId" {...register('taxId')} className="bg-input border-border focus:ring-primary text-sm" />
                    {errors.taxId && <p className="text-xs text-destructive mt-1">{errors.taxId.message}</p>}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-border/30">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting} className="border-muted text-muted-foreground hover:bg-muted/80">
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button type="submit" disabled={!isValid || isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {logoToDisplayForViewing && (
                  <div className="mb-4">
                    <Image src={logoToDisplayForViewing} alt={`${displayDataForViewing.name || 'Company'} Logo`} width={150} height={50} className="max-h-16 object-contain" data-ai-hint="company logo"/>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <p><span className="font-medium text-muted-foreground">Address:</span><br/><span className="text-card-foreground whitespace-pre-line">{displayDataForViewing.address || 'N/A'}</span></p>
                  <p><span className="font-medium text-muted-foreground">Phone:</span><br/><span className="text-card-foreground">{displayDataForViewing.phone || 'N/A'}</span></p>
                  <p><span className="font-medium text-muted-foreground">Email:</span><br/><span className="text-card-foreground">{displayDataForViewing.email || 'N/A'}</span></p>
                  <p><span className="font-medium text-muted-foreground">Website:</span><br/><span className="text-card-foreground">{displayDataForViewing.website || 'N/A'}</span></p>
                  <p><span className="font-medium text-muted-foreground">Tax ID / Reg No.:</span><br/><span className="text-card-foreground">{displayDataForViewing.taxId || 'N/A'}</span></p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
