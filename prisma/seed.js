const { prisma } = require('../src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminExists = await prisma.admin.findUnique({
    where: { username: 'admin' }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin4s111123', 10);
    await prisma.admin.create({
      data: {
        username: 'admin4s',
        password: hashedPassword
      }
    });
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }

  // Create sample products
  const productsCount = await prisma.product.count();
  
  if (productsCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: 'Charizard Card',
          description: 'Rare Charizard Pokémon card',
          price: 1500000,
          stock: 5,
          category: 'TCG_CARD'
        },
        {
          name: 'Card Sleeves',
          description: 'High quality card sleeves for protection',
          price: 120000,
          stock: 100,
          category: 'ACCESSORY'
        },
        {
          name: 'Card Binder',
          description: 'Store and display your card collection',
          price: 500000,
          stock: 30,
          category: 'ACCESSORY'
        },
        {
          name: 'Soda',
          description: 'Refreshing carbonated drink',
          price: 7000,
          stock: 50,
          category: 'BEVERAGE'
        },
        {
          name: 'Air Putih',
          description: 'Mineral Water',
          price: 5000,
          stock: 40,
          category: 'BEVERAGE'
        }
      ]
    });
    console.log('Sample products created.');
  } else {
    console.log('Products already exist.');
  }
  
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });