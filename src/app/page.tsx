
import { store } from '@/store/store';
import {
  initializeAllProducts,
  initializeDiscountSets,
  initializeTaxRate,
} from '@/store/slices/saleSlice';

import { getDiscountSetsAction, getTaxRateAction } from '@/app/actions/settingsActions';
import { getAllProductsAction } from '@/app/actions/productActions';
import { POSClientComponent } from '@/components/pos/POSClientComponent';

// This is now a Server Component
export default async function PosPageContainer() {
  // Fetch all initial data on the server
  const productsResult = await getAllProductsAction();
  const discountSetsResult = await getDiscountSetsAction();
  const taxRateResult = await getTaxRateAction();

  // Prepare initial state for Redux on the server
  // This avoids client-side fetching for initial load
  const products = productsResult.success ? productsResult.data ?? [] : [];
  const discountSets = discountSetsResult.success ? discountSetsResult.data ?? [] : [];
  const taxRate = taxRateResult.success ? taxRateResult.data?.value ?? 0 : 0;
  
  // Directly dispatch to the server-side instance of the store
  store.dispatch(initializeAllProducts(products));
  store.dispatch(initializeDiscountSets(discountSets));
  store.dispatch(initializeTaxRate(taxRate));
  
  // Get the initial state from the server-side store
  const initialReduxState = store.getState();

  // Pass the initial state to the client component
  // The client component will then initialize its store with this server-fetched data
  return (
      <POSClientComponent serverState={initialReduxState} />
  );
}
