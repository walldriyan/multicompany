
'use server';

import prisma from '@/lib/prisma';
import { CompanyProfileSchema } from '@/lib/zodSchemas';
import type { CompanyProfileFormData } from '@/types';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);


const COMPANY_PROFILE_UNIQUE_ID = "main_profile";
const LOGO_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/company-logos');

export async function getCompanyProfileAction(): Promise<{
  success: boolean;
  data?: CompanyProfileFormData;
  error?: string;
}> {
  try {
    let profile = await prisma.companyProfile.findUnique({
      where: { id: COMPANY_PROFILE_UNIQUE_ID },
    });

    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: {
          id: COMPANY_PROFILE_UNIQUE_ID,
          name: 'My Company', // Default name
        }
      });
    }
    return { success: true, data: profile as CompanyProfileFormData };
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    return { success: false, error: 'Failed to fetch company profile.' };
  }
}

export async function upsertCompanyProfileAction(
  formData: FormData,
  userId: string
): Promise<{ success: boolean; data?: CompanyProfileFormData; error?: string, fieldErrors?: Record<string, string[]> }> {
  
  if (!userId) {
    return { success: false, error: 'User is not authenticated. Cannot update company profile.' };
  }

  const rawDataFromForm: Record<string, any> = {};
  formData.forEach((value, key) => {
    if (key !== 'logoFile' && key !== 'clearLogo') {
       rawDataFromForm[key] = value;
    }
  });
  
  const logoFile = formData.get('logoFile') as File | null;
  const clearLogo = formData.get('clearLogo') === 'true';

  if (logoFile) {
    rawDataFromForm.logoUrl = '';
  }
  
  if (rawDataFromForm.id === 'undefined' || rawDataFromForm.id === 'null' || !rawDataFromForm.id) {
    delete rawDataFromForm.id; 
  }
  
  const validationResult = CompanyProfileSchema.safeParse(rawDataFromForm);
  if (!validationResult.success) {
    console.error("Zod validation failed for company profile text data:", validationResult.error.flatten().fieldErrors);
    return { success: false, error: "Validation failed for text fields. Please check the errors below.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }
  const validatedTextData = validationResult.data;
  console.log("Validated text data for upsert (after Zod):", validatedTextData);

  const { id, logoUrl: currentDbLogoUrlFromZod, ...dataToUpsert } = validatedTextData; 

  let newLogoPath: string | null | undefined = currentDbLogoUrlFromZod;

  try {
    await mkdirAsync(LOGO_UPLOAD_DIR, { recursive: true });

    const existingProfileFromServer = await prisma.companyProfile.findUnique({
      where: { id: COMPANY_PROFILE_UNIQUE_ID },
      select: { logoUrl: true }
    });
    const oldLogoPathOnServer = existingProfileFromServer?.logoUrl ? path.join(process.cwd(), 'public', existingProfileFromServer.logoUrl) : null;

    if (clearLogo) {
        newLogoPath = null;
        if (oldLogoPathOnServer && fs.existsSync(oldLogoPathOnServer)) {
            try {
                await unlinkAsync(oldLogoPathOnServer);
                console.log("Old logo deleted (due to clearLogo):", oldLogoPathOnServer);
            } catch (unlinkError) {
                console.error("Error deleting old logo (on clearLogo):", unlinkError);
            }
        }
    } else if (logoFile) {
      const fileBuffer = Buffer.from(await logoFile.arrayBuffer());
      const fileExtension = path.extname(logoFile.name);
      const uniqueFilename = `logo-${Date.now()}${fileExtension}`;
      const filePathOnServer = path.join(LOGO_UPLOAD_DIR, uniqueFilename);
      
      await writeFileAsync(filePathOnServer, fileBuffer);
      newLogoPath = `/uploads/company-logos/${uniqueFilename}`; 

      if (oldLogoPathOnServer && oldLogoPathOnServer !== path.join(process.cwd(), 'public', newLogoPath) && fs.existsSync(oldLogoPathOnServer)) {
         try {
            await unlinkAsync(oldLogoPathOnServer);
            console.log("Old logo deleted (replaced by new):", oldLogoPathOnServer);
         } catch (unlinkError) {
            console.error("Error deleting old logo (on new upload):", unlinkError);
         }
      }
    }

    const finalData = {
      ...dataToUpsert,
      logoUrl: newLogoPath, 
      name: dataToUpsert.name || "My Company",
      updatedByUserId: userId,
    };
    
    console.log("Data being sent to Prisma upsert:", finalData);
    const updatedProfile = await prisma.companyProfile.upsert({
      where: { id: COMPANY_PROFILE_UNIQUE_ID },
      update: finalData,
      create: {
        id: COMPANY_PROFILE_UNIQUE_ID,
        ...finalData,
      },
    });
    return { success: true, data: updatedProfile as CompanyProfileFormData };
  } catch (error: any) {
    console.error('Error updating company profile in DB:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error: ${error.message}` };
    }
    return { success: false, error: 'Failed to update company profile. Check server logs.' };
  }
}
