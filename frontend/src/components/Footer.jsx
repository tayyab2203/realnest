import { Link } from 'react-router-dom';
import { HiOutlineHome } from 'react-icons/hi2';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineHome className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">RealNest</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your trusted partner in finding the perfect property. Smart recommendations powered by your preferences.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/properties" className="block text-sm hover:text-white transition-colors">Browse Properties</Link>
              <Link to="/properties?status=FOR_SALE" className="block text-sm hover:text-white transition-colors">Buy</Link>
              <Link to="/properties?status=FOR_RENT" className="block text-sm hover:text-white transition-colors">Rent</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm hover:text-white transition-colors">About Us</a>
              <a href="#" className="block text-sm hover:text-white transition-colors">Contact</a>
              <a href="#" className="block text-sm hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Contact</h4>
            <div className="space-y-2 text-sm">
              <p>contact@realnest.com</p>
              <p>+92 300 1234567</p>
              <p>Islamabad, Pakistan</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} RealNest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
