import { useState } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi2';

const FAQ_ITEMS = [
  {
    q: 'What types of properties do you sell?',
    a: 'We offer a wide range of properties including houses, apartments, villas, duplexes, warehouses, and more. Browse our listings to find your perfect match.',
  },
  {
    q: 'How do I know if a property is a good investment?',
    a: 'Our platform provides detailed property information, market insights, and AI-powered recommendations to help you make informed decisions.',
  },
  {
    q: 'Do I need to hire a real estate agent?',
    a: 'While our platform connects you directly with sellers, you can choose to work with an agent for additional support during the buying process.',
  },
  {
    q: "What's the process for buying a property?",
    a: 'Browse listings, save favorites, schedule viewings, and complete your purchase. Our team guides you through each step for a smooth experience.',
  },
  {
    q: 'Can I tour a property before purchasing?',
    a: 'Yes! Contact the seller through our platform to schedule a viewing. We encourage all buyers to visit properties before making a decision.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div
          key={i}
          className="border-b border-gray-200 last:border-0"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-4 text-left hover:text-gray-900 transition-colors"
          >
            <span className="font-medium text-gray-700 pr-4">{item.q}</span>
            <HiOutlineChevronDown
              className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                openIndex === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === i ? 'max-h-48' : 'max-h-0'
            }`}
          >
            <p className="pb-4 text-sm text-gray-500 leading-relaxed">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
