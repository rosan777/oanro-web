ALTER TABLE "product_collection" DROP CONSTRAINT "product_collection_preset_check";--> statement-breakpoint
ALTER TABLE "product_collection" ADD CONSTRAINT "product_collection_preset_check" CHECK ("product_collection"."preset" in ('seasonal', 'caps', 'tech', 'jewelry', 'general'));
