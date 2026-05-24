import { pool } from '../src/db.js'

const contactDetails = {
  farmName: 'Omaru Farm',
  addressLine1: '776 Ventnor Road, Ventnor',
  addressLine2: 'Phillip Island VIC 3922',
  email: 'hello@omarufarm.com.au',
  whatsapp: 'https://wa.me/61000000000',
  instagram: 'https://instagram.com',
  mapQuery: '776 Ventnor Road, Ventnor, Phillip Island VIC 3922, Australia',
  hoursCafe: 'Thu–Fri: 10am–2pm & 5–8pm · Sat–Sun: 10am–8pm',
  hoursStore: 'Mon–Sun: 9am–5pm',
  hoursTours: 'By appointment',
}

async function setSetting(settingKey, value) {
  await pool.query(
    `INSERT INTO admin_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [settingKey, JSON.stringify(value)],
  )
}

async function main() {
  await setSetting('contact_details', contactDetails)
  await pool.query(
    `UPDATE menu_items
     SET is_published = 0
     WHERE section_name IN ('Breakfast', 'Afternoon Tea')`,
  )
  await pool.query(
    `UPDATE menu_items
     SET section_name = 'Dinner'
     WHERE section_name = 'Evening'`,
  )
  console.log('Aligned contact details, trading hours, and hidden legacy breakfast/afternoon tea menu rows.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
