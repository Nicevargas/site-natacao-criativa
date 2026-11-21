-- ============================================================================
-- Migration 0008: pedidos da loja, estoque e eventos de pagamento do Asaas.
-- Só acrescenta; não altera dados existentes.
-- As tabelas têm RLS sem políticas: só o servidor (service_role) acessa.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  access_token text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aguardando_pagamento'
    CHECK (status IN ('aguardando_pagamento','vencido','pago','em_separacao','enviado','entregue','cancelado','reembolsado')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  delivery_method text NOT NULL CHECK (delivery_method IN ('envio','retirada')),
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL,
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents > 0),
  asaas_customer_id text,
  asaas_payment_id text UNIQUE,
  invoice_url text,
  billing_type text,
  paid_at timestamptz,
  tracking_code text,
  internal_notes text,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_reserved boolean NOT NULL DEFAULT false,
  stock_released_at timestamptz,
  notified_created_at timestamptz,
  notified_paid_at timestamptz,
  notified_shipped_at timestamptz,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON public.store_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_email ON public.store_orders(customer_email);
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Só produtos com linha aqui têm estoque controlado; sem linha, a venda não tem limite.
CREATE TABLE IF NOT EXISTS public.store_stock (
  item_id text PRIMARY KEY,
  quantity integer NOT NULL CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;

-- Evita processar duas vezes o mesmo aviso do Asaas.
CREATE TABLE IF NOT EXISTS public.store_payment_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payment_id text,
  received_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.store_payment_events ENABLE ROW LEVEL SECURITY;

-- Reserva o estoque do pedido inteiro, ou nada. Devolve false se faltar algum item.
CREATE OR REPLACE FUNCTION public.loja_reservar_estoque(p_order uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders%ROWTYPE;
  v_item jsonb;
  v_qtd integer;
BEGIN
  SELECT * INTO v_order FROM public.store_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.stock_reserved AND v_order.stock_released_at IS NULL THEN RETURN true; END IF;

  BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) ORDER BY value->>'id' LOOP
      v_qtd := (v_item->>'qtd')::integer;
      IF EXISTS (SELECT 1 FROM public.store_stock WHERE item_id = v_item->>'id') THEN
        UPDATE public.store_stock
           SET quantity = quantity - v_qtd, updated_at = timezone('utc', now())
         WHERE item_id = v_item->>'id' AND quantity >= v_qtd;
        IF NOT FOUND THEN RAISE EXCEPTION 'sem_estoque'; END IF;
      END IF;
    END LOOP;
  EXCEPTION WHEN raise_exception THEN
    RETURN false;
  END;

  UPDATE public.store_orders
     SET stock_reserved = true, stock_released_at = NULL
   WHERE id = p_order;
  RETURN true;
END;
$$;

-- Devolve o estoque uma única vez, mesmo se for chamada de novo.
CREATE OR REPLACE FUNCTION public.loja_devolver_estoque(p_order uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
BEGIN
  UPDATE public.store_orders
     SET stock_released_at = timezone('utc', now())
   WHERE id = p_order AND stock_reserved AND stock_released_at IS NULL
  RETURNING items INTO v_items;
  IF v_items IS NULL THEN RETURN false; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    UPDATE public.store_stock
       SET quantity = quantity + (v_item->>'qtd')::integer, updated_at = timezone('utc', now())
     WHERE item_id = v_item->>'id';
  END LOOP;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.loja_reservar_estoque(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.loja_devolver_estoque(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loja_reservar_estoque(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.loja_devolver_estoque(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
