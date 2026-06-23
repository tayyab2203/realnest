import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFeaturedProperties, useProperties } from '../hooks/useProperties';
import PropertyCard from '../components/PropertyCard';
import MapComponent from '../components/MapComponent';
import FAQAccordion from '../components/FAQAccordion';
import { HiOutlineMagnifyingGlass, HiOutlineBuildingOffice2, HiOutlineUserGroup, HiOutlineShieldCheck, HiOutlineChartBar, HiOutlineMapPin } from 'react-icons/hi2';


const STATS = [
  { value: '100%', label: 'Satisfaction Rate' },
  { value: '500+', label: 'Properties Listed' },
  { value: '150+', label: 'Happy Clients' },
  { value: '2,000+', label: 'Successful Sales' },
];

const TESTIMONIAL = {
  quote: "Working with this team was a pleasure. They understood our vision and helped us find a property that exceeded our expectations. We couldn't have done it without them.",
  name: 'Sophia Turner',
  role: 'Home Buyer',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
};

export default function Home() {
  const { data: featured, isLoading } = useFeaturedProperties();
  const { data: allPropertiesData } = useProperties({ limit: 6 });
  const allProperties = allPropertiesData?.properties ?? [];
  const [searchCity, setSearchCity] = useState('');
  const navigate = useNavigate();

  const propertiesForMap = featured?.length > 0 ? featured : allProperties;
  const featuredCards = featured?.slice(0, 2) ?? [];

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/properties?city=${searchCity}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-block text-sm font-medium text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full mb-6">
              Intelligent Property Search
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Find your ideal home with <span className="text-blue-400">smart</span> recommendations
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Discover properties tailored to your preferences. Our AI learns what you love and recommends your perfect match.
            </p>

            <form onSubmit={handleSearch} className="flex bg-white rounded-xl p-1.5 max-w-lg shadow-2xl">
              <div className="relative flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter city or location..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-gray-900 text-sm rounded-lg focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex gap-8 mt-10">
              <div>
                <p className="text-2xl font-bold">350k+</p>
                <p className="text-sm text-gray-400">Properties Listed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">120k+</p>
                <p className="text-sm text-gray-400">Happy Customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-sm text-gray-400">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-medium text-blue-600">Why RealNest</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Trusted solutions for real estate</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Expert coverage, fast processing, and complete peace of mind at every step of your real estate journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: HiOutlineBuildingOffice2, title: 'Wide Selection', desc: 'Thousands of properties across all major cities' },
              { icon: HiOutlineChartBar, title: 'Smart Matching', desc: 'AI-powered recommendations based on your behavior' },
              { icon: HiOutlineUserGroup, title: 'Verified Sellers', desc: 'All our sellers go through a verification process' },
              { icon: HiOutlineShieldCheck, title: 'Secure Transactions', desc: 'Your data and communications are fully protected' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <item.icon className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Your Primary Home */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
            <h2 className="text-4xl font-bold text-gray-900 max-w-sm">
              Your primary home might begin to feel left out.
            </h2>
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 max-w-xs">
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                <span className="text-white text-xl">▶</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Big things can happen in small spaces.</p>
                <Link to="/properties?type=APARTMENT" className="text-xs text-blue-600 hover:underline mt-0.5 block">Explore compact living →</Link>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredCards[0] ? (
              <Link to={`/properties/${featuredCards[0].id}`} className="group rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-shadow bg-white">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={featuredCards[0].images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'}
                    alt={featuredCards[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow">
                    <span className="font-bold text-gray-900 text-sm">PKR {featuredCards[0].price?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{featuredCards[0].title}</h3>
                  <p className="text-sm text-gray-500">{featuredCards[0].address}, {featuredCards[0].city}</p>
                  <div className="flex gap-4 text-sm text-gray-600 mt-2">
                    <span>{featuredCards[0].bedrooms} beds</span>
                    <span>{featuredCards[0].bathrooms} baths</span>
                    <span>{featuredCards[0].area} sqft</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-gray-200 aspect-video animate-pulse" />
            )}
            {featuredCards[1] ? (
              <Link to={`/properties/${featuredCards[1].id}`} className="group rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-shadow bg-white">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={featuredCards[1].images?.[0] || 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80'}
                    alt={featuredCards[1].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-xs text-white/80">Starting From</p>
                    <span className="font-bold text-white">PKR {featuredCards[1].price?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{featuredCards[1].title}</h3>
                  <p className="text-sm text-gray-500">{featuredCards[1].address}, {featuredCards[1].city}</p>
                  <div className="flex gap-4 text-sm text-gray-600 mt-2">
                    <span>{featuredCards[1].bedrooms} beds</span>
                    <span>{featuredCards[1].bathrooms} baths</span>
                    <span>{featuredCards[1].area} sqft</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-gray-200 aspect-video animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Discover Properties – Map */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 h-80">
              <MapComponent properties={propertiesForMap} className="h-full rounded-none" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Discover Properties with the Best Value
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Explore our curated selection of properties on the map. Find your perfect home in the right neighbourhood with transparent pricing and expert guidance.
              </p>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <HiOutlineMapPin className="h-4 w-4" />
                Explore on Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Explore our premier houses */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <span className="text-sm font-medium text-blue-600">Premier</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">Explore our premier houses</h2>
            </div>
            <Link
              to="/properties"
              className="hidden sm:inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all &rarr;
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />)}
            </div>
          ) : featured?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(property => <PropertyCard key={property.id} property={property} />)}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No properties yet.</p>
              <Link to="/properties" className="text-blue-600 font-medium mt-2 inline-block">Browse all →</Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently asked questions</h2>
              <FAQAccordion />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
                alt="Modern home interior"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">What our clients say about us</h2>
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="flex items-center gap-4 shrink-0">
              <img
                src={TESTIMONIAL.avatar}
                alt={TESTIMONIAL.name}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-100"
              />
              <div>
                <p className="font-semibold text-gray-900">{TESTIMONIAL.name}</p>
                <p className="text-sm text-gray-500">{TESTIMONIAL.role}</p>
              </div>
            </div>
            <div className="flex-1 relative">
              <span className="text-6xl text-blue-100 font-serif leading-none block -mb-3">&ldquo;</span>
              <p className="text-lg text-gray-600 leading-relaxed pl-6">{TESTIMONIAL.quote}</p>
              <div className="flex gap-1 mt-4 pl-6">
                {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-lg">★</span>)}
              </div>
            </div>
            <div className="text-center lg:text-right shrink-0">
              <p className="text-3xl font-bold text-gray-900">65K+</p>
              <p className="text-sm text-gray-500 mt-1">Happy clients</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Image Banner */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/65" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Ready to Make Your Dream Property a Reality?
          </h2>
          <Link
            to="/register"
            className="inline-flex bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

    </div>
  );
}
