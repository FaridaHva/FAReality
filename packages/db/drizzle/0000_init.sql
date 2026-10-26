CREATE TYPE "public"."model_source" AS ENUM('cad', 'scan', 'ai', 'artist', 'library');--> statement-breakpoint
CREATE TYPE "public"."model_status" AS ENUM('processing', 'needs_review', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" jsonb,
	"logo_url" text,
	"city" text,
	"address" text,
	"phone" text,
	"whatsapp" text,
	"instagram" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source" "model_source" NOT NULL,
	"status" "model_status" DEFAULT 'processing' NOT NULL,
	"source_url" text NOT NULL,
	"glb_url" text,
	"usdz_url" text,
	"poster_url" text,
	"report" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"price_azn" numeric(10, 2),
	"width_cm" integer,
	"depth_cm" integer,
	"height_cm" integer,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_models" ADD CONSTRAINT "product_models_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_models_product_id_status_index" ON "product_models" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "products_company_id_slug_index" ON "products" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "products_status_index" ON "products" USING btree ("status");