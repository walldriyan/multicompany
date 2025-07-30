
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
  // Verify user authentication on the server before rendering anything.
  const { user } = await verifyAuth();
  
  // If no valid user session is found from the cookie, redirect to login from the server.
  // This prevents the client from ever rendering in a "logged out" state, which causes the flicker.
  if (!user) {
    return redirect('/login');
  }

  // Fetch all initial data on the server, scoped to the user's company
  const productsResult = await getAllProductsAction(user.id);
  const discountSetsResult = await getDiscountSetsAction(user.id);
  const taxRateResult = await getTaxRateAction();

  // Prepare initial state for Redux on the server
  const products = productsResult.success ? productsResult.data ?? [] : [];
  const discountSets = discountSetsResult.success ? discountSetsResult.data ?? [] : [];
  const taxRate = taxRateResult.success ? taxRateResult.data?.value ?? 0 : 0;
  
  // Directly dispatch to the server-side instance of the store
  // NOTE: This approach with a singleton store on the server might have concurrency issues
  // under high load. For this app's scale, it's acceptable.
  // A more robust solution might involve passing initial state as props without a shared server store instance.
  store.dispatch(initializeAllProducts(products));
  store.dispatch(initializeDiscountSets(discountSets));
  store.dispatch(initializeTaxRate(taxRate));
  store.dispatch(setUser(user));
  
  // Pass the initial state to the client component. The client component will then
  // hydrate the Redux store with this complete, server-fetched data.
  // We don't need to pass the whole state, just a flag to tell the client to use the server store's state.
  return (
      <POSClientComponent serverState={store.getState()} />
  );
}
