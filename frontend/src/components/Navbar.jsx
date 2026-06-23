import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import {
  HiOutlineHome,
  HiArrowRightOnRectangle,
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import { useMySubscription } from '../hooks/useSubscription';

function ProfileAvatar({ name, onClick }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold hover:bg-blue-700 transition-colors"
    >
      {initials}
    </button>
  );
}

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isSeller = profile?.role === 'SELLER';
  // Surface the active plan as a chip in the dropdown — only fetch for
  // authenticated sellers to avoid spurious 401s for guests/buyers.
  const { data: subscription } = useMySubscription({
    enabled: !!user && isSeller,
  });
  const isAgencyPlan = subscription?.plan === 'AGENCY';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <HiOutlineHome className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">RealNest</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Home</Link>
            <Link to="/properties" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Properties</Link>
            <Link
              to="/subscription"
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium inline-flex items-center gap-1"
            >
              <HiOutlineSparkles className="h-4 w-4" /> Pricing
            </Link>

            {user && profile ? (
              <>
                <Link
                  to={profile.role === 'SELLER' ? '/dashboard/seller' : '/dashboard/buyer'}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>

                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <ProfileAvatar name={profile.name} onClick={() => setDropdownOpen(!dropdownOpen)} />

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-gray-100 shadow-lg py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{profile.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {profile.role}
                          </span>
                          {isSeller && subscription && (
                            <span
                              className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                subscription.plan === 'AGENCY'
                                  ? 'bg-violet-100 text-violet-700'
                                  : subscription.plan === 'PRO'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {subscription.plan}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={profile.role === 'SELLER' ? '/dashboard/seller' : '/dashboard/buyer'}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      {isSeller && isAgencyPlan && (
                        <Link
                          to="/dashboard/agency"
                          className="block px-4 py-2 text-sm text-violet-700 hover:bg-violet-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <HiOutlineBuildingOffice2 className="h-4 w-4" /> Agency Dashboard
                        </Link>
                      )}
                      {isSeller && (
                        <Link
                          to="/subscription"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <HiOutlineRocketLaunch className="h-4 w-4" />
                          {subscription?.plan === 'FREE' || !subscription ? 'Upgrade Plan' : 'Manage Subscription'}
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <HiArrowRightOnRectangle className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <HiOutlineX className="h-6 w-6" /> : <HiOutlineMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 pt-2 space-y-2">
          <Link to="/" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/properties" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Properties</Link>
          <Link to="/subscription" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Pricing</Link>
          {user && profile ? (
            <>
              <div className="flex items-center gap-3 py-2 border-b border-gray-100 mb-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                  <p className="text-xs text-gray-500">
                    {profile.role}
                    {isSeller && subscription && ` · ${subscription.plan}`}
                  </p>
                </div>
              </div>
              <Link
                to={profile.role === 'SELLER' ? '/dashboard/seller' : '/dashboard/buyer'}
                className="block py-2 text-gray-700"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              {isSeller && isAgencyPlan && (
                <Link
                  to="/dashboard/agency"
                  className="block py-2 text-violet-700"
                  onClick={() => setMobileOpen(false)}
                >
                  Agency Dashboard
                </Link>
              )}
              {isSeller && (
                <Link
                  to="/subscription"
                  className="block py-2 text-blue-600 font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {subscription?.plan === 'FREE' || !subscription ? 'Upgrade Plan' : 'Manage Subscription'}
                </Link>
              )}
              <button onClick={handleLogout} className="block py-2 text-red-600">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="block py-2 text-blue-600 font-medium" onClick={() => setMobileOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
