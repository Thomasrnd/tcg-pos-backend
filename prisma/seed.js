// prisma/seed.js
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
        password: hashedPassword,
        role: 'MASTER_ADMIN'
      }
    });
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }

  // Create default categories if they don't exist
  const categories = [
    { name: 'TCG_CARD' },
    { name: 'ACCESSORY' },
    { name: 'BEVERAGE' },
    { name: 'OTHER' }
  ];

  for (const category of categories) {
    const exists = await prisma.productCategory.findFirst({
      where: { name: category.name }
    });

    if (!exists) {
      await prisma.productCategory.create({
        data: category
      });
      console.log(`Category ${category.name} created.`);
    }
  }

  // Create default payment methods if they don't exist
  const paymentMethods = [
    { 
      method: 'BANK_TRANSFER', 
      name: 'Bank Transfer', 
      description: 'Transfer payment to our bank account',
      isEnabled: true,
      requiresProof: true,
      sortOrder: 1
    },
    { 
      method: 'CASH', 
      name: 'Cash', 
      description: 'Pay with cash at pickup',
      isEnabled: true,
      requiresProof: false,
      sortOrder: 2
    },
    { 
      method: 'QRIS', 
      name: 'QRIS', 
      description: 'Pay with QRIS (coming soon)',
      isEnabled: false,
      requiresProof: false,
      sortOrder: 3
    },
  ];

  for (const method of paymentMethods) {
    const exists = await prisma.paymentMethodSetting.findFirst({
      where: { method: method.method }
    });

    if (!exists) {
      await prisma.paymentMethodSetting.create({
        data: method
      });
      console.log(`Payment method ${method.name} created.`);
    }
  }

  // Get category IDs for product creation
  const categoryMap = {};
  const allCategories = await prisma.productCategory.findMany();
  allCategories.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });

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
          categoryId: categoryMap['TCG_CARD']
        },
        {
          name: 'Card Sleeves',
          description: 'High quality card sleeves for protection',
          price: 120000,
          stock: 100,
          categoryId: categoryMap['ACCESSORY']
        },
        {
          name: 'Card Binder',
          description: 'Store and display your card collection',
          price: 500000,
          stock: 30,
          categoryId: categoryMap['ACCESSORY']
        },
        {
          name: 'Soda',
          description: 'Refreshing carbonated drink',
          price: 7000,
          stock: 50,
          categoryId: categoryMap['BEVERAGE']
        },
        {
          name: 'Air Putih',
          description: 'Mineral Water',
          price: 5000,
          stock: 40,
          categoryId: categoryMap['BEVERAGE']
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