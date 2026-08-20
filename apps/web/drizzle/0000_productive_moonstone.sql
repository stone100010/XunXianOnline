CREATE TABLE "archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"dao_fruit_code" varchar(9) NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"seed" bigint NOT NULL,
	"settings_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compass_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archive_id" uuid NOT NULL,
	"turn_no" integer NOT NULL,
	"idx" integer NOT NULL,
	"kind" varchar(16) NOT NULL,
	"label" text NOT NULL,
	"payload" jsonb NOT NULL,
	"risk_flag" boolean DEFAULT false NOT NULL,
	"destiny_flag" boolean DEFAULT false NOT NULL,
	"freshness_expire_turn" integer NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_states" (
	"archive_id" uuid PRIMARY KEY NOT NULL,
	"turn_no" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turn_records" (
	"archive_id" uuid NOT NULL,
	"turn_no" integer NOT NULL,
	"seed" bigint NOT NULL,
	"action_kind" varchar(32) NOT NULL,
	"action_input" jsonb NOT NULL,
	"engine_delta" jsonb NOT NULL,
	"narrative" text NOT NULL,
	"model_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archives" ADD CONSTRAINT "archives_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compass_options" ADD CONSTRAINT "compass_options_archive_id_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."archives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_states" ADD CONSTRAINT "player_states_archive_id_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."archives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn_records" ADD CONSTRAINT "turn_records_archive_id_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."archives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "archives_code_idx" ON "archives" USING btree ("dao_fruit_code");--> statement-breakpoint
CREATE INDEX "compass_archive_turn_idx" ON "compass_options" USING btree ("archive_id","turn_no");--> statement-breakpoint
CREATE INDEX "turn_records_pk" ON "turn_records" USING btree ("archive_id","turn_no");