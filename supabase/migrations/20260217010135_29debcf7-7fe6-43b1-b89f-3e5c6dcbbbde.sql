
-- Add DELETE policy for payment_links
CREATE POLICY "Members can delete payment_links"
ON public.payment_links
FOR DELETE
USING (is_workspace_member(auth.uid(), workspace_id));

-- Make payment_links.client_id cascade on delete
ALTER TABLE public.payment_links
DROP CONSTRAINT payment_links_client_id_fkey;

ALTER TABLE public.payment_links
ADD CONSTRAINT payment_links_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Also cascade appointments FK on client delete
ALTER TABLE public.appointments
DROP CONSTRAINT appointments_client_id_fkey;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
