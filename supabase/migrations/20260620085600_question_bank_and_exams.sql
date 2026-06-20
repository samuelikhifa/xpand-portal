CREATE TABLE question_bank (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer char(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exam_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES exams(id),
  full_name text NOT NULL,
  email text NOT NULL,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  score numeric,
  question_ids uuid[] NOT NULL
);

CREATE TABLE exam_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid REFERENCES exam_participants(id),
  question_id uuid REFERENCES question_bank(id),
  selected_answer char(1)
);

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage question bank" ON question_bank FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Anyone can view exam meta" ON exams FOR SELECT USING (true);
CREATE POLICY "Admins manage exams" ON exams FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Anon can insert participants" ON exam_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can update own participant" ON exam_participants FOR UPDATE USING (true);
CREATE POLICY "Admins view all participants" ON exam_participants FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Anon can insert responses" ON exam_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view responses" ON exam_responses FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
