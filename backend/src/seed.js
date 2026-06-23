import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sampleProperties = [
  {
    title: 'Modern Villa in DHA Phase 5',
    description: 'A beautifully designed 5-bedroom villa with modern architecture, spacious garden, and smart home features.',
    type: 'VILLA',
    status: 'FOR_SALE',
    price: 45000000,
    city: 'Lahore',
    address: 'Street 12, DHA Phase 5',
    latitude: 31.4697,
    longitude: 74.3762,
    bedrooms: 5,
    bathrooms: 4,
    area: 4500,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80'],
    featured: true,
  },
  {
    title: 'Luxury Apartment in Bahria Town',
    description: 'Premium 3-bedroom apartment on the 12th floor with panoramic city views and underground parking.',
    type: 'APARTMENT',
    status: 'FOR_RENT',
    price: 85000,
    city: 'Islamabad',
    address: 'Tower B, Bahria Town Phase 7',
    latitude: 33.5217,
    longitude: 73.1552,
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'],
    featured: true,
  },
  {
    title: 'Family Home in Gulberg',
    description: 'Spacious 4-bedroom house with a large lawn, servant quarters, and prime Gulberg location.',
    type: 'HOUSE',
    status: 'FOR_SALE',
    price: 32000000,
    city: 'Lahore',
    address: 'Block H, Gulberg III',
    latitude: 31.5204,
    longitude: 74.3587,
    bedrooms: 4,
    bathrooms: 3,
    area: 3200,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
    featured: true,
  },
  {
    title: 'Cozy Studio in F-7',
    description: 'Perfect for professionals — furnished studio apartment with all utilities included.',
    type: 'APARTMENT',
    status: 'FOR_RENT',
    price: 45000,
    city: 'Islamabad',
    address: 'F-7 Markaz, Jinnah Super',
    latitude: 33.7215,
    longitude: 73.0576,
    bedrooms: 1,
    bathrooms: 1,
    area: 650,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'],
    featured: true,
  },
  {
    title: 'Duplex in Clifton',
    description: 'Stunning sea-facing duplex with 6 bedrooms, rooftop terrace, and private entrance.',
    type: 'DUPLEX',
    status: 'FOR_SALE',
    price: 78000000,
    city: 'Karachi',
    address: 'Block 5, Clifton',
    latitude: 24.8138,
    longitude: 67.0300,
    bedrooms: 6,
    bathrooms: 5,
    area: 5500,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'],
    featured: true,
  },
  {
    title: 'Affordable House in Multan',
    description: 'A well-maintained 3-bedroom house in a peaceful neighborhood with all basic amenities nearby.',
    type: 'HOUSE',
    status: 'FOR_SALE',
    price: 8500000,
    city: 'Multan',
    address: 'Bosan Road, Shah Rukn-e-Alam Colony',
    latitude: 30.1575,
    longitude: 71.5249,
    bedrooms: 3,
    bathrooms: 2,
    area: 1500,
    images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80'],
    featured: true,
  },
];

async function seed() {
  console.log('Seeding database...');

  let sellerProfile = await prisma.profile.findFirst({ where: { role: 'SELLER' } });

  if (!sellerProfile) {
    console.log('No seller profile found. Creating a demo seller profile...');
    sellerProfile = await prisma.profile.create({
      data: {
        userId: 'demo-seller-' + Date.now(),
        email: 'seller@realnest.com',
        name: 'Demo Seller',
        phone: '+92 300 0000000',
        role: 'SELLER',
      },
    });
    console.log('Created demo seller:', sellerProfile.email);
  }

  for (const prop of sampleProperties) {
    await prisma.property.create({
      data: { ...prop, sellerId: sellerProfile.id },
    });
    console.log(`  Created: ${prop.title}`);
  }

  console.log(`\nSeeded ${sampleProperties.length} properties!`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  prisma.$disconnect();
  process.exit(1);
});
