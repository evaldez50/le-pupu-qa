// Supabase Edge Function — Stripe Webhook
// Escucha el evento checkout.session.completed y actualiza has_paid = true
// Desplegar con: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response('Cannot read body', { status: 400 });
  }

  const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error('Invalid Stripe signature');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('Event ignored', { status: 200 });
  }

  const session = event.data.object as {
    id: string;
    payment_status: string;
    client_reference_id?: string;
    customer_email?: string;
    customer_details?: { email?: string };
  };

  if (session.payment_status !== 'paid') {
    return new Response('Payment not completed', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const userId = session.client_reference_id;
  const customerEmail = session.customer_details?.email || session.customer_email || null;

  if (userId) {
    // CASO A: Usuario logueado al pagar — actualizar por UUID
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, has_paid: true }, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert error (by id):', error);
      return new Response('DB update failed', { status: 500 });
    }
    console.log(`✅ Usuario ${userId} actualizado a Premium`);
  } else if (customerEmail) {
    // CASO B: Pago anónimo — guardar email en pending_activations para activar al registrarse
    const { error } = await supabase
      .from('pending_activations')
      .upsert({ email: customerEmail, stripe_session_id: session.id }, { onConflict: 'email' });
    if (error) {
      console.error('Supabase pending_activations error:', error);
      return new Response('DB update failed', { status: 500 });
    }
    console.log(`⏳ Pago anónimo registrado para ${customerEmail}`);
  } else {
    console.error('No client_reference_id ni customer email');
    return new Response('Missing user info', { status: 400 });
  }

  return new Response('OK', { status: 200 });
});

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      sigHeader.split(',').map((p) => p.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const msgData = new TextEncoder().encode(signedPayload);
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const computed = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === signature;
  } catch {
    return false;
  }
}
