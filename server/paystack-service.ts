import Paystack from 'paystack-api';

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('Missing required Paystack secret: PAYSTACK_SECRET_KEY');
}

// Initialize Paystack
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

/**
 * Verify a Paystack transaction by reference
 * 
 * @param reference - The transaction reference to verify
 * @returns The verified transaction data or null if verification fails
 */
export async function verifyTransaction(reference: string): Promise<any> {
  try {
    const response = await paystack.transaction.verify({ reference });
    
    if (response.status && response.data.status === 'success') {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return null;
  }
}

/**
 * Initialize a Paystack transaction
 * 
 * @param email - Customer's email address
 * @param amount - Amount in kobo (smallest currency unit)
 * @param metadata - Additional metadata to store with the transaction
 * @returns The transaction initialization data or null if initialization fails
 */
export async function initializeTransaction(
  email: string,
  amount: number,
  metadata: Record<string, any> = {}
): Promise<any> {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount,
      metadata
    });
    
    if (response.status) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    return null;
  }
}

/**
 * Get details of a Paystack transaction by ID
 * 
 * @param id - The transaction ID
 * @returns The transaction details or null if retrieval fails
 */
export async function getTransaction(id: number): Promise<any> {
  try {
    const response = await paystack.transaction.get({ id });
    
    if (response.status) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Paystack transaction:', error);
    return null;
  }
}

export default {
  verifyTransaction,
  initializeTransaction,
  getTransaction
};