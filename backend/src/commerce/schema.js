import { pool } from '../db.js'
import { seedShippingMatrix } from './shipping.js'

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  )
  if (toNumber(rows[0]?.c, 0) > 0) return
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`)
}

export async function ensureCommerceSchema() {
  await addColumnIfMissing('products', 'stock_qty', 'INT NOT NULL DEFAULT 100')
  await addColumnIfMissing('products', 'weight_grams', 'INT NOT NULL DEFAULT 500')
  await addColumnIfMissing('products', 'volume_cm3', 'INT NOT NULL DEFAULT 0')
  await addColumnIfMissing('products', 'shippable', 'TINYINT(1) NOT NULL DEFAULT 1')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(180) NOT NULL DEFAULT '',
      phone VARCHAR(40) DEFAULT '',
      delivery_line1 VARCHAR(255) DEFAULT '',
      delivery_line2 VARCHAR(255) DEFAULT '',
      delivery_city VARCHAR(120) DEFAULT '',
      delivery_state VARCHAR(60) DEFAULT '',
      delivery_postcode VARCHAR(20) DEFAULT '',
      stripe_customer_id VARCHAR(120) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_customer_sessions_customer (customer_id),
      CONSTRAINT fk_customer_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipping_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      postcode_prefixes TEXT NOT NULL,
      base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      per_kg_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      free_over DECIMAL(10,2) NULL,
      sort_order INT NOT NULL DEFAULT 100,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Widen if an older deploy created VARCHAR(255) — long AU postcode lists overflow it.
  await pool.query('ALTER TABLE shipping_rules MODIFY COLUMN postcode_prefixes TEXT NOT NULL')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(40) NOT NULL UNIQUE,
      customer_id INT NULL,
      email VARCHAR(180) NOT NULL,
      full_name VARCHAR(180) NOT NULL,
      phone VARCHAR(40) DEFAULT '',
      shipping_method VARCHAR(40) NOT NULL DEFAULT 'delivery',
      shipping_line1 VARCHAR(255) DEFAULT '',
      shipping_line2 VARCHAR(255) DEFAULT '',
      shipping_city VARCHAR(120) DEFAULT '',
      shipping_state VARCHAR(60) DEFAULT '',
      shipping_postcode VARCHAR(20) DEFAULT '',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'aud',
      status VARCHAR(40) NOT NULL DEFAULT 'pending_payment',
      fulfillment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
      stripe_payment_intent_id VARCHAR(120) DEFAULT NULL,
      shipping_breakdown_json TEXT NULL,
      carrier VARCHAR(80) DEFAULT '',
      tracking_number VARCHAR(160) DEFAULT '',
      tracking_url VARCHAR(500) DEFAULT '',
      admin_note TEXT NULL,
      paid_at DATETIME NULL,
      packed_at DATETIME NULL,
      shipped_at DATETIME NULL,
      delivered_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_orders_status (status),
      INDEX idx_orders_customer (customer_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_size VARCHAR(60) DEFAULT '',
      unit_price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      weight_grams INT NOT NULL DEFAULT 0,
      line_total DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_payment_methods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      stripe_payment_method_id VARCHAR(120) NOT NULL UNIQUE,
      brand VARCHAR(40) DEFAULT '',
      last4 VARCHAR(8) DEFAULT '',
      exp_month INT NULL,
      exp_year INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_spm_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      description TEXT,
      nightly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_nights INT NOT NULL DEFAULT 1,
      max_guests INT NOT NULL DEFAULT 2,
      cleaning_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      ical_airbnb_url TEXT NULL,
      ical_booking_url TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 100,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS availability_blocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'manual',
      external_uid VARCHAR(255) DEFAULT NULL,
      note VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block_external (property_id, source, external_uid),
      INDEX idx_blocks_property_dates (property_id, start_date, end_date),
      CONSTRAINT fk_blocks_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stay_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_number VARCHAR(40) NOT NULL UNIQUE,
      property_id INT NOT NULL,
      customer_id INT NULL,
      email VARCHAR(180) NOT NULL,
      full_name VARCHAR(180) NOT NULL,
      phone VARCHAR(40) DEFAULT '',
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests INT NOT NULL DEFAULT 1,
      nights INT NOT NULL,
      nightly_rate DECIMAL(10,2) NOT NULL,
      cleaning_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending_payment',
      stripe_payment_intent_id VARCHAR(120) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_stay_property FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS table_holds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hold_number VARCHAR(40) NOT NULL UNIQUE,
      full_name VARCHAR(180) NOT NULL,
      email VARCHAR(180) NOT NULL,
      phone VARCHAR(40) DEFAULT '',
      party_date DATE NOT NULL,
      slot VARCHAR(20) NOT NULL,
      covers INT NOT NULL,
      notes TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_table_holds_expires (expires_at),
      INDEX idx_table_holds_date_slot (party_date, slot)
    )
  `)

  // Capacity for café lunch/dinner soft-holds (single-row settings).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafe_capacity (
      id INT PRIMARY KEY,
      lunch_covers INT NOT NULL DEFAULT 40,
      dinner_covers INT NOT NULL DEFAULT 30,
      max_party_size INT NOT NULL DEFAULT 10,
      open_days VARCHAR(32) NOT NULL DEFAULT '4,5,6,0',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  const [capRows] = await pool.query('SELECT id FROM cafe_capacity WHERE id = 1 LIMIT 1')
  if (!capRows[0]) {
    // Default open days: Thu(4), Fri(5), Sat(6), Sun(0) — matches café hours.
    await pool.query(
      `INSERT INTO cafe_capacity (id, lunch_covers, dinner_covers, max_party_size, open_days)
       VALUES (1, 40, 30, 10, '4,5,6,0')`,
    )
  }

  // Legacy soft holds used status "held"; treat them as pending confirmation.
  await pool.query(`UPDATE table_holds SET status = 'pending' WHERE status = 'held'`)

  await addColumnIfMissing('orders', 'expires_at', 'DATETIME NULL')
  await addColumnIfMissing('orders', 'stock_reserved', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing('orders', 'refund_requested_at', 'DATETIME NULL')
  await addColumnIfMissing('orders', 'refund_reason', 'TEXT NULL')
  await addColumnIfMissing('orders', 'refund_status', 'VARCHAR(40) NULL')
  await addColumnIfMissing('orders', 'stripe_refund_id', 'VARCHAR(120) NULL')
  await addColumnIfMissing('orders', 'refunded_amount', 'DECIMAL(10,2) NULL')
  await addColumnIfMissing('orders', 'refund_note', 'TEXT NULL')
  await addColumnIfMissing('orders', 'carrier', "VARCHAR(80) NOT NULL DEFAULT ''")
  await addColumnIfMissing('orders', 'tracking_number', "VARCHAR(160) NOT NULL DEFAULT ''")
  await addColumnIfMissing('orders', 'tracking_url', "VARCHAR(500) NOT NULL DEFAULT ''")
  await addColumnIfMissing('orders', 'admin_note', 'TEXT NULL')
  await addColumnIfMissing('orders', 'paid_at', 'DATETIME NULL')
  await addColumnIfMissing('orders', 'packed_at', 'DATETIME NULL')
  await addColumnIfMissing('orders', 'shipped_at', 'DATETIME NULL')
  await addColumnIfMissing('orders', 'delivered_at', 'DATETIME NULL')
  await pool.query(
    `UPDATE orders SET paid_at = created_at
     WHERE paid_at IS NULL AND status IN ('paid', 'refund_requested', 'refunded')`,
  )

  // Prefer customer-facing "pending" over legacy "unfulfilled"
  await pool.query(`UPDATE orders SET fulfillment_status = 'pending' WHERE fulfillment_status = 'unfulfilled'`)

  await addColumnIfMissing('stay_bookings', 'expires_at', 'DATETIME NULL')
  await addColumnIfMissing('stay_bookings', 'refund_requested_at', 'DATETIME NULL')
  await addColumnIfMissing('stay_bookings', 'refund_reason', 'TEXT NULL')
  await addColumnIfMissing('stay_bookings', 'refund_status', 'VARCHAR(40) NULL')
  await addColumnIfMissing('stay_bookings', 'stripe_refund_id', 'VARCHAR(120) NULL')
  await addColumnIfMissing('stay_bookings', 'refunded_amount', 'DECIMAL(10,2) NULL')
  await addColumnIfMissing('stay_bookings', 'refund_note', 'TEXT NULL')

  await addColumnIfMissing('customers', 'email_verified', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing('customers', 'email_verify_code', 'VARCHAR(10) NULL')
  await addColumnIfMissing('customers', 'email_verify_expires', 'DATETIME NULL')
  await addColumnIfMissing('customers', 'phone_verified', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumnIfMissing('customers', 'phone_verify_code', 'VARCHAR(10) NULL')
  await addColumnIfMissing('customers', 'phone_verify_expires', 'DATETIME NULL')
  await addColumnIfMissing('customers', 'auth_provider', "VARCHAR(20) NOT NULL DEFAULT 'local'")
  await addColumnIfMissing('customers', 'google_id', 'VARCHAR(120) NULL')
  await addColumnIfMissing('customers', 'apple_id', 'VARCHAR(120) NULL')
  await addColumnIfMissing('customers', 'password_reset_code', 'VARCHAR(10) NULL')
  await addColumnIfMissing('customers', 'password_reset_expires', 'DATETIME NULL')
  await pool.query('ALTER TABLE customers MODIFY COLUMN password_hash VARCHAR(255) NULL')
  await pool.query(`
    UPDATE customers
    SET email_verified = 1,
        phone_verified = CASE WHEN phone IS NOT NULL AND phone <> '' THEN 1 ELSE phone_verified END
    WHERE email_verify_code IS NULL
      AND phone_verify_code IS NULL
      AND email_verified = 0
      AND google_id IS NULL
      AND apple_id IS NULL
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id VARCHAR(255) PRIMARY KEY,
      event_type VARCHAR(120) NOT NULL,
      processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await seedShippingMatrix(pool)

  const [propCount] = await pool.query('SELECT COUNT(*) AS c FROM properties')
  if (toNumber(propCount[0]?.c, 0) === 0) {
    await pool.query(
      `INSERT INTO properties (slug, name, description, nightly_rate, min_nights, max_guests, cleaning_fee, sort_order) VALUES
       ('rose-by-omaru-farm', 'Rose by Omaru Farm', 'Four-bedroom holiday home in Cowes with outdoor hot tub. Sleeps up to 10.', 450.00, 2, 10, 150.00, 10),
       ('jasmine-by-omaru-farm', 'Jasmine by Omaru Farm', 'Five-bedroom holiday home near Cowes. Sleeps up to 12.', 520.00, 2, 12, 160.00, 20),
       ('daisy-by-omaru-farm', 'Daisy by Omaru Farm', 'Daisy holiday home on Phillip Island (Airbnb sync enabled).', 380.00, 2, 8, 120.00, 30),
       ('daphne-by-omaru-farm', 'Daphne by Omaru Farm', 'Daphne holiday home on Phillip Island (Airbnb sync enabled).', 380.00, 2, 8, 120.00, 40)`,
    )
  }
}
