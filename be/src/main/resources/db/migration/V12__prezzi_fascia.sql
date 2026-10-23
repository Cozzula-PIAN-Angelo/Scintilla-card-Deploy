-- minimo e massimo di Cardmarket per carta (normale e reverse, dai valori "-holo"), per il valore del binder
-- come fascia. null = mai letti: li scrivono l'import, il riempimento e il rinfresco settimanale delle carte nei binder
ALTER TABLE oggetti ADD COLUMN prezzo_minimo numeric(8, 2);
ALTER TABLE oggetti ADD COLUMN prezzo_massimo numeric(8, 2);
ALTER TABLE oggetti ADD COLUMN prezzo_minimo_reverse numeric(8, 2);
ALTER TABLE oggetti ADD COLUMN prezzo_massimo_reverse numeric(8, 2);
ALTER TABLE oggetti ADD COLUMN prezzi_aggiornati_il timestamp(6) with time zone;
