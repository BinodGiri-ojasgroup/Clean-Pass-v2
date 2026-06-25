import { getSession } from '@/lib/auth';
import api, { ok, err } from '@/lib/api';
import { AxiosError } from 'axios';

export async function GET(req: Request) {
  // 1. Enforce authentication on the Next.js gateway side
  const session = await getSession();
  if (!session) return err('Unauthorized', 401);

  // 2. Extract any search queries passed from your UI components
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  try {
    // 3. Forward the request directly to your Django backend via your central Axios client
    // This will hit http://127.0.0.1:8000/api/washstation/customers/?search=...
    const response = await api.get('/customers/', {
      params: { search }
    });

    // 4. Send the clean data payload back down to your React UI
    return ok(response.data);
  } catch (error) {
    console.error('Error fetching customers from Django:', error);
    
    // Handle Axios errors gracefully
    if (error instanceof AxiosError) {
      return err(error.response?.data?.error || 'Failed to fetch customer records from backend', error.response?.status || 500);
    }
    return err('Internal Server Error', 500);
  }
}