-- BTC Signal AI — Supabase Schema
-- Supabase 대시보드 > SQL Editor 에서 실행하세요

CREATE TABLE licenses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  plan          TEXT NOT NULL,          -- '1month' | '3month' | '12month'
  status        TEXT DEFAULT 'active',  -- 'active' | 'expired' | 'suspended'
  payment_id    TEXT UNIQUE,            -- NOWPayments payment ID
  payment_amount NUMERIC,
  payment_currency TEXT,
  buyer_email   TEXT,
  buyer_name    TEXT,
  max_devices   INT DEFAULT 2,
  issued_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  notes         TEXT
);

-- 인덱스
CREATE INDEX idx_licenses_key ON licenses(key);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_payment_id ON licenses(payment_id);

-- RLS (Row Level Security) 비활성화 (서비스 키로만 접근)
ALTER TABLE licenses DISABLE ROW LEVEL SECURITY;
