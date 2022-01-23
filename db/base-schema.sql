CREATE TABLE "video_processing_task" (
	"id" varchar(500),
	"video_file_source"	varchar(500) NOT NULL,
	"method" varchar(100),
	"processing_status"	integer NOT NULL DEFAULT 0 CHECK("processing_status" IN (0, 1, 2)),
	"transform_video_file_source" varchar(500),
	"job_configuration" varchar(500),
	"job_enqueue_time" integer,
	"job_completion_time" integer,
	"details"	TEXT,
	PRIMARY KEY("id")
);

CREATE TABLE "image_style" (
	"id" varchar(500),
	"style_file_source"	varchar(500) NOT NULL,
	"description" varchar(500) NOT NULL,
	PRIMARY KEY("id")
);

// Seed data for the provided styles in this file.
INSERT INTO image_style
VALUES (1, 'styles/girl-before-picasso.jpg', 'Girl Before a Mirror - Picasso');
INSERT INTO image_style
VALUES (2, 'styles/starry-night-vangogh.jpg', 'Starry Night - Van Gogh');
INSERT INTO image_style
VALUES (3, 'styles/pencil.jpg', 'Pencil Drawing');
