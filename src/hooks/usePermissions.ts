'use client';

import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

type Action = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'access';
type Subject = 'all' | 'Product' | 'Sale' | 'PurchaseBill' | 'Party' | 'User' | 'Role' | 'Settings' | 'Dashboard';

export const usePermissions = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { toast } = useToast();

  const can = useCallback((action: Action, subject: Subject): boolean => {
    if (!currentUser?.role?.permissions) {
      return false;
    }

    // Super admin can do anything
    if (currentUser.role.permissions.some(p => p.action === 'manage' && p.subject === 'all')) {
      return true;
    }

    return currentUser.role.permissions.some(
      p => p.action === action && p.subject === subject
    );
  }, [currentUser]);

  const check = useCallback((action: Action, subject: Subject): { permitted: boolean; toast: () => void } => {
    const permitted = can(action, subject);
    
    const showToast = () => {
        if (!permitted) {
            toast({
                title: "Permission Denied",
                description: `You do not have permission to perform this action.`,
                variant: "destructive",
            });
        }
    };

    return { permitted, toast: showToast };
  }, [can, toast]);

  return { can, check };
};
