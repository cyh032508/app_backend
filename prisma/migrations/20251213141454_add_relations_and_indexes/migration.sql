-- CreateTable
CREATE TABLE "USER" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "username" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESSAYS" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "ocr_raw_text" TEXT,
    "image_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ESSAYS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RUBRICS" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "criteria_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "RUBRICS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCORES" (
    "id" TEXT NOT NULL,
    "essay_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,
    "total_score" TEXT NOT NULL,
    "feedback_json" JSONB,
    "scoring_method" TEXT,
    "rank_position" INTEGER,
    "percentile" INTEGER,
    "dimension_feedbacks" JSONB,
    "grammar_analysis" JSONB,
    "vocabulary_usage" JSONB,
    "structure_issues" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SCORES_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USER_email_key" ON "USER"("email");

-- CreateIndex
CREATE INDEX "ESSAYS_user_id_idx" ON "ESSAYS"("user_id");

-- CreateIndex
CREATE INDEX "SCORES_essay_id_idx" ON "SCORES"("essay_id");

-- CreateIndex
CREATE INDEX "SCORES_user_id_idx" ON "SCORES"("user_id");

-- CreateIndex
CREATE INDEX "SCORES_rubric_id_idx" ON "SCORES"("rubric_id");

-- AddForeignKey
ALTER TABLE "ESSAYS" ADD CONSTRAINT "ESSAYS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCORES" ADD CONSTRAINT "SCORES_essay_id_fkey" FOREIGN KEY ("essay_id") REFERENCES "ESSAYS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCORES" ADD CONSTRAINT "SCORES_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCORES" ADD CONSTRAINT "SCORES_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "RUBRICS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
