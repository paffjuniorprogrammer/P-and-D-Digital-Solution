-- P&D Digital Solutions: seed the empty database tables
-- Run this in the SQL Editor of the Supabase project connected to the website.
-- SQL Editor execution has the privileges needed to insert these records.

INSERT INTO public.projects (id, title, tag, description, url, "imageUrl")
VALUES
  (
    'pafly-rw',
    'PAFLY RW',
    'E-commerce',
    'A digital marketplace that connects customers with local stores, allowing them to browse products, place orders, and receive deliveries. Businesses can manage their products, orders, and customers from one platform.',
    'https://www.pafly.rw',
    ''
  ),
  (
    'umucuruzi-pos',
    'POS System (UMUCURUZI POS)',
    'System',
    'A business management system designed to simplify sales, product management, stock tracking, pricing, and daily business operations. It helps businesses manage their products and monitor sales more efficiently.',
    'https://umucuruzipos.vercel.app',
    ''
  ),
  (
    'advanced-luxe-line',
    'Advanced Luxe Line Ltd',
    'Web',
    'Hospitality and relaxation establishment in Musanze, Rwanda, offering luxury rooms, sauna, massage, pool snooker, and fine dining.',
    'https://advancedluxeline.com',
    ''
  ),
  (
    'corporate-enterprise-portal',
    'Corporate Enterprise Portal',
    'System',
    'Full-stack client management portal with real-time analytics and automated invoicing.',
    'https://example.com',
    ''
  ),
  (
    'modern-saas-web-application',
    'Modern SaaS Web Application',
    'App',
    'Responsive web application with interactive user dashboard, payment gateway, and role permissions.',
    'https://example.com',
    ''
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  tag = EXCLUDED.tag,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  "imageUrl" = EXCLUDED."imageUrl";

INSERT INTO public.public_contact_settings (key, value, updated_at)
VALUES
  ('whatsappNumber', '250780000000', NOW()),
  ('whatsappMessage', 'Hello P&D Digital Solutions, I''d like to talk about a project.', NOW()),
  ('email', 'paffdaddy06@gmail.com', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the records after running:
SELECT id, title, tag, url FROM public.projects ORDER BY created_at DESC;
SELECT key, value FROM public.public_contact_settings ORDER BY key;
