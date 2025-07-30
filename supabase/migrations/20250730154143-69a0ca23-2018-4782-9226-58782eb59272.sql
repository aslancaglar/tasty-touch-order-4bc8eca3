-- Add new languages to the system
INSERT INTO public.languages (code, name, flag_url) VALUES
('ru', 'Русский', NULL),
('zh', '中文', NULL),
('de', 'Deutsch', NULL),
('es', 'Español', NULL),
('it', 'Italiano', NULL),
('ar', 'العربية', NULL),
('pt', 'Português', NULL),
('nl', 'Nederlands', NULL)
ON CONFLICT (code) DO NOTHING;