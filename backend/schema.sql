CREATE DATABASE IF NOT EXISTS omaru_farm;
USE omaru_farm;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'Farm Store',
  size VARCHAR(60),
  price DECIMAL(8, 2) NOT NULL,
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  booking_date DATE NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, size, price, image) VALUES
('Extra Virgin Olive Oil with Onion Flakes', '250ml', 25.50, '20260311_130334.jpg'),
('Apple Cider Vinegar with Honey', '500ml', 18.50, '20260311_130456.jpg'),
('Sesame Seeds', '175g', 10.50, '20260311_130712.jpg'),
('Cardamom Pods', '175g', 15.50, '20260311_130805.jpg'),
('Clover', '175g', 15.50, '20260311_130831.jpg'),
('Extra Virgin Olive Oil with Cinnamon Sticks', '250ml', 25.50, '20260311_130909.jpg'),
('Italian Mixed Herbs', '250g', 14.50, '20260311_130929.jpg'),
('Extra Virgin Olive Oil and Garlic', '250ml', 25.50, '20260311_130944.jpg'),
('Extra Virgin Olive Oil and Lemon', '250ml', 25.50, '20260311_130957.jpg'),
('Spicy BBQ Marinade', '250g', 12.50, '20260311_131012.jpg');

INSERT INTO reviews (customer_name, rating, comment) VALUES
('Emily R.', 5, 'Beautiful location, elegant atmosphere, and excellent farm products.'),
('Daniel S.', 5, 'Wonderful cafe menu and great hospitality across the property.'),
('Priya K.', 5, 'A premium farm-to-table destination with authentic countryside charm.');
