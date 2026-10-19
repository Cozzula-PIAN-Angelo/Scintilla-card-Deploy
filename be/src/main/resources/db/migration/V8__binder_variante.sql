-- Variante della carta in una tasca, per il binder del master set (Normale e Reverse holo affiancate).
-- null = una variante qualsiasi: è il caso di tutte le tasche di prima e delle carte inserite a mano

ALTER TABLE binder_slot ADD COLUMN variante varchar(20);
ALTER TABLE binder_slot ADD CONSTRAINT ck_binder_slot_variante
    CHECK (variante IS NULL OR variante IN ('NORMALE', 'REVERSE_HOLO'));
