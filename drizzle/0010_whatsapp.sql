-- Opt-in for WhatsApp alerts. The phone column stays the login number.
ALTER TABLE users
	ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

ALTER TABLE users
	ADD COLUMN IF NOT EXISTS whatsapp_opted_at timestamptz;
