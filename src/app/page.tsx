

import { store } from '@/store/store';
import {
  initializeAllProducts,
  initializeDiscountSets,
  initializeTaxRate,
} from '@/store/slices/saleSlice';
import { setUser } from '@/store/slices/authSlice';
import { getDiscountSetsAction, getTaxRateAction } from '@/app/actions/settingsActions';
import { getAllProductsAction } from '@/app/actions/productActions';
import { POSClientComponent } from '@/components/pos/POSClientComponent';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAuth } from '@/lib/auth';

// This is now a Server Component
export default async function PosPageContainer() {
  // Verify user authentication on the server
  const result = await verifyAuth();
  if (!result.user) {
    return redirect('/login');
  }

  // Fetch all initial data on the server, scoped to the user's company
  const productsResult = await getAllProductsAction(result.user.id);
  const discountSetsResult = await getDiscountSetsAction(result.user.id);
  const taxRateResult = await getTaxRateAction();

  // Prepare initial state for Redux on the server
  const products = productsResult.success ? productsResult.data ?? [] : [];
  const discountSets = discountSetsResult.success ? discountSetsResult.data ?? [] : [];
  const taxRate = taxRateResult.success ? taxRateResult.data?.value ?? 0 : 0;
  
  // Directly dispatch to the server-side instance of the store
  store.dispatch(initializeAllProducts(products));
  store.dispatch(initializeDiscountSets(discountSets));
  store.dispatch(initializeTaxRate(taxRate));
  store.dispatch(setUser(result.user));
  
  // Get the initial state from the server-side store
  const initialReduxState = store.getState();

  // Pass the initial state to the client component
  // The client component will then initialize its store with this server-fetched data
  return (
      <POSClientComponent serverState={initialReduxState} />
  );
}
