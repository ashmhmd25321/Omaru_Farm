import { pool } from '../db.js'

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
      fulfillment_status VARCHAR(40) NOT NULL DEFAULT 'unfulfilled',
      stripe_payment_intent_id VARCHAR(120) DEFAULT NULL,
      shipping_breakdown_json TEXT NULL,
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
      status VARCHAR(40) NOT NULL DEFAULT 'held',
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_table_holds_expires (expires_at),
      INDEX idx_table_holds_date_slot (party_date, slot)
    )
  `)

  const [ruleCount] = await pool.query('SELECT COUNT(*) AS c FROM shipping_rules')
  if (toNumber(ruleCount[0]?.c, 0) === 0) {
    // Compact prefix placeholders until the client shipping matrix arrives.
    // Matching uses startsWith, so "30,31,32" covers metro-ish VIC and "39" covers Phillip Island / Bass Coast.
    await pool.query(
      `INSERT INTO shipping_rules (name, postcode_prefixes, base_fee, per_kg_fee, free_over, sort_order) VALUES
       ('Metro VIC', '30,31,32', 12.00, 2.50, 150.00, 10),
       ('Regional VIC / Phillip Island', '39', 15.00, 3.00, 180.00, 20),
       ('Interstate AU (default)', '*', 25.00, 4.50, 250.00, 100)`,
    )
  }

  const [propCount] = await pool.query('SELECT COUNT(*) AS c FROM properties')
  if (toNumber(propCount[0]?.c, 0) === 0) {
    await pool.query(
      `INSERT INTO properties (slug, name, description, nightly_rate, min_nights, max_guests, cleaning_fee, sort_order) VALUES
       ('glass-pavilion', 'Glass Pavilion', 'On-farm cabin with sweeping views.', 280.00, 2, 2, 80.00, 10),
       ('heritage-stone-cottage', 'Heritage Stone Cottage', 'Self-contained stone cottage on Omaru Farm.', 320.00, 2, 4, 90.00, 20)`,
    )
  }
}
